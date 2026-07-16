"""
API routes for the recommendation service.
"""
from fastapi import APIRouter, HTTPException, Query
import logging
from typing import Optional, List

from models import FeedbackRequest, RecommendationResponse, StatsResponse
from services import RecommendationEngine
from services.backend_client import BackendClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["recommendations"])


# Global references (will be set from main.py)
recommendation_engine: Optional[RecommendationEngine] = None
backend_client: Optional[BackendClient] = None


def set_engine(engine: RecommendationEngine) -> None:
    """Set the recommendation engine instance"""
    global recommendation_engine
    recommendation_engine = engine


def set_backend_client(client: BackendClient) -> None:
    """Set the backend client instance"""
    global backend_client
    backend_client = client


@router.get("/recommend/{user_id}")
async def get_recommendations(
    user_id: str,
    n_products: int = Query(5, ge=1, le=50),
    category_filter: Optional[str] = Query(None),
    exclude_products: Optional[List[str]] = Query(None)
) -> RecommendationResponse:
    """
    Get personalized product recommendations for a user.
    
    Automatically handles cold start for new users.
    """
    if recommendation_engine is None:
        raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
    
    try:
        result = recommendation_engine.get_recommendations(
            user_id=user_id,
            n_products=n_products,
            exclude_products=exclude_products,
            category_filter=category_filter
        )
        
        return RecommendationResponse(
            user_id=result.user_id,
            recommendations=[
                {
                    "id": p.id,
                    "name": p.name,
                    "price": p.price,
                    "category": p.category,
                    "brand": p.brand,
                    "imageUrl": p.imageUrl,
                    "rating": p.rating,
                    "review_count": p.review_count,
                    "ar_enabled": p.ar_enabled
                }
                for p in result.products
            ],
            metadata={
                "recommendation_source": result.source,
                "is_new_user": result.is_new_user,
                "user_interaction_count": result.interaction_count,
                "total_recommended_count": len(result.products),
                "timestamp": result.timestamp
            }
        )
    
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        raise HTTPException(status_code=500, detail="Error generating recommendations")


@router.post("/feedback")
async def record_feedback(feedback: FeedbackRequest) -> dict:
    """
    Record user feedback (interaction) with a product.
    
    Actions: 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
    """
    if backend_client is None:
        raise HTTPException(status_code=503, detail="Backend client not initialized")
    
    try:
        success = await backend_client.record_feedback(
            user_id=feedback.user_id,
            product_id=feedback.product_id,
            action=feedback.action
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to record feedback")
        
        return {
            "status": "success",
            "message": "Feedback recorded successfully",
            "user_id": feedback.user_id,
            "product_id": feedback.product_id,
            "action": feedback.action
        }
    
    except Exception as e:
        logger.error(f"Error recording feedback: {e}")
        raise HTTPException(status_code=500, detail="Error recording feedback")


@router.get("/stats")
async def get_stats() -> StatsResponse:
    """Get system statistics"""
    if recommendation_engine is None:
        raise HTTPException(status_code=503, detail="Recommendation engine not initialized")
    
    stats = recommendation_engine.get_stats()
    
    return StatsResponse(
        total_products=stats["backend_status"]["products_loaded"],
        total_users=stats["personalization_stats"]["total_users"],
        total_interactions=stats["personalization_stats"]["total_interactions"],
        total_recommendations_served=stats["total_recommendations_served"],
        average_recommendation_time_ms=stats["average_recommendation_time_ms"],
        cache_stats={"message": "Caching enabled for performance"}
    )


@router.get("/health")
async def health_check() -> dict:
    """Check service health status"""
    if backend_client is None:
        return {
            "status": "initializing",
            "products_loaded": 0,
            "users_tracked": 0,
            "initialized": False,
            "backend_connected": False
        }
    
    stats = recommendation_engine.get_stats() if recommendation_engine else {}
    
    return {
        "status": "healthy" if backend_client.is_connected else "unhealthy",
        "products_loaded": len(backend_client.get_all_products()),
        "users_tracked": stats.get("personalization_stats", {}).get("total_users", 0),
        "initialized": backend_client.is_connected,
        "backend_connected": backend_client.is_connected
    }
