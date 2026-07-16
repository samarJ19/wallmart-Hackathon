const logger = require('../utils/logger');

class SocketService {
  constructor(io, prisma) {
    this.io = io;
    this.prisma = prisma;
    this.activeUsers = new Map();
    this.userSockets = new Map();
  }

  // Register user connection
  async registerUserConnection(userId, socketId, user) {
    this.activeUsers.set(userId, {
      socketId,
      status: 'online',
      lastSeen: new Date(),
    });
    this.userSockets.set(socketId, userId);

    // Update database
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'online',
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      logger.warn('Failed to update user status', error);
    }

    logger.info('User connected', { userId, socketId });
    return true;
  }

  // Unregister user connection
  async unregisterUserConnection(socketId, userId) {
    this.activeUsers.delete(userId);
    this.userSockets.delete(socketId);

    // Update database
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'offline',
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      logger.warn('Failed to update user offline status', error);
    }

    logger.info('User disconnected', { userId, socketId });
    return true;
  }

  // Get active user count
  getActiveUserCount() {
    return this.activeUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.activeUsers.has(userId);
  }

  // Emit to group
  emitToGroup(groupId, event, data) {
    this.io.to(`group_${groupId}`).emit(event, data);
    logger.debug('Event emitted to group', { groupId, event });
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    const connection = this.activeUsers.get(userId);
    if (connection) {
      this.io.to(connection.socketId).emit(event, data);
      logger.debug('Event emitted to user', { userId, event });
    }
  }

  // Join group room
  joinGroupRoom(socket, groupId) {
    socket.join(`group_${groupId}`);
    logger.debug('Socket joined group room', { socketId: socket.id, groupId });
  }

  // Leave group room
  leaveGroupRoom(socket, groupId) {
    socket.leave(`group_${groupId}`);
    logger.debug('Socket left group room', { socketId: socket.id, groupId });
  }

  // Broadcast user status to groups
  async broadcastUserStatusToGroups(userId, groupIds, status) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) return;

    groupIds.forEach(groupId => {
      this.emitToGroup(groupId, 'user_status_changed', {
        userId: user.id,
        status,
        name: user.name,
      });
    });
  }
}

module.exports = SocketService;
