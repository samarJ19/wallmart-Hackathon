const axios = require('axios');
const logger = require('../utils/logger');
const { ExternalServiceError } = require('../errors/AppError');
const { retryAsync } = require('../utils/helpers');

class RecommendationService {
  constructor(prisma) {
    this.prisma = prisma;
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.maxRetries = 3;
  }

  // Get recommendations for user
  async getRecommendations(userId) {
    try {
      // Check interaction count to determine if cold start
      const interactionCount = await this.prisma.userInteraction.count({
        where: { userId },
      });

      const endpoint = interactionCount < 3 
        ? `${this.mlServiceUrl}/recommend/${userId}/cold_start`
        : `${this.mlServiceUrl}/recommend/${userId}`;

      logger.debug('Fetching recommendations', { userId, endpoint });

      const response = await retryAsync(
        () => axios.get(endpoint, { timeout: 5000 }),
        this.maxRetries,
        1000
      );

      if (response.data && response.data.recommendations) {
        logger.info('Recommendations fetched successfully', { userId });
        return response.data.recommendations;
      }

      throw new ExternalServiceError('ML', 'Invalid response format');
    } catch (error) {
      logger.warn('ML service failed, falling back to popular products', error.message);
      return this._getFallbackRecommendations();
    }
  }

  // Send interaction feedback to ML service
  async recordFeedback(userId, productId, action, reward) {
    try {
      await retryAsync(
        () => axios.post(
          `${this.mlServiceUrl}/feedback/record`,
          { user_id: userId, product_id: productId, action, reward },
          { headers: { 'Content-Type': 'application/json' }, timeout: 3000 }
        ),
        2,
        500
      );

      logger.debug('Feedback sent to ML service', { userId, productId, action });
    } catch (error) {
      logger.warn('Failed to send feedback to ML service', error.message);
      // Don't throw - this is a non-critical operation
    }
  }

  // Get fallback recommendations (popular products)
  async _getFallbackRecommendations() {
    try {
      const popularProducts = await this.prisma.product.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { interactions: true, orderItems: true },
          },
        },
        orderBy: [
          { interactions: { _count: 'desc' } },
          { orderItems: { _count: 'desc' } },
        ],
        take: 10,
      });

      logger.debug('Using popular products as fallback recommendations');

      return popularProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        brand: p.brand,
        imageUrl: p.imageUrl,
        arEnabled: p.arEnabled,
      }));
    } catch (error) {
      logger.error('Fallback recommendation retrieval failed', error);
      return [];
    }
  }
}

module.exports = RecommendationService;
