const express = require("express");
const router = express.Router();
const { getAuth } = require("@clerk/express");
// Middleware to get user ID (allows both authenticated and unauthenticated requests)
const getUser = (req, next) => {
  // If user is authenticated via Clerk middleware, userId will be available
  if (getAuth(req)) {
    req.userId = getAuth(req);
  }
  next();
};

router.get("/genproducts", async (req,res)=>{
  try{
    const { prisma } = req;
    const products = await prisma.product.findMany();
    res.json({Message:"Data fetch complete !",products:products});
  }catch(err){
    res.status(403).json({errorMessage:"Got error while getting products from database",err})
  }
})

// GET /api/products - Get all products with filtering and pagination
router.get("/", getUser, async (req, res) => {
  try {
    const { prisma } = req;
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      arEnabled,
      inStock,
    } = req.query;

    // Build where clause
    const where = {
      isActive: true,
      ...(category && { category }),
      ...(brand && { brand }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && {
        price: {
          ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
          lte: parseFloat(maxPrice),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(arEnabled === "true" && { arEnabled: true }),
      ...(inStock === "true" && { inventory: { gt: 0 } }),
    };

    // Build orderBy clause
    let orderBy = {};
    if (sortBy === "price") {
      orderBy.price = sortOrder;
    } else if (sortBy === "name") {
      orderBy.name = sortOrder;
    } else if (sortBy === "popularity") {
      // For popularity sorting, we'll count interactions
      // In production, you'd want to cache this data
      orderBy.createdAt = "desc"; // Fallback to newest first
    } else {
      orderBy.createdAt = sortOrder;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Get products with interaction counts
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          _count: {
            select: {
              interactions: true,
              cartItems: true,
              orderItems: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // If user is authenticated, get their interaction history for these products, but doesn't it reduces the scope of new products ? if authenticated users are going to see less number of product then how is it going to increase sales or personalization
    let userInteractions = {};
    if (req.userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: req.userId },
      });

      if (user) {
        const interactions = await prisma.userInteraction.findMany({
          where: {
            userId: user.id,
            productId: { in: products.map((p) => p.id) },
          },
          orderBy: { createdAt: "desc" },
        });

        // Group interactions by product ID
        userInteractions = interactions.reduce((acc, interaction) => {
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
      }
    }

    // Enhance products with user interaction data
    const enhancedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      brand: product.brand,
      imageUrl: product.imageUrl,
      images: product.images,
      inventory: product.inventory,
      has3DModel: product.has3DModel,
      modelUrl: product.modelUrl,
      arEnabled: product.arEnabled,
      createdAt: product.createdAt,
      // ML-relevant metrics
      stats: {
        totalInteractions: product._count.interactions,
        inCarts: product._count.cartItems,
        totalOrders: product._count.orderItems,
      },
      // User-specific data (if authenticated)
      userInteractions: userInteractions[product.id] || [],
    }));

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      products: enhancedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        category,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

//GET route to get product details given a batch of product Ids

// GET /api/products/:id - Get single product with detailed info
router.get("/:id", getUser, async (req, res) => {
  try {
    const { prisma } = req;
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            interactions: true,
            cartItems: true,
            orderItems: true,
          },
        },
        interactions: {
          include: {
            user: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10, // Recent interactions for social proof
        },
      },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If user is authenticated, get their specific interactions with this product
    let userInteractions = [];
    if (req.userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: req.userId },
      });

      if (user) {
        userInteractions = await prisma.userInteraction.findMany({
          where: {
            userId: user.id,
            productId: id,
          },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    // Calculate interaction statistics
    const interactionStats = product.interactions.reduce(
      (stats, interaction) => {
        stats[interaction.action] = (stats[interaction.action] || 0) + 1;
        return stats;
      },
      {}
    );

    // Get similar products (same category, different product)
    const similarProducts = await prisma.product.findMany({
      where: {
        category: product.category,
        id: { not: id },
        isActive: true,
      },
      take: 6,
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        brand: true,
      },
    });

    const enhancedProduct = {
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
      // Recent interactions for social proof (anonymized)
      recentActivity: product.interactions.slice(0, 5).map((interaction) => ({
        action: interaction.action,
        createdAt: interaction.createdAt,
        userName: interaction.user.name
          ? interaction.user.name.charAt(0) + "***"
          : "Anonymous",
      })),
    };

    res.json({ product: enhancedProduct });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// GET /api/products/categories/list - Get all unique categories
router.get("/categories/list", async (req, res) => {
  try {
    const { prisma } = req;

    // Get all active products with full details grouped by category
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: true,
        features: true,
        createdAt: true
        // Add any other product fields you need
      },
      orderBy: {
        createdAt: 'desc', // Order products by creation date
      },
    });

    // Group products by category
    const categoryMap = products.reduce((acc, product) => {
      const categoryName = product.category;
      
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          products: [],
          count: 0,
        };
      }
      
      acc[categoryName].products.push(product);
      acc[categoryName].count++;
      return acc;
    }, {});

    // Convert to array and sort by count (descending)
    const categoryList = Object.values(categoryMap).sort(
      (a, b) => b.count - a.count
    );

    res.json({ 
      categories: categoryList,
      totalCategories: categoryList.length,
      totalProducts: products.length
    });
  } catch (error) {
    console.error("Error fetching categories with products:", error);
    res.status(500).json({ error: "Failed to fetch categories with products" });
  }
});

// GET /api/products/brands/list - Get all unique brands
router.get("/brands/list", async (req, res) => {
  try {
    const { prisma } = req;

    const brands = await prisma.product.groupBy({
      by: ["brand"],
      where: { isActive: true },
      _count: {
        brand: true,
      },
      orderBy: {
        _count: {
          brand: "desc",
        },
      },
    });

    const brandList = brands.map((brand) => ({
      name: brand.brand,
      count: brand._count.brand,
    }));

    res.json({ brands: brandList });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
});

// POST /api/products/:id/view - Track product view (for ML)
router.post("/:id/view", getUser, async (req, res) => {
  try {
    const { prisma } = req;
    const { id } = req.params;
    const { context } = req.body;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If user is authenticated, track the interaction
    if (req.userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: req.userId },
      });

      if (user) {
        const interaction = await prisma.userInteraction.create({
          data: {
            userId: user.id,
            productId: id,
            action: "view",
            reward: 0.1,
            context: context || {},
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking product view:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
});

// GET /api/products/popular - Get popular products based on interactions
router.get("/popular/list", async (req, res) => {
  try {
    const { prisma } = req;
    const { limit = 10 } = req.query;

    // Get products with highest interaction counts
    const popularProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            interactions: true,
            orderItems: true,
          },
        },
      },
      orderBy: [
        {
          interactions: {
            _count: "desc",
          },
        },
        {
          orderItems: {
            _count: "desc",
          },
        },
      ],
      take: parseInt(limit),
    });

    const formattedProducts = popularProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      brand: product.brand,
      imageUrl: product.imageUrl,
      stats: {
        totalInteractions: product._count.interactions,
        totalOrders: product._count.orderItems,
      },
    }));

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error("Error fetching popular products:", error);
    res.status(500).json({ error: "Failed to fetch popular products" });
  }
});

// GET /api/products/search/suggestions - Get search suggestions
router.get("/search/suggestions", async (req, res) => {
  try {
    const { prisma } = req;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get product name suggestions
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        name: true,
        brand: true,
        category: true,
      },
      take: 10,
    });

    // Create unique suggestions
    const suggestions = new Set();
    products.forEach((product) => {
      if (product.name.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(product.name);
      }
      if (product.brand.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(product.brand);
      }
      if (product.category.toLowerCase().includes(q.toLowerCase())) {
        suggestions.add(product.category);
      }
    });

    res.json({
      suggestions: Array.from(suggestions).slice(0, 8),
    });
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

module.exports = router;
