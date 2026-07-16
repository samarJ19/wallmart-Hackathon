const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../errors/AppError');
const { clerkClient } = require('@clerk/express');

class UserService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Get user by Clerk ID or database ID
  async getUser(clerkId, options = {}) {
    const where = { clerkId };
    
    const user = await this.prisma.user.findUnique({
      where,
      include: {
        interactions: options.includeInteractions ? { orderBy: { createdAt: 'desc' }, take: 50 } : undefined,
        orders: options.includeOrders ? { include: { orderItems: { include: { product: true } } }, orderBy: { createdAt: 'desc' } } : undefined,
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  // Get user by database ID
  async getUserById(userId) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  // Sync user from Clerk
  async syncUser(clerkId) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);

      const user = await this.prisma.user.upsert({
        where: { clerkId },
        update: {
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          avatar: clerkUser.imageUrl,
          updatedAt: new Date(),
        },
        create: {
          clerkId,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          avatar: clerkUser.imageUrl,
          preferences: {},
        },
      });

      logger.info('User synced successfully', { userId: user.id, clerkId });
      return user;
    } catch (error) {
      logger.error('Error syncing user from Clerk', error);
      throw error;
    }
  }

  // Track user interaction
  async trackInteraction(clerkId, productId, action, context = {}) {
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const validActions = ['view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'];
    if (!validActions.includes(action)) {
      throw new ValidationError('Invalid action', { action, validActions });
    }

    const user = await this.getUser(clerkId);
    const reward = this._getRewardForAction(action);

    const interaction = await this.prisma.userInteraction.create({
      data: {
        userId: user.id,
        productId,
        action,
        reward,
        context,
      },
    });

    // Update user preferences for significant actions
    if (['tick', 'cart_add', 'purchase'].includes(action)) {
      await this._updateUserPreferences(user.id, productId, action);
    }

    logger.debug('Interaction tracked', { userId: user.id, action, productId });
    return interaction;
  }

  // Update user preferences
  async updatePreferences(clerkId, preferences) {
    const user = await this.getUser(clerkId);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: {
          ...user.preferences,
          ...preferences,
        },
      },
    });

    return updatedUser;
  }

  // Calculate user insights
  async calculateInsights(clerkId) {
    const user = await this.getUser(clerkId);
    
    const interactions = await this.prisma.userInteraction.findMany({
      where: { userId: user.id },
      include: { product: true },
    });

    if (interactions.length === 0) {
      return {
        favoriteCategories: [],
        averagePrice: 0,
        preferredBrands: [],
        totalReward: 0,
      };
    }

    // Calculate category preferences
    const categoryCount = {};
    interactions.forEach((interaction) => {
      const category = interaction.product.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const favoriteCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, count]) => ({ category, count }));

    // Calculate average price
    const prices = interactions.map((i) => i.product.price);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // Calculate preferred brands
    const brandCount = {};
    interactions.forEach((interaction) => {
      const brand = interaction.product.brand;
      brandCount[brand] = (brandCount[brand] || 0) + 1;
    });

    const preferredBrands = Object.entries(brandCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([brand, count]) => ({ brand, count }));

    // Calculate total reward
    const totalReward = interactions.reduce((sum, interaction) => sum + interaction.reward, 0);

    return {
      favoriteCategories,
      averagePrice: Math.round(averagePrice * 100) / 100,
      preferredBrands,
      totalReward,
    };
  }

  // Private helper: Get reward for action
  _getRewardForAction(action) {
    const rewardMap = {
      view: 0.1,
      tick: 1,
      cross: -1,
      cart_add: 2,
      purchase: 5,
      ar_view: 1.5,
    };
    return rewardMap[action] || 0;
  }

  // Private helper: Update user preferences based on interaction
  async _updateUserPreferences(userId, productId, action) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) return;

      const user = await this.getUserById(userId);
      const currentPrefs = user.preferences || {};

      // Update category preferences
      const categories = currentPrefs.categories || {};
      const category = product.category;

      if (action === 'tick' || action === 'cart_add') {
        categories[category] = (categories[category] || 0) + 1;
      } else if (action === 'purchase') {
        categories[category] = (categories[category] || 0) + 3;
      }

      // Update brand preferences
      const brands = currentPrefs.brands || {};
      const brand = product.brand;

      if (action === 'tick' || action === 'cart_add') {
        brands[brand] = (brands[brand] || 0) + 1;
      } else if (action === 'purchase') {
        brands[brand] = (brands[brand] || 0) + 3;
      }

      // Update price range preferences
      const priceRanges = currentPrefs.priceRanges || {};
      const priceRange = this._getPriceRange(product.price);

      if (action === 'tick' || action === 'cart_add' || action === 'purchase') {
        priceRanges[priceRange] = (priceRanges[priceRange] || 0) + 1;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...currentPrefs,
            categories,
            brands,
            priceRanges,
            lastUpdated: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.warn('Failed to update user preferences', error);
    }
  }

  // Private helper: Get price range
  _getPriceRange(price) {
    if (price < 50) return 'under-50';
    if (price < 100) return '50-100';
    if (price < 200) return '100-200';
    if (price < 500) return '200-500';
    return 'over-500';
  }
}

module.exports = UserService;
