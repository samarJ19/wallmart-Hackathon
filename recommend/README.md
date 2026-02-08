# ML Recommendation Service

A FastAPI-based machine learning service for personalized product recommendations using contextual bandits and user feedback learning.

## Quick Start

### Development

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Create environment file:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Run the development server:**
```bash
cd app
python main2.py
```

The service will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Key Endpoints

- `GET /` - Service info
- `GET /health` - Health check and system status
- `GET /recommend/{user_id}` - Get personalized recommendations
- `POST /feedback/record` - Record user feedback (tick/cross)
- `GET /stats/system` - System statistics
- `GET /stats/user/{user_id}` - User-specific statistics

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including:
- Environment configuration
- Docker deployment
- Cloud platform deployments (Render, Railway, Heroku, GCP, AWS)
- Production best practices

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
