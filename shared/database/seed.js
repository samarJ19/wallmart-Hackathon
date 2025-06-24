const SEED_DATA = {
  // Sample Users (You can add Clerk IDs later)
  users: [
    {
      id: 'user_1',
      clerkId: 'clerk_user_1',
      email: 'john.doe@email.com',
      name: 'John Doe',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      preferences: {
        categories: ['electronics', 'home'],
        priceRange: { min: 0, max: 1000 },
        brands: ['Apple', 'Samsung', 'Sony']
      }
    },
    {
      id: 'user_2',
      clerkId: 'clerk_user_2',
      email: 'jane.smith@email.com',
      name: 'Jane Smith',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c1c1?w=150',
      preferences: {
        categories: ['fashion', 'beauty', 'home'],
        priceRange: { min: 50, max: 500 },
        brands: ['Nike', 'Adidas', 'Levi\'s']
      }
    },
    {
      id: 'user_3',
      clerkId: 'clerk_user_3',
      email: 'mike.johnson@email.com',
      name: 'Mike Johnson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      preferences: {
        categories: ['sports', 'electronics', 'automotive'],
        priceRange: { min: 100, max: 2000 },
        brands: ['Nike', 'Apple', 'Sony']
      }
    },
    {
      id: 'user_4',
      clerkId: 'clerk_user_4',
      email: 'sarah.wilson@email.com',
      name: 'Sarah Wilson',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      preferences: {
        categories: ['home', 'kitchen', 'books'],
        priceRange: { min: 20, max: 800 },
        brands: ['KitchenAid', 'Cuisinart', 'OXO']
      }
    },
    {
      id: 'user_5',
      clerkId: 'clerk_user_5',
      email: 'alex.brown@email.com',
      name: 'Alex Brown',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      preferences: {
        categories: ['electronics', 'gaming', 'music'],
        priceRange: { min: 0, max: 1500 },
        brands: ['Sony', 'Nintendo', 'Apple']
      }
    }
  ],

  // Sample Products
  products: [
    // Electronics
    {
      id: 'prod_1',
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone with advanced camera system and A17 Pro chip',
      price: 999.99,
      category: 'electronics',
      brand: 'Apple',
      imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
      images: [
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400'
      ],
      features: {
        screenSize: '6.1 inches',
        storage: '128GB',
        camera: '48MP',
        battery: '3274mAh',
        weight: '187g',
        colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium']
      },
      inventory: 50,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/iphone15pro.glb',
      arEnabled: true
    },
    {
      id: 'prod_2',
      name: 'Samsung Galaxy S24 Ultra',
      description: 'Premium Android smartphone with S Pen and advanced AI features',
      price: 1199.99,
      category: 'electronics',
      brand: 'Samsung',
      imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
      images: [
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
        'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400'
      ],
      features: {
        screenSize: '6.8 inches',
        storage: '256GB',
        camera: '200MP',
        battery: '5000mAh',
        weight: '232g',
        colors: ['Titanium Black', 'Titanium Gray', 'Titanium Violet', 'Titanium Yellow']
      },
      inventory: 35,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/galaxys24ultra.glb',
      arEnabled: true
    },
    {
      id: 'prod_3',
      name: 'MacBook Air M3',
      description: '13-inch laptop with M3 chip, perfect for everyday computing',
      price: 1099.99,
      category: 'electronics',
      brand: 'Apple',
      imageUrl: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
      images: [
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400'
      ],
      features: {
        screenSize: '13.6 inches',
        processor: 'M3 chip',
        memory: '8GB',
        storage: '256GB SSD',
        weight: '1.24kg',
        colors: ['Space Gray', 'Silver', 'Starlight', 'Midnight']
      },
      inventory: 25,
      has3DModel: false,
      arEnabled: false
    },

    // Fashion
    {
      id: 'prod_4',
      name: 'Nike Air Max 270',
      description: 'Comfortable running shoes with Max Air technology',
      price: 150.00,
      category: 'fashion',
      brand: 'Nike',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400'
      ],
      features: {
        type: 'Running Shoes',
        material: 'Mesh and synthetic',
        sole: 'Rubber',
        technology: 'Max Air',
        sizes: ['7', '8', '9', '10', '11', '12'],
        colors: ['Black/White', 'White/Blue', 'Red/Black', 'Gray/Orange']
      },
      inventory: 100,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/airmax270.glb',
      arEnabled: true
    },
    {
      id: 'prod_5',
      name: 'Levi\'s 501 Original Jeans',
      description: 'Classic straight-fit jeans, the original blue jean since 1873',
      price: 89.99,
      category: 'fashion',
      brand: 'Levi\'s',
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
      images: [
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400',
        'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400'
      ],
      features: {
        fit: 'Straight',
        material: '100% Cotton',
        rise: 'Mid rise',
        closure: 'Button fly',
        sizes: ['28', '30', '32', '34', '36', '38', '40'],
        colors: ['Dark Blue', 'Light Blue', 'Black', 'Gray']
      },
      inventory: 75,
      has3DModel: false,
      arEnabled: false
    },

    // Home & Kitchen
    {
      id: 'prod_6',
      name: 'KitchenAid Stand Mixer',
      description: 'Professional 5-quart stand mixer for all your baking needs',
      price: 379.99,
      category: 'home',
      brand: 'KitchenAid',
      imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
      images: [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'
      ],
      features: {
        capacity: '5 quart',
        power: '325 watts',
        speeds: '10 speeds',
        material: 'Metal',
        weight: '22 lbs',
        colors: ['White', 'Black', 'Red', 'Silver', 'Blue']
      },
      inventory: 40,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/kitchenaid_mixer.glb',
      arEnabled: true
    },
    {
      id: 'prod_7',
      name: 'Dyson V15 Detect',
      description: 'Cordless vacuum with laser dust detection and powerful suction',
      price: 749.99,
      category: 'home',
      brand: 'Dyson',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'
      ],
      features: {
        type: 'Cordless Stick',
        runtime: '60 minutes',
        weight: '3.1 kg',
        technology: 'Laser dust detection',
        filtration: 'HEPA',
        colors: ['Yellow/Purple', 'Blue/Red']
      },
      inventory: 20,
      has3DModel: false,
      arEnabled: false
    },

    // Sports & Gaming
    {
      id: 'prod_8',
      name: 'PlayStation 5',
      description: 'Next-generation gaming console with 4K gaming and ray tracing',
      price: 499.99,
      category: 'gaming',
      brand: 'Sony',
      imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400',
      images: [
        'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400',
        'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400'
      ],
      features: {
        storage: '825GB SSD',
        resolution: '4K',
        frameRate: '120fps',
        technology: 'Ray tracing',
        weight: '4.5 kg',
        colors: ['White', 'Black']
      },
      inventory: 15,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/ps5.glb',
      arEnabled: true
    },
    {
      id: 'prod_9',
      name: 'Wilson Tennis Racket Pro',
      description: 'Professional tennis racket for intermediate to advanced players',
      price: 199.99,
      category: 'sports',
      brand: 'Wilson',
      imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
      images: [
        'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'
      ],
      features: {
        weight: '300g',
        headSize: '100 sq in',
        stringPattern: '16x19',
        material: 'Graphite',
        gripSize: '4 1/4',
        colors: ['Black/Red', 'White/Blue']
      },
      inventory: 60,
      has3DModel: false,
      arEnabled: false
    },

    // Books & Media
    {
      id: 'prod_10',
      name: 'AirPods Pro (2nd generation)',
      description: 'Active noise cancellation wireless earbuds with spatial audio',
      price: 249.99,
      category: 'electronics',
      brand: 'Apple',
      imageUrl: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400',
      images: [
        'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400',
        'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400'
      ],
      features: {
        batteryLife: '6 hours',
        chargingCase: '30 hours total',
        features: 'Active Noise Cancellation',
        connectivity: 'Bluetooth 5.3',
        weight: '5.3g each',
        colors: ['White']
      },
      inventory: 80,
      has3DModel: true,
      modelUrl: 'https://cdn.example.com/models/airpods_pro.glb',
      arEnabled: true
    }
  ],

  // Initial User Interactions for ML Training
  userInteractions: [
    // User 1 interactions (Tech enthusiast)
    { userId: 'user_1', productId: 'prod_1', action: 'view', reward: 0.2 },
    { userId: 'user_1', productId: 'prod_1', action: 'tick', reward: 1.0 },
    { userId: 'user_1', productId: 'prod_1', action: 'cart_add', reward: 2.0 },
    { userId: 'user_1', productId: 'prod_3', action: 'view', reward: 0.2 },
    { userId: 'user_1', productId: 'prod_3', action: 'tick', reward: 1.0 },
    { userId: 'user_1', productId: 'prod_10', action: 'view', reward: 0.2 },
    { userId: 'user_1', productId: 'prod_10', action: 'tick', reward: 1.0 },
    { userId: 'user_1', productId: 'prod_10', action: 'cart_add', reward: 2.0 },
    { userId: 'user_1', productId: 'prod_4', action: 'view', reward: 0.2 },
    { userId: 'user_1', productId: 'prod_4', action: 'cross', reward: -1.0 },
    { userId: 'user_1', productId: 'prod_5', action: 'view', reward: 0.2 },
    { userId: 'user_1', productId: 'prod_5', action: 'cross', reward: -1.0 },

    // User 2 interactions (Fashion focused)
    { userId: 'user_2', productId: 'prod_4', action: 'view', reward: 0.2 },
    { userId: 'user_2', productId: 'prod_4', action: 'tick', reward: 1.0 },
    { userId: 'user_2', productId: 'prod_4', action: 'cart_add', reward: 2.0 },
    { userId: 'user_2', productId: 'prod_5', action: 'view', reward: 0.2 },
    { userId: 'user_2', productId: 'prod_5', action: 'tick', reward: 1.0 },
    { userId: 'user_2', productId: 'prod_6', action: 'view', reward: 0.2 },
    { userId: 'user_2', productId: 'prod_6', action: 'tick', reward: 1.0 },
    { userId: 'user_2', productId: 'prod_1', action: 'view', reward: 0.2 },
    { userId: 'user_2', productId: 'prod_1', action: 'cross', reward: -1.0 },
    { userId: 'user_2', productId: 'prod_8', action: 'view', reward: 0.2 },
    { userId: 'user_2', productId: 'prod_8', action: 'cross', reward: -1.0 },

    // User 3 interactions (Sports & Tech)
    { userId: 'user_3', productId: 'prod_8', action: 'view', reward: 0.2 },
    { userId: 'user_3', productId: 'prod_8', action: 'tick', reward: 1.0 },
    { userId: 'user_3', productId: 'prod_8', action: 'cart_add', reward: 2.0 },
    { userId: 'user_3', productId: 'prod_9', action: 'view', reward: 0.2 },
    { userId: 'user_3', productId: 'prod_9', action: 'tick', reward: 1.0 },
    { userId: 'user_3', productId: 'prod_2', action: 'view', reward: 0.2 },
    { userId: 'user_3', productId: 'prod_2', action: 'tick', reward: 1.0 },
    { userId: 'user_3', productId: 'prod_5', action: 'view', reward: 0.2 },
    { userId: 'user_3', productId: 'prod_5', action: 'cross', reward: -1.0 },
    { userId: 'user_3', productId: 'prod_6', action: 'view', reward: 0.2 },
    { userId: 'user_3', productId: 'prod_6', action: 'cross', reward: -1.0 },

    // User 4 interactions (Home & Kitchen)
    { userId: 'user_4', productId: 'prod_6', action: 'view', reward: 0.2 },
    { userId: 'user_4', productId: 'prod_6', action: 'tick', reward: 1.0 },
    { userId: 'user_4', productId: 'prod_6', action: 'cart_add', reward: 2.0 },
    { userId: 'user_4', productId: 'prod_7', action: 'view', reward: 0.2 },
    { userId: 'user_4', productId: 'prod_7', action: 'tick', reward: 1.0 },
    { userId: 'user_4', productId: 'prod_7', action: 'cart_add', reward: 2.0 },
    { userId: 'user_4', productId: 'prod_1', action: 'view', reward: 0.2 },
    { userId: 'user_4', productId: 'prod_1', action: 'cross', reward: -1.0 },
    { userId: 'user_4', productId: 'prod_8', action: 'view', reward: 0.2 },
    { userId: 'user_4', productId: 'prod_8', action: 'cross', reward: -1.0 },

    // User 5 interactions (Electronics & Gaming)
    { userId: 'user_5', productId: 'prod_1', action: 'view', reward: 0.2 },
    { userId: 'user_5', productId: 'prod_1', action: 'tick', reward: 1.0 },
    { userId: 'user_5', productId: 'prod_8', action: 'view', reward: 0.2 },
    { userId: 'user_5', productId: 'prod_8', action: 'tick', reward: 1.0 },
    { userId: 'user_5', productId: 'prod_8', action: 'cart_add', reward: 2.0 },
    { userId: 'user_5', productId: 'prod_10', action: 'view', reward: 0.2 },
    { userId: 'user_5', productId: 'prod_10', action: 'tick', reward: 1.0 },
    { userId: 'user_5', productId: 'prod_4', action: 'view', reward: 0.2 },
    { userId: 'user_5', productId: 'prod_4', action: 'cross', reward: -1.0 },
    { userId: 'user_5', productId: 'prod_7', action: 'view', reward: 0.2 },
    { userId: 'user_5', productId: 'prod_7', action: 'cross', reward: -1.0 }
  ],

  // Sample Cart Items
  cartItems: [
    { userId: 'user_1', productId: 'prod_1', quantity: 1 },
    { userId: 'user_1', productId: 'prod_10', quantity: 1 },
    { userId: 'user_2', productId: 'prod_4', quantity: 1 },
    { userId: 'user_3', productId: 'prod_8', quantity: 1 },
    { userId: 'user_4', productId: 'prod_6', quantity: 1 },
    { userId: 'user_4', productId: 'prod_7', quantity: 1 },
    { userId: 'user_5', productId: 'prod_8', quantity: 1 }
  ],

  // Sample Orders
  orders: [
    {
      id: 'order_1',
      userId: 'user_1',
      status: 'delivered',
      total: 1249.98,
      orderItems: [
        { productId: 'prod_1', quantity: 1, price: 999.99 },
        { productId: 'prod_10', quantity: 1, price: 249.99 }
      ]
    },
    {
      id: 'order_2',
      userId: 'user_2',
      status: 'shipped',
      total: 150.00,
      orderItems: [
        { productId: 'prod_4', quantity: 1, price: 150.00 }
      ]
    },
    {
      id: 'order_3',
      userId: 'user_3',
      status: 'confirmed',
      total: 499.99,
      orderItems: [
        { productId: 'prod_8', quantity: 1, price: 499.99 }
      ]
    }
  ],

  // Sample Analytics Data
  analytics: [
    {
      type: 'ml_performance',
      data: {
        date: new Date().toISOString(),
        totalRecommendations: 150,
        clickThroughRate: 0.25,
        conversionRate: 0.12,
        averageReward: 0.35
      }
    },
    {
      type: 'product_popularity',
      data: {
        date: new Date().toISOString(),
        topProducts: [
          { productId: 'prod_1', views: 45, interactions: 25 },
          { productId: 'prod_8', views: 38, interactions: 22 },
          { productId: 'prod_4', views: 35, interactions: 20 }
        ]
      }
    }
  ]
};
