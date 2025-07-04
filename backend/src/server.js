const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { clerkMiddleware } = require('@clerk/express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const recommendationsRouter = require('./routes/recommendations');
const cartRouter = require('./routes/cart');
const groupChatRouter = require('./routes/groupChat');
// const callsRouter = require('./routes/calls');
// const ordersRouter = require('./routes/orders');

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize Prisma client
const prisma = new PrismaClient();

// Store active users and their socket connections
const activeUsers = new Map(); // userId -> { socketId, status, lastSeen }
const userSockets = new Map(); // socketId -> userId

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Clerk middleware - must be before routes
app.use(clerkMiddleware());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Make Prisma and Socket.IO available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  req.io = io;
  req.activeUsers = activeUsers;
  next();
});

// Routes
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/test', require('./routes/test'));
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/groups', groupChatRouter);
// app.use('/api/calls', callsRouter);
// app.use('/api/orders', ordersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeUsers: activeUsers.size
  });
});

// Socket.IO Authentication Middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify the token (assuming you're using JWT from Clerk)
    // You might need to adjust this based on your Clerk setup
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return next(new Error('Invalid token'));
    }

    // Get user from database using Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: decoded.sub },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        avatar: true,
        groupChatMembers: {
          where: { isActive: true },
          select: {
            groupChatId: true,
            role: true
          }
        }
      }
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Apply authentication middleware
io.use(socketAuth);

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.userId})`);
  
  // Store user connection
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    status: 'online',
    lastSeen: new Date()
  });
  userSockets.set(socket.id, socket.userId);

  // Update user status in database
  await prisma.user.update({
    where: { id: socket.userId },
    data: { 
      status: 'online',
      lastSeen: new Date()
    }
  });

  // Join user to their group chat rooms
  const userGroups = socket.user.groupChatMembers;
  for (const membership of userGroups) {
    socket.join(`group_${membership.groupChatId}`);
    console.log(`User ${socket.user.name} joined group room: group_${membership.groupChatId}`);
  }

  // Broadcast user online status to their groups
  for (const membership of userGroups) {
    socket.to(`group_${membership.groupChatId}`).emit('user_status_changed', {
      userId: socket.userId,
      status: 'online',
      name: socket.user.name
    });
  }

  // Handle joining a specific group chat
  socket.on('join_group', async (data) => {
    try {
      const { groupChatId } = data;
      
      // Verify user is member of this group
      const membership = await prisma.groupChatMember.findFirst({
        where: {
          groupChatId: groupChatId,
          userId: socket.userId,
          isActive: true
        }
      });

      if (membership) {
        socket.join(`group_${groupChatId}`);
        
        // Send recent messages to the user
        const recentMessages = await prisma.chatMessage.findMany({
          where: {
            groupChatId: groupChatId,
            isDeleted: false
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });

        socket.emit('recent_messages', {
          groupChatId,
          messages: recentMessages.reverse()
        });

        // Notify others that user joined
        socket.to(`group_${groupChatId}`).emit('user_joined_group', {
          userId: socket.userId,
          name: socket.user.name,
          groupChatId
        });
      }
    } catch (error) {
      console.error('Error joining group:', error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { groupChatId, content, messageType = 'text', metadata = null } = data;
      
      // Verify user is member of this group
      const membership = await prisma.groupChatMember.findFirst({
        where: {
          groupChatId: groupChatId,
          userId: socket.userId,
          isActive: true
        }
      });

      if (!membership) {
        socket.emit('error', { message: 'Not authorized to send messages to this group' });
        return;
      }

      // Save message to database
      const message = await prisma.chatMessage.create({
        data: {
          groupChatId,
          userId: socket.userId,
          content,
          messageType,
          metadata
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      // Broadcast message to all group members
      io.to(`group_${groupChatId}`).emit('new_message', {
        message,
        groupChatId
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { groupChatId } = data;
    socket.to(`group_${groupChatId}`).emit('user_typing', {
      userId: socket.userId,
      name: socket.user.name,
      groupChatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { groupChatId } = data;
    socket.to(`group_${groupChatId}`).emit('user_stopped_typing', {
      userId: socket.userId,
      groupChatId
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
    
    // Remove from active users
    activeUsers.delete(socket.userId);
    userSockets.delete(socket.id);

    // Update user status in database
    await prisma.user.update({
      where: { id: socket.userId },
      data: { 
        status: 'offline',
        lastSeen: new Date()
      }
    });

    // Broadcast user offline status to their groups
    const userGroups = socket.user.groupChatMembers;
    for (const membership of userGroups) {
      socket.to(`group_${membership.groupChatId}`).emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline',
        name: socket.user.name
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  // Close Socket.IO connections
  io.close();
  
  // Disconnect Prisma
  await prisma.$disconnect();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Close Socket.IO connections
  io.close();
  
  // Disconnect Prisma
  await prisma.$disconnect();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
  console.log(`🔌 Socket.IO initialized`);
});

module.exports = { app, server, prisma, io };