const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../errors/AppError');

class ProductService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Get single product
  async getProduct(productId) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
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
              select: { name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError('Product');
    }

    return product;
  }

  // Get all products with filtering and pagination
  async getAllProducts(filters = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      arEnabled,
      inStock,
    } = filters;

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
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(arEnabled === 'true' && { arEnabled: true }),
      ...(inStock === 'true' && { inventory: { gt: 0 } }),
    };

    // Build orderBy clause
    let orderBy = {};
    if (sortBy === 'price') {
      orderBy.price = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [products, totalCount] = await Promise.all([
      this.prisma.product.findMany({
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
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    return {
      products: products.map(this._formatProduct),
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
      filters: { category, brand, minPrice, maxPrice, search, sortBy, sortOrder },
    };
  }

  // Get similar products
  async getSimilarProducts(productId, limit = 6) {
    const product = await this.getProduct(productId);

    const similarProducts = await this.prisma.product.findMany({
      where: {
        category: product.category,
        id: { not: productId },
        isActive: true,
      },
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        brand: true,
      },
    });

    return similarProducts;
  }

  // Get popular products
  async getPopularProducts(limit = 10) {
    const products = await this.prisma.product.findMany({
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
        { interactions: { _count: 'desc' } },
        { orderItems: { _count: 'desc' } },
      ],
      take: parseInt(limit),
    });

    return products.map(product => ({
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
  }

  // Get categories
  async getCategories() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        category: true,
        features: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const categoryList = Object.values(categoryMap).sort(
      (a, b) => b.count - a.count
    );

    return {
      categories: categoryList,
      totalCategories: categoryList.length,
      totalProducts: products.length,
    };
  }

  // Get brands
  async getBrands() {
    const brands = await this.prisma.product.groupBy({
      by: ['brand'],
      where: { isActive: true },
      _count: { brand: true },
      orderBy: { _count: { brand: 'desc' } },
    });

    return brands.map(brand => ({
      name: brand.brand,
      count: brand._count.brand,
    }));
  }

  // Search products
  async searchProducts(query, limit = 10) {
    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        name: true,
        brand: true,
        category: true,
      },
      take: limit,
    });

    const suggestions = new Set();
    products.forEach((product) => {
      if (product.name.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.name);
      }
      if (product.brand.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.brand);
      }
      if (product.category.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(product.category);
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }

  // Record product view
  async recordView(productId) {
    const product = await this.getProduct(productId);
    logger.debug('Product view recorded', { productId });
    return product;
  }

  // Private helper: Format product response
  _formatProduct(product) {
    return {
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
      stats: {
        totalInteractions: product._count.interactions,
        inCarts: product._count.cartItems,
        totalOrders: product._count.orderItems,
      },
    };
  }
}

module.exports = ProductService;
