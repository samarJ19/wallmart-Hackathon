walmart-rl-ecommerce/
├── frontend/                    # React Frontend (Shared)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Shared components
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── products/        # ML Team Components
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   ├── ProductGrid.jsx
│   │   │   │   ├── Cart.jsx
│   │   │   │   └── RecommendationOverlay.jsx
│   │   │   ├── chatbot/         # Chatbot Team Components
│   │   │   │   ├── ChatWindow.jsx
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   └── ChatInput.jsx
│   │   │   ├── ar/              # AR Team Components
│   │   │   │   ├── ARViewer.jsx
│   │   │   │   ├── ARControls.jsx
│   │   │   │   └── ProductAR.jsx
│   │   │   └── dashboard/       # Analytics & Admin
│   │   │       ├── MLDashboard.jsx
│   │   │       ├── ChatAnalytics.jsx
│   │   │       └── ARMetrics.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── ARShowroom.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js     # WS integration
│   │   │   ├── useCart.js
│   │   │   ├── useRecommendations.js
│   │   │   ├── useChat.js
│   │   │   └── useAR.js
│   │   ├── services/
│   │   │   ├── api.js           # Main API service
│   │   │   ├── websocket.js     # WS service
│   │   │   ├── clerk.js         # Clerk auth service
│   │   │   └── constants.js
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Clerk context
│   │   │   ├── CartContext.jsx
│   │   │   └── SocketContext.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── ...
│
├── backend-main/                # Node.js + Express (Main API)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # Authentication routes
│   │   │   ├── users.js         # User management
│   │   │   ├── products.js      # Product management
│   │   │   ├── cart.js          # Cart operations
│   │   │   ├── orders.js        # Order processing
│   │   │   ├── recommendations.js # ML recommendations
│   │   │   ├── chatbot.js       # Chatbot API routes
│   │   │   ├── ar.js            # AR-related routes
│   │   │   └── analytics.js     # Analytics & reporting
│   │   ├── middleware/
│   │   │   ├── auth.js          # Clerk auth middleware
│   │   │   ├── validation.js    # Request validation
│   │   │   ├── rateLimit.js     # Rate limiting
│   │   │   └── cors.js          # CORS configuration
│   │   ├── services/
│   │   │   ├── socketService.js # WS service
│   │   │   ├── mlService.js     # ML service communication
│   │   │   ├── chatbotService.js # Chatbot service communication
│   │   │   ├── arService.js     # AR service communication
│   │   │   ├── clerkService.js  # Clerk integration
│   │   │   └── emailService.js  # Email notifications
│   │   ├── config/
│   │   │   ├── database.js      # Database configuration
│   │   │   ├── websocket.js     # WS configuration
│   │   │   └── environment.js   # Environment variables
│   │   └── server.js            # Main server file
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── ...
│
├── ml-service/                  # FastAPI + Multi-Armed Bandit
│   ├── app/
│   │   ├── models/
│   │   │   ├── bandit.py
│   │   │   ├── database.py
│   │   │   └── user_profile.py
│   │   ├── services/
│   │   │   ├── recommendation_service.py
│   │   │   ├── feedback_service.py
│   │   │   └── analytics_service.py
│   │   ├── api/
│   │   │   ├── recommendations.py
│   │   │   ├── feedback.py
│   │   │   └── analytics.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
│
├── chatbot-service/             # Chatbot Team Service
│   ├── src/
│   │   ├── models/
│   │   │   ├── nlp_model.py
│   │   │   └── conversation.py
│   │   ├── services/
│   │   │   ├── chat_service.py
│   │   │   ├── intent_recognition.py
│   │   │   └── response_generator.py
│   │   ├── api/
│   │   │   ├── chat.py
│   │   │   └── training.py
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
│
├── ar-service/                  # AR Team Service
│   ├── src/
│   │   ├── models/
│   │   │   ├── ar_model.py
│   │   │   └── product_3d.py
│   │   ├── services/
│   │   │   ├── ar_processing.py
│   │   │   ├── model_generation.py
│   │   │   └── tracking_service.py
│   │   ├── api/
│   │   │   ├── ar_models.py
│   │   │   └── ar_sessions.py
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
│
├── shared/                      # Shared utilities and types
│   ├── types/
│   │   ├── user.ts
│   │   ├── product.ts
│   │   ├── chat.ts
│   │   └── ar.ts
│   ├── utils/
│   │   ├── validation.js
│   │   └── constants.js
│   └── database/
│       └── seed.js              # Shared seed data
│
├── docs/                        # Team documentation
│   ├── api/
│   │   ├── main-api.md
│   │   ├── ml-api.md
│   │   ├── chatbot-api.md
│   │   └── ar-api.md
│   ├── team-guidelines.md
│   └── deployment.md
│
├── docker-compose.yml           # All services
├── .env.example                 # Environment template
└── README.md                    # Main project README