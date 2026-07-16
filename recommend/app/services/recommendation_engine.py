"""
Main recommendation engine that orchestrates all recommendation logic.
Combines cold start, personalization, and popularity strategies.
"""
import logging
from typing import List, Dict, Optional
import numpy as np

from models.data_models import Product, RecommendationResult
from services.backend_client import BackendClient
from services.cold_start import ColdStartRecommender
from services.personalization import PersonalizationEngine
from config import Config
from utils.helpers import weighted_average

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Main recommendation engine that generates personalized product recommendations.
    Combines multiple strategies: popularity, cold start, and personalized recommendations.
    """
    
    def __init__(
        self,
        backend_client: BackendClient,
        cold_start_recommender: ColdStartRecommender,
        personalization_engine: PersonalizationEngine
    ):
        self.backend_client = backend_client
        self.cold_start_recommender = cold_start_recommender
        self.personalization_engine = personalization_engine
        
        # Statistics
        self.total_recommendations_served = 0
        self.recommendation_times = []
    
    def get_recommendations(
        self,
        user_id: str,
        n_products: int = 5,
        exclude_products: Optional[List[str]] = None,
        category_filter: Optional[str] = None
    ) -> RecommendationResult:
        """
        Generate recommendations for a user.
        Automatically selects strategy based on user history.
        
        Args:
            user_id: User ID
            n_products: Number of products to recommend
            exclude_products: Products to exclude
            category_filter: Optional category filter
        
        Returns:
            RecommendationResult with recommended products
        """
        import time
        start_time = time.time()
        
        exclude_products = exclude_products or []
        
        # Get user preferences
        user_prefs = self.personalization_engine.get_user_preferences(user_id)
        is_new_user = user_prefs.interaction_count == 0
        
        # Select strategy based on user history
        if is_new_user:
            # Cold start: new user with no interactions
            logger.info(f"Using cold start strategy for new user {user_id}")
            products = self.cold_start_recommender.get_recommendations(
                n_products=n_products,
                exclude_products=exclude_products,
                category_filter=category_filter
            )
            source = "cold_start"
        
        elif user_prefs.interaction_count < Config.COLD_START_THRESHOLD:
            # Hybrid: user with some interactions but not enough for full personalization
            logger.info(f"Using hybrid strategy for user {user_id} ({user_prefs.interaction_count} interactions)")
            products = self._get_hybrid_recommendations(
                user_id=user_id,
                n_products=n_products,
                exclude_products=exclude_products,
                category_filter=category_filter
            )
            source = "hybrid"
        
        else:
            # Personalized: user with enough interaction history
            logger.info(f"Using personalized strategy for user {user_id} ({user_prefs.interaction_count} interactions)")
            products = self._get_personalized_recommendations(
                user_id=user_id,
                n_products=n_products,
                exclude_products=exclude_products,
                category_filter=category_filter
            )
            source = "personalized"
        
        # Track metrics
        elapsed_ms = (time.time() - start_time) * 1000
        self.recommendation_times.append(elapsed_ms)
        self.total_recommendations_served += 1
        
        logger.info(f"Generated {len(products)} recommendations for {user_id} in {elapsed_ms:.2f}ms")
        
        return RecommendationResult(
            user_id=user_id,
            products=products,
            source=source,
            is_new_user=is_new_user,
            interaction_count=user_prefs.interaction_count
        )
    
    def _get_personalized_recommendations(
        self,
        user_id: str,
        n_products: int,
        exclude_products: List[str],
        category_filter: Optional[str]
    ) -> List[Product]:
        """Get personalized recommendations based on user preferences"""
        user_prefs = self.personalization_engine.get_user_preferences(user_id)
        
        # Define weights for scoring
        weights = {
            "category": Config.WEIGHT_CATEGORY,
            "brand": Config.WEIGHT_BRAND,
            "price": Config.WEIGHT_PRICE,
            "features": Config.WEIGHT_FEATURES,
            "quality": Config.WEIGHT_GLOBAL_SCORE
        }
        
        # Score all products
        scored_products = []
        for product_id, product in self.backend_client.get_all_products().items():
            if product_id in exclude_products:
                continue
            if category_filter and product.category.lower() != category_filter.lower():
                continue
            
            score = self.personalization_engine.calculate_product_score(
                product=product,
                user_prefs=user_prefs,
                weights=weights
            )
            
            scored_products.append((product, score))
        
        # Sort by score
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Exploration vs Exploitation: mix deterministic top picks with random exploration
        deterministic_count = max(1, int(n_products * Config.DETERMINISTIC_RATE))
        
        if len(scored_products) <= deterministic_count:
            return [p for p, _ in scored_products[:n_products]]
        
        # Take top products deterministically
        top_products = [p for p, _ in scored_products[:deterministic_count]]
        
        # Explore from the rest
        remaining_products = [p for p, _ in scored_products[deterministic_count:]]
        exploration_count = n_products - deterministic_count
        
        if remaining_products and exploration_count > 0:
            explored_indices = np.random.choice(
                len(remaining_products),
                size=min(exploration_count, len(remaining_products)),
                replace=False
            )
            explored_products = [remaining_products[i] for i in explored_indices]
        else:
            explored_products = []
        
        return top_products + explored_products
    
    def _get_hybrid_recommendations(
        self,
        user_id: str,
        n_products: int,
        exclude_products: List[str],
        category_filter: Optional[str]
    ) -> List[Product]:
        """
        Get hybrid recommendations combining cold start and personalized approaches.
        Useful for users with limited interaction history.
        """
        # Get cold start recommendations (mostly popular products)
        cold_start_prods = self.cold_start_recommender.get_recommendations(
            n_products=int(n_products * 0.4),
            exclude_products=exclude_products,
            category_filter=category_filter
        )
        
        # Get personalized recommendations (based on limited history)
        personalized_prods = self._get_personalized_recommendations(
            user_id=user_id,
            n_products=int(n_products * 0.6),
            exclude_products=exclude_products + [p.id for p in cold_start_prods],
            category_filter=category_filter
        )
        
        # Combine and shuffle slightly
        all_prods = cold_start_prods + personalized_prods
        
        # Remove duplicates while preserving order
        seen = set()
        unique_prods = []
        for prod in all_prods:
            if prod.id not in seen:
                unique_prods.append(prod)
                seen.add(prod.id)
        
        return unique_prods[:n_products]
    
    def get_stats(self) -> Dict[str, any]:
        """Get recommendation engine statistics"""
        avg_recommendation_time = (
            np.mean(self.recommendation_times)
            if self.recommendation_times else 0.0
        )
        
        return {
            "total_recommendations_served": self.total_recommendations_served,
            "average_recommendation_time_ms": round(avg_recommendation_time, 2),
            "total_products": len(self.backend_client.get_all_products()),
            "personalization_stats": self.personalization_engine.get_stats(),
            "backend_status": self.backend_client.get_connection_status()
        }
