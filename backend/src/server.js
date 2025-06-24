const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { clerkMiddleware } = require('@clerk/express');
require('dotenv').config();

// Import routes
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
// const recommendationsRouter = require('./routes/recommendations');
// const cartRouter = require('./routes/cart');
// const ordersRouter = require('./routes/orders');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Initialize Prisma client
const prisma = new PrismaClient();

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
  next();
});

// Routes
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/test',require('./routes/test'));
// app.use('/api/recommendations', recommendationsRouter);
// app.use('/api/cart', cartRouter);
// app.use('/api/orders', ordersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user-specific room for personalized updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Handle real-time interactions for ML
  socket.on('user-interaction', async (data) => {
    try {
      const { userId, productId, action, context } = data;
      
      // Store interaction in database so ML models can use that data to train 
      await prisma.userInteraction.create({
        data: {
          userId,
          productId,
          action,
          reward: getRewardForAction(action),
          context: context || {}
        }
      });
      
      // Emit to ML service for real-time learning (if needed)
      socket.to(`ml-service`).emit('new-interaction', {
        userId,
        productId,
        action,
        timestamp: new Date()
      });
      
      console.log(`Interaction logged: ${userId} ${action} ${productId}`);
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  });
  
  // Handle cart updates
  socket.on('cart-update', (data) => {
    const { userId, cartCount } = data;
    socket.to(`user-${userId}`).emit('cart-updated', { cartCount });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to calculate rewards
function getRewardForAction(action) {
  const rewardMap = {
    'view': 0.1,
    'tick': 1,
    'cross': -1,
    'cart_add': 2,
    'purchase': 5,
    'ar_view': 1.5
  };
  return rewardMap[action] || 0;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - Fixed to use proper Express pattern
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
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
  console.log(`🔌 WebSocket server ready`);
});

module.exports = { app, server, io, prisma };