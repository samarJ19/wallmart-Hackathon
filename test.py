"""
Multi-Armed Bandit algorithms for e-commerce product recommendations.
Handles exploration vs exploitation for product recommendation optimization.
Uses user interaction data from database to make intelligent recommendations.
"""

import numpy as np
import math
from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional, Any
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Product:
    """Product information from database"""
    id: str
    name: str
    imageUrl: str
    price: float
    category: str


@dataclass
class UserInteraction:
    """User interaction data from database"""
    id: int
    userId: int
    productId: str
    interactionType: str  # 'view', 'like', 'cart', 'purchase'
    createdAt: str
    product: Product


class ProductScorer:
    """
    Scoring system for products based on user interactions.
    Different interaction types have different reward values.
    """
    
    INTERACTION_REWARDS = {
        'view': 0.1,
        'like': 0.3,
        'cart': 0.6,
        'purchase': 1.0,
        'remove_cart': -0.2,
        'return': -0.5
    }
    
    TIME_DECAY_FACTOR = 0.95  # How much to decay older interactions
    
    @classmethod
    def calculate_reward(cls, interaction_type: str, days_ago: int = 0) -> float:
        """
        Calculate reward for an interaction type with time decay.
        
        Args:
            interaction_type: Type of interaction
            days_ago: How many days ago the interaction occurred
            
        Returns:
            Calculated reward value
        """
        base_reward = cls.INTERACTION_REWARDS.get(interaction_type.lower(), 0.0)
        time_decay = cls.TIME_DECAY_FACTOR ** days_ago
        return base_reward * time_decay
    
    @classmethod
    def score_product(cls, product_id: str, interactions: List[UserInteraction]) -> float:
        """
        Calculate overall score for a product based on all interactions.
        
        Args:
            product_id: ID of the product to score
            interactions: List of user interactions
            
        Returns:
            Overall product score
        """
        product_interactions = [i for i in interactions if i.productId == product_id]
        
        if not product_interactions:
            return 0.0
        
        total_score = 0.0
        now = datetime.now()
        
        for interaction in product_interactions:
            # Calculate days since interaction
            interaction_date = datetime.fromisoformat(interaction.createdAt.replace('Z', '+00:00'))
            days_ago = (now - interaction_date).days
            
            # Calculate reward with time decay
            reward = cls.calculate_reward(interaction.interactionType, days_ago)
            total_score += reward
        
        return total_score


class MultiArmedBandit(ABC):
    """
    Abstract base class for Multi-Armed Bandit algorithms.
    Each 'arm' represents a product that can be recommended.
    """
    
    def __init__(self, products: List[Product]):
        """
        Initialize the bandit with products.
        
        Args:
            products: List of Product objects
        """
        self.products = {p.id: p for p in products}
        self.product_ids = list(self.products.keys())
        self.n_arms = len(self.product_ids)
        
        if self.n_arms == 0:
            raise ValueError("Cannot create bandit with no products")
        
        # Track statistics for each arm (product)
        self.counts = np.zeros(self.n_arms)  # Number of times each product was recommended
        self.rewards = np.zeros(self.n_arms)  # Sum of rewards for each product
        self.total_pulls = 0
        
        # Performance tracking
        self.history = {
            'products_recommended': [],
            'rewards_received': [],
            'cumulative_reward': 0,
            'timestamps': []
        }
        
        # Product ID to arm index mapping
        self.product_to_arm = {pid: i for i, pid in enumerate(self.product_ids)}
    
    @abstractmethod
    def select_arm(self) -> int:
        """Select which arm to pull next."""
        pass
    
    def select_products(self, n_products: int = 5, exclude_products: List[str] = None) -> List[Product]:
        """
        Select multiple products for recommendation.
        
        Args:
            n_products: Number of products to recommend
            exclude_products: Product IDs to exclude from recommendations
            
        Returns:
            List of recommended Product objects
        """
        exclude_products = exclude_products or []
        available_products = [p for p in self.product_ids if p not in exclude_products]
        
        if not available_products:
            # If no products available after exclusion, return random products
            available_products = self.product_ids
        
        n_products = min(n_products, len(available_products))
        recommended_product_ids = []
        
        # Get diverse recommendations by temporarily removing selected products
        temp_excluded = set(exclude_products)
        
        for _ in range(n_products):
            # Filter available arms
            available_arms = [self.product_to_arm[pid] for pid in available_products 
                            if pid not in temp_excluded]
            
            if not available_arms:
                break
                
            # Temporarily modify the bandit to only consider available arms
            original_n_arms = self.n_arms
            original_product_ids = self.product_ids.copy()
            
            # Create temporary mapping for available arms
            temp_arm_to_original = {i: arm for i, arm in enumerate(available_arms)}
            
            # Select from available arms using bandit logic
            if hasattr(self, '_select_from_available_arms'):
                selected_temp_arm = self._select_from_available_arms(available_arms)
            else:
                # Fallback: select based on UCB or epsilon-greedy logic
                selected_temp_arm = self._select_best_available_arm(available_arms)
            
            original_arm = temp_arm_to_original[selected_temp_arm]
            selected_product_id = self.product_ids[original_arm]
            
            recommended_product_ids.append(selected_product_id)
            temp_excluded.add(selected_product_id)
        
        return [self.products[pid] for pid in recommended_product_ids]
    
    def _select_best_available_arm(self, available_arms: List[int]) -> int:
        """
        Select best arm from available arms based on current statistics.
        
        Args:
            available_arms: List of available arm indices
            
        Returns:
            Index in available_arms list (not original arm index)
        """
        if not available_arms:
            return 0
        
        # Calculate scores for available arms
        scores = []
        for arm in available_arms:
            if self.counts[arm] == 0:
                scores.append(float('inf'))  # Prioritize unexplored arms
            else:
                avg_reward = self.rewards[arm] / self.counts[arm]
                # Add exploration bonus
                exploration_bonus = math.sqrt(2 * math.log(max(1, self.total_pulls)) / self.counts[arm])
                scores.append(avg_reward + exploration_bonus)
        
        # Return index in available_arms list
        best_idx = np.argmax(scores)
        return best_idx
    
    def update_rewards(self, interactions: List[UserInteraction]) -> None:
        """
        Update bandit rewards based on user interactions.
        
        Args:
            interactions: List of user interactions from database
        """
        # Reset current rewards to recalculate from scratch
        self.rewards = np.zeros(self.n_arms)
        self.counts = np.zeros(self.n_arms)
        
        # Group interactions by product
        product_interactions = {}
        for interaction in interactions:
            if interaction.productId not in product_interactions:
                product_interactions[interaction.productId] = []
            product_interactions[interaction.productId].append(interaction)
        
        # Calculate rewards for each product
        for product_id, product_interactions_list in product_interactions.items():
            if product_id in self.product_to_arm:
                arm_idx = self.product_to_arm[product_id]
                
                # Calculate total score for this product
                total_score = ProductScorer.score_product(product_id, product_interactions_list)
                interaction_count = len(product_interactions_list)
                
                # Update bandit statistics
                self.rewards[arm_idx] = total_score
                self.counts[arm_idx] = interaction_count
        
        # Update total pulls
        self.total_pulls = sum(self.counts)
        
        logger.info(f"Updated bandit rewards based on {len(interactions)} interactions")
    
    def update(self, product_id: str, reward: float) -> None:
        """
        Update the bandit with a single reward (for real-time updates).
        
        Args:
            product_id: ID of the product that was recommended
            reward: Reward received
        """
        if product_id not in self.product_to_arm:
            logger.warning(f"Product {product_id} not found in bandit")
            return
        
        arm_idx = self.product_to_arm[product_id]
        
        self.counts[arm_idx] += 1
        self.rewards[arm_idx] += reward
        self.total_pulls += 1
        
        # Update history
        self.history['products_recommended'].append(product_id)
        self.history['rewards_received'].append(reward)
        self.history['cumulative_reward'] += reward
        self.history['timestamps'].append(datetime.now().isoformat())
        
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
                'price': product.price,
                'interaction_count': int(self.counts[i]),
                'total_reward': float(self.rewards[i]),
                'average_reward': float(avg_reward),
                'recommendation_priority': self._calculate_priority(i)
            })
        
        # Sort by recommendation priority
        stats.sort(key=lambda x: x['recommendation_priority'], reverse=True)
        return stats
    
    def _calculate_priority(self, arm_idx: int) -> float:
        """Calculate recommendation priority for an arm."""
        if self.counts[arm_idx] == 0:
            return float('inf')  # Unexplored products get highest priority
        
        avg_reward = self.rewards[arm_idx] / self.counts[arm_idx]
        return avg_reward
    
    def get_best_products(self, n_products: int = 5) -> List[Product]:
        """Get the best performing products."""
        stats = self.get_product_stats()
        best_stats = stats[:n_products]
        return [self.products[stat['product_id']] for stat in best_stats]
    
    def reset(self) -> None:
        """Reset all statistics."""
        self.counts = np.zeros(self.n_arms)
        self.rewards = np.zeros(self.n_arms)
        self.total_pulls = 0
        self.history = {
            'products_recommended': [],
            'rewards_received': [],
            'cumulative_reward': 0,
            'timestamps': []
        }
        logger.info("Bandit statistics reset")


class EpsilonGreedyBandit(MultiArmedBandit):
    """
    Epsilon-Greedy Multi-Armed Bandit implementation.
    
    With probability ε, explore by choosing a random product.
    With probability (1-ε), exploit by choosing the best known product.
    """
    
    def __init__(self, products: List[Product], epsilon: float = 0.1, 
                 decay_epsilon: bool = False):
        """
        Initialize Epsilon-Greedy bandit.
        
        Args:
            products: List of Product objects
            epsilon: Exploration probability (0-1)
            decay_epsilon: Whether to decay epsilon over time
        """
        super().__init__(products)
        self.initial_epsilon = epsilon
        self.epsilon = epsilon
        self.decay_epsilon = decay_epsilon
        
        if not 0 <= epsilon <= 1:
            raise ValueError("Epsilon must be between 0 and 1")
    
    def select_arm(self) -> int:
        """
        Select arm using epsilon-greedy strategy.
        
        Returns:
            Index of selected arm
        """
        # Update epsilon if decay is enabled
        if self.decay_epsilon and self.total_pulls > 0:
            self.epsilon = self.initial_epsilon / (1 + self.total_pulls * 0.001)
        
        # Exploration: choose random arm
        if np.random.random() < self.epsilon:
            selected_arm = np.random.randint(0, self.n_arms)
            logger.info(f"Exploring: selected product {self.product_ids[selected_arm]}")
        
        # Exploitation: choose best known arm
        else:
            # Calculate average rewards for each arm
            avg_rewards = np.divide(self.rewards, self.counts, 
                                   out=np.zeros_like(self.rewards), 
                                   where=self.counts!=0)
            
            # Handle case where no arms have been pulled
            if np.all(self.counts == 0):
                selected_arm = np.random.randint(0, self.n_arms)
            else:
                selected_arm = np.argmax(avg_rewards)
            
            logger.info(f"Exploiting: selected product {self.product_ids[selected_arm]}")
        
        return int(selected_arm)
    
    def _select_from_available_arms(self, available_arms: List[int]) -> int:
        """Select from available arms using epsilon-greedy logic."""
        if np.random.random() < self.epsilon:
            # Random selection from available arms
            return np.random.randint(0, len(available_arms))
        else:
            # Best selection from available arms
            return self._select_best_available_arm(available_arms)


class UCBBandit(MultiArmedBandit):
    """
    Upper Confidence Bound Multi-Armed Bandit implementation.
    
    Selects the arm with the highest upper confidence bound:
    UCB(i) = average_reward(i) + sqrt(2 * log(total_pulls) / pulls(i))
    """
    
    def __init__(self, products: List[Product], confidence_level: float = 2.0):
        """
        Initialize UCB bandit.
        
        Args:
            products: List of Product objects
            confidence_level: Confidence parameter (higher = more exploration)
        """
        super().__init__(products)
        self.confidence_level = confidence_level
        
        if confidence_level <= 0:
            raise ValueError("Confidence level must be positive")
    
    def select_arm(self) -> int:
        """
        Select arm using UCB strategy.
        
        Returns:
            Index of selected arm
        """
        # If any arm hasn't been pulled, pull it first
        unpulled_arms = np.where(self.counts == 0)[0]
        if len(unpulled_arms) > 0:
            selected_arm = unpulled_arms[0]
            logger.info(f"UCB: Pulling unpulled product {self.product_ids[selected_arm]}")
            return selected_arm
        
        # Calculate UCB values for all arms
        ucb_values = self._calculate_ucb_values()
        
        # Select arm with highest UCB value
        selected_arm = np.argmax(ucb_values)
        
        logger.info(f"UCB: selected product {self.product_ids[selected_arm]} "
                   f"with UCB value {ucb_values[selected_arm]:.3f}")
        
        return int(selected_arm)
    
    def _calculate_ucb_values(self) -> np.ndarray:
        """Calculate UCB values for all arms."""
        if self.total_pulls == 0:
            return np.full(self.n_arms, float('inf'))
        
        ucb_values = np.zeros(self.n_arms)
        
        for i in range(self.n_arms):
            if self.counts[i] == 0:
                ucb_values[i] = float('inf')
            else:
                # Average reward for this arm
                avg_reward = self.rewards[i] / self.counts[i]
                
                # Confidence interval
                confidence_interval = math.sqrt(
                    (self.confidence_level * math.log(self.total_pulls)) / self.counts[i]
                )
                
                # UCB value
                ucb_values[i] = avg_reward + confidence_interval
        
        return ucb_values
    
    def _select_from_available_arms(self, available_arms: List[int]) -> int:
        """Select from available arms using UCB logic."""
        if not available_arms:
            return 0
        
        # Calculate UCB values for available arms only
        ucb_values = []
        for arm in available_arms:
            if self.counts[arm] == 0:
                ucb_values.append(float('inf'))
            else:
                avg_reward = self.rewards[arm] / self.counts[arm]
                confidence_interval = math.sqrt(
                    (self.confidence_level * math.log(max(1, self.total_pulls))) / self.counts[arm]
                )
                ucb_values.append(avg_reward + confidence_interval)
        
        # Return index in available_arms list
        return np.argmax(ucb_values)


class BanditManager:
    """
    Manager class to handle multiple bandit instances for different contexts.
    E.g., different bandits for different product categories or user segments.
    """
    
    def __init__(self):
        self.bandits: Dict[str, MultiArmedBandit] = {}
        self.category_products: Dict[str, List[Product]] = {}
    
    def create_bandit(self, bandit_id: str, bandit_type: str, 
                     products: List[Product], **kwargs) -> MultiArmedBandit:
        """
        Create a new bandit instance.
        
        Args:
            bandit_id: Unique identifier for this bandit
            bandit_type: 'epsilon_greedy' or 'ucb'
            products: List of Product objects that this bandit will recommend
            **kwargs: Additional parameters for the bandit
        
        Returns:
            Created bandit instance
        """
        if not products:
            raise ValueError(f"Cannot create bandit '{bandit_id}' with no products")
        
        if bandit_type == 'epsilon_greedy':
            bandit = EpsilonGreedyBandit(products, **kwargs)
        elif bandit_type == 'ucb':
            bandit = UCBBandit(products, **kwargs)
        else:
            raise ValueError(f"Unknown bandit type: {bandit_type}")
        
        self.bandits[bandit_id] = bandit
        self.category_products[bandit_id] = products
        
        logger.info(f"Created {bandit_type} bandit '{bandit_id}' with {len(products)} products")
        
        return bandit
    
    def get_bandit(self, bandit_id: str) -> Optional[MultiArmedBandit]:
        """Get a bandit instance by ID."""
        return self.bandits.get(bandit_id)
    
    def update_bandit_from_interactions(self, bandit_id: str, 
                                      interactions: List[UserInteraction]) -> bool:
        """
        Update a bandit with user interactions from database.
        
        Args:
            bandit_id: ID of the bandit to update
            interactions: List of user interactions
        
        Returns:
            True if update was successful, False otherwise
        """
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            logger.error(f"Bandit '{bandit_id}' not found")
            return False
        
        try:
            bandit.update_rewards(interactions)
            return True
        except Exception as e:
            logger.error(f"Error updating bandit '{bandit_id}': {e}")
            return False
    
    def update_bandit(self, bandit_id: str, product_id: str, reward: float) -> bool:
        """
        Update a bandit with a single reward (for real-time updates).
        
        Args:
            bandit_id: ID of the bandit to update
            product_id: ID of the product that was recommended
            reward: Reward value
        
        Returns:
            True if update was successful, False otherwise
        """
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            logger.error(f"Bandit '{bandit_id}' not found")
            return False
        
        try:
            bandit.update(product_id, reward)
            return True
        except Exception as e:
            logger.error(f"Error updating bandit '{bandit_id}': {e}")
            return False
    
    def recommend_products(self, bandit_id: str, n_products: int = 5, 
                          exclude_products: List[str] = None) -> Optional[List[Product]]:
        """
        Get product recommendations from a bandit.
        
        Args:
            bandit_id: ID of the bandit to use
            n_products: Number of products to recommend
            exclude_products: Product IDs to exclude from recommendations
        
        Returns:
            List of Product objects to recommend, or None if bandit not found
        """
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            logger.error(f"Bandit '{bandit_id}' not found")
            return None
        
        try:
            return bandit.select_products(n_products, exclude_products)
        except Exception as e:
            logger.error(f"Error getting recommendations from bandit '{bandit_id}': {e}")
            return None
    
    def get_bandit_stats(self, bandit_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get statistics for a bandit."""
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            return None
        
        return bandit.get_product_stats()
    
    def list_bandits(self) -> List[str]:
        """Get list of all bandit IDs."""
        return list(self.bandits.keys())
    
    def get_category_products(self, bandit_id: str) -> Optional[List[Product]]:
        """Get products for a specific bandit/category."""
        return self.category_products.get(bandit_id)


# Utility functions for creating Product and UserInteraction objects from API responses
def create_product_from_dict(product_data: Dict[str, Any]) -> Product:
    """Create Product object from dictionary data."""
    return Product(
        id=str(product_data['id']),
        name=product_data['name'],
        imageUrl=product_data.get('imageUrl', ''),
        price=float(product_data.get('price', 0)),
        category=product_data.get('category', 'general')
    )


def create_interaction_from_dict(interaction_data: Dict[str, Any]) -> UserInteraction:
    """Create UserInteraction object from dictionary data."""
    product_data = interaction_data.get('product', {})
    product = create_product_from_dict(product_data)
    
    return UserInteraction(
        id=interaction_data['id'],
        userId=interaction_data['userId'],
        productId=str(interaction_data['productId']),
        interactionType=interaction_data.get('interactionType', 'view'),
        createdAt=interaction_data['createdAt'],
        product=product
    )


# Example usage for testing
if __name__ == "__main__":
    # Example: Testing with sample products
    sample_products = [
        Product("1", "iPhone 15", "iphone.jpg", 999.99, "electronics"),
        Product("2", "Samsung Galaxy", "samsung.jpg", 899.99, "electronics"),
        Product("3", "Nike Shoes", "nike.jpg", 129.99, "footwear"),
        Product("4", "Adidas Sneakers", "adidas.jpg", 119.99, "footwear"),
        Product("5", "MacBook Pro", "macbook.jpg", 1999.99, "electronics")
    ]
    
    print("=== Testing UCB Bandit with Products ===")
    bandit = UCBBandit(sample_products)
    
    # Simulate some recommendations and rewards
    for i in range(10):
        recommended_products = bandit.select_products(3)
        print(f"Recommended: {[p.name for p in recommended_products]}")
        
        # Simulate user interaction (reward)
        for product in recommended_products:
            # Simulate different reward patterns
            if "iPhone" in product.name:
                reward = np.random.normal(0.8, 0.2)  # High engagement
            elif "Samsung" in product.name:
                reward = np.random.normal(0.6, 0.2)  # Medium engagement
            else:
                reward = np.random.normal(0.3, 0.3)  # Lower engagement
            
            bandit.update(product.id, max(0, reward))  # Ensure non-negative
    
    print("\n=== Product Statistics ===")
    stats = bandit.get_product_stats()
    for stat in stats[:3]:  # Top 3 products
        print(f"{stat['product_name']}: avg_reward={stat['average_reward']:.3f}, "
              f"interactions={stat['interaction_count']}")