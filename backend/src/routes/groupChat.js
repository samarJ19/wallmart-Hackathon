const express = require('express');
const { requireAuth, clerkClient, getAuth } = require('@clerk/express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();


// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat-images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to get user from Clerk auth
const getUserFromAuth = async (req) => {
  const { userId } = getAuth(req);
  const { prisma } = req;
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      avatar: true
    }
  });
  return user;
};

// POST /api/group-chat/create - Create a new group chat
router.post('/create', requireAuth(), async (req, res) => {
  try {
    const { name, description, avatar, maxMembers = 10 } = req.body;
    const user = await getUserFromAuth(req);
    const { prisma } = req;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Group name must be 50 characters or less' });
    }

    if (maxMembers < 2 || maxMembers > 50) {
      return res.status(400).json({ error: 'Max members must be between 2 and 50' });
    }

    // Create group chat
    const groupChat = await prisma.groupChat.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        avatar: avatar || null,
        createdBy: userId,
        maxMembers: maxMembers
      }
    });

    // Add creator as admin member
    await prisma.groupChatMember.create({
      data: {
        groupChatId: groupChat.id,
        userId: userId,
        role: 'admin'
      }
    });

    // Return the created group with member info
    const groupWithMembers = await prisma.groupChat.findUnique({
      where: { id: groupChat.id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: { members: { where: { isActive: true } } }
        }
      }
    });

    res.status(201).json({
      message: 'Group chat created successfully',
      groupChat: groupWithMembers
    });

  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ error: 'Failed to create group chat' });
  }
});

// POST /api/group-chat/invite - Send invitation to join group
router.post('/invite', requireAuth(), async (req, res) => {
  try {
    const { groupChatId, userEmail } = req.body;
    const user = await getUserFromAuth(req);
    const { prisma } = req;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentUserId = user.id;

    // Validate input
    if (!groupChatId || !userEmail) {
      return res.status(400).json({ error: 'Group chat ID and user email are required' });
    }

    // Check if current user is admin of the group
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: groupChatId,
        userId: currentUserId,
        role: 'admin',
        isActive: true
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only group admins can invite users' });
    }

    // Check if group exists and get current member count
    const groupChat = await prisma.groupChat.findUnique({
      where: { id: groupChatId },
      include: {
        _count: {
          select: { members: { where: { isActive: true } } }
        }
      }
    });

    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    if (!groupChat.isActive) {
      return res.status(400).json({ error: 'Cannot invite users to inactive group' });
    }

    // Check if group is full
    if (groupChat._count.members >= groupChat.maxMembers) {
      return res.status(400).json({ error: 'Group has reached maximum member limit' });
    }

    // Find user to invite
    const userToInvite = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true, email: true }
    });

    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: groupChatId,
        userId: userToInvite.id
      }
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        return res.status(400).json({ error: 'User is already a member of this group' });
      } else {
        // Reactivate membership
        await prisma.groupChatMember.update({
          where: { id: existingMembership.id },
          data: { 
            isActive: true,
            joinedAt: new Date(),
            role: 'member'
          }
        });
      }
    } else {
      // Create new membership
      await prisma.groupChatMember.create({
        data: {
          groupChatId: groupChatId,
          userId: userToInvite.id,
          role: 'member'
        }
      });
    }

    // Create system message about user joining
    await prisma.chatMessage.create({
      data: {
        groupChatId: groupChatId,
        userId: currentUserId,
        content: `${userToInvite.name} has been added to the group`,
        messageType: 'system',
        metadata: {
          action: 'user_added',
          addedUserId: userToInvite.id,
          addedUserName: userToInvite.name
        }
      }
    });

    res.status(200).json({
      message: 'User added to group successfully',
      user: userToInvite
    });

  } catch (error) {
    console.error('Error inviting user to group:', error);
    res.status(500).json({ error: 'Failed to invite user to group' });
  }
});

// POST /api/group-chat/upload-image - Upload image to chat
router.post('/upload-image', requireAuth(), upload.single('image'), async (req, res) => {
  try {
    const { groupChatId } = req.body;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    if (!groupChatId) {
      return res.status(400).json({ error: 'Group chat ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Verify user is member of this group
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: groupChatId,
        userId: userId,
        isActive: true
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized to send messages to this group' });
    }

    // Create image message
    const imageUrl = `/uploads/chat-images/${req.file.filename}`;
    const message = await prisma.chatMessage.create({
      data: {
        groupChatId: groupChatId,
        userId: userId,
        content: '', // Empty content for image messages
        messageType: 'image',
        metadata: {
          imageUrl: imageUrl,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
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

    res.status(201).json({
      message: 'Image uploaded successfully',
      chatMessage: message,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET /api/group-chat/my-groups - Get user's group chats
router.get('/my-groups', requireAuth(), async (req, res) => {
  try {
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    const userGroups = await prisma.groupChatMember.findMany({
      where: {
        userId: userId,
        isActive: true
      },
      include: {
        groupChat: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    status: true
                  }
                }
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            },
            _count: {
              select: { 
                members: { where: { isActive: true } },
                messages: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    res.status(200).json({
      message: 'Groups retrieved successfully',
      groups: userGroups
    });

  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
});

// GET /api/group-chat/:id - Get specific group chat details
router.get('/:id', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    // Check if user is member of this group
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: id,
        userId: userId,
        isActive: true
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized to view this group' });
    }

    const groupChat = await prisma.groupChat.findUnique({
      where: { id: id },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                status: true,
                lastSeen: true
              }
            }
          }
        },
        _count: {
          select: { 
            members: { where: { isActive: true } },
            messages: true
          }
        }
      }
    });

    if (!groupChat) {
      return res.status(404).json({ error: 'Group chat not found' });
    }

    res.status(200).json({
      message: 'Group chat retrieved successfully',
      groupChat: groupChat
    });

  } catch (error) {
    console.error('Error fetching group chat:', error);
    res.status(500).json({ error: 'Failed to fetch group chat' });
  }
});

// GET /api/group-chat/:id/messages - Get messages for a specific group
router.get('/:id/messages', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    // Check if user is member of this group
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: id,
        userId: userId,
        isActive: true
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized to view messages in this group' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await prisma.chatMessage.findMany({
      where: {
        groupChatId: id,
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
      skip: skip,
      take: parseInt(limit)
    });

    // Update user's last read timestamp
    await prisma.groupChatMember.update({
      where: { id: membership.id },
      data: { lastRead: new Date() }
    });

    res.status(200).json({
      message: 'Messages retrieved successfully',
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/group-chat/:id/update - Update group chat details
router.put('/:id/update', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, avatar, maxMembers } = req.body;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    // Check if user is admin of this group
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: id,
        userId: userId,
        role: 'admin',
        isActive: true
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only group admins can update group details' });
    }

    // Validate input
    if (name && name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name cannot be empty' });
    }

    if (name && name.length > 50) {
      return res.status(400).json({ error: 'Group name must be 50 characters or less' });
    }

    if (maxMembers && (maxMembers < 2 || maxMembers > 50)) {
      return res.status(400).json({ error: 'Max members must be between 2 and 50' });
    }

    // Update group
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

    const updatedGroup = await prisma.groupChat.update({
      where: { id: id },
      data: updateData,
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: { members: { where: { isActive: true } } }
        }
      }
    });

    res.status(200).json({
      message: 'Group chat updated successfully',
      groupChat: updatedGroup
    });

  } catch (error) {
    console.error('Error updating group chat:', error);
    res.status(500).json({ error: 'Failed to update group chat' });
  }
});

// DELETE /api/group-chat/:id/leave - Leave a group chat
router.delete('/:id/leave', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = user.id;

    // Find user's membership
    const membership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: id,
        userId: userId,
        isActive: true
      }
    });

    if (!membership) {
      return res.status(400).json({ error: 'You are not a member of this group' });
    }

    // Check if user is the only admin
    const adminCount = await prisma.groupChatMember.count({
      where: {
        groupChatId: id,
        role: 'admin',
        isActive: true
      }
    });

    if (membership.role === 'admin' && adminCount === 1) {
      // Transfer admin to another member or deactivate group
      const otherMembers = await prisma.groupChatMember.findMany({
        where: {
          groupChatId: id,
          userId: { not: userId },
          isActive: true
        },
        orderBy: { joinedAt: 'asc' }
      });

      if (otherMembers.length > 0) {
        // Make the oldest member admin
        await prisma.groupChatMember.update({
          where: { id: otherMembers[0].id },
          data: { role: 'admin' }
        });

        // Create system message about admin transfer
        await prisma.chatMessage.create({
          data: {
            groupChatId: id,
            userId: userId,
            content: `${user.name} left the group. ${otherMembers[0].user?.name || 'Member'} is now the admin.`,
            messageType: 'system',
            metadata: {
              action: 'admin_transfer',
              oldAdmin: userId,
              newAdmin: otherMembers[0].userId
            }
          }
        });
      } else {
        // No other members, deactivate group
        await prisma.groupChat.update({
          where: { id: id },
          data: { isActive: false }
        });
      }
    }

    // Remove user from group
    await prisma.groupChatMember.update({
      where: { id: membership.id },
      data: { isActive: false }
    });

    // Create system message about user leaving
    if (membership.role !== 'admin' || adminCount > 1) {
      await prisma.chatMessage.create({
        data: {
          groupChatId: id,
          userId: userId,
          content: `${user.name} left the group`,
          messageType: 'system',
          metadata: {
            action: 'user_left',
            leftUserId: userId,
            leftUserName: user.name
          }
        }
      });
    }

    res.status(200).json({
      message: 'Successfully left the group'
    });

  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// DELETE /api/group-chat/:groupId/remove/:userId - Remove a user from group (admin only)
router.delete('/:groupId/remove/:userId', requireAuth(), async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const user = await getUserFromAuth(req);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentUserId = user.id;

    // Check if current user is admin
    const adminMembership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: groupId,
        userId: currentUserId,
        role: 'admin',
        isActive: true
      }
    });

    if (!adminMembership) {
      return res.status(403).json({ error: 'Only group admins can remove users' });
    }

    // Find target user's membership
    const targetMembership = await prisma.groupChatMember.findFirst({
      where: {
        groupChatId: groupId,
        userId: targetUserId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'User is not a member of this group' });
    }

    // Prevent removing another admin
    if (targetMembership.role === 'admin') {
      return res.status(400).json({ error: 'Cannot remove another admin' });
    }

    // Remove user from group
    await prisma.groupChatMember.update({
      where: { id: targetMembership.id },
      data: { isActive: false }
    });

    // Create system message
    await prisma.chatMessage.create({
      data: {
        groupChatId: groupId,
        userId: currentUserId,
        content: `${targetMembership.user.name} was removed from the group`,
        messageType: 'system',
        metadata: {
          action: 'user_removed',
          removedUserId: targetUserId,
          removedUserName: targetMembership.user.name,
          removedBy: currentUserId
        }
      }
    });

    res.status(200).json({
      message: 'User removed from group successfully'
    });

  } catch (error) {
    console.error('Error removing user from group:', error);
    res.status(500).json({ error: 'Failed to remove user from group' });
  }
});

module.exports = router;