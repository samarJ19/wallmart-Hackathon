const { createServer } = require("http");
require("dotenv").config();

const createApp = require("./app");
const prisma = require("./config/prisma");
const { createServices } = require("./services");
const { createSocketServer, registerSocketHandlers } = require("./sockets");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const server = createServer();
const io = createSocketServer(server);
const services = createServices({ prisma, io });
const socketService = services.socket;
const app = createApp({ prisma, io, services, socketService });

server.on("request", app);
registerSocketHandlers({ io, services });

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    io.close();
    await prisma.$disconnect();
    logger.info("Resources cleaned up successfully");
  } catch (error) {
    logger.error("Error during shutdown", error);
  }

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(PORT, HOST, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info("Database connected");
  logger.info("Socket.IO initialized");
});

module.exports = { app, server, prisma, io, services };
