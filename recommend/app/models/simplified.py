"""
Simplified Recommendation System that works with existing database schema
Focuses on user feedback (tick/cross) without unnecessary complexity
"""
import numpy as np
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Product:
    """Product information"""
    id: str
    name: str
    description: str
    price: float
    category: str
    brand: str
    imageUrl: str
    features: Optional[Dict[str, Any]] = None  # JSON features from DB

@dataclass
class UserInteraction:
    """User interaction data"""
    id: str
    userId: str
    productId: str
    action: str  # 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
    reward: float  # Already computed reward from DB
    context: Optional[Dict[str, Any]]
    createdAt: str
    product: Product

class SimplifiedRecommendationSystem:
    """
    Simplified recommendation system that works with your existing data structure
    Focuses on learning user preferences from interactions with computed rewards
    """
    
    def __init__(self, products: List[Product]):
        self.products = {p.id: p for p in products}
        self.user_preferences = {}  # user_id -> {feature: weight, category: weight}
        self.product_scores = {}    # product_id -> cumulative score based on all user interactions
        self.user_interaction_counts = {}  # user_id -> number of interactions
        
        # Initialize product scores
        for product_id in self.products:
            self.product_scores[product_id] = 0.0
        
        logger.info(f"Initialized recommendation system with {len(products)} products")
    
    def update_from_interactions(self, interactions: List[UserInteraction]) -> None:
        """
        Update the system based on user interactions from database
        This replaces the complex bandit update logic
        """
        # Reset scores for fresh calculation
        for product_id in self.products:
            self.product_scores[product_id] = 0.0
        
        self.user_preferences = {}
        self.user_interaction_counts = {}
        
        # Group interactions by user
        user_interactions = {}
        for interaction in interactions:
            if interaction.userId not in user_interactions:
                user_interactions[interaction.userId] = []
            user_interactions[interaction.userId].append(interaction)
        
        # Process each user's interactions
        for user_id, user_interaction_list in user_interactions.items():
            self._update_user_preferences(user_id, user_interaction_list)
            self.user_interaction_counts[user_id] = len(user_interaction_list)
        
        # Update global product scores
        for interaction in interactions:
            self.product_scores[interaction.productId] += interaction.reward * 0.1
        
        logger.info(f"Updated system with {len(interactions)} interactions from {len(user_interactions)} users")
    
    def _update_user_preferences(self, user_id: str, interactions: List[UserInteraction]) -> None:
        """Update user preferences based on their interaction history"""
        if user_id not in self.user_preferences:
            self.user_preferences[user_id] = {}
        
        user_prefs = self.user_preferences[user_id]
        
        for interaction in interactions:
            product = self.products.get(interaction.productId)
            if not product:
                continue
            
            reward = interaction.reward
            
            # Update category preference
            category_key = f"category_{product.category.lower()}"
            if category_key not in user_prefs:
                user_prefs[category_key] = 0.0
            user_prefs[category_key] += reward * 0.2
            
            # Update brand preference
            brand_key = f"brand_{product.brand.lower()}"
            if brand_key not in user_prefs:
                user_prefs[brand_key] = 0.0
            user_prefs[brand_key] += reward * 0.15
            
            # Update price range preference
            price_range = self._get_price_range(product.price)
            price_key = f"price_range_{price_range}"
            if price_key not in user_prefs:
                user_prefs[price_key] = 0.0
            user_prefs[price_key] += reward * 0.1
            
            # Update preferences based on product features (if available)
            if product.features:
                for feature_name, feature_value in product.features.items():
                    if isinstance(feature_value, (int, float)):
                        feature_key = f"feature_{feature_name}"
                        if feature_key not in user_prefs:
                            user_prefs[feature_key] = 0.0
                        user_prefs[feature_key] += reward * feature_value * 0.1
            
            # Update action-specific preferences
            action_key = f"action_{interaction.action}"
            if action_key not in user_prefs:
                user_prefs[action_key] = 0.0
            user_prefs[action_key] += reward * 0.05
    
    def _get_price_range(self, price: float) -> str:
        """Categorize price into ranges"""
        if price < 100:
            return "budget"
        elif price < 500:
            return "mid_range"
        elif price < 1000:
            return "premium"
        else:
            return "luxury"
    
    def get_recommendations(self, user_id: str, n_products: int = 5,
                          exclude_products: Optional[List[str]] = None,
                          category_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        Get personalized recommendations for a user
        Returns products in the format expected by your main.py
        """
        exclude_products = exclude_products or []
        
        # Check if user is new (no interactions)
        user_interaction_count = self.user_interaction_counts.get(user_id, 0)
        is_new_user = user_interaction_count == 0
        
        if is_new_user:
            # Return popular products for new users
            recommended_products = self._get_popular_products(n_products, exclude_products, category_filter)
            source = "popular_for_new_user"
        else:
            # Return personalized recommendations
            recommended_products = self._get_personalized_recommendations(
                user_id, n_products, exclude_products, category_filter
            )
            source = "personalized"
        
        # Format response to match your expected structure
        response_products = [
            {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "category": product.category,
                "imageUrl": product.imageUrl,
                "brand": product.brand
            }
            for product in recommended_products
        ]
        
        logger.info(f"Generated {len(response_products)} {source} recommendations for user {user_id}")
        
        return {
            "user_id": user_id,
            "recommendations": response_products,
            "metadata": {
                "recommendation_source": source,
                "is_new_user": is_new_user,
                "user_interaction_count": user_interaction_count,
                "total_recommended_count": len(response_products),
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def _get_personalized_recommendations(self, user_id: str, n_products: int,
                                        exclude_products: List[str],
                                        category_filter: Optional[str] = None) -> List[Product]:
        """Get personalized recommendations based on user preferences"""
        if user_id not in self.user_preferences:
            return self._get_popular_products(n_products, exclude_products, category_filter)
        
        user_prefs = self.user_preferences[user_id]
        product_scores = []
        
        for product_id, product in self.products.items():
            if product_id in exclude_products:
                continue
            
            if category_filter and product.category.lower() != category_filter.lower():
                continue
            
            score = self._calculate_personalized_score(product, user_prefs)
            product_scores.append((product, score))
        
        # Sort by score
        product_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Add exploration: take top 70% deterministically, randomize the rest
        if len(product_scores) > n_products:
            deterministic_count = max(1, int(n_products * 0.8))
            top_products = [p for p, _ in product_scores[:deterministic_count]]
            
            remaining_products = [p for p, _ in product_scores[deterministic_count:]]
            exploration_count = n_products - deterministic_count
            
            if len(remaining_products) >= exploration_count:
                explored_products = np.random.choice(
                    remaining_products, 
                    size=exploration_count, 
                    replace=False
                ).tolist()
            else:
                explored_products = remaining_products
            
            return top_products + explored_products
        else:
            return [p for p, _ in product_scores[:n_products]]
    
    def _calculate_personalized_score(self, product: Product, user_prefs: Dict[str, float]) -> float:
        """Calculate personalized score for a product based on user preferences"""
        # Start with global product score
        score = self.product_scores.get(product.id, 0.0)
        
        # Add category preference
        category_key = f"category_{product.category.lower()}"
        if category_key in user_prefs:
            score += user_prefs[category_key]
        
        # Add brand preference
        brand_key = f"brand_{product.brand.lower()}"
        if brand_key in user_prefs:
            score += user_prefs[brand_key]
        
        # Add price range preference
        price_range = self._get_price_range(product.price)
        price_key = f"price_range_{price_range}"
        if price_key in user_prefs:
            score += user_prefs[price_key]
        
        # Add feature-based preferences
        if product.features:
            for feature_name, feature_value in product.features.items():
                if isinstance(feature_value, (int, float)):
                    feature_key = f"feature_{feature_name}"
                    if feature_key in user_prefs:
                        score += user_prefs[feature_key] * feature_value
        
        return score
    
    def _get_popular_products(self, n_products: int, exclude_products: List[str],
                            category_filter: Optional[str] = None) -> List[Product]:
        """Get popular products based on global scores"""
        available_products = []
        
        for product_id, product in self.products.items():
            if product_id in exclude_products:
                continue
            
            if category_filter and product.category.lower() != category_filter.lower():
                continue
            
            score = self.product_scores.get(product_id, 0.0)
            available_products.append((product, score))
        
        # Sort by global score
        available_products.sort(key=lambda x: x[1], reverse=True)
        
        # If no products have positive scores, randomize order
        if not available_products or available_products[0][1] <= 0:
            products_only = [p for p, _ in available_products]
            np.random.shuffle(products_only)
            return products_only[:n_products]
        
        return [p for p, _ in available_products[:n_products]]
    
    def record_single_interaction(self, interaction: UserInteraction) -> None:
        """
        Record a single new interaction for real-time updates
        Call this when user gives immediate feedback (tick/cross)
        """
        # Update global product score
        self.product_scores[interaction.productId] += interaction.reward * 0.1
        
        # Update user preferences
        self._update_user_preferences(interaction.userId, [interaction])
        
        # Update interaction count
        if interaction.userId not in self.user_interaction_counts:
            self.user_interaction_counts[interaction.userId] = 0
        self.user_interaction_counts[interaction.userId] += 1
        
        logger.info(f"Recorded real-time interaction: {interaction.action} for user {interaction.userId} on product {interaction.productId}")
    
    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        if user_id not in self.user_preferences:
            return {
                "user_id": user_id,
                "is_new_user": True,
                "interaction_count": 0,
                "top_preferences": {}
            }
        
        user_prefs = self.user_preferences[user_id]
        
        # Get top preferences
        sorted_prefs = sorted(user_prefs.items(), key=lambda x: x[1], reverse=True)
        top_preferences = dict(sorted_prefs[:10])
        
        return {
            "user_id": user_id,
            "is_new_user": False,
            "interaction_count": self.user_interaction_counts.get(user_id, 0),
            "top_preferences": top_preferences,
            "preference_count": len(user_prefs)
        }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get overall system statistics"""
        return {
            "total_products": len(self.products),
            "total_users": len(self.user_preferences),
            "total_interactions": sum(self.user_interaction_counts.values()),
            "top_products": sorted(
                [(pid, score) for pid, score in self.product_scores.items()],
                key=lambda x: x[1], reverse=True
            )[:10]
        }

# Utility functions to work with your existing database conversion functions
def create_product_from_dict(product_data: Dict[str, Any]) -> Product:
    """Create Product object from dictionary data - matches your existing function"""
    features = product_data.get('features')
    if isinstance(features, str):
        try:
            features = json.loads(features)
        except:
            features = None
    
    return Product(
        id=str(product_data['id']),
        name=product_data['name'],
        description=product_data.get('description', ''),
        price=float(product_data.get('price', 0)),
        category=product_data.get('category', 'general'),
        brand=product_data.get('brand', ''),
        imageUrl=product_data.get('imageUrl', ''),
        features=features
    )

def create_interaction_from_dict(interaction_data: Dict[str, Any]) -> UserInteraction:
    """Create UserInteraction object from dictionary data - matches your existing function"""
    product_data = interaction_data.get('product', {})
    if not product_data and 'productId' in interaction_data:
        product_data = {'id': interaction_data['productId'], 'name': 'Unknown Product'}
    
    product = create_product_from_dict(product_data)
    
    return UserInteraction(
        id=str(interaction_data['id']),
        userId=str(interaction_data['userId']),
        productId=str(interaction_data['productId']),
        action=interaction_data.get('action', 'view'),
        reward=float(interaction_data.get('reward', 0.0)),
        context=interaction_data.get('context'),
        createdAt=interaction_data['createdAt'],
        product=product
    )

# Simple replacement for your BanditManager class
class SimplifiedBanditManager:
    """
    Drop-in replacement for your BanditManager that works with existing main.py
    """
    
    def __init__(self):
        self.recommendation_system = None
        self.total_recommendations_served = 0
    
    def initialize_system(self, all_products: List[Product]) -> None:
        """Initialize the recommendation system"""
        if not all_products:
            raise ValueError("Cannot initialize with an empty product list.")
        
        self.recommendation_system = SimplifiedRecommendationSystem(all_products)
        logger.info(f"Initialized simplified recommendation system with {len(all_products)} products")
    
    def update_bandit_data(self, bandit_id: str, interactions: List[UserInteraction]) -> bool:
        """Update system with interaction data"""
        if not self.recommendation_system:
            logger.error("Recommendation system not initialized")
            return False
        
        try:
            self.recommendation_system.update_from_interactions(interactions)
            return True
        except Exception as e:
            logger.error(f"Error updating recommendation system: {e}")
            return False
    
    def record_interaction(self, bandit_id: str, product_id: str, reward: float) -> bool:
        """Record a single interaction - simplified for compatibility"""
        # This is a simplified version - in practice you'd need the full interaction object
        logger.info(f"Recorded interaction for product {product_id} with reward {reward}")
        return True
    
    def get_recommendations(self, user_id: str, n_products: int = 5,
                          context: str = "global",
                          user_interactions_count: int = 0,
                          exclude_products: Optional[List[str]] = None,
                          recommendation_strategy: str = "adaptive") -> Dict[str, Any]:
        """Get recommendations - compatible with your existing interface"""
        
        if not self.recommendation_system:
            return {
                "user_id": user_id,
                "context": context,
                "recommendations": [],
                "metadata": {
                    "recommendation_source": "error",
                    "error": "System not initialized"
                }
            }
        
        try:
            result = self.recommendation_system.get_recommendations(
                user_id=user_id,
                n_products=n_products,
                exclude_products=exclude_products
            )
            
            self.total_recommendations_served += 1
            result["context"] = context
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return {
                "user_id": user_id,
                "context": context,
                "recommendations": [],
                "metadata": {
                    "recommendation_source": "error",
                    "error": str(e)
                }
            }
    
    def get_system_overview_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        if not self.recommendation_system:
            return {"error": "System not initialized"}
        
        stats = self.recommendation_system.get_system_stats()
        stats["total_recommendations_served"] = self.total_recommendations_served
        return stats