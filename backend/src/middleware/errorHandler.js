const logger = require('../utils/logger');
const { AppError } = require('../errors/AppError');

// Express error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error('Request error:', err);

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      errorCode: err.errorCode,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(err.details && { details: err.details }),
      timestamp: err.timestamp,
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      status: 'error',
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid data provided',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        errorCode: 'NOT_FOUND',
        message: 'Resource not found',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle unknown errors
  res.status(err.statusCode || 500).json({
    status: 'error',
    errorCode: err.errorCode || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
