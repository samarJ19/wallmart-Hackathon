"""
Cold start recommendation strategy for new users.
Handles the cold start problem by recommending popular/trending products.
"""
import logging
from typing import List, Dict, Optional
import numpy as np

from models.data_models import Product
from utils.helpers import get_price_bucket

logger = logging.getLogger(__name__)


class ColdStartRecommender:
    """
    Recommends products to new users without interaction history.
    Uses content-based scoring based on product features and popularity.
    """
    
    def __init__(self, products: Dict[str, Product]):
        self.products = products
        self._product_scores = self._calculate_product_scores()
    
    def _calculate_product_scores(self) -> Dict[str, float]:
        """
        Calculate content-based scores for all products.
        Combines rating, review count, and recency.
        """
        scores = {}
        
        if not self.products:
            return scores
        
        # Get normalization parameters
        ratings = [p.rating for p in self.products.values() if p.rating]
        review_counts = [p.review_count for p in self.products.values() if p.review_count]
        
        max_rating = max(ratings) if ratings else 5.0
        max_reviews = max(review_counts) if review_counts else 100
        
        for product_id, product in self.products.items():
            # Normalize rating (0-1)
            rating_score = (product.rating / max_rating) if max_rating > 0 else 0
            
            # Normalize review count (0-1)
            review_score = (product.review_count / max_reviews) if max_reviews > 0 else 0
            
            # Combined score with weights
            # 50% from rating, 40% from reviews, 10% from availability
            score = (
                0.5 * rating_score +
                0.4 * review_score +
                0.1  # Base score for availability
            )
            
            scores[product_id] = score
        
        return scores
    
    def get_recommendations(
        self,
        n_products: int = 5,
        exclude_products: Optional[List[str]] = None,
        category_filter: Optional[str] = None
    ) -> List[Product]:
        """
        Get cold start recommendations for a new user.
        
        Args:
            n_products: Number of products to recommend
            exclude_products: Product IDs to exclude
            category_filter: Optional category to filter by
        
        Returns:
            List of recommended products
        """
        exclude_products = exclude_products or []
        
        # Filter products
        candidates = []
        for product_id, product in self.products.items():
            if product_id in exclude_products:
                continue
            if category_filter and product.category.lower() != category_filter.lower():
                continue
            
            score = self._product_scores.get(product_id, 0)
            candidates.append((product, score))
        
        # Sort by score
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Add diversification: recommend from different categories
        recommendations = []
        category_counts = {}
        
        for product, score in candidates:
            # Allow at most ceil(n_products/num_categories) from each category
            category = product.category.lower()
            current_count = category_counts.get(category, 0)
            
            # Soft limit on same category (can exceed slightly)
            if current_count >= max(1, n_products // 3):
                continue
            
            recommendations.append(product)
            category_counts[category] = current_count + 1
            
            if len(recommendations) >= n_products:
                break
        
        # If not enough diverse products, fill with top products
        if len(recommendations) < n_products:
            for product, _ in candidates:
                if product not in recommendations:
                    recommendations.append(product)
                    if len(recommendations) >= n_products:
                        break
        
        logger.info(f"Generated {len(recommendations)} cold start recommendations")
        return recommendations[:n_products]
    
    def get_category_recommendations(
        self,
        category: str,
        n_products: int = 5,
        exclude_products: Optional[List[str]] = None
    ) -> List[Product]:
        """Get top products for a specific category"""
        exclude_products = exclude_products or []
        
        candidates = []
        for product_id, product in self.products.items():
            if product_id in exclude_products:
                continue
            if product.category.lower() != category.lower():
                continue
            
            score = self._product_scores.get(product_id, 0)
            candidates.append((product, score))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [p for p, _ in candidates[:n_products]]
