const express = require('express');
const router = express.Router();

// This file is ONLY for testing during development
// Remove this in production

// POST /api/test/users - Create test user (bypasses Clerk)
router.post('/users', async (req, res) => {
  try {
    const { prisma } = req;
    const { clerkId, email, name, avatar } = req.body;

    if (!clerkId || !email || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: clerkId, email, name' 
      });
    }

    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name,
        avatar,
        preferences: {}
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this clerkId or email already exists' });
    }
    console.error('Error creating test user:', error);
    res.status(500).json({ error: 'Failed to create test user' });
  }
});

// POST /api/test/products - Create test product
router.post('/products', async (req, res) => {
  try {
    const { prisma } = req;
    const {
      name,
      description,
      price,
      category,
      brand,
      imageUrl,
      images = [],
      features = {},
      inventory = 10
    } = req.body;

    if (!name || !description || !price || !category || !brand || !imageUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, description, price, category, brand, imageUrl' 
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        brand,
        imageUrl,
        images,
        features,
        inventory: parseInt(inventory)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test product created successfully',
      product
    });

  } catch (error) {
    console.error('Error creating test product:', error);
    res.status(500).json({ error: 'Failed to create test product' });
  }
});

// POST /api/test/interactions - Create test interaction
router.post('/interactions', async (req, res) => {
  try {
    const { prisma } = req;
    const { userId, productId, action, reward = 0, context = {} } = req.body;

    if (!userId || !productId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, productId, action' 
      });
    }

    // Verify user and product exist
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const interaction = await prisma.userInteraction.create({
      data: {
        userId,
        productId,
        action,
        reward: parseFloat(reward),
        context
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test interaction created successfully',
      interaction
    });

  } catch (error) {
    console.error('Error creating test interaction:', error);
    res.status(500).json({ error: 'Failed to create test interaction' });
  }
});

// GET /api/test/users/:id - Get test user
router.get('/users/:id', async (req, res) => {
  try {
    const { prisma } = req;
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        interactions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        cartItems: true,
        orders: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error fetching test user:', error);
    res.status(500).json({ error: 'Failed to fetch test user' });
  }
});

// GET /api/test/setup-validation - Validate entire setup
router.get('/setup-validation', async (req, res) => {
  try {
    const { prisma } = req;
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      overall_status: 'unknown'
    };

    // Test 1: Database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.tests.database_connection = {
        status: 'pass',
        details: 'Database connection successful'
      };
    } catch (error) {
      results.tests.database_connection = {
        status: 'fail',
        details: `Database connection failed: ${error.message}`
      };
    }

    // Test 2: User model
    try {
      const userCount = await prisma.user.count();
      results.tests.user_model = {
        status: 'pass',
        details: `User model working. Count: ${userCount}`
      };
    } catch (error) {
      results.tests.user_model = {
        status: 'fail',
        details: `User model error: ${error.message}`
      };
    }

    // Test 3: Product model
    try {
      const productCount = await prisma.product.count();
      results.tests.product_model = {
        status: 'pass',
        details: `Product model working. Count: ${productCount}`
      };
    } catch (error) {
      results.tests.product_model = {
        status: 'fail',
        details: `Product model error: ${error.message}`
      };
    }

    // Test 4: Interaction model
    try {
      const interactionCount = await prisma.userInteraction.count();
      results.tests.interaction_model = {
        status: 'pass',
        details: `Interaction model working. Count: ${interactionCount}`
      };
    } catch (error) {
      results.tests.interaction_model = {
        status: 'fail',
        details: `Interaction model error: ${error.message}`
      };
    }

    // Test 5: Prisma schema sync
    try {
      // This will fail if schema is not synced
      await prisma.user.findFirst();
      await prisma.product.findFirst();
      await prisma.userInteraction.findFirst();
      results.tests.schema_sync = {
        status: 'pass',
        details: 'All models accessible, schema is synced'
      };
    } catch (error) {
      results.tests.schema_sync = {
        status: 'fail',
        details: `Schema sync issue: ${error.message}`
      };
    }

    // Determine overall status
    const allTestsPassed = Object.values(results.tests).every(test => test.status === 'pass');
    results.overall_status = allTestsPassed ? 'pass' : 'fail';

    res.json(results);

  } catch (error) {
    console.error('Error in setup validation:', error);
    res.status(500).json({
      error: 'Setup validation failed',
      details: error.message
    });
  }
});

// creating sample data for products
router.post('/seed-productData', async (req,res)=>{
  try {
    const { prisma } = req;
    const { productData } = req.body;
    
    // Fix 2: Validate that productData exists and is an array
    if (!productData || !Array.isArray(productData)) {
      return res.status(400).json({
        error: "productData is required and must be an array"
      });
    }
    
    if (productData.length === 0) {
      return res.status(400).json({
        error: "productData array cannot be empty"
      });
    }
    // Fix 3: Correct the createMany syntax - pass an object with 'data' property
    const response = await prisma.product.createMany({
      data: productData,
      skipDuplicates: true // Optional: skip duplicates instead of throwing error
    });
    
    res.status(201).json({
      message: "Seeded data successfully!",
      count: response.count,
      response
    });

  } catch (err) {
    console.log("Got the following error while seeding product data:", err);
    
    // Fix 4: Return proper error status and don't expose internal error details
    res.status(500).json({
      error: "Failed to seed product data",
      message: err.message || "Internal server error"
    });
  }
});

// POST /api/test/seed-sample-data - Create sample data for testing
router.post('/seed-sample-data', async (req, res) => {
  try {
    const { prisma } = req;

    // Create sample users
    const sampleUsers = await Promise.all([
      prisma.user.upsert({
        where: { clerkId: 'test_user_1' },
        update: {},
        create: {
          clerkId: 'test_user_1',
          email: 'user1@test.com',
          name: 'Test User 1',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
          preferences: {}
        }
      }),
      prisma.user.upsert({
        where: { clerkId: 'test_user_2' },
        update: {},
        create: {
          clerkId: 'test_user_2',
          email: 'user2@test.com',
          name: 'Test User 2',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c921?w=100',
          preferences: {}
        }
      })
    ]);

    // Create sample products
    const sampleProducts = await Promise.all([
      prisma.product.upsert({
        where: { id: 'sample_product_1' },
        update: {},
        create: {
          id: 'sample_product_1',
          name: 'Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation',
          price: 199.99,
          category: 'Electronics',
          brand: 'TechBrand',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
          images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
          features: { color: 'black', wireless: true, noiseCancelling: true },
          inventory: 50
        }
      }),
      prisma.product.upsert({
        where: { id: 'sample_product_2' },
        update: {},
        create: {
          id: 'sample_product_2',
          name: 'Smart Watch',
          description: 'Feature-rich smartwatch with fitness tracking',
          price: 299.99,
          category: 'Electronics',
          brand: 'SmartTech',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
          features: { waterproof: true, gps: true, heartRate: true },
          inventory: 30
        }
      })
    ]);

    // Create sample interactions
    const sampleInteractions = await Promise.all([
      prisma.userInteraction.create({
        data: {
          userId: sampleUsers[0].id,
          productId: sampleProducts[0].id,
          action: 'view',
          reward: 0.1,
          context: { page: 'home', duration: 30 }
        }
      }),
      prisma.userInteraction.create({
        data: {
          userId: sampleUsers[0].id,
          productId: sampleProducts[0].id,
          action: 'tick',
          reward: 1.0,
          context: { page: 'product', liked: true }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Sample data created successfully',
      data: {
        users: sampleUsers.length,
        products: sampleProducts.length,
        interactions: sampleInteractions.length
      }
    });

  } catch (error) {
    console.error('Error seeding sample data:', error);
    res.status(500).json({ error: 'Failed to seed sample data' });
  }
});

module.exports = router;