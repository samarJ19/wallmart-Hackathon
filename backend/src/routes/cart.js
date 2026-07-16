const express = require("express");
const { requireAuth, getAuth } = require("@clerk/express");

const { asyncHandler } = require("../utils/helpers");
const { validateBody, validateParams, validationRules } = require("../middleware/validation");

const router = express.Router();

const currentUser = async (req) => {
  const { userId } = getAuth(req);
  return req.services.user.getUser(userId);
};

router.get(
  "/cartproducts",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const cartData = await req.services.cart.getCart(user.id);
    res.json({ cartData });
  })
);

router.post(
  "/addproduct/:productId",
  requireAuth(),
  validateParams({ productId: validationRules.productId }),
  validateBody({ quantity: validationRules.quantity }),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const quantity = req.validatedBody.quantity || 1;
    const { productId } = req.validatedParams;
    const cartItem = await req.services.cart.addToCart(user.id, productId, quantity);

    req.services.user.trackInteraction(getAuth(req).userId, productId, "cart_add").catch(() => {});
    req.services.recommendation.recordFeedback(user.id, productId, "cart_add", 2).catch(() => {});

    res.json({ message: "Added/updated cart item", cartItem });
  })
);

router.put(
  "/updatequantity/:cartItemId",
  requireAuth(),
  validateParams({ cartItemId: validationRules.productId }),
  validateBody({ quant: validationRules.quantity }),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const cartItem = await req.services.cart.updateCartItemQuantity(
      user.id,
      req.validatedParams.cartItemId,
      req.validatedBody.quant
    );

    res.json({ message: "Update successful", cartItem });
  })
);

router.delete(
  "/deleteItem/:cartItemId",
  requireAuth(),
  validateParams({ cartItemId: validationRules.productId }),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    await req.services.cart.removeCartItem(user.id, req.validatedParams.cartItemId);
    res.json({ message: "Product deleted successfully" });
  })
);

router.delete(
  "/clear",
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await currentUser(req);
    const result = await req.services.cart.clearCart(user.id);
    res.json(result);
  })
);

module.exports = router;
