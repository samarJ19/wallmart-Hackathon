const logger = require("../utils/logger");

const registerGroupChatHandlers = ({ io, socket, services }) => {
  const { groupChat, socket: socketService } = services;
  const userId = socket.userId;
  const user = socket.user;
  const userGroups = user.groupChatMembers || [];

  socket.on("join_group", async (data) => {
    try {
      const { groupChatId } = data;

      await groupChat.verifyGroupMembership(userId, groupChatId);
      socketService.joinGroupRoom(socket, groupChatId);

      const recentMessages = await groupChat.getRecentMessages(groupChatId);
      socket.emit("recent_messages", { groupChatId, messages: recentMessages });

      socketService.emitToGroup(groupChatId, "user_joined_group", {
        userId,
        name: user.name,
        groupChatId,
      });
    } catch (error) {
      logger.error("Error joining group", error);
      socket.emit("error", { message: error.message || "Failed to join group" });
    }
  });

  socket.on("send_message", async (data) => {
    try {
      const { groupChatId, content, messageType = "text", metadata = null } = data;

      await groupChat.verifyGroupMembership(userId, groupChatId);
      const message = await groupChat.createMessage(
        groupChatId,
        userId,
        content,
        messageType,
        metadata
      );

      socketService.emitToGroup(groupChatId, "new_message", {
        message,
        groupChatId,
      });
    } catch (error) {
      logger.error("Error sending message", error);
      socket.emit("error", { message: error.message || "Failed to send message" });
    }
  });

  socket.on("typing_start", (data) => {
    try {
      const { groupChatId } = data;
      socketService.emitToGroup(groupChatId, "user_typing", {
        userId,
        name: user.name,
        groupChatId,
      });
    } catch (error) {
      logger.warn("Error in typing_start", error);
    }
  });

  socket.on("typing_stop", (data) => {
    try {
      const { groupChatId } = data;
      socketService.emitToGroup(groupChatId, "user_stopped_typing", {
        userId,
        groupChatId,
      });
    } catch (error) {
      logger.warn("Error in typing_stop", error);
    }
  });

  socket.on("start-cart-sharing", async (data) => {
    try {
      const { groupId, cartItems } = data;
      const eventData = {
        userId,
        username: user.name,
        cartItems,
      };

      socket.to(`group_${groupId}`).emit("cart-share-started", eventData);
      socket.emit("cart-share-started", eventData);
    } catch (error) {
      logger.error("Error in start-cart-sharing", error);
      socket.emit("error", { message: "Failed to share cart" });
    }
  });

  socket.on("update-shared-cart", (data) => {
    try {
      const { groupId, cartItems } = data;
      socket.to(`group_${groupId}`).emit("cart-share-updated", {
        userId,
        cartItems,
      });
    } catch (error) {
      logger.warn("Error in update-shared-cart", error);
    }
  });

  socket.on("stop-cart-sharing", (data) => {
    try {
      const { groupId } = data;
      socket.to(`group_${groupId}`).emit("cart-share-stopped", { userId });
    } catch (error) {
      logger.warn("Error in stop-cart-sharing", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      await socketService.unregisterUserConnection(socket.id, userId);

      const groupIds = userGroups.map((membership) => membership.groupChatId);
      await socketService.broadcastUserStatusToGroups(userId, groupIds, "offline");
    } catch (error) {
      logger.error("Error handling disconnect", error);
    }
  });

  socket.on("error", (error) => {
    logger.error("Socket error", error);
  });
};

module.exports = registerGroupChatHandlers;
