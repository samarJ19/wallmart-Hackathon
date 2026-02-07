from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import httpx
import os
from datetime import datetime
import json
from typing import List, Dict, Any, Optional
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel, ValidationError
# Import the simplified recommendation system
from models.simplified import (
    SimplifiedRecommendationSystem,
    Product,
    UserInteraction,
    create_product_from_dict,
    create_interaction_from_dict
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
class FeedbackRequest(BaseModel):
    user_id: str
    product_id: str
    action: str
    reward: Optional[float] = None

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
MAX_INIT_RETRIES = 10  # Maximum number of initialization retries
INIT_RETRY_DELAY = 5  # Initial delay in seconds between retries
MAX_RETRY_DELAY = 60  # Maximum delay between retries

# Global recommendation system
recommendation_system: Optional[SimplifiedRecommendationSystem] = None
total_recommendations_served = 0
initialization_task: Optional[asyncio.Task] = None  # Background task for retrying initialization
is_initializing = False  # Flag to prevent multiple initialization attempts

async def get_http_client():
    """Get HTTP client for backend communication"""
    return httpx.AsyncClient(timeout=30.0)

async def initialize_recommendation_system():
    """Initialize recommendation system with products from backend"""
    global recommendation_system, is_initializing
    
    if is_initializing:
        logger.info("Initialization already in progress, skipping...")
        return False
    
    is_initializing = True
    
    try:
        logger.info(f"Attempting to connect to backend at {BACKEND_URL}...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{BACKEND_URL}/api/products/categories/list")
            response.raise_for_status()
            
            data = response.json()
            categories = data.get("categories", [])
            
            all_products = []
            
            for cat in categories:
                category_name = cat.get("name")
                product_data_list = cat.get("products", [])
                
                if not product_data_list:
                    logger.warning(f"No products found for category {category_name}")
                    continue
                
                # Convert product data to Product objects
                for product_data in product_data_list:
                    try:
                        product = create_product_from_dict(product_data)
                        all_products.append(product)
                    except Exception as e:
                        logger.error(f"Error creating product from data: {e}")
                        continue
                
                logger.info(f"Loaded {len(product_data_list)} products from category {category_name}")
            
            if all_products:
                recommendation_system = SimplifiedRecommendationSystem(all_products)
                logger.info(f"✓ Successfully initialized recommendation system with {len(all_products)} total products")
                
                # Load all existing interactions to train the system
                await load_all_interactions()
                is_initializing = False
                return True
            else:
                logger.warning("No products found to initialize recommendation system")
                is_initializing = False
                return False
                    
    except Exception as e:
        logger.error(f"✗ Failed to initialize recommendation system: {e}")
        is_initializing = False
        return False

async def retry_initialization_task():
    """Background task to retry initialization if it fails"""
    global recommendation_system
    
    retry_count = 0
    delay = INIT_RETRY_DELAY
    
    while recommendation_system is None and retry_count < MAX_INIT_RETRIES:
        retry_count += 1
        logger.info(f"Retrying initialization (attempt {retry_count}/{MAX_INIT_RETRIES}) in {delay} seconds...")
        await asyncio.sleep(delay)
        
        success = await initialize_recommendation_system()
        
        if success:
            logger.info("✓ Recommendation system successfully initialized on retry!")
            return
        
        # Exponential backoff with max limit
        delay = min(delay * 2, MAX_RETRY_DELAY)
    
    if recommendation_system is None:
        logger.error(f"✗ Failed to initialize recommendation system after {MAX_INIT_RETRIES} attempts. Will continue retrying indefinitely...")
        
        # Continue retrying indefinitely with max delay
        while recommendation_system is None:
            await asyncio.sleep(MAX_RETRY_DELAY)
            logger.info("Attempting to initialize recommendation system...")
            success = await initialize_recommendation_system()
            if success:
                logger.info("✓ Recommendation system successfully initialized!")
                return

async def load_all_interactions():
    """Load all user interactions from backend to train the system"""
    global recommendation_system
    
    if not recommendation_system:
        return
    system = recommendation_system
    
    try:
        async with httpx.AsyncClient() as client:
            # Get all interactions from backend
            response = await client.get(f"{BACKEND_URL}/api/users/interactions/all")
            response.raise_for_status()
            
            data = response.json()
            interactions_data = data.get("interactions", [])
            
            # Convert to UserInteraction objects
            all_interactions = []
            for interaction_data in interactions_data:
                try:
                    interaction = create_interaction_from_dict(interaction_data)
                    all_interactions.append(interaction)
                except Exception as e:
                    logger.error(f"Error creating interaction from data: {e}")
                    continue
            
            if all_interactions:
                system.update_from_interactions(all_interactions)
                logger.info(f"Trained recommendation system with {len(all_interactions)} interactions")
            else:
                logger.info("No interactions found - system ready for new users")
                
    except Exception as e:
        logger.error(f"Error loading interactions: {e}")

async def get_user_interactions(user_id: str) -> List[UserInteraction]:
    """Get user interactions from backend"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/users/interactions/{user_id}")
            response.raise_for_status()
            
            data = response.json()
            interactions = data.get("interactions", [])
            
            # Convert to UserInteraction objects
            user_interactions = []
            for interaction_data in interactions:
                try:
                    interaction = create_interaction_from_dict(interaction_data)
                    user_interactions.append(interaction)
                except Exception as e:
                    logger.error(f"Error creating interaction from data: {e}")
                    continue
            
            logger.info(f"Retrieved {len(user_interactions)} user interactions for user {user_id}")
            return user_interactions
            
    except Exception as e:
        logger.error(f"Error getting user interactions: {e}")
        return []

def check_system_initialized() -> None:
    """Check if recommendation system is initialized and raise appropriate error if not"""
    global recommendation_system, is_initializing, initialization_task
    
    if not recommendation_system:
        if is_initializing or (initialization_task and not initialization_task.done()):
            raise HTTPException(
                status_code=503, 
                detail="Recommendation system is still initializing. Please wait and try again in a few moments. Check /health endpoint for status."
            )
        else:
            raise HTTPException(
                status_code=503, 
                detail="Recommendation system failed to initialize. Backend may be unavailable. Check /health endpoint for details."
            )

def get_recommendation_system() -> SimplifiedRecommendationSystem:
    """Return initialized recommendation system or raise an HTTP error."""
    check_system_initialized()
    assert recommendation_system is not None
    return recommendation_system

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize recommendation system on startup and clean up on shutdown."""
    global initialization_task
    
    logger.info("Starting up simplified ML service...")
    
    # Try to initialize immediately
    success = await initialize_recommendation_system()
    
    if not success:
        logger.warning("Initial initialization failed. Starting background retry task...")
        # Start background task to keep retrying
        initialization_task = asyncio.create_task(retry_initialization_task())
    
    logger.info("Simplified ML service startup complete")
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down simplified ML service...")
    if initialization_task and not initialization_task.done():
        initialization_task.cancel()
        try:
            await initialization_task
        except asyncio.CancelledError:
            pass

# FastAPI app initialization
app = FastAPI(
    title="Walmart Hackathon ML Service - Simplified",
    description="Simplified ML and recommendation service using user feedback learning",
    version="2.0.0",
    lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Walmart Hackathon Simplified ML Service is running!"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    global recommendation_system, total_recommendations_served, is_initializing, initialization_task
    
    try:
        # Test backend connection
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BACKEND_URL}/health")
            backend_status = "healthy" if response.status_code == 200 else "unhealthy"
    except Exception as e:
        backend_status = f"unreachable: {str(e)}"
    
    # Get system stats
    system_initialized = recommendation_system is not None
    stats = {}
    if system_initialized and recommendation_system is not None:
        stats = recommendation_system.get_system_stats()
    
    # Check if retry task is running
    retry_task_running = initialization_task is not None and not initialization_task.done()
    
    return {
        "status": "healthy" if system_initialized else "initializing",
        "timestamp": datetime.now().isoformat(),
        "backend_connection": backend_status,
        "service": "simplified-ml-service",
        "system_initialized": system_initialized,
        "is_initializing": is_initializing,
        "retry_task_active": retry_task_running,
        "total_products": stats.get("total_products", 0),
        "total_users": stats.get("total_users", 0),
        "total_interactions": stats.get("total_interactions", 0),
        "total_recommendations_served": total_recommendations_served
    }

@app.post("/system/refresh")
async def refresh_system():
    """Refresh the entire recommendation system with latest data"""
    try:
        await initialize_recommendation_system()
        
        stats = {}
        if recommendation_system:
            stats = recommendation_system.get_system_stats()
        
        return {
            "status": "success",
            "message": "Recommendation system refreshed successfully",
            "total_products": stats.get("total_products", 0),
            "total_users": stats.get("total_users", 0),
            "total_interactions": stats.get("total_interactions", 0),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error refreshing system: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh recommendation system")

@app.get("/recommend/{user_id}")
async def get_recommendations(
    user_id: str,
    category: Optional[str] = None,
    n_products: int = 5,
    recommendation_type: str = "adaptive"
):
    """
    Get personalized product recommendations for a specific user
    """
    global recommendation_system, total_recommendations_served
    
    system = get_recommendation_system()
    
    try:
        # Get recommendations from simplified system
        result = system.get_recommendations(
            user_id=user_id,
            n_products=n_products,
            exclude_products=[],
            category_filter=category
        )
        
        recommendations = result["recommendations"]
        metadata = result["metadata"]
        
        # Update total count
        total_recommendations_served += 1
        
        if not recommendations:
            return {
                "user_id": user_id,
                "category": category,
                "recommended_product": None,
                "recommendations": [],
                "count": 0,
                "message": "No recommendations available",
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "user_id": user_id,
            "category": category,
            "recommended_product": recommendations[0]["id"],  # For backward compatibility
            "recommendations": recommendations,
            "count": len(recommendations),
            "message": f"Recommendations generated using {metadata['recommendation_source']}",
            "metadata": metadata,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return {
            "user_id": user_id,
            "category": category,
            "recommended_product": None,
            "recommendations": [],
            "count": 0,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/recommend/{user_id}/cold_start")
async def get_cold_start_recommendations(
    user_id: str,
    category: Optional[str] = None,
    n_products: int = 5
):
    """
    Get cold start recommendations for new users
    """
    global recommendation_system
    
    system = get_recommendation_system()
    
    try:
        # Force new user treatment by passing empty interaction history
        result = system.get_recommendations(
            user_id=user_id,
            n_products=n_products,
            exclude_products=[],
            category_filter=category
        )
        
        return {
            "user_id": user_id,
            "category": category,
            "recommendations": result["recommendations"],
            "count": len(result["recommendations"]),
            "recommendation_type": "cold_start",
            "metadata": result["metadata"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting cold start recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cold start recommendations")

@app.post("/feedback/record")
async def record_user_feedback(request: FeedbackRequest):
    """
    Record user feedback (tick/cross) for real-time learning
    This endpoint allows immediate updates without waiting for database sync
    """
    print(f"Received request: {request}")
    print(f"user_id: {request.user_id}")
    print(f"product_id: {request.product_id}")
    print(f"action: {request.action}")
    print(f"reward: {request.reward}")
    global recommendation_system
    
    system = get_recommendation_system()
    
    # Calculate reward if not provided
    if request.reward is None:
        reward_mapping = {
            'tick': 1.0,
            'cross': -0.5,
            'view': 0.1,
            'cart_add': 0.8,
            'purchase': 2.0,
            'ar_view': 0.3
        }
        reward = reward_mapping.get(request.action, 0.0)
    else:
        reward = request.reward
    
    try:
        # Get product info
        product = system.products.get(request.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Create interaction object
        interaction = UserInteraction(
            id=f"realtime_{request.user_id}_{request.product_id}_{int(datetime.now().timestamp())}",
            userId=request.user_id,
            productId=request.product_id,
            action=request.action,
            reward=reward,
            context={"source": "realtime_feedback"},
            createdAt=datetime.now().isoformat(),
            product=product
        )
        
        # Record the interaction
        system.record_single_interaction(interaction)
        
        return {
            "status": "success",
            "message": f"Recorded {request.action} feedback for user {request.user_id} on product {request.product_id}",
            "user_id": request.user_id,
            "product_id": request.product_id,
            "action": request.action,
            "reward": reward,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to record feedback")

@app.get("/stats/system")
async def get_system_stats():
    """Get overall system statistics"""
    global recommendation_system, total_recommendations_served
    
    system = get_recommendation_system()
    
    try:
        stats = system.get_system_stats()
        stats["total_recommendations_served"] = total_recommendations_served
        stats["timestamp"] = datetime.now().isoformat()
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system statistics")

@app.get("/stats/user/{user_id}")
async def get_user_stats(user_id: str):
    """Get statistics for a specific user"""
    global recommendation_system
    
    system = get_recommendation_system()
    
    try:
        user_stats = system.get_user_stats(user_id)
        user_stats["timestamp"] = datetime.now().isoformat()
        
        return user_stats
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user statistics")

@app.post("/users/{user_id}/sync")
async def sync_user_data(user_id: str):
    """
    Sync a specific user's data from the backend
    Useful when you know a user has new interactions in the database
    """
    global recommendation_system
    
    system = get_recommendation_system()
    
    try:
        # Get latest user interactions from backend
        user_interactions = await get_user_interactions(user_id)
        
        if user_interactions:
            # Update system with user's interactions
            system.update_from_interactions(user_interactions)
            
            return {
                "status": "success",
                "message": f"Synced {len(user_interactions)} interactions for user {user_id}",
                "user_id": user_id,
                "interactions_synced": len(user_interactions),
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "success",
                "message": f"No interactions found for user {user_id}",
                "user_id": user_id,
                "interactions_synced": 0,
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Error syncing user data: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync user data")

# Backward compatibility endpoints to match your existing API
@app.post("/bandits/refresh/{userId}")
async def refresh_bandits(userId: str):
    """Backward compatibility - refresh user data"""
    return await sync_user_data(userId)

@app.get("/bandits/stats")
async def get_bandit_stats():
    """Backward compatibility - get system stats"""
    return await get_system_stats()

@app.get("/bandits/contexts")
async def list_contexts():
    """Backward compatibility - list available contexts"""
    global recommendation_system
    
    system = get_recommendation_system()
    
    try:
        stats = system.get_system_stats()
        
        # Group products by category to show contexts
        category_counts = {}
        for product_id, product in system.products.items():
            category = product.category
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += 1
        
        contexts = []
        for category, count in category_counts.items():
            contexts.append({
                "context": category,
                "product_count": count,
                "total_interactions": stats.get("total_interactions", 0) // len(category_counts),
                "usage_count": stats.get("total_interactions", 0) // len(category_counts),
                "bandit_type": "simplified_learning"
            })
        
        return {
            "contexts": contexts,
            "total_count": len(contexts),
            "total_recommendations": total_recommendations_served,
            "cold_start_available": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing contexts: {e}")
        raise HTTPException(status_code=500, detail="Failed to list contexts")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)