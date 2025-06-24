from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import httpx
import os
from datetime import datetime
import json
from models.bandit import BanditManager, EpsilonGreedyBandit, UCBBandit


# FastAPI app initialization
app = FastAPI(
    title="Walmart Hackathon ML Service",
    description="ML and recommendation service for e-commerce platform",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

async def get_http_client():
    """Get HTTP client for backend communication"""
    return httpx.AsyncClient(timeout=30.0)
bandit_manager = BanditManager()

async def create_bandit_for_different_categories():
    # Call the backend and get the categories, then create bandit categories
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/products/categories/list")
            response.raise_for_status()
            
            # Fix the response parsing
            data = response.json()
            categories = data.get("categories", [])
            
            for cat in categories:
                bandit_id = cat.get("name")
                product_ids = cat.get("product_ids", [])
                
                # Ensure product_ids is not empty before creating bandit
                if product_ids:
                    bandit_manager.create_bandit(
                        bandit_id=bandit_id,
                        bandit_type="ucb",
                        product_ids=product_ids
                    )
                else:
                    print(f"Warning: No products found for category {bandit_id}")
                    
    except Exception as e:
        print(f"Error creating bandits for categories: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Walmart Hackathon ML Service is running!"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test backend connection
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/health", timeout=5.0)
            backend_status = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception as e:
        backend_status = f"unreachable: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "backend_connection": backend_status,
        "service": "ml-service"
    }
@app.get("/recommend/{user_id}")
async def get_recommendations(user_id: str, category: str = "general"):
    product_id = bandit_manager.recommend_product(f"{category}_bandit")
    return {"recommended_product": product_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)