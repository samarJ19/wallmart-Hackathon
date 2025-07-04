

=>The product data should include features these features include products popularity , its category and other relevant features that can be used to recommend it to someone how has joined your platform for the first time ! Although we can start with these features but these features need to change periodically

## Add checkout page, just add products which user has selected to buy in its order table, so it can be seen that user have purchased few products so they don't get recommend again

## Edit Homepage,cart and for you section: have to show show these pages when user is not signed in
Add conditional rendering on the basis of clerk's user object !

## Add social sync : chat and call feature !
Fix server.js and features into it
- add rate limitting on sending messages (i don't know why, but it has been recommended)
- socket auth fix 
Implement group management routes
## I want to implement group chat feature in my e-commerece website for hackathon
I have already made database models required for this feature. I have listed some routes which I think will be required for group chat. Complete them and also add any necessary route which you think I have missed.
There was also a route for managing messages but then I removed it because that is getting handled by web sockets. I have a complete server.js file (entry file for my backend) ready with me. So you only have to implement routes. For your reference I am adding all the relevant part of that file.
  database models: 
  model User {
  id          String   @id @default(cuid())
  clerkId     String   @unique // Clerk User ID
  email       String   @unique
  name        String
  avatar      String?
  preferences Json? // User preferences for ML
  status      String   @default("offline") // online, offline, busy
  lastSeen    DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  cartItems    CartItem[]
  orders       Order[]
  interactions UserInteraction[]
  arSessions   ARSession[]

  // New chat-related relations
  groupChatMembers GroupChatMember[]
  chatMessages     ChatMessage[]
  callParticipants CallParticipant[]
  initiatedCalls   GroupCall[]       @relation("CallInitiator")

  @@map("users")
}

model GroupChat {
  id          String   @id @default(cuid())
  name        String
  description String?
  avatar      String? // Group avatar/image
  createdBy   String
  isActive    Boolean  @default(true)
  maxMembers  Int      @default(10) // Limit for hackathon
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  members  GroupChatMember[]
  messages ChatMessage[]
  calls    GroupCall[]

  @@map("group_chats")
}

model GroupChatMember {
  id          String   @id @default(cuid())
  groupChatId String
  userId      String
  role        String   @default("member") // admin, member
  joinedAt    DateTime @default(now())
  lastRead    DateTime @default(now()) // For unread message tracking
  isActive    Boolean  @default(true) // For soft delete

  // Relations
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupChat GroupChat @relation(fields: [groupChatId], references: [id], onDelete: Cascade)

  @@unique([groupChatId, userId])
  @@map("group_chat_members")
}

model ChatMessage {
  id          String   @id @default(cuid())
  groupChatId String
  userId      String
  content     String
  messageType String   @default("text") // text, image, file, product_share, system
  metadata    Json? // For product links, file info, etc.
  isEdited    Boolean  @default(false)
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  groupChat GroupChat @relation(fields: [groupChatId], references: [id], onDelete: Cascade)

  @@map("chat_messages")
}
relevant code snippet from server.js
```
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { clerkMiddleware } = require('@clerk/express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const groupChatRouter = require('./routes/groupChat');
const activeUsers = new Map(); 
const userSockets = new Map(); 
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
```
- Post Route: to create a group : requires userId
- Post Route to let other user join that group or any group requires userId of the user which you want to add and also groupchat id
- Post Route sending images : store in database
- Post Route acceptance of the invite (what will be the logic behind it? or is it even necessary ?)
