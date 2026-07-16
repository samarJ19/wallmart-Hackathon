const { Server } = require("socket.io");

const { socketAuth } = require("../middleware/socketAuth");
const logger = require("../utils/logger");
const registerGroupChatHandlers = require("./groupChatHandlers");

const createSocketServer = (server) => {
  return new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });
};

const registerSocketHandlers = ({ io, services }) => {
  const socketService = services.socket;

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    try {
      await socketService.registerUserConnection(userId, socket.id, user);

      const userGroups = user.groupChatMembers || [];
      for (const membership of userGroups) {
        socketService.joinGroupRoom(socket, membership.groupChatId);
      }

      const groupIds = userGroups.map((membership) => membership.groupChatId);
      await socketService.broadcastUserStatusToGroups(userId, groupIds, "online");

      registerGroupChatHandlers({ io, socket, services });
    } catch (error) {
      logger.error("Error in socket connection", error);
      socket.emit("error", { message: "Connection failed" });
      socket.disconnect();
    }
  });
};

module.exports = {
  createSocketServer,
  registerSocketHandlers,
};
