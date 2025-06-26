Change bandit.py according to users route and database schema

  The bandit recommendation system needs to query the database (which it can by hitting the backend on the route // GET /api/users/interactions - Get user interaction history. This route share user interaction which have all kind of details about product so after computing the best recommendation , we can directly give a list of actual products not just productIds eliminating the need for INTEGRATION WITH PRODUCT CATALOG) and I think the version that I have  does not account for that, also I think it has few other bugs like select_arm function .  Also Implement product scoring system - Add methods: select_products(), update_rewards() - Store arm (product) statistics in memory

The get route: router.get('/interactions', requireAuth(), async (req, res) => {
  try {
    const { prisma } = req;
    const { userId } = getAuth(req);
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

and change the main.py according to the changes in the bandit.py