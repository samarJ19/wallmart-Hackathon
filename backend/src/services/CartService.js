const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../errors/AppError');

class CartService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Get user cart
  async getCart(userId) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
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
            inventory: true,
          },
        },
      },
    });

    return cartItems;
  }

  // Add product to cart
  async addToCart(userId, productId, quantity = 1) {
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    if (quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Check inventory
    if (product.inventory < quantity) {
      throw new ValidationError('Not enough inventory available', {
        requested: quantity,
        available: product.inventory,
      });
    }

    const cartItem = await this.prisma.cartItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        userId,
        productId,
        quantity,
      },
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
    });

    logger.debug('Product added to cart', { userId, productId, quantity });
    return cartItem;
  }

  // Update cart item quantity
  async updateCartQuantity(userId, productId, quantity) {
    if (quantity < 0) {
      throw new ValidationError('Quantity must be non-negative');
    }

    if (quantity === 0) {
      return this.removeFromCart(userId, productId);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    if (product.inventory < quantity) {
      throw new ValidationError('Not enough inventory available', {
        requested: quantity,
        available: product.inventory,
      });
    }

    const cartItem = await this.prisma.cartItem.update({
      where: {
        userId_productId: { userId, productId },
      },
      data: { quantity },
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
    });

    logger.debug('Cart item updated', { userId, productId, quantity });
    return cartItem;
  }

  // Update a cart item by its cart item id. This matches the frontend cart page contract.
  async updateCartItemQuantity(userId, cartItemId, quantity) {
    if (quantity < 0) {
      throw new ValidationError('Quantity must be non-negative');
    }

    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: { product: true },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item');
    }

    if (quantity === 0) {
      return this.removeCartItem(userId, cartItemId);
    }

    if (cartItem.product.inventory < quantity) {
      throw new ValidationError('Not enough inventory available', {
        requested: quantity,
        available: cartItem.product.inventory,
      });
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
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
    });

    logger.debug('Cart item updated by id', { userId, cartItemId, quantity });
    return updatedItem;
  }

  // Remove from cart
  async removeFromCart(userId, productId) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item');
    }

    await this.prisma.cartItem.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    logger.debug('Item removed from cart', { userId, productId });
    return { success: true };
  }

  // Remove a cart item by its cart item id.
  async removeCartItem(userId, cartItemId) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    logger.debug('Cart item removed by id', { userId, cartItemId });
    return { success: true };
  }

  // Clear cart
  async clearCart(userId) {
    const deleted = await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    logger.debug('Cart cleared', { userId, deletedCount: deleted.count });
    return { success: true, deletedCount: deleted.count };
  }

  // Get cart total
  async getCartTotal(userId) {
    const cartItems = await this.getCart(userId);

    const total = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    return {
      items: cartItems.length,
      total: Math.round(total * 100) / 100,
      cartItems,
    };
  }
}

module.exports = CartService;
