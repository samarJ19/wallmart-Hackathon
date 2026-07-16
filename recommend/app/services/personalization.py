"""
User personalization engine that learns from interactions.
Builds user preference profiles from their interaction history.
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime

from models.data_models import Product, UserInteraction, UserPreferences
from utils.helpers import get_price_bucket

logger = logging.getLogger(__name__)


class PersonalizationEngine:
    """
    Learns and maintains user preference profiles.
    Updates preferences based on user interactions.
    """
    
    def __init__(self, products: Dict[str, Product]):
        self.products = products
        self.user_preferences: Dict[str, UserPreferences] = {}
    
    def update_from_interactions(self, interactions: List[UserInteraction]) -> None:
        """
        Update all user preferences from interactions.
        This is called periodically to refresh preferences.
        """
        logger.info(f"Updating preferences from {len(interactions)} interactions")
        
        # Group interactions by user
        user_interactions = {}
        for interaction in interactions:
            if interaction.user_id not in user_interactions:
                user_interactions[interaction.user_id] = []
            user_interactions[interaction.user_id].append(interaction)
        
        # Update each user's preferences
        for user_id, user_interaction_list in user_interactions.items():
            self._update_user_preferences(user_id, user_interaction_list)
    
    def _update_user_preferences(
        self,
        user_id: str,
        interactions: List[UserInteraction]
    ) -> None:
        """Update preference profile for a specific user"""
        if not interactions:
            return
        
        prefs = UserPreferences(user_id=user_id, interaction_count=len(interactions))
        
        # Process each interaction
        for interaction in interactions:
            product = self.products.get(interaction.product_id)
            if not product:
                continue
            
            # Use pre-computed reward from backend
            reward = interaction.reward
            
            # Only process positive interactions for preference building
            if reward > 0:
                # Category preference
                category_key = product.category.lower()
                if category_key not in prefs.category_prefs:
                    prefs.category_prefs[category_key] = 0.0
                prefs.category_prefs[category_key] += reward * 0.3
                
                # Brand preference
                brand_key = product.brand.lower()
                if brand_key not in prefs.brand_prefs:
                    prefs.brand_prefs[brand_key] = 0.0
                prefs.brand_prefs[brand_key] += reward * 0.2
                
                # Price range preference
                price_range = get_price_bucket(product.price)
                price_key = price_range
                if price_key not in prefs.price_range_prefs:
                    prefs.price_range_prefs[price_key] = 0.0
                prefs.price_range_prefs[price_key] += reward * 0.15
                
                # Product feature preferences (if available)
                if product.features:
                    for feature_name, feature_value in product.features.items():
                        if isinstance(feature_value, (int, float)):
                            feature_key = feature_name
                            if feature_key not in prefs.feature_prefs:
                                prefs.feature_prefs[feature_key] = 0.0
                            prefs.feature_prefs[feature_key] += reward * float(feature_value) * 0.15
        
        # Normalize preferences to reasonable range (0-1)
        self._normalize_preferences(prefs)
        
        self.user_preferences[user_id] = prefs
    
    @staticmethod
    def _normalize_preferences(prefs: UserPreferences) -> None:
        """Normalize preference scores to 0-1 range"""
        # Normalize category preferences
        if prefs.category_prefs:
            max_score = max(prefs.category_prefs.values()) if prefs.category_prefs.values() else 1
            if max_score > 0:
                prefs.category_prefs = {
                    k: min(v / max_score, 1.0) for k, v in prefs.category_prefs.items()
                }
        
        # Normalize brand preferences
        if prefs.brand_prefs:
            max_score = max(prefs.brand_prefs.values()) if prefs.brand_prefs.values() else 1
            if max_score > 0:
                prefs.brand_prefs = {
                    k: min(v / max_score, 1.0) for k, v in prefs.brand_prefs.items()
                }
        
        # Normalize price range preferences
        if prefs.price_range_prefs:
            max_score = max(prefs.price_range_prefs.values()) if prefs.price_range_prefs.values() else 1
            if max_score > 0:
                prefs.price_range_prefs = {
                    k: min(v / max_score, 1.0) for k, v in prefs.price_range_prefs.items()
                }
        
        # Normalize feature preferences
        if prefs.feature_prefs:
            max_score = max(prefs.feature_prefs.values()) if prefs.feature_prefs.values() else 1
            if max_score > 0:
                prefs.feature_prefs = {
                    k: min(v / max_score, 1.0) for k, v in prefs.feature_prefs.items()
                }
    
    def get_user_preferences(self, user_id: str) -> UserPreferences:
        """Get preference profile for a user"""
        if user_id not in self.user_preferences:
            return UserPreferences(user_id=user_id, interaction_count=0)
        
        return self.user_preferences[user_id]
    
    def calculate_product_score(
        self,
        product: Product,
        user_prefs: UserPreferences,
        weights: Dict[str, float]
    ) -> float:
        """
        Calculate personalized score for a product based on user preferences.
        
        Args:
            product: Product to score
            user_prefs: User preference profile
            weights: Component weights (should sum to 1.0)
        
        Returns:
            Personalized score (0-1)
        """
        score = 0.0
        
        # Category preference
        category_key = product.category.lower()
        category_score = user_prefs.category_prefs.get(category_key, 0.0)
        score += category_score * weights.get("category", 0.3)
        
        # Brand preference
        brand_key = product.brand.lower()
        brand_score = user_prefs.brand_prefs.get(brand_key, 0.0)
        score += brand_score * weights.get("brand", 0.2)
        
        # Price range preference
        price_range = get_price_bucket(product.price)
        price_score = user_prefs.price_range_prefs.get(price_range, 0.0)
        score += price_score * weights.get("price", 0.15)
        
        # Feature preferences
        if product.features:
            feature_score = 0.0
            feature_count = 0
            for feature_name, feature_value in product.features.items():
                if isinstance(feature_value, (int, float)):
                    pref_value = user_prefs.feature_prefs.get(feature_name, 0.0)
                    feature_score += pref_value * float(feature_value)
                    feature_count += 1
            
            if feature_count > 0:
                score += (feature_score / feature_count) * weights.get("features", 0.15)
        
        # Product quality baseline
        quality_score = min(product.rating / 5.0, 1.0)  # Normalize to 0-1
        score += quality_score * weights.get("quality", 0.2)
        
        return min(score, 1.0)  # Cap at 1.0
    
    def get_stats(self) -> Dict[str, int]:
        """Get statistics about personalization"""
        total_interactions = sum(
            p.interaction_count for p in self.user_preferences.values()
        )
        
        return {
            "total_users": len(self.user_preferences),
            "total_interactions": total_interactions,
            "avg_interactions_per_user": (
                total_interactions / len(self.user_preferences)
                if self.user_preferences else 0
            )
        }
