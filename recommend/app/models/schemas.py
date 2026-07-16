"""
Pydantic models for API request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FeedbackRequest(BaseModel):
    """Request model for recording user feedback"""
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID")
    action: str = Field(..., description="Action type: view, tick, cross, cart_add, purchase, ar_view")
    reward: Optional[float] = Field(None, description="Reward value (optional, will be calculated)")


class RecommendationQuery(BaseModel):
    """Request model for getting recommendations"""
    n_products: int = Field(5, ge=1, le=50, description="Number of products to recommend")
    category_filter: Optional[str] = Field(None, description="Optional category filter")
    exclude_products: Optional[List[str]] = Field(None, description="Product IDs to exclude")


class ProductResponse(BaseModel):
    """Response model for a product"""
    id: str
    name: str
    price: float
    category: str
    brand: str
    imageUrl: str
    rating: float = 0.0
    review_count: int = 0
    ar_enabled: bool = False


class RecommendationResponse(BaseModel):
    """Response model for recommendations"""
    user_id: str
    recommendations: List[ProductResponse]
    metadata: dict = Field(
        default_factory=dict,
        description="Metadata about the recommendations"
    )


class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status: healthy, initializing, unhealthy")
    products_loaded: int = Field(..., description="Number of products loaded")
    users_tracked: int = Field(..., description="Number of users with interactions")
    initialized: bool = Field(..., description="Whether service is fully initialized")
    backend_connected: bool = Field(..., description="Whether backend is connected")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class StatsResponse(BaseModel):
    """Response model for system statistics"""
    total_products: int
    total_users: int
    total_interactions: int
    total_recommendations_served: int
    average_recommendation_time_ms: float = 0.0
    cache_stats: dict = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
