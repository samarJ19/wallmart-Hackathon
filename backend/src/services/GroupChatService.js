const logger = require('../utils/logger');
const { NotFoundError, ValidationError, ForbiddenError } = require('../errors/AppError');

class GroupChatService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Verify user is member of group
  async verifyGroupMembership(userId, groupChatId) {
    const membership = await this.prisma.groupChatMember.findFirst({
      where: {
        groupChatId,
        userId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ForbiddenError('Not authorized to access this group');
    }

    return membership;
  }

  // Get recent messages for group
  async getRecentMessages(groupChatId, limit = 50) {
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        groupChatId,
        isDeleted: false,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  // Create message
  async createMessage(groupChatId, userId, content, messageType = 'text', metadata = null) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content.length > 5000) {
      throw new ValidationError('Message too long (max 5000 characters)');
    }

    // Verify group exists
    const group = await this.prisma.groupChat.findUnique({
      where: { id: groupChatId },
    });

    if (!group) {
      throw new NotFoundError('Group');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        groupChatId,
        userId,
        content: content.trim(),
        messageType,
        metadata,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    logger.debug('Message created', { messageId: message.id, groupChatId });
    return message;
  }

  // Get group members status
  async getGroupMembersStatus(groupChatId) {
    const members = await this.prisma.groupChatMember.findMany({
      where: { groupChatId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
            lastSeen: true,
          },
        },
      },
    });

    return members.map(m => ({
      userId: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar,
      status: m.user.status,
      lastSeen: m.user.lastSeen,
    }));
  }

  // Get user's groups
  async getUserGroups(userId) {
    const userGroups = await this.prisma.groupChat.findMany({
      where: {
        members: {
          some: { userId, isActive: true },
        },
        isActive: true,
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, avatar: true, status: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            members: { where: { isActive: true } },
            messages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return userGroups.map((group) => {
      const currentUserMember = group.members.find((member) => member.userId === userId);
      return {
        ...group,
        currentUserRole: currentUserMember?.role,
        currentUserJoinedAt: currentUserMember?.joinedAt,
        currentUserLastRead: currentUserMember?.lastRead,
      };
    });
  }

  async createGroup(userId, { name, description, avatar, maxMembers = 10 }) {
    this._validateGroupDetails({ name, maxMembers }, { requireName: true });

    const groupChat = await this.prisma.groupChat.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        avatar: avatar || null,
        createdBy: userId,
        maxMembers,
      },
    });

    await this.prisma.groupChatMember.create({
      data: {
        groupChatId: groupChat.id,
        userId,
        role: 'admin',
      },
    });

    return this.getGroup(userId, groupChat.id);
  }

  async inviteUser(groupChatId, userEmail, currentUserId) {
    if (!groupChatId || !userEmail) {
      throw new ValidationError('Group chat ID and user email are required');
    }

    await this._verifyAdmin(currentUserId, groupChatId);

    const groupChat = await this.prisma.groupChat.findUnique({
      where: { id: groupChatId },
      include: {
        _count: {
          select: { members: { where: { isActive: true } } },
        },
      },
    });

    if (!groupChat) {
      throw new NotFoundError('Group chat');
    }

    if (!groupChat.isActive) {
      throw new ValidationError('Cannot invite users to inactive group');
    }

    if (groupChat._count.members >= groupChat.maxMembers) {
      throw new ValidationError('Group has reached maximum member limit');
    }

    const userToInvite = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true },
    });

    if (!userToInvite) {
      throw new NotFoundError('User');
    }

    const existingMembership = await this.prisma.groupChatMember.findFirst({
      where: { groupChatId, userId: userToInvite.id },
    });

    if (existingMembership?.isActive) {
      throw new ValidationError('User is already a member of this group');
    }

    if (existingMembership) {
      await this.prisma.groupChatMember.update({
        where: { id: existingMembership.id },
        data: { isActive: true, joinedAt: new Date(), role: 'member' },
      });
    } else {
      await this.prisma.groupChatMember.create({
        data: { groupChatId, userId: userToInvite.id, role: 'member' },
      });
    }

    await this._createSystemMessage(groupChatId, currentUserId, `${userToInvite.name} has been added to the group`, {
      action: 'user_added',
      addedUserId: userToInvite.id,
      addedUserName: userToInvite.name,
    });

    return userToInvite;
  }

  async createImageMessage(groupChatId, userId, file) {
    if (!groupChatId) {
      throw new ValidationError('Group chat ID is required');
    }

    if (!file) {
      throw new ValidationError('No image file provided');
    }

    await this.verifyGroupMembership(userId, groupChatId);

    const imageUrl = `/uploads/chat-images/${file.filename}`;
    return this.prisma.chatMessage.create({
      data: {
        groupChatId,
        userId,
        content: '',
        messageType: 'image',
        metadata: {
          imageUrl,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async getAdminGroups(userId) {
    return this.prisma.groupChat.findMany({
      where: {
        members: {
          some: { userId, role: 'admin', isActive: true },
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        maxMembers: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getGroup(userId, groupChatId) {
    await this.verifyGroupMembership(userId, groupChatId);

    const groupChat = await this.prisma.groupChat.findUnique({
      where: { id: groupChatId },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, avatar: true, status: true, lastSeen: true },
            },
          },
        },
        _count: {
          select: {
            members: { where: { isActive: true } },
            messages: true,
          },
        },
      },
    });

    if (!groupChat) {
      throw new NotFoundError('Group chat');
    }

    return groupChat;
  }

  async getMessages(userId, groupChatId, page = 1, limit = 50) {
    const membership = await this.verifyGroupMembership(userId, groupChatId);
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      throw new ValidationError('Page must be a positive integer');
    }

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { groupChatId, isDeleted: false },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    });

    await this.prisma.groupChatMember.update({
      where: { id: membership.id },
      data: { lastRead: new Date() },
    });

    return {
      messages,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        hasMore: messages.length === parsedLimit,
      },
    };
  }

  async updateGroup(userId, groupChatId, updates) {
    await this._verifyAdmin(userId, groupChatId);
    this._validateGroupDetails(updates);

    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.maxMembers !== undefined) updateData.maxMembers = updates.maxMembers;

    return this.prisma.groupChat.update({
      where: { id: groupChatId },
      data: updateData,
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, avatar: true, status: true },
            },
          },
        },
        _count: {
          select: { members: { where: { isActive: true } } },
        },
      },
    });
  }

  async leaveGroup(groupChatId, user) {
    const membership = await this.verifyGroupMembership(user.id, groupChatId);
    const adminCount = await this.prisma.groupChatMember.count({
      where: { groupChatId, role: 'admin', isActive: true },
    });

    if (membership.role === 'admin' && adminCount === 1) {
      const otherMembers = await this.prisma.groupChatMember.findMany({
        where: {
          groupChatId,
          userId: { not: user.id },
          isActive: true,
        },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (otherMembers.length > 0) {
        await this.prisma.groupChatMember.update({
          where: { id: otherMembers[0].id },
          data: { role: 'admin' },
        });

        await this._createSystemMessage(
          groupChatId,
          user.id,
          `${user.name} left the group. ${otherMembers[0].user.name} is now the admin.`,
          {
            action: 'admin_transfer',
            oldAdmin: user.id,
            newAdmin: otherMembers[0].userId,
          }
        );
      } else {
        await this.prisma.groupChat.update({
          where: { id: groupChatId },
          data: { isActive: false },
        });
      }
    }

    await this.prisma.groupChatMember.update({
      where: { id: membership.id },
      data: { isActive: false },
    });

    if (membership.role !== 'admin' || adminCount > 1) {
      await this._createSystemMessage(groupChatId, user.id, `${user.name} left the group`, {
        action: 'user_left',
        leftUserId: user.id,
        leftUserName: user.name,
      });
    }

    return { success: true };
  }

  async removeUser(groupChatId, targetUserId, currentUserId) {
    await this._verifyAdmin(currentUserId, groupChatId);

    const targetMembership = await this.prisma.groupChatMember.findFirst({
      where: { groupChatId, userId: targetUserId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundError('User membership');
    }

    if (targetMembership.role === 'admin') {
      throw new ValidationError('Cannot remove another admin');
    }

    await this.prisma.groupChatMember.update({
      where: { id: targetMembership.id },
      data: { isActive: false },
    });

    await this._createSystemMessage(
      groupChatId,
      currentUserId,
      `${targetMembership.user.name} was removed from the group`,
      {
        action: 'user_removed',
        removedUserId: targetUserId,
        removedUserName: targetMembership.user.name,
        removedBy: currentUserId,
      }
    );

    return { success: true };
  }

  async _verifyAdmin(userId, groupChatId) {
    const membership = await this.prisma.groupChatMember.findFirst({
      where: { groupChatId, userId, role: 'admin', isActive: true },
    });

    if (!membership) {
      throw new ForbiddenError('Only group admins can perform this action');
    }

    return membership;
  }

  async _createSystemMessage(groupChatId, userId, content, metadata) {
    return this.prisma.chatMessage.create({
      data: {
        groupChatId,
        userId,
        content,
        messageType: 'system',
        metadata,
      },
    });
  }

  _validateGroupDetails({ name, maxMembers }, options = {}) {
    if (options.requireName && (!name || name.trim().length === 0)) {
      throw new ValidationError('Group name is required');
    }

    if (name !== undefined && name.trim().length === 0) {
      throw new ValidationError('Group name cannot be empty');
    }

    if (name && name.length > 50) {
      throw new ValidationError('Group name must be 50 characters or less');
    }

    if (maxMembers !== undefined && (maxMembers < 2 || maxMembers > 50)) {
      throw new ValidationError('Max members must be between 2 and 50');
    }
  }
}

module.exports = GroupChatService;
