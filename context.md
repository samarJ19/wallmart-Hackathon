## Building an **e-commerce website** for the **Walmart Hackathon**: 
### Tech Stack
- **Backend:**
     **Node.js with Express** 
     **FastAPI (Python)** 
- **Frontend:**
    - **React** for UI.
- **Other Tools & Libraries:**
    - **Prisma** as ORM.
    - **socket io** for WebSockets.
    - **Clerk** for user session management and authentication.
### Folder structure
backend
    prisma
    src
        config
        middleware
        routes
            analytics.js
            auth.js
            products.js
            orders.js
            recommendations.js
            cart.js
            users.js
        services
        server.js
recommend
  app
    models
    api
    core
    services
  main.py
frontend (Vite+React+TS with `Shadcn`)
  src
  components
  context
    auth.tsx
    cart.tsx
    socket.tsx
  pages
  services
    api.ts
    auth.ts
    websocket.ts
  app.tsx


### Key Architecture 
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique  // Clerk User ID
  email         String   @unique
  name          String
  avatar        String?
  preferences   Json?    // User preferences for ML
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  cartItems     CartItem[]
  orders        Order[]
  interactions  UserInteraction[]
  chatSessions  ChatSession[]
  arSessions    ARSession[]
  
  @@map("users")
}

// Product Management
model Product {
  id          String   @id @default(cuid())
  name        String
  description String
  price       Float
  category    String
  brand       String
  imageUrl    String
  images      String[] // Multiple product images
  features    Json     // ML features
  inventory   Int      @default(0)
  isActive    Boolean  @default(true)
  
  // AR specific fields
  has3DModel  Boolean  @default(false)
  modelUrl    String?  // 3D model URL
  arEnabled   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  cartItems     CartItem[]
  orderItems    OrderItem[]
  interactions  UserInteraction[]
  arSessions    ARSession[]
  
  @@map("products")
}

// Cart Management
model CartItem {
  id        String @id @default(cuid())
  userId    String
  productId String
  quantity  Int    @default(1)
  createdAt DateTime @default(now())
  
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([userId, productId])
  @@map("cart_items")
}

// Order Management
model Order {
  id          String    @id @default(cuid())
  userId      String
  status      String    // 'pending', 'confirmed', 'shipped', 'delivered'
  total       Float
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  user        User        @relation(fields: [userId], references: [id])
  orderItems  OrderItem[]
  
  @@map("orders")
}

model OrderItem {
  id        String @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  price     Float  // Price at time of order
  
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id])
  
  @@map("order_items")
}

// ML & Recommendations
model UserInteraction {
  id        String   @id @default(cuid())
  userId    String
  productId String
  action    String   // 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
  reward    Float    // Reward value for RL
  context   Json?    // Additional context (page, time spent, etc.)
  createdAt DateTime @default(now())
  
  user      User    @relation(fields: [userId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
  
  @@map("user_interactions")
}

## Current Flow :

Frontend → User interacts with product → Socket.IO → Node.js Backend
Node.js Backend → Stores interaction in database (UserInteraction table)
Frontend → Makes API call to FastAPI → Gets recommendations from bandit.py
FastAPI → Queries database for interaction data → Updates bandit → Returns recommendation
