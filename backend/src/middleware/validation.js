const { ValidationError } = require('../errors/AppError');

// Validation rules
const validationRules = {
  // Product validation
  productId: (value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('Invalid product ID');
    }
    return value;
  },

  quantity: (value) => {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 1) {
      throw new ValidationError('Quantity must be a positive integer', { quantity: value });
    }
    return qty;
  },

  // Pagination validation
  page: (value) => {
    const page = parseInt(value || 1);
    if (isNaN(page) || page < 1) {
      throw new ValidationError('Page must be a positive integer', { page: value });
    }
    return page;
  },

  limit: (value) => {
    const limit = parseInt(value || 20);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100', { limit: value });
    }
    return limit;
  },

  offset: (value) => {
    const offset = parseInt(value || 0);
    if (isNaN(offset) || offset < 0) {
      throw new ValidationError('Offset must be a non-negative integer', { offset: value });
    }
    return offset;
  },

  // User interaction validation
  productIdRequired: (value) => {
    if (!value) {
      throw new ValidationError('Product ID is required', { productId: value });
    }
    return value;
  },

  actionRequired: (value) => {
    const validActions = ['view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'];
    if (!validActions.includes(value)) {
      throw new ValidationError('Invalid action', { 
        action: value,
        validActions 
      });
    }
    return value;
  },

  userIdRequired: (value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('User ID is required', { userId: value });
    }
    return value;
  },

  // Group chat validation
  groupChatIdRequired: (value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('Group chat ID is required');
    }
    return value;
  },

  messageContentRequired: (value) => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }
    if (value.length > 5000) {
      throw new ValidationError('Message content too long (max 5000 characters)');
    }
    return value.trim();
  },

  // Price validation
  price: (value) => {
    const price = parseFloat(value);
    if (isNaN(price) || price < 0) {
      throw new ValidationError('Invalid price', { price: value });
    }
    return price;
  },

  // Search validation
  searchQuery: (value) => {
    if (!value || typeof value !== 'string' || value.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }
    return value.trim().slice(0, 100);
  },
};

// Middleware to validate query parameters
const validateQuery = (rules) => {
  return (req, res, next) => {
    const errors = {};
    const validated = {};

    for (const [key, validator] of Object.entries(rules)) {
      try {
        if (req.query[key] !== undefined) {
          validated[key] = validator(req.query[key]);
        }
      } catch (err) {
        errors[key] = err.details || err.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('Query validation failed', errors));
    }

    req.validatedQuery = validated;
    next();
  };
};

// Middleware to validate body parameters
const validateBody = (rules) => {
  return (req, res, next) => {
    const errors = {};
    const validated = {};

    for (const [key, validator] of Object.entries(rules)) {
      try {
        if (req.body[key] !== undefined) {
          validated[key] = validator(req.body[key]);
        }
      } catch (err) {
        errors[key] = err.details || err.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('Body validation failed', errors));
    }

    req.validatedBody = validated;
    next();
  };
};

// Middleware to validate path parameters
const validateParams = (rules) => {
  return (req, res, next) => {
    const errors = {};
    const validated = {};

    for (const [key, validator] of Object.entries(rules)) {
      try {
        if (req.params[key] !== undefined) {
          validated[key] = validator(req.params[key]);
        }
      } catch (err) {
        errors[key] = err.details || err.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('Parameter validation failed', errors));
    }

    req.validatedParams = validated;
    next();
  };
};

module.exports = {
  validationRules,
  validateQuery,
  validateBody,
  validateParams,
};
