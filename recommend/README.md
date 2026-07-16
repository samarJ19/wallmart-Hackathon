# ML Recommendation Service (v2.0)

A refactored FastAPI-based machine learning service for personalized product recommendations. Built with clean architecture, modular design, and comprehensive cold-start handling.

## ✨ Features

- **Adaptive Recommendations**: Learns from user interactions in real-time
- **Cold Start Handling**: Smart recommendations for new users using content-based scoring
- **Hybrid Strategy**: Combines multiple recommendation approaches for optimal results
- **Category Filtering**: Get recommendations for specific product categories
- **Feedback Learning**: Improves recommendations based on user feedback (tick/cross)
- **Graceful Initialization**: Automatic retry with exponential backoff if backend unavailable
- **Health Monitoring**: Comprehensive health check endpoint with service status

## 🏗️ New Architecture (v2.0)

Completely refactored with clean, modular design:

```
app/
├── main.py                  # FastAPI application
├── config.py               # Configuration
├── models/                 # Data structures & validation
├── services/               # Core business logic
├── routes/                 # API endpoints
└── utils/                  # Utilities & helpers
```

## 🚀 Quick Start

```bash
cd recommend
pip install -r app/requirements.txt
cd app
python main.py
```

Service available at `http://localhost:8000`

## 📚 API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 🔑 Key Endpoints

- `GET /api/recommend/{user_id}` - Get recommendations
- `POST /api/feedback` - Record user feedback
- `GET /api/health` - Health check
- `GET /api/stats` - Statistics

## 🧠 Recommendation Strategies

1. **Cold Start (0 interactions)**: Trending products
2. **Hybrid (1-4 interactions)**: Mix popular + personalized
3. **Personalized (5+ interactions)**: Full personalization with exploration

## ✅ Improvements in v2.0

- Removed 40KB of unused complexity (bandit.py)
- Clean modular architecture
- Better cold start handling
- Improved maintainability and extensibility
- Performance optimized with caching

## 🐳 Deployment

```bash
docker build -t recommendation-service .
docker run -p 8000:8000 -e BACKEND_URL=https://your-backend.com recommendation-service
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Production Start

**Using Docker:**
```bash
docker build -t ml-service .
docker run -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e BACKEND_URL=https://your-backend-url.com \
  ml-service
```

**Using Gunicorn:**
```bash
chmod +x start.sh
./start.sh
```

## Environment Variables

See `.env.example` for all available configuration options. Key variables:

- `ENVIRONMENT` - Set to `production` for production deployment
- `BACKEND_URL` - URL of your backend service
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `PORT` - Server port (default: 8000)
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)

## Features

- **Adaptive Recommendations** - Learns from user interactions in real-time
- **Cold Start Handling** - Smart recommendations for new users
- **Category Filtering** - Get recommendations for specific product categories
- **Feedback Learning** - Improves based on tick/cross user feedback
- **Graceful Initialization** - Automatic retry if backend is unavailable
- **Health Monitoring** - Comprehensive health check endpoint

## Architecture

- **Framework:** FastAPI
- **ML Approach:** Simplified contextual bandits with user feedback
- **Backend Integration:** Async communication with Node.js backend
- **Learning:** Real-time adaptation based on user interactions

## Project Structure

```
recommend/
├── app/
│   ├── main2.py              # Main FastAPI application
│   ├── models/
│   │   ├── simplified.py     # Recommendation system logic
│   │   ├── bandit.py         # Bandit algorithms
│   │   └── validation.py     # Data validation
│   ├── api/
│   ├── core/
│   └── services/
├── requirements.txt          # Python dependencies
├── .env.example             # Environment template
├── Dockerfile               # Docker configuration
├── Procfile                 # Heroku deployment
├── start.sh                 # Production start script
├── DEPLOYMENT.md            # Deployment guide
└── README.md               # This file
```

## Development

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

### Code Quality
```bash
# Format code
black app/

# Lint
pylint app/
```

## Monitoring

Monitor the service using:
- `/health` endpoint - Real-time system status
- Logs - Structured logging with timestamps
- `/stats/system` - System-wide statistics

## Troubleshooting

**Service won't initialize:**
- Check BACKEND_URL is correct and reachable
- View `/health` endpoint for initialization status
- Service will automatically retry connection

**No recommendations returned:**
- Ensure products are loaded from backend
- Check `/stats/system` for product count
- Verify user interactions are being recorded

**CORS errors:**
- Update ALLOWED_ORIGINS in environment variables
- Ensure frontend domain is included

For more help, see [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)

## License

MIT
