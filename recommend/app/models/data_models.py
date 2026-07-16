"""
Core data models for the recommendation system.
Represents the fundamental data structures used throughout the service.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List


@dataclass
class Product:
    """Represents a product in the catalog"""
    id: str
    name: str
    description: str
    price: float
    category: str
    brand: str
    imageUrl: str
    features: Optional[Dict[str, Any]] = None
    rating: float = 0.0
    review_count: int = 0
    images: List[str] = field(default_factory=list)
    has_3d_model: bool = False
    ar_enabled: bool = False
    
    @property
    def price_range(self) -> str:
        """Categorize price into ranges"""
        if self.price < 100:
            return "budget"
        elif self.price < 500:
            return "mid_range"
        elif self.price < 1000:
            return "premium"
        else:
            return "luxury"


@dataclass
class UserInteraction:
    """Represents a user's interaction with a product"""
    id: str
    user_id: str
    product_id: str
    action: str  # 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
    reward: float  # Pre-computed reward value
    context: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    product: Optional[Product] = None
    
    @property
    def is_positive(self) -> bool:
        """Check if interaction is positive (non-negative reward)"""
        return self.reward > 0.0
    
    @property
    def is_explicit_positive(self) -> bool:
        """Check if user explicitly liked the product"""
        return self.action in ("tick", "purchase", "cart_add")
    
    @property
    def is_explicit_negative(self) -> bool:
        """Check if user explicitly disliked the product"""
        return self.action == "cross"


@dataclass
class UserPreferences:
    """Represents learned user preferences"""
    user_id: str
    category_prefs: Dict[str, float] = field(default_factory=dict)
    brand_prefs: Dict[str, float] = field(default_factory=dict)
    price_range_prefs: Dict[str, float] = field(default_factory=dict)
    feature_prefs: Dict[str, float] = field(default_factory=dict)
    interaction_count: int = 0
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())
    
    @property
    def preference_strength(self) -> float:
        """Overall strength of learned preferences (0-1)"""
        if self.interaction_count == 0:
            return 0.0
        # Normalize by interaction count (capped at 100 for scaling)
        return min(self.interaction_count / 100.0, 1.0)


@dataclass
class RecommendationResult:
    """Represents the result of a recommendation request"""
    user_id: str
    products: List[Product]
    source: str  # 'cold_start', 'personalized', 'popular', 'hybrid'
    is_new_user: bool
    interaction_count: int
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response"""
        return {
            "user_id": self.user_id,
            "recommendations": [
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
                for p in self.products
            ],
            "metadata": {
                "recommendation_source": self.source,
                "is_new_user": self.is_new_user,
                "user_interaction_count": self.interaction_count,
                "total_recommended_count": len(self.products),
                "timestamp": self.timestamp
            }
        }
