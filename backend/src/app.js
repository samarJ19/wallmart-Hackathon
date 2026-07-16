const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");

const registerRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const createApp = ({ prisma, io, services, socketService }) => {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(clerkMiddleware());
  app.use(logger.logRequest);

  app.use((req, res, next) => {
    req.prisma = prisma;
    req.io = io;
    req.services = services;
    req.socketService = socketService;
    next();
  });

  registerRoutes(app);

  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      activeUsers: socketService.getActiveUserCount(),
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      status: "error",
      errorCode: "NOT_FOUND",
      message: "Route not found",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
