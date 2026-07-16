"""
Helper functions for the recommendation service.
Includes scoring, normalization, and utility functions.
"""
from typing import List, Dict
import math
from datetime import datetime


def normalize_score(score: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """
    Normalize a score to a given range [min_val, max_val].
    Used for combining scores from different sources.
    """
    if score < min_val:
        return min_val
    if score > max_val:
        return max_val
    return score


def calculate_decay(original_value: float, days_old: int, half_life_days: int = 7) -> float:
    """
    Calculate decayed value based on age.
    Uses exponential decay with configurable half-life.
    
    Args:
        original_value: Initial value
        days_old: How many days old the value is
        half_life_days: Days for value to decay to 50%
    
    Returns:
        Decayed value
    """
    if days_old <= 0:
        return original_value
    
    # Exponential decay formula: value * (0.5)^(age/half_life)
    decay_factor = 0.5 ** (days_old / half_life_days)
    return original_value * decay_factor


def sigmoid(x: float, steepness: float = 1.0) -> float:
    """
    Sigmoid function for smooth transitions.
    Used for smooth scaling between 0 and 1.
    """
    try:
        return 1.0 / (1.0 + math.exp(-steepness * x))
    except OverflowError:
        return 0.0 if x < 0 else 1.0


def weighted_average(scores: List[float], weights: List[float]) -> float:
    """
    Calculate weighted average of scores.
    
    Args:
        scores: List of scores
        weights: List of weights (should sum to 1.0)
    
    Returns:
        Weighted average
    """
    if not scores or not weights:
        return 0.0
    
    if len(scores) != len(weights):
        raise ValueError("Scores and weights must have the same length")
    
    total_weight = sum(weights)
    if total_weight == 0:
        return 0.0
    
    weighted_sum = sum(s * w for s, w in zip(scores, weights))
    return weighted_sum / total_weight


def calculate_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """
    Calculate cosine similarity between two vectors (represented as dicts).
    Used for user-user and item-item similarity in collaborative filtering.
    
    Args:
        vec1: First vector as dict
        vec2: Second vector as dict
    
    Returns:
        Cosine similarity (0-1)
    """
    # Get all keys
    all_keys = set(vec1.keys()) | set(vec2.keys())
    
    if not all_keys:
        return 0.0
    
    # Calculate dot product and magnitudes
    dot_product = sum(vec1.get(k, 0.0) * vec2.get(k, 0.0) for k in all_keys)
    mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))
    
    if mag1 == 0 or mag2 == 0:
        return 0.0
    
    return dot_product / (mag1 * mag2)


def get_price_bucket(price: float) -> str:
    """Get price bucket/range for a price"""
    if price < 100:
        return "budget"
    elif price < 500:
        return "mid_range"
    elif price < 1000:
        return "premium"
    else:
        return "luxury"
