const { verifyToken } = require('@clerk/backend');
const { PrismaClient } = require('@prisma/client');

// Socket.IO Authentication Middleware using @clerk/backend
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    const prisma = new PrismaClient();
    // Verify the session token using Clerk's backend SDK
    const sessionClaims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      // Optional: specify authorized parties (your frontend domains)
      authorizedParties: [process.env.CLERK_AUTHORIZED_PARTY || 'localhost:5173']
    });

    if (!sessionClaims || !sessionClaims.sub) {
      return next(new Error('Invalid session token'));
    }

    // Extract user ID from the session claims
    const clerkUserId = sessionClaims.sub;

    // Get user from database using Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
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

    // Attach user info to socket
    socket.userId = user.id;
    socket.user = user;
    socket.clerkUserId = clerkUserId;
    socket.sessionClaims = sessionClaims; // Store the session claims for later use
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

module.exports = { socketAuth };