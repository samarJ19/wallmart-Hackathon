from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import httpx
import os
from datetime import datetime
import json
from typing import List, Dict, Any, Optional
import logging

# Import MAB classes and utility functions from bandit.py
from models.bandit import (
    BanditManager, 
    UserInteraction,
    Product,
    ProductFeatures,
    create_product_from_dict,  # Now imported from bandit.py
    create_interaction_from_dict # Now imported from bandit.py
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = FastAPI(
    title="Walmart Hackathon ML Service",
    description="ML and recommendation service with Multi-Armed Bandit algorithms",
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

# Global bandit manager
bandit_manager = BanditManager(
    default_bandit_type="ucb",  # Use UCB as default
    default_epsilon=0.1,
    default_confidence_level=2.0
)

async def get_http_client():
    """Get HTTP client for backend communication"""
    return httpx.AsyncClient(timeout=30.0)

# Removed duplicate create_product_from_dict and create_interaction_from_dict
# as they are now imported from models.bandit

async def initialize_bandits_from_categories():
    """Initialize bandits for different product categories"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/products/categories/list")
            response.raise_for_status()
            
            data = response.json()
            categories = data.get("categories", [])
            
            all_products = []
            category_contexts = []
            
            for cat in categories:
                category_name = cat.get("name")
                product_data_list = cat.get("products", [])
                
                if not product_data_list:
                    logger.warning(f"No products found for category {category_name}")
                    continue
                
                # Convert product data to Product objects
                category_products = []
                for product_data in product_data_list:
                    try:
                        product = create_product_from_dict(product_data)
                        category_products.append(product)
                        all_products.append(product)
                    except Exception as e:
                        logger.error(f"Error creating product from data: {e}")
                        continue
                
                if category_products:
                    category_contexts.append(category_name)
                    logger.info(f"Prepared {len(category_products)} products for category {category_name}")
            
            # Initialize bandits with all products and contexts using the new method
            if all_products:
                bandit_manager.initialize_system(all_products, category_contexts)
                logger.info(f"Initialized bandits for {len(category_contexts)} categories with {len(all_products)} total products")
            else:
                logger.warning("No products found to initialize bandits")
                    
    except Exception as e:
        logger.error(f"Error initializing bandits from categories: {e}")

async def get_user_interactions(userId: str) -> List[UserInteraction]:
    """Get user interactions from backend"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BACKEND_URL}/api/users/interactions/{userId}")
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
            
            logger.info(f"Retrieved {len(user_interactions)} user interactions")
            return user_interactions
            
    except Exception as e:
        logger.error(f"Error getting user interactions: {e}")
        return []

@app.on_event("startup")
async def startup_event():
    """Initialize bandits on startup"""
    logger.info("Starting up ML service...")
    await initialize_bandits_from_categories()
    logger.info("ML service startup complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Walmart Hackathon ML Service with Advanced MAB is running!"}

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
    
    # Get bandit manager stats using the new method
    stats = bandit_manager.get_system_overview_stats()
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "backend_connection": backend_status,
        "service": "ml-service",
        "active_contexts": list(bandit_manager.bandits.keys()), # This needs to be fetched from stats if possible
        "total_contexts": stats["active_bandits_count"], # Renamed from total_contexts
        "cold_start_available": stats["cold_start_recommender_initialized"],
        "total_recommendations": stats["total_recommendations_served_system_wide"]
    }

@app.post("/bandits/refresh/{userId}")
async def refresh_bandits(userId: str):
    """Refresh bandits with current user's latest interaction data"""
    try:
        # Get user interactions
        user_interactions = await get_user_interactions(userId)
        
        if user_interactions:
            # Group interactions by product category
            category_interactions: Dict[str, List[UserInteraction]] = {}
            
            for interaction in user_interactions:
                product_category = interaction.product.category
                
                if product_category not in category_interactions:
                    category_interactions[product_category] = []
                category_interactions[product_category].append(interaction)
            
            # Update each context with relevant interactions using the new method
            for context, interactions in category_interactions.items():
                bandit_manager.update_bandit_data(context, interactions)
                logger.info(f"Updated context {context} with {len(interactions)} interactions")
        
        stats = bandit_manager.get_system_overview_stats() # Use new stats method
        
        return {
            "status": "success",
            "message": f"Bandits refreshed with {len(user_interactions)} user interactions",
            "active_contexts": list(bandit_manager.bandits.keys()), # Still can get directly
            "total_contexts": stats["active_bandits_count"], # Use new stats field
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error refreshing bandits: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh bandits")

@app.get("/recommend/{user_id}")
async def get_recommendations(
    user_id: str,
    category: str = "global",
    n_products: int = 5,
    recommendation_type: str = "adaptive"  # 'bandit', 'cold_start', 'adaptive', 'trending'
):
    """
    Get personalized product recommendations for a specific user using Multi-Armed Bandit algorithm
    """
    try:
        # Get user interactions (used to determine if new user)
        user_interactions = await get_user_interactions(user_id)
        # Get recommendations using the new BanditManager interface
        recommendations_response = bandit_manager.get_recommendations(
    user_id=user_id,
    n_products=n_products,
    context="global",  # This will now use ALL bandits
    user_interactions_count=len(user_interactions),
    exclude_products=[],
    recommendation_strategy="bandit"  # or "adaptive"
)
        
        # Extract recommended products
        recommendations = recommendations_response["recommendations"]
        
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
            "message": f"Recommendations generated using {recommendations_response['metadata']['recommendation_source']}",
            "metadata": recommendations_response["metadata"],
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
    n_products: int = 5,
    recommendation_type: str = "cold_start"  # 'cold_start', 'trending'
):
    """
    Get cold start recommendations for new users
    """
    try:
        # Map old recommendation_type to new recommendation_strategy
        rec_strategy = "cold_start"
        if recommendation_type == "trending":
            rec_strategy = "trending"
        
        recommendations_response = bandit_manager.get_recommendations(
            user_id=user_id,
            n_products=n_products,
            context=category or "global",
            user_interactions_count=0,  # Always 0 for cold start
            exclude_products=[],
            recommendation_strategy=rec_strategy # Use new parameter name
        )
        
        return {
            "user_id": user_id,
            "category": category,
            "recommendations": recommendations_response["recommendations"],
            "count": len(recommendations_response["recommendations"]),
            "recommendation_type": recommendation_type,
            "metadata": recommendations_response["metadata"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting cold start recommendations: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cold start recommendations")

@app.get("/bandits/stats")
async def get_bandit_stats(context: Optional[str] = None):
    """Get statistics for bandits"""
    try:
        if context:
            # Get stats for specific context using the new method
            stats = bandit_manager.get_bandit_stats(context)
            if stats is None:
                raise HTTPException(status_code=404, detail=f"Context '{context}' not found")
            
            return {
                "context": context,
                "stats": stats,
                "timestamp": datetime.now().isoformat()
            }
        else:
            # Get stats for all contexts using the new method
            all_stats = bandit_manager.get_system_overview_stats()
            
            return {
                "all_stats": all_stats,
                "timestamp": datetime.now().isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bandit stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bandit statistics")

@app.post("/bandits/{context}/update")
async def update_bandit_reward(
    context: str,
    product_id: str,
    reward: float
):
    """Update a bandit with a single reward (for real-time updates)"""
    try:
        bandit_manager.record_interaction(context, product_id, reward) # Use new method
        
        return {
            "status": "success",
            "message": f"Updated context '{context}' with reward {reward} for product '{product_id}'",
            "context": context,
            "product_id": product_id,
            "reward": reward,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating bandit: {e}")
        raise HTTPException(status_code=500, detail="Failed to update bandit")

@app.get("/bandits/contexts")
async def list_contexts():
    """List all available contexts (bandits)"""
    try:
        stats = bandit_manager.get_system_overview_stats() # Use new stats method
        context_info = []
        
        # Iterate over bandit_details, which now contains stats for each bandit
        for context, context_stats in stats["bandit_details"].items():
            if context_stats: # Ensure stats are not None
                context_info.append({
                    "context": context,
                    "product_count": context_stats["product_count"],
                    "total_interactions": context_stats["total_interactions_recorded"], # Renamed
                    "usage_count": context_stats["total_interactions_recorded"], # Using same for usage count
                    "bandit_type": context_stats["type"] # Renamed
                })
        
        return {
            "contexts": context_info,
            "total_count": len(context_info),
            "total_recommendations": stats["total_recommendations_served_system_wide"],
            "cold_start_available": stats["cold_start_recommender_initialized"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error listing contexts: {e}")
        raise HTTPException(status_code=500, detail="Failed to list contexts")

# Removed get_recommendation_history endpoint as it's no longer supported by BanditManager

@app.post("/bandits/{context}/reset")
async def reset_context_stats(context: str):
    """Reset statistics for a specific context"""
    try:
        success = bandit_manager.reset_bandit(context) # Use new method
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Context '{context}' not found")
        
        return {
            "status": "success",
            "message": f"Reset statistics for context '{context}'",
            "context": context,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting context: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset context")

@app.post("/bandits/reset_all")
async def reset_all_stats():
    """Reset all statistics for all contexts"""
    try:
        bandit_manager.reset_all_bandits() # Use new method
        
        return {
            "status": "success",
            "message": "Reset all bandit statistics",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error resetting all stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset all statistics")

# Removed export_bandit_stats endpoint as it's no longer supported by BanditManager

# Backward compatibility endpoints
@app.get("/bandits/list")
async def list_bandits():
    """List all available bandits (backward compatibility)"""
    return await list_contexts()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)