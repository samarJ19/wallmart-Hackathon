"""
Configuration management for the recommendation service.
Centralized configuration from environment variables.
"""
import os
from typing import List
from enum import Enum


class Environment(str, Enum):
    """Environment types"""
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"


class Config:
    """Main configuration class"""
    
    # Environment
    ENVIRONMENT = os.getenv("ENVIRONMENT", Environment.DEVELOPMENT)
    DEBUG = ENVIRONMENT == Environment.DEVELOPMENT
    
    # Server
    PORT = int(os.getenv("PORT", "8000"))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # Backend Integration
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")
    BACKEND_TIMEOUT = int(os.getenv("BACKEND_TIMEOUT", "30"))
    
    # Initialization & Retries
    MAX_INIT_RETRIES = int(os.getenv("MAX_INIT_RETRIES", "10"))
    INIT_RETRY_DELAY = int(os.getenv("INIT_RETRY_DELAY", "5"))
    MAX_RETRY_DELAY = int(os.getenv("MAX_RETRY_DELAY", "60"))
    
    # CORS
    ALLOWED_ORIGINS: List[str] = (
        os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if ENVIRONMENT == Environment.PRODUCTION
        else ["*"]
    )
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "production" else "DEBUG")
    
    # Recommendation Engine
    DEFAULT_RECOMMENDATION_COUNT = int(os.getenv("DEFAULT_RECOMMENDATION_COUNT", "5"))
    COLD_START_THRESHOLD = int(os.getenv("COLD_START_THRESHOLD", "5"))  # Interactions before personalized
    
    # Caching
    CACHE_TTL_PRODUCTS = int(os.getenv("CACHE_TTL_PRODUCTS", "3600"))  # 1 hour
    CACHE_TTL_USER_PREFERENCES = int(os.getenv("CACHE_TTL_USER_PREFERENCES", "1800"))  # 30 mins
    
    # Personalization weights
    WEIGHT_CATEGORY = float(os.getenv("WEIGHT_CATEGORY", "0.3"))
    WEIGHT_BRAND = float(os.getenv("WEIGHT_BRAND", "0.2"))
    WEIGHT_PRICE = float(os.getenv("WEIGHT_PRICE", "0.15"))
    WEIGHT_FEATURES = float(os.getenv("WEIGHT_FEATURES", "0.15"))
    WEIGHT_GLOBAL_SCORE = float(os.getenv("WEIGHT_GLOBAL_SCORE", "0.2"))
    
    # Exploration vs Exploitation
    EXPLORATION_RATE = float(os.getenv("EXPLORATION_RATE", "0.1"))  # 10% exploration
    DETERMINISTIC_RATE = float(os.getenv("DETERMINISTIC_RATE", "0.7"))  # 70% from top scores


# Singleton config instance
config = Config()
