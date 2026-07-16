"""Data models and schemas for the recommendation service"""
from .data_models import Product, UserInteraction, UserPreferences, RecommendationResult
from .schemas import FeedbackRequest, RecommendationQuery, ProductResponse, RecommendationResponse

__all__ = [
    "Product",
    "UserInteraction",
    "UserPreferences",
    "RecommendationResult",
    "FeedbackRequest",
    "RecommendationQuery",
    "ProductResponse",
    "RecommendationResponse"
]
