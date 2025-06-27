"""
Multi-Armed Bandit algorithms for e-commerce product recommendations.
Handles exploration vs exploitation for product recommendation optimization.
Uses user interaction data from database to make intelligent recommendations.
Includes robust cold start solution for new users.
"""
import numpy as np
import math
from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional, Any, Union
import json
import logging
from dataclasses import dataclass
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ProductFeatures:
    """Product features for content-based recommendations"""
    avg_rating: float
    review_count: int
    price_competitiveness: float  # 0-1 scale, higher = more competitive
    market_position: str  # Budget/Mid-range/Premium
    days_since_launch: int
    trend_momentum: float  # -1 to 1, higher = better growth trend
    lifecycle_stage: str  # New/Growing/Mature/Declining


@dataclass
class Product:
    """Product information from database"""
    id: str
    name: str
    description: str
    price: float
    category: str
    brand: str
    imageUrl: str
    features: Optional[ProductFeatures] = None


@dataclass
class UserInteraction:
    """User interaction data from database"""
    id: str
    userId: str
    productId: str
    action: str  # 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
    reward: float
    context: Optional[Dict[str, Any]]
    createdAt: str
    product: Product


class ColdStartRecommender:
    """
    Content-based recommender for new users without interaction history.
    Uses product features to provide immediate recommendations.
    Simplified to focus on core scoring and filtering.
    """

    def __init__(self, products: List[Product]):
        """
        Initialize cold start recommender.

        Args:
            products: List of Product objects with features
        """
        self.products = {p.id: p for p in products}
        self._feature_cache = {}
        self._prepare_feature_cache()

    def _prepare_feature_cache(self):
        """Pre-calculate normalized features and scores for all products."""
        if not self.products:
            return

        # Calculate normalization parameters for features
        ratings = [p.features.avg_rating for p in self.products.values() if p.features]
        review_counts = [p.features.review_count for p in self.products.values() if p.features]
        days_since_launch = [p.features.days_since_launch for p in self.products.values() if p.features]

        self.rating_stats = {'min': min(ratings) if ratings else 0, 'max': max(ratings) if ratings else 5}
        self.review_count_stats = {'max': max(review_counts) if review_counts else 100}
        self.launch_stats = {'max': max(days_since_launch) if days_since_launch else 365}

        # Pre-calculate scores for all products
        for product_id, product in self.products.items():
            self._feature_cache[product_id] = self._calculate_product_score(product)

    def _calculate_product_score(self, product: Product) -> float:
        """
        Calculate content-based score for a product.
        Combines various features into a single score.
        """
        if not product.features:
            return 0.5  # Default score for products without features

        features = product.features
        score = 0.0

        # Avg Rating (normalized)
        if self.rating_stats['max'] > self.rating_stats['min']:
            score += (features.avg_rating - self.rating_stats['min']) / \
                     (self.rating_stats['max'] - self.rating_stats['min']) * 0.25
        else:
            score += 0.8 * 0.25 # Default if no range

        # Review Count (logarithmic)
        if features.review_count > 0 and self.review_count_stats['max'] > 0:
            score += math.log(1 + features.review_count) / \
                     math.log(1 + self.review_count_stats['max']) * 0.15

        # Price Competitiveness
        score += features.price_competitiveness * 0.20

        # Trend Momentum (normalize from -1,1 to 0,1)
        score += ((features.trend_momentum + 1) / 2) * 0.15

        # Freshness (simple tiers)
        if features.days_since_launch <= 30:
            score += 1.0 * 0.10
        elif features.days_since_launch <= 90:
            score += 0.8 * 0.10
        elif features.days_since_launch <= 180:
            score += 0.6 * 0.10
        else:
            score += 0.4 * 0.10

        # Lifecycle Stage Bonus
        lifecycle_bonuses = {'New': 0.9, 'Growing': 0.8, 'Mature': 0.6, 'Declining': 0.3}
        score += lifecycle_bonuses.get(features.lifecycle_stage, 0.5) * 0.15

        return max(0, min(1, score)) # Ensure score is between 0 and 1

    def get_cold_start_recommendations(self,
                                     category_filter: Optional[str] = None,
                                     price_range: Optional[Tuple[float, float]] = None,
                                     market_position: Optional[str] = None,
                                     exclude_products: Optional[List[str]] = None) -> List[Product]:
        """
        Get recommendations for new users based on product features, with optional filters.
        """
        exclude_products = exclude_products or []
        
        filtered_products = []
        for product in self.products.values():
            if product.id in exclude_products:
                continue
            if category_filter and product.category.lower() != category_filter.lower():
                continue
            if price_range and not (price_range[0] <= product.price <= price_range[1]):
                continue
            if (market_position and product.features and
                product.features.market_position.lower() != market_position.lower()):
                continue
            filtered_products.append(product)

        if not filtered_products: # Fallback if filters yield no products
            filtered_products = [p for p in self.products.values() if p.id not in exclude_products]
            
        product_scores = [(product, self._feature_cache.get(product.id, 0.0)) for product in filtered_products]
        product_scores.sort(key=lambda x: x[1] + np.random.normal(0, 0.01), reverse=True) # Add minor randomness
        
        logger.info(f"Cold start: recommended {len(product_scores)} products from {len(filtered_products)} candidates")
        return [p for p, _ in product_scores]

    def get_trending_products(self, n_products: int = 5,
                            min_trend_momentum: float = 0.3,
                            exclude_products: Optional[List[str]] = None) -> List[Product]:
        """
        Get trending products based on trend momentum and lifecycle stage.
        """
        exclude_products = exclude_products or []
        trending_candidates = []

        for product in self.products.values():
            if product.id in exclude_products or not product.features:
                continue
            if product.features.trend_momentum >= min_trend_momentum and \
               product.features.lifecycle_stage in ['New', 'Growing']:
                trending_candidates.append(product)
        
        if not trending_candidates: # Fallback to any positive trend if no strong trends
            trending_candidates = [
                p for p in self.products.values()
                if (p.id not in exclude_products and p.features and
                    p.features.trend_momentum > 0)
            ]

        trending_scored = []
        for product in trending_candidates:
            base_score = self._feature_cache.get(product.id, 0.0)
            # Boost for trending specific features
            trend_bonus = product.features.trend_momentum * 0.3 # type: ignore
            lifecycle_bonus = 0.2 if product.features.lifecycle_stage in ['New', 'Growing'] else 0 # type: ignore
            final_score = base_score + trend_bonus + lifecycle_bonus
            trending_scored.append((product, final_score))

        trending_scored.sort(key=lambda x: x[1], reverse=True)
        
        logger.info(f"Trending recommendations: {len(trending_scored[:n_products])} products")
        return [p for p, _ in trending_scored[:n_products]]


class ProductScorer:
    """
    Scoring system for products based on user interactions.
    """
    @classmethod
    def score_product(cls, product_id: str, interactions: List[UserInteraction]) -> float:
        """
        Calculate overall score for a product based on interactions.
        """
        product_interactions = [i for i in interactions if i.productId == product_id]
        return sum(interaction.reward for interaction in product_interactions) if product_interactions else 0.0


class MultiArmedBandit(ABC):
    """
    Abstract base class for Multi-Armed Bandit algorithms.
    Each 'arm' represents a product that can be recommended.
    """
    def __init__(self, products: List[Product]):
        self.products = {p.id: p for p in products}
        self.product_ids = list(self.products.keys())
        self.n_arms = len(self.product_ids)
        if self.n_arms == 0:
            raise ValueError("Cannot create bandit with no products")

        self.counts = np.zeros(self.n_arms)  # Number of times each product was recommended
        self.rewards = np.zeros(self.n_arms)  # Sum of rewards for each product
        self.total_pulls = 0
        self.product_to_arm = {pid: i for i, pid in enumerate(self.product_ids)}

    @abstractmethod
    def select_arm(self) -> int:
        """Select which arm to pull next."""
        pass

    def select_products(self, n_products: int = 5, exclude_products: Optional[List[str]] = None) -> List[Product]:
        """
        Select multiple products for recommendation ensuring diversity.
        """
        exclude_products = set(exclude_products or []) # type: ignore
        recommended_product_ids = []
        
        available_arms_indices = [i for i, pid in enumerate(self.product_ids) if pid not in exclude_products] # type: ignore

        if not available_arms_indices:
            logger.warning("No products available after exclusions for bandit selection.")
            return []

        for _ in range(min(n_products, len(available_arms_indices))):
            # Temporarily adjust bandit state to pick from remaining
            temp_bandit = type(self)(
                products=[self.products[self.product_ids[i]] for i in available_arms_indices]
            )
            temp_bandit.counts = self.counts[available_arms_indices]
            temp_bandit.rewards = self.rewards[available_arms_indices]
            temp_bandit.total_pulls = self.total_pulls # total pulls is global

            selected_temp_arm_idx = temp_bandit.select_arm()
            
            # Map back to original arm index and product ID
            original_arm_idx = available_arms_indices[selected_temp_arm_idx]
            selected_product_id = self.product_ids[original_arm_idx]

            recommended_product_ids.append(selected_product_id)
            exclude_products.append(selected_product_id) # type: ignore # Exclude for next selection
            
            # Remove the selected arm from available_arms_indices for the next iteration
            available_arms_indices.pop(selected_temp_arm_idx)

        return [self.products[pid] for pid in recommended_product_ids]

    def update_rewards(self, interactions: List[UserInteraction]) -> None:
        """
        Update bandit rewards based on user interactions.
        """
        self.rewards = np.zeros(self.n_arms)
        self.counts = np.zeros(self.n_arms)

        product_interactions = {}
        for interaction in interactions:
            if interaction.productId in self.product_to_arm:
                if interaction.productId not in product_interactions:
                    product_interactions[interaction.productId] = []
                product_interactions[interaction.productId].append(interaction)

        for product_id, product_interactions_list in product_interactions.items():
            arm_idx = self.product_to_arm[product_id]
            self.rewards[arm_idx] = ProductScorer.score_product(product_id, product_interactions_list)
            self.counts[arm_idx] = len(product_interactions_list)
        
        self.total_pulls = int(sum(self.counts))
        logger.info(f"Updated bandit rewards based on {len(interactions)} interactions")

    def update(self, product_id: str, reward: float) -> None:
        """
        Update the bandit with a single reward (for real-time updates).
        """
        if product_id not in self.product_to_arm:
            logger.warning(f"Product {product_id} not found in bandit")
            return

        arm_idx = self.product_to_arm[product_id]
        self.counts[arm_idx] += 1
        self.rewards[arm_idx] += reward
        self.total_pulls += 1
        logger.info(f"Updated product {product_id} with reward {reward}")

    def get_product_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all products."""
        stats = []
        for i, product_id in enumerate(self.product_ids):
            product = self.products[product_id]
            avg_reward = self.rewards[i] / self.counts[i] if self.counts[i] > 0 else 0.0
            stats.append({
                'product_id': product_id,
                'product_name': product.name,
                'category': product.category,
                'interaction_count': int(self.counts[i]),
                'average_reward': float(avg_reward),
                'priority_score': avg_reward # Simple priority based on average reward
            })
        stats.sort(key=lambda x: x['priority_score'], reverse=True)
        return stats

    def reset(self) -> None:
        """Reset all statistics."""
        self.counts = np.zeros(self.n_arms)
        self.rewards = np.zeros(self.n_arms)
        self.total_pulls = 0
        logger.info("Bandit statistics reset")


class EpsilonGreedyBandit(MultiArmedBandit):
    """
    Epsilon-Greedy Multi-Armed Bandit implementation.
    """
    def __init__(self, products: List[Product], epsilon: float = 0.1):
        super().__init__(products)
        self.epsilon = epsilon
        if not 0 <= epsilon <= 1:
            raise ValueError("Epsilon must be between 0 and 1")

    def select_arm(self) -> int:
        """
        Select arm using epsilon-greedy strategy.
        """
        if np.random.random() < self.epsilon:
            selected_arm = np.random.randint(0, self.n_arms)
            logger.debug(f"Exploring: selected product {self.product_ids[selected_arm]}")
        else:
            # Handle cases where counts are zero to avoid division by zero
            avg_rewards = np.divide(self.rewards, self.counts, 
                                   out=np.zeros_like(self.rewards), 
                                   where=self.counts!=0)
            selected_arm = np.argmax(avg_rewards) if np.any(self.counts > 0) else np.random.randint(0, self.n_arms)
            logger.debug(f"Exploiting: selected product {self.product_ids[selected_arm]}")
        return int(selected_arm)


class UCBBandit(MultiArmedBandit):
    """
    Upper Confidence Bound Multi-Armed Bandit implementation.
    """
    def __init__(self, products: List[Product], confidence_level: float = 2.0):
        super().__init__(products)
        self.confidence_level = confidence_level
        if confidence_level <= 0:
            raise ValueError("Confidence level must be positive")

    def select_arm(self) -> int:
        """
        Select arm using UCB strategy.
        """
        unpulled_arms = np.where(self.counts == 0)[0]
        if len(unpulled_arms) > 0:
            selected_arm = unpulled_arms[0]
            logger.debug(f"UCB: Pulling unpulled product {self.product_ids[selected_arm]}")
            return int(selected_arm)

        ucb_values = np.zeros(self.n_arms)
        for i in range(self.n_arms):
            avg_reward = self.rewards[i] / self.counts[i]
            confidence_interval = math.sqrt(
                (self.confidence_level * math.log(self.total_pulls)) / self.counts[i]
            )
            ucb_values[i] = avg_reward + confidence_interval
        
        selected_arm = np.argmax(ucb_values)
        logger.debug(f"UCB: selected product {self.product_ids[selected_arm]} with UCB value {ucb_values[selected_arm]:.3f}")
        return int(selected_arm)


class BanditManager:
    """
    Manager class to handle multiple bandit instances for different contexts.
    Includes cold start recommendations for new users.
    Simplified to remove redundant methods and focus on core recommendation logic.
    """

    def __init__(self, default_bandit_type: str = "epsilon_greedy",
                 default_epsilon: float = 0.1,
                 default_confidence_level: float = 2.0):
        self.bandits: Dict[str, MultiArmedBandit] = {}
        self.cold_start_recommender: Optional[ColdStartRecommender] = None
        self.default_bandit_type = default_bandit_type
        self.default_epsilon = default_epsilon
        self.default_confidence_level = default_confidence_level
        self.total_recommendations_served = 0 # Renamed for clarity

        logger.info(f"BanditManager initialized with default type: {default_bandit_type}")

    def initialize_system(self, all_products: List[Product], contexts: Optional[List[str]] = None) -> None:
        """
        Initializes cold start recommender and bandits for specified contexts.
        A 'global' bandit is created if no contexts are provided.
        """
        if not all_products:
            raise ValueError("Cannot initialize with an empty product list.")

        self.cold_start_recommender = ColdStartRecommender(all_products)
        logger.info(f"Initialized cold start recommender with {len(all_products)} products.")

        contexts_to_create = contexts if contexts else ["global"]
        for context in contexts_to_create:
            self._create_bandit_instance(context, all_products, self.default_bandit_type)
        
        logger.info(f"Initialized {len(self.bandits)} bandit instances for contexts: {', '.join(self.bandits.keys())}.")

    def _create_bandit_instance(self, bandit_id: str, products: List[Product], bandit_type: str) -> MultiArmedBandit:
        """Helper to create and store a bandit instance."""
        if bandit_type == 'epsilon_greedy':
            bandit = EpsilonGreedyBandit(products, epsilon=self.default_epsilon)
        elif bandit_type == 'ucb':
            bandit = UCBBandit(products, confidence_level=self.default_confidence_level)
        else:
            raise ValueError(f"Unknown bandit type: {bandit_type}")
        
        self.bandits[bandit_id] = bandit
        return bandit

    def update_bandit_data(self, bandit_id: str, interactions: List[UserInteraction]) -> bool:
        """Updates a specific bandit's reward and count data based on a list of interactions."""
        bandit = self.bandits.get(bandit_id)
        if not bandit:
            logger.error(f"Bandit '{bandit_id}' not found for update.")
            return False
        
        try:
            bandit.update_rewards(interactions)
            return True
        except Exception as e:
            logger.error(f"Error updating bandit '{bandit_id}' with interactions: {e}")
            return False

    def record_interaction(self, bandit_id: str, product_id: str, reward: float) -> bool:
        """Records a single user interaction for real-time bandit updates."""
        bandit = self.bandits.get(bandit_id)
        if not bandit:
            logger.error(f"Bandit '{bandit_id}' not found for interaction record.")
            return False
        
        try:
            bandit.update(product_id, reward)
            return True
        except Exception as e:
            logger.error(f"Error recording interaction for bandit '{bandit_id}': {e}")
            return False

    def get_recommendations(self, user_id: str, n_products: int = 5,
                          context: str = "global",
                          user_interactions_count: int = 0, # Simplified from full interactions list
                          exclude_products: Optional[List[str]] = None,
                          recommendation_strategy: str = "adaptive") -> Dict[str, Any]:
        """
        Provides product recommendations based on strategy.
        'adaptive': Uses cold start for new users, bandit otherwise.
        'cold_start': Always uses cold start.
        'trending': Always uses trending products.
        'bandit': Always uses the bandit for the given context.
        """
        exclude_products = exclude_products or []
        recommended_products: List[Product] = []
        source_type = "unknown"

        is_new_user = user_interactions_count == 0

        try:
            if recommendation_strategy == "cold_start" or (recommendation_strategy == "adaptive" and is_new_user):
                if self.cold_start_recommender:
                    recommended_products = self.cold_start_recommender.get_cold_start_recommendations(
                         exclude_products=exclude_products
                    )
                    source_type = "cold_start"
                else:
                    logger.warning("Cold start recommender not initialized, cannot provide cold start recommendations.")

            elif recommendation_strategy == "trending":
                if self.cold_start_recommender:
                    recommended_products = self.cold_start_recommender.get_trending_products(
                        n_products=n_products, exclude_products=exclude_products
                    )
                    source_type = "trending"
                else:
                    logger.warning("Cold start recommender not initialized, cannot provide trending recommendations.")

            elif recommendation_strategy == "bandit" or (recommendation_strategy == "adaptive" and not is_new_user):
                bandit = self.bandits.get(context)
                if bandit:
                    recommended_products = bandit.select_products(n_products=n_products, exclude_products=exclude_products)
                    source_type = "bandit"
                else:
                    logger.warning(f"Bandit '{context}' not found. Falling back to cold start (if available).")
                    if self.cold_start_recommender:
                        recommended_products = self.cold_start_recommender.get_cold_start_recommendations(
                             exclude_products=exclude_products
                        )
                        source_type = "cold_start_fallback"

            # If no products obtained, try a last-resort cold start if not already used
            if not recommended_products and self.cold_start_recommender and source_type not in ["cold_start", "cold_start_fallback"]:
                recommended_products = self.cold_start_recommender.get_cold_start_recommendations(
                     exclude_products=exclude_products
                )
                source_type = "cold_start_last_resort"

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            if self.cold_start_recommender: # Always try cold start on error
                recommended_products = self.cold_start_recommender.get_cold_start_recommendations(
                    exclude_products=exclude_products
                )
                source_type = "error_cold_start_fallback"
            else:
                recommended_products = []
                source_type = "error"

        self.total_recommendations_served += 1

        response_products = [
            {
                "id": product.id,
                "name": product.name,
                "price": product.price,
                "category": product.category,
                "imageUrl": product.imageUrl
            }
            for product in recommended_products[:n_products]
        ]
        
        logger.info(f"Generated {len(response_products)} recommendations for user {user_id} "
                   f"from {source_type} using strategy '{recommendation_strategy}'.")

        return {
            "user_id": user_id,
            "context": context,
            "recommendations": response_products,
            "metadata": {
                "recommendation_source": source_type,
                "is_new_user": is_new_user,
                "total_recommended_count": len(response_products),
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def get_bandit_stats(self, bandit_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed statistics for a specific bandit."""
        bandit = self.bandits.get(bandit_id)
        if not bandit:
            return None
        
        product_stats = bandit.get_product_stats()
        
        return {
            "bandit_id": bandit_id,
            "type": type(bandit).__name__,
            "total_interactions_recorded": int(bandit.total_pulls),
            "product_count": len(bandit.products),
            "top_products": product_stats[:5], # Top 5 products
        }

    def get_system_overview_stats(self) -> Dict[str, Any]:
        """Provides an overview of the entire recommendation system."""
        all_stats = {
            "total_recommendations_served_system_wide": self.total_recommendations_served,
            "cold_start_recommender_initialized": self.cold_start_recommender is not None,
            "active_bandits_count": len(self.bandits),
            "bandit_details": {bid: self.get_bandit_stats(bid) for bid in self.bandits}
        }
        return all_stats

    def reset_bandit(self, bandit_id: str) -> bool:
        """Resets the statistics for a specific bandit."""
        bandit = self.bandits.get(bandit_id)
        if not bandit:
            logger.warning(f"Attempted to reset non-existent bandit: {bandit_id}")
            return False
        bandit.reset()
        logger.info(f"Bandit '{bandit_id}' statistics have been reset.")
        return True

    def reset_all_bandits(self) -> None:
        """Resets statistics for all managed bandits."""
        for bandit_id in self.bandits:
            self.bandits[bandit_id].reset()
        self.total_recommendations_served = 0
        logger.info("All bandit statistics and system recommendation count reset.")


# Utility functions (kept minimal and focused on data conversion)
def create_product_from_dict(product_data: Dict[str, Any]) -> Product:
    """Create Product object from dictionary data."""
    features = None
    if 'features' in product_data and product_data['features']:
        features_data = product_data['features']
        features = ProductFeatures(
            avg_rating=float(features_data.get('avg_rating', 0.0)),
            review_count=int(features_data.get('review_count', 0)),
            price_competitiveness=float(features_data.get('price_competitiveness', 0.5)),
            market_position=features_data.get('market_position', 'Mid-range'),
            days_since_launch=int(features_data.get('days_since_launch', 0)),
            trend_momentum=float(features_data.get('trend_momentum', 0.0)),
            lifecycle_stage=features_data.get('lifecycle_stage', 'Mature')
        )
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
    """Create UserInteraction object from dictionary data."""
    product_data = interaction_data.get('product', {})
    if not product_data and 'productId' in interaction_data: # Minimal product if full data isn't nested
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