const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
  },

  error: (message, error = null) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error('Error Details:', {
        message: error.message,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        ...(isDevelopment && { stack: error.stack }),
      });
    }
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
  },

  debug: (message, data = {}) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
    }
  },

  logRequest: (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  },
};

module.exports = logger;
