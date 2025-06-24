const express = require('express');
const { requireAuth, clerkClient, getAuth } = require('@clerk/express');
const router = express.Router();

// GET /api/users/profile - Get user profile with ML insights
router.get('/profile', requireAuth(), async (req, res) => {
  try {
    const { prisma } = req;
    const userId = getAuth(req);

    // Get user from database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        orders: {
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate user insights from interactions
    const insights = await calculateUserInsights(prisma, user.id);

    res.json({
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        preferences: user.preferences,
        createdAt: user.createdAt
      },
      insights,
      stats: {
        totalInteractions: user.interactions.length,
        totalOrders: user.orders.length,
        totalSpent: user.orders.reduce((sum, order) => sum + order.total, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// POST /api/users/sync - Sync user from Clerk (called after signup/signin)
router.post('/sync', requireAuth(), async (req, res) => {
  try {
    const { prisma } = req;
    const userId = getAuth(req);

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    
    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        avatar: clerkUser.imageUrl,
        updatedAt: new Date()
      },
      create: {
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        avatar: clerkUser.imageUrl,
        preferences: {}
      }
    });

    res.json({ 
      success: true, 
      user: {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// POST /api/users/interactions - Track user interactions for ML
router.post('/interactions', requireAuth(), async (req, res) => {
  try {
    const { prisma, io } = req;
    const userId = getAuth(req);
    const { productId, action, context } = req.body;

    if (!productId || !action) {
      return res.status(400).json({ error: 'productId and action are required' });
    }

    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate reward based on action
    const reward = getRewardForAction(action);

    // Store interaction upsert a better option ?
    const interaction = await prisma.userInteraction.create({
      data: {
        userId: user.id,
        productId,
        action,
        reward,
        context: context || {}
      }
    });

    // Emit real-time update for ML service
    io.emit('user-interaction', {
      userId: user.id,
      productId,
      action,
      reward,
      context,
      timestamp: interaction.createdAt
    });

    // Update user preferences if it's a significant action
    if (['tick', 'cart_add', 'purchase'].includes(action)) {
      await updateUserPreferences(prisma, user.id, productId, action);
    }

    res.json({ 
      success: true, 
      interaction: {
        id: interaction.id,
        action: interaction.action,
        reward: interaction.reward,
        createdAt: interaction.createdAt
      }
    });

  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// PUT /api/users/preferences - Update user preferences
router.put('/preferences', requireAuth(), async (req, res) => {
  try {
    const { prisma } = req;
    const userId = getAuth(req);
    const { preferences } = req.body;

    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        preferences: {
          ...user.preferences,
          ...preferences
        }
      }
    });

    res.json({ 
      success: true, 
      preferences: updatedUser.preferences 
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// GET /api/users/interactions - Get user interaction history
router.get('/interactions', requireAuth(), async (req, res) => {
  try {
    const { prisma } = req;
    const userId = getAuth(req);
    const { limit = 50, offset = 0 } = req.query;

    // Get user's database ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const interactions = await prisma.userInteraction.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    res.json({ interactions });

  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

// Helper function to calculate rewards
function getRewardForAction(action) {
  const rewardMap = {
    'view': 0.1,
    'tick': 1,
    'cross': -1,
    'cart_add': 2,
    'purchase': 5,
    'ar_view': 1.5
  };
  return rewardMap[action] || 0;
}

// Helper function to calculate user insights
async function calculateUserInsights(prisma, userId) {
  const interactions = await prisma.userInteraction.findMany({
    where: { userId },
    include: {
      product: true
    }
  });

  if (interactions.length === 0) {
    return {
      favoriteCategories: [],
      averagePrice: 0,
      preferredBrands: [],
      totalReward: 0
    };
  }

  // Calculate category preferences
  const categoryCount = {};
  interactions.forEach(interaction => {
    const category = interaction.product.category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });

  const favoriteCategories = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));

  // Calculate average price of interacted products
  const prices = interactions.map(i => i.product.price);
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  // Calculate preferred brands
  const brandCount = {};
  interactions.forEach(interaction => {
    const brand = interaction.product.brand;
    brandCount[brand] = (brandCount[brand] || 0) + 1;
  });

  const preferredBrands = Object.entries(brandCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([brand, count]) => ({ brand, count }));

  // Calculate total reward
  const totalReward = interactions.reduce((sum, interaction) => sum + interaction.reward, 0);

  return {
    favoriteCategories,
    averagePrice: Math.round(averagePrice * 100) / 100,
    preferredBrands,
    totalReward
  };
}

// Helper function to update user preferences based on interactions
async function updateUserPreferences(prisma, userId, productId, action) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

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
    const priceRange = getPriceRange(product.price);
    
    if (action === 'tick' || action === 'cart_add' || action === 'purchase') {
      priceRanges[priceRange] = (priceRanges[priceRange] || 0) + 1;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...currentPrefs,
          categories,
          brands,
          priceRanges,
          lastUpdated: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}

function getPriceRange(price) {
  if (price < 50) return 'under-50';
  if (price < 100) return '50-100';
  if (price < 200) return '100-200';
  if (price < 500) return '200-500';
  return 'over-500';
}

module.exports = router;