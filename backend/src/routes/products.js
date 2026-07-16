const express = require("express");
const router = express.Router();
const { getAuth, requireAuth } = require("@clerk/express");
const { asyncHandler } = require("../utils/helpers");
const { validateQuery, validateParams, validationRules } = require("../middleware/validation");
const logger = require("../utils/logger");

// GET /api/products - Get all products
router.get(
  "/",
  requireAuth(),
  validateQuery({
    page: validationRules.page,
    limit: validationRules.limit,
  }),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, category, brand, minPrice, maxPrice, search, sortBy, sortOrder, arEnabled, inStock } = {
      ...req.query,
      ...req.validatedQuery,
    };

    const result = await req.services.product.getAllProducts({
      page,
      limit,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy,
      sortOrder,
      arEnabled,
      inStock,
    });

    const { userId } = getAuth(req);
    if (userId) {
      const user = await req.prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (user) {
        const interactions = await req.prisma.userInteraction.findMany({
          where: {
            userId: user.id,
            productId: { in: result.products.map((p) => p.id) },
          },
        });

        const userInteractions = interactions.reduce((acc, interaction) => {
          if (!acc[interaction.productId]) {
            acc[interaction.productId] = [];
          }
          acc[interaction.productId].push({
            action: interaction.action,
            createdAt: interaction.createdAt,
            reward: interaction.reward,
          });
          return acc;
        }, {});

        result.products = result.products.map((p) => ({
          ...p,
          userInteractions: userInteractions[p.id] || [],
        }));
      }
    }

    res.json(result);
  })
);

// GET /api/products/any/:id - Get product (no auth required)
router.get(
  "/any/:id",
  validateParams({ id: validationRules.productId }),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const product = await req.services.product.getProduct(id);

    const similarProducts = await req.services.product.getSimilarProducts(id);

    const interactionStats = product.interactions.reduce(
      (stats, interaction) => {
        stats[interaction.action] = (stats[interaction.action] || 0) + 1;
        return stats;
      },
      {}
    );

    res.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        brand: product.brand,
        imageUrl: product.imageUrl,
        images: product.images,
        features: product.features,
        inventory: product.inventory,
        has3DModel: product.has3DModel,
        modelUrl: product.modelUrl,
        arEnabled: product.arEnabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stats: {
          totalInteractions: product._count.interactions,
          inCarts: product._count.cartItems,
          totalOrders: product._count.orderItems,
          interactionBreakdown: interactionStats,
        },
        similarProducts,
        recentActivity: product.interactions.slice(0, 5).map((interaction) => ({
          action: interaction.action,
          createdAt: interaction.createdAt,
          userName: interaction.user.name ? interaction.user.name.charAt(0) + "***" : "Anonymous",
        })),
      },
    });
  })
);

// GET /api/products/:id - Get product (auth required)
router.get(
  "/:id",
  requireAuth(),
  validateParams({ id: validationRules.productId }),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { userId } = getAuth(req);

    const product = await req.services.product.getProduct(id);

    let userInteractions = [];
    const user = await req.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user) {
      userInteractions = await req.prisma.userInteraction.findMany({
        where: { userId: user.id, productId: id },
        orderBy: { createdAt: "desc" },
      });
    }

    const similarProducts = await req.services.product.getSimilarProducts(id);

    const interactionStats = product.interactions.reduce(
      (stats, interaction) => {
        stats[interaction.action] = (stats[interaction.action] || 0) + 1;
        return stats;
      },
      {}
    );

    res.json({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        brand: product.brand,
        imageUrl: product.imageUrl,
        images: product.images,
        features: product.features,
        inventory: product.inventory,
        has3DModel: product.has3DModel,
        modelUrl: product.modelUrl,
        arEnabled: product.arEnabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stats: {
          totalInteractions: product._count.interactions,
          inCarts: product._count.cartItems,
          totalOrders: product._count.orderItems,
          interactionBreakdown: interactionStats,
        },
        userInteractions,
        similarProducts,
        recentActivity: product.interactions.slice(0, 5).map((interaction) => ({
          action: interaction.action,
          createdAt: interaction.createdAt,
          userName: interaction.user.name ? interaction.user.name.charAt(0) + "***" : "Anonymous",
        })),
      },
    });
  })
);

// GET /api/products/categories/list - Get categories
router.get(
  "/categories/list",
  asyncHandler(async (req, res) => {
    const result = await req.services.product.getCategories();
    res.json(result);
  })
);

// GET /api/products/brands/list - Get brands
router.get(
  "/brands/list",
  asyncHandler(async (req, res) => {
    const brands = await req.services.product.getBrands();
    res.json({ brands });
  })
);

// POST /api/products/:id/view - Track view
router.post(
  "/:id/view",
  requireAuth(),
  validateParams({ id: validationRules.productId }),
  asyncHandler(async (req, res) => {
    const { id } = req.validatedParams;
    const { userId } = getAuth(req);
    const { context } = req.body;

    await req.services.product.recordView(id);

    const user = await req.prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user) {
      await req.services.user.trackInteraction(userId, id, "view", context);

      req.services.recommendation.recordFeedback(user.id, id, "view", 0.1).catch(err => {
        logger.warn('Failed to record feedback to ML service', err);
      });
    }

    res.json({ success: true });
  })
);

// GET /api/products/popular/list - Get popular products
router.get(
  "/popular/list",
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const products = await req.services.product.getPopularProducts(limit);
    res.json({ products });
  })
);

// GET /api/products/search/suggestions - Get search suggestions
router.get(
  "/search/suggestions",
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    const suggestions = await req.services.product.searchProducts(q);
    res.json({ suggestions });
  })
);

module.exports = router;
