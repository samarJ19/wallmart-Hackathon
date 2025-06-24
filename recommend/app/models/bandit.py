"""
Multi-Armed Bandit algorithms for e-commerce product recommendations.
Handles exploration vs exploitation for product recommendation optimization.
"""

import numpy as np
import math
from abc import ABC, abstractmethod
from typing import List, Dict, Tuple, Optional
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MultiArmedBandit(ABC):
    """
    Abstract base class for Multi-Armed Bandit algorithms.
    Each 'arm' represents a product that can be recommended.
    """
    
    def __init__(self, n_arms: int, arm_ids: Optional[List[str]] = None):
        """
        Initialize the bandit.
        
        Args:
            n_arms: Number of arms (products)
            arm_ids: Optional list of product IDs corresponding to arms
        """
        self.n_arms = n_arms
        self.arm_ids = arm_ids or [f"arm_{i}" for i in range(n_arms)]
        
        # Track statistics for each arm
        self.counts = np.zeros(n_arms)  # Number of times each arm was pulled
        self.rewards = np.zeros(n_arms)  # Sum of rewards for each arm
        self.total_pulls = 0
        
        # Performance tracking
        self.history = {
            'arms_pulled': [],
            'rewards_received': [],
            'cumulative_reward': 0
        }
    
    @abstractmethod
    def select_arm(self) -> int:
        """Select which arm to pull next."""
        pass
    
    def update(self, arm: int, reward: float) -> None:
        """
        Update the bandit with the result of pulling an arm.
        
        Args:
            arm: Index of the arm that was pulled
            reward: Reward received from pulling the arm
        """
        if arm >= self.n_arms or arm < 0:
            raise ValueError(f"Invalid arm index: {arm}. Must be between 0 and {self.n_arms-1}")
        
        self.counts[arm] += 1
        self.rewards[arm] += reward
        self.total_pulls += 1
        
        # Update history
        self.history['arms_pulled'].append(arm)
        self.history['rewards_received'].append(reward)
        self.history['cumulative_reward'] += reward
        
        logger.info(f"Updated arm {arm} (product: {self.arm_ids[arm]}) with reward {reward}")
    
    def get_arm_stats(self) -> Dict[str, List[float]]:
        """Get statistics for all arms."""
        avg_rewards = np.divide(self.rewards, self.counts, 
                               out=np.zeros_like(self.rewards), 
                               where=self.counts!=0)
        
        return {
            'arm_ids': (np.array(self.arm_ids,dtype=float)).tolist(),
            'counts': self.counts.tolist(),
            'total_rewards': self.rewards.tolist(),
            'average_rewards': avg_rewards.tolist(),
            'confidence_bounds': self._get_confidence_bounds()
        }
    
    def _get_confidence_bounds(self) -> List[float]:
        """Calculate confidence bounds for arms (used by UCB)."""
        if self.total_pulls == 0:
            return [0.0] * self.n_arms
        
        bounds = []
        for i in range(self.n_arms):
            if self.counts[i] == 0:
                bounds.append(float('inf'))
            else:
                avg_reward = self.rewards[i] / self.counts[i]
                confidence = math.sqrt(2 * math.log(self.total_pulls) / self.counts[i])
                bounds.append(avg_reward + confidence)
        
        return bounds
    
    def get_best_arm(self) -> tuple[int, str]:
        """Get the arm with the highest average reward."""
        avg_rewards = np.divide(self.rewards, self.counts, 
                               out=np.zeros_like(self.rewards), 
                               where=self.counts!=0)
        best_arm = np.argmax(avg_rewards)
        return int(best_arm), self.arm_ids[best_arm]
    
    def reset(self) -> None:
        """Reset all statistics."""
        self.counts = np.zeros(self.n_arms)
        self.rewards = np.zeros(self.n_arms)
        self.total_pulls = 0
        self.history = {
            'arms_pulled': [],
            'rewards_received': [],
            'cumulative_reward': 0
        }
        logger.info("Bandit statistics reset")
   


class EpsilonGreedyBandit(MultiArmedBandit):
    """
    Epsilon-Greedy Multi-Armed Bandit implementation.
    
    With probability ε, explore by choosing a random arm.
    With probability (1-ε), exploit by choosing the best known arm.
    """
    
    def __init__(self, n_arms: int, epsilon: float = 0.1, 
                 arm_ids: Optional[List[str]] = None, 
                 decay_epsilon: bool = False):
        """
        Initialize Epsilon-Greedy bandit.
        
        Args:
            n_arms: Number of arms
            epsilon: Exploration probability (0-1)
            arm_ids: Optional list of product IDs
            decay_epsilon: Whether to decay epsilon over time
        """
        super().__init__(n_arms, arm_ids)
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
            logger.info(f"Exploring: selected arm {selected_arm} (product: {self.arm_ids[selected_arm]})")
        
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
            
            logger.info(f"Exploiting: selected arm {selected_arm} (product: {self.arm_ids[selected_arm]})")
        
        return int(selected_arm)
    
    def get_config(self) -> Dict:
        """Get current configuration."""
        return {
            'algorithm': 'epsilon_greedy',
            'n_arms': self.n_arms,
            'epsilon': self.epsilon,
            'initial_epsilon': self.initial_epsilon,
            'decay_epsilon': self.decay_epsilon,
            'total_pulls': self.total_pulls
        }


class UCBBandit(MultiArmedBandit):
    """
    Upper Confidence Bound Multi-Armed Bandit implementation.
    
    Selects the arm with the highest upper confidence bound:
    UCB(i) = average_reward(i) + sqrt(2 * log(total_pulls) / pulls(i))
    """
    
    def __init__(self, n_arms: int, confidence_level: float = 2.0, 
                 arm_ids: Optional[List[str]] = None):
        """
        Initialize UCB bandit.
        
        Args:
            n_arms: Number of arms
            confidence_level: Confidence parameter (higher = more exploration)
            arm_ids: Optional list of product IDs
        """
        super().__init__(n_arms, arm_ids)
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
            logger.info(f"UCB: Pulling unpulled arm {selected_arm} (product: {self.arm_ids[selected_arm]})")
            return selected_arm
        
        # Calculate UCB values for all arms
        ucb_values = np.zeros(self.n_arms)
        
        for i in range(self.n_arms):
            # Average reward for this arm
            avg_reward = self.rewards[i] / self.counts[i]
            
            # Confidence interval
            confidence_interval = math.sqrt(
                (self.confidence_level * math.log(self.total_pulls)) / self.counts[i]
            )
            
            # UCB value
            ucb_values[i] = avg_reward + confidence_interval
        
        # Select arm with highest UCB value
        selected_arm = np.argmax(ucb_values)
        
        logger.info(f"UCB: selected arm {selected_arm} (product: {self.arm_ids[selected_arm]}) "
                   f"with UCB value {ucb_values[selected_arm]:.3f}")
        
        return int(selected_arm)
    
    def get_ucb_values(self) -> List[float]:
        """Get current UCB values for all arms."""
        if self.total_pulls == 0:
            return [float('inf')] * self.n_arms
        
        ucb_values = []
        for i in range(self.n_arms):
            if self.counts[i] == 0:
                ucb_values.append(float('inf'))
            else:
                avg_reward = self.rewards[i] / self.counts[i]
                confidence_interval = math.sqrt(
                    (self.confidence_level * math.log(self.total_pulls)) / self.counts[i]
                )
                ucb_values.append(avg_reward + confidence_interval)
        
        return ucb_values
    
    def get_config(self) -> Dict:
        """Get current configuration."""
        return {
            'algorithm': 'ucb',
            'n_arms': self.n_arms,
            'confidence_level': self.confidence_level,
            'total_pulls': self.total_pulls
        }


class BanditManager:
    """
    Manager class to handle multiple bandit instances for different contexts.
    E.g., different bandits for different product categories or user segments.
    """
    
    def __init__(self):
        self.bandits: Dict[str, MultiArmedBandit] = {}
    
    def create_bandit(self, bandit_id: str, bandit_type: str, 
                     product_ids: List[str], **kwargs) -> MultiArmedBandit:
        """
        Create a new bandit instance.
        
        Args:
            bandit_id: Unique identifier for this bandit
            bandit_type: 'epsilon_greedy' or 'ucb'
            product_ids: List of product IDs that this bandit will recommend
            **kwargs: Additional parameters for the bandit
        
        Returns:
            Created bandit instance
        """
        n_arms = len(product_ids)
        
        if bandit_type == 'epsilon_greedy':
            bandit = EpsilonGreedyBandit(n_arms, arm_ids=product_ids, **kwargs)
        elif bandit_type == 'ucb':
            bandit = UCBBandit(n_arms, arm_ids=product_ids, **kwargs)
        else:
            raise ValueError(f"Unknown bandit type: {bandit_type}")
        
        self.bandits[bandit_id] = bandit
        logger.info(f"Created {bandit_type} bandit '{bandit_id}' with {n_arms} arms")
        
        return bandit
    
    def get_bandit(self, bandit_id: str) -> Optional[MultiArmedBandit]:
        """Get a bandit instance by ID."""
        return self.bandits.get(bandit_id)
    
    def update_bandit(self, bandit_id: str, product_id: str, reward: float) -> bool:
        """
        Update a bandit with a reward.
        
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
            arm_index = bandit.arm_ids.index(product_id)
            bandit.update(arm_index, reward)
            return True
        except ValueError:
            logger.error(f"Product '{product_id}' not found in bandit '{bandit_id}'")
            return False
    
    def recommend_product(self, bandit_id: str) -> Optional[str]:
        """
        Get a product recommendation from a bandit.
        
        Args:
            bandit_id: ID of the bandit to use
        
        Returns:
            Product ID to recommend, or None if bandit not found
        """
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            logger.error(f"Bandit '{bandit_id}' not found")
            return None
        
        arm_index = bandit.select_arm()
        return bandit.arm_ids[arm_index]
    
    def get_bandit_stats(self, bandit_id: str) -> Optional[Dict]:
        """Get statistics for a bandit."""
        bandit = self.get_bandit(bandit_id)
        if bandit is None:
            return None
        
        stats = bandit.get_arm_stats()
        
        return stats
    
    def list_bandits(self) -> List[str]:
        """Get list of all bandit IDs."""
        return list(self.bandits.keys())


# Example usage for testing
if __name__ == "__main__":
    # Example: Testing with sample product IDs
    product_ids = ["prod_1", "prod_2", "prod_3", "prod_4", "prod_5"]
    
    print("=== Epsilon-Greedy Bandit Test ===")
    eg_bandit = EpsilonGreedyBandit(len(product_ids), epsilon=0.3, arm_ids=product_ids)
    
    # Simulate some interactions
    for i in range(20):
        arm = eg_bandit.select_arm()
        # Simulate different reward patterns
        if product_ids[arm] == "prod_1":
            reward = np.random.normal(2.0, 0.5)  # Good product
        elif product_ids[arm] == "prod_2":
            reward = np.random.normal(1.5, 0.3)  # Decent product
        else:
            reward = np.random.normal(0.5, 0.8)  # Average products
        
        eg_bandit.update(arm, reward)
    
    print(f"Best arm: {eg_bandit.get_best_arm()}")
    print(f"Stats: {eg_bandit.get_arm_stats()}")
    
    print("\n=== UCB Bandit Test ===")
    ucb_bandit = UCBBandit(len(product_ids), arm_ids=product_ids)
    
    # Simulate interactions
    for i in range(20):
        arm = ucb_bandit.select_arm()
        # Same reward pattern
        if product_ids[arm] == "prod_1":
            reward = np.random.normal(2.0, 0.5)
        elif product_ids[arm] == "prod_2":
            reward = np.random.normal(1.5, 0.3)
        else:
            reward = np.random.normal(0.5, 0.8)
        
        ucb_bandit.update(arm, reward)
    
    print(f"Best arm: {ucb_bandit.get_best_arm()}")
    print(f"UCB values: {ucb_bandit.get_ucb_values()}")