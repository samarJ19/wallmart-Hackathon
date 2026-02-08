# FastAPI ML Service Deployment Guide

## Overview
This guide covers deploying the Walmart Hackathon ML recommendation service (FastAPI) to production.

## Pre-Deployment Checklist

### 1. Dependencies
Ensure all dependencies are listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file for production (NEVER commit this to version control):

```env
# Environment
ENVIRONMENT=production

# Server Configuration  
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# Backend Service
BACKEND_URL=https://your-production-backend-url.com

# CORS Configuration (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Initialization Settings
MAX_INIT_RETRIES=10
INIT_RETRY_DELAY=5
MAX_RETRY_DELAY=60
```

## Deployment Options

### Option 1: Deploy with Uvicorn (Simple)

For small-scale deployments:

```bash
# Install dependencies
pip install -r requirements.txt

# Run with environment variables
export ENVIRONMENT=production
export BACKEND_URL=https://your-backend-url.com
export ALLOWED_ORIGINS=https://yourdomain.com

# Start the server
cd app
uvicorn main2:app --host 0.0.0.0 --port 8000 --workers 4
```

### Option 2: Deploy with Gunicorn + Uvicorn Workers (Recommended for Production)

Gunicorn provides better process management and graceful restarts.

1. **Install Gunicorn:**
```bash
pip install gunicorn
```

2. **Update `requirements.txt`:**
```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
gunicorn==21.2.0
httpx==0.26.0
pydantic==2.5.3
numpy==1.26.3
python-dotenv==1.0.1
```

3. **Create a start script `start.sh`:**
```bash
#!/bin/bash
cd app
gunicorn main2:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

4. **Make it executable and run:**
```bash
chmod +x start.sh
./start.sh
```

### Option 3: Docker Deployment (Most Portable)

1. **Create `Dockerfile` in the `recommend` directory:**
```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Run the application
CMD ["uvicorn", "app.main2:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

2. **Create `.dockerignore`:**
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info/
dist/
build/
.env
.venv/
venv/
*.log
```

3. **Build and run:**
```bash
# Build image
docker build -t ml-service:latest .

# Run container
docker run -d \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e BACKEND_URL=https://your-backend-url.com \
  -e ALLOWED_ORIGINS=https://yourdomain.com \
  --name ml-service \
  ml-service:latest
```

### Option 4: Cloud Platform Deployments

#### **Render.com**
1. Connect your GitHub repository
2. Create a new Web Service
3. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `cd app && uvicorn main2:app --host 0.0.0.0 --port $PORT --workers 2`
   - **Environment Variables:** Add all required env vars

#### **Railway.app**
1. Connect repository
2. Add environment variables
3. Deploy automatically (Railway detects Python and installs requirements.txt)

#### **Heroku**
1. **Create `Procfile`:**
```
web: cd app && uvicorn main2:app --host 0.0.0.0 --port $PORT --workers 2
```

2. **Create `runtime.txt`:**
```
python-3.11.7
```

3. **Deploy:**
```bash
heroku create your-app-name
git push heroku main
heroku config:set ENVIRONMENT=production
heroku config:set BACKEND_URL=https://your-backend-url.com
```

#### **Google Cloud Run**
1. Build with Cloud Build:
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/ml-service
```

2. Deploy:
```bash
gcloud run deploy ml-service \
  --image gcr.io/PROJECT-ID/ml-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production,BACKEND_URL=https://your-backend-url.com
```

#### **AWS EC2**
1. SSH into your EC2 instance
2. Install Python and dependencies
3. Clone your repository
4. Create a systemd service file `/etc/systemd/system/ml-service.service`:
```ini
[Unit]
Description=ML Recommendation Service
After=network.target

[Service]
Type=notify
User=ubuntu
WorkingDirectory=/home/ubuntu/wallmart/recommend/app
Environment="ENVIRONMENT=production"
Environment="BACKEND_URL=https://your-backend-url.com"
Environment="ALLOWED_ORIGINS=https://yourdomain.com"
ExecStart=/usr/bin/gunicorn main2:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

5. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ml-service
sudo systemctl start ml-service
```

## Production Best Practices

### 1. Worker Configuration
- **CPU-bound:** Set workers = (2 × CPU cores) + 1
- **I/O-bound:** Set workers = (4 × CPU cores) or higher
- For this ML service (I/O heavy): 4 workers is a good start

### 2. Monitoring & Health Checks
- Use `/health` endpoint for health checks
- Monitor: response times, error rates, initialization status
- Set up alerts for when `system_initialized` is `false`

### 3. Scaling Considerations
- The service initializes by loading all products from backend
- For large product catalogs, consider:
  - Caching strategies
  - Database connection pooling
  - Horizontal scaling with load balancer

### 4. Security
- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, Google Secret Manager)
- Restrict CORS origins to your actual frontend domains
- Use HTTPS in production

### 5. Logging & Debugging
- Production uses `INFO` level logging
- For debugging set `LOG_LEVEL=DEBUG`
- Monitor logs for initialization failures

## Testing the Deployment

### 1. Health Check
```bash
curl https://your-deployment-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "system_initialized": true,
  "total_products": 100,
  "total_users": 50
}
```

### 2. Get Recommendations
```bash
curl https://your-deployment-url.com/recommend/user123
```

### 3. System Stats
```bash
curl https://your-deployment-url.com/stats/system
```

## Troubleshooting

### Service won't start
- Check logs: `docker logs ml-service` or `journalctl -u ml-service`
- Verify BACKEND_URL is reachable
- Check all environment variables are set

### "system_initialized": false
- Backend may be down or unreachable
- Check BACKEND_URL in logs
- Service will retry automatically (check `/health` for retry status)

### High memory usage
- Reduce number of workers
- Monitor with: `docker stats` or system monitoring tools

### CORS errors
- Verify ALLOWED_ORIGINS includes your frontend domain
- Check browser console for exact origin

## Comparison with NPM Projects

| Aspect | NPM/Node.js | FastAPI/Python |
|--------|-------------|----------------|
| Dependencies | `package.json` | `requirements.txt` |
| Scripts | `npm run build`, `npm start` | Direct Python execution |
| Production Server | PM2, Node cluster | Gunicorn + Uvicorn |
| Environment | `.env` + process.env | `.env` + python-dotenv |
| Docker | Similar | Similar |
| Build Step | Often required (TypeScript, bundling) | Usually not required |

## Key Differences from NPM Deployment:
1. **No build step needed** - Python runs directly (unless using compiled extensions)
2. **Process manager** - Use Gunicorn instead of PM2
3. **Workers** - Configured via command line, not cluster module
4. **Environment** - python-dotenv instead of dotenv package

## Next Steps After Deployment
1. Set up monitoring (Sentry, DataDog, etc.)
2. Configure CI/CD pipeline
3. Set up database backups (if using database)
4. Configure auto-scaling policies
5. Set up SSL certificates (Let's Encrypt, CloudFlare)
