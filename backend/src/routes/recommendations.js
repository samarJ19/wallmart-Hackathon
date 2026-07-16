const express = require("express");
const { getAuth, requireAuth } = require("@clerk/express");

const { asyncHandler } = require("../utils/helpers");

const router = express.Router();

router.get(
  "/getRec",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    const user = await req.services.user.getUser(userId);
    const recommendations = await req.services.recommendation.getRecommendations(user.id);

    res.json({ products: recommendations });
  })
);

module.exports = router;
