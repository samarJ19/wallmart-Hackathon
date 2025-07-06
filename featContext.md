relevant code snippet from server.js
```
const express = require('express');
const { clerkMiddleware } = require('@clerk/express');
const { verifyToken } = require('@clerk/backend');
const activeUsers = new Map(); 
const userSockets = new Map(); 

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.sub) {
      return next(new Error('Invalid token'));
    }

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
io.use(socketAuth);

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.userId})`);
  
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    status: 'online',
    lastSeen: new Date()
  });
  userSockets.set(socket.id, socket.userId);
  await prisma.user.update({
    where: { id: socket.userId },
    data: { 
      status: 'online',
      lastSeen: new Date()
    }
  });

  const userGroups = socket.user.groupChatMembers;
  for (const membership of userGroups) {
    socket.join(`group_${membership.groupChatId}`);
    console.log(`User ${socket.user.name} joined group room: group_${membership.groupChatId}`);
  }
  for (const membership of userGroups) {
    socket.to(`group_${membership.groupChatId}`).emit('user_status_changed', {
      userId: socket.userId,
      status: 'online',
      name: socket.user.name
    });
  }
  socket.on('join_group', async (data) => {
    try {
      const { groupChatId } = data;
      const membership = await prisma.groupChatMember.findFirst({
        where: {
          groupChatId: groupChatId,
          userId: socket.userId,
          isActive: true
        }
      });

      if (membership) {
        socket.join(`group_${groupChatId}`);
        
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

  socket.on('send_message', async (data) => {
    try {
      const { groupChatId, content, messageType = 'text', metadata = null } = data;
      
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

      io.to(`group_${groupChatId}`).emit('new_message', {
        message,
        groupChatId
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

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

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
    
    activeUsers.delete(socket.userId);
    userSockets.delete(socket.id);

    await prisma.user.update({
      where: { id: socket.userId },
      data: { 
        status: 'offline',
        lastSeen: new Date()
      }
    });
    const userGroups = socket.user.groupChatMembers;
    for (const membership of userGroups) {
      socket.to(`group_${membership.groupChatId}`).emit('user_status_changed', {
        userId: socket.userId,
        status: 'offline',
        name: socket.user.name
      });
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});
```
