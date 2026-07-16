const express = require("express");
const { getAuth, requireAuth } = require("@clerk/express");

const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

const getClerkUserId = (req) => getAuth(req).userId;

router.post(
  "/sync",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await req.services.user.syncUser(getClerkUserId(req));
    res.json({ user });
  })
);

router.get(
  "/profile",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await req.services.user.getUser(getClerkUserId(req), {
      includeInteractions: true,
      includeOrders: true,
    });

    res.json({ user });
  })
);

router.put(
  "/profile",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await req.services.user.updatePreferences(
      getClerkUserId(req),
      req.body.preferences || req.body
    );

    res.json({ user });
  })
);

router.put(
  "/preferences",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await req.services.user.updatePreferences(
      getClerkUserId(req),
      req.body.preferences || req.body
    );

    res.json({ success: true, preferences: user.preferences });
  })
);

router.post(
  "/interactions",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { productId, action, context = {} } = req.body;
    const clerkId = getClerkUserId(req);
    const interaction = await req.services.user.trackInteraction(
      clerkId,
      productId,
      action,
      context
    );

    req.services.recommendation
      .recordFeedback(interaction.userId, productId, action, interaction.reward)
      .catch(() => {});

    res.status(201).json({ interaction });
  })
);

router.get(
  "/interactions/all",
  asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const interactions = await req.prisma.userInteraction.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            category: true,
            description: true,
            brand: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ interactions });
  })
);

router.get(
  "/interactions",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const user = await req.services.user.getUser(getClerkUserId(req));
    const interactions = await req.prisma.userInteraction.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
            category: true,
            description: true,
            brand: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ interactions });
  })
);

router.get(
  "/interactions/:userId",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const requestedUserId = req.params.userId;
    const authUserId = getClerkUserId(req);
    const user = await req.services.user.getUser(requestedUserId === authUserId ? authUserId : requestedUserId);

    const interactions = await req.prisma.userInteraction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ count: interactions.length, interactions });
  })
);

router.get(
  "/insights",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const insights = await req.services.user.calculateInsights(getClerkUserId(req));
    res.json({ insights });
  })
);

module.exports = router;
