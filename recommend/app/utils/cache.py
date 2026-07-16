"""
In-memory caching utilities for the recommendation service.
Handles product and user preference caching with TTL support.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, TypeVar, Generic
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CacheEntry(Generic[T]):
    """Represents a cached entry with TTL"""
    
    def __init__(self, value: T, ttl_seconds: int):
        self.value = value
        self.created_at = datetime.now()
        self.ttl_seconds = ttl_seconds
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired"""
        expiry_time = self.created_at + timedelta(seconds=self.ttl_seconds)
        return datetime.now() > expiry_time


class InMemoryCache(Generic[T]):
    """
    Simple in-memory cache with TTL support.
    Used for caching products and user preferences.
    """
    
    def __init__(self):
        self._cache: Dict[str, CacheEntry] = {}
    
    def get(self, key: str) -> Optional[T]:
        """Get value from cache if it exists and hasn't expired"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if entry.is_expired():
            del self._cache[key]
            logger.debug(f"Cache entry expired for key: {key}")
            return None
        
        return entry.value
    
    def set(self, key: str, value: T, ttl_seconds: int) -> None:
        """Set value in cache with TTL"""
        self._cache[key] = CacheEntry(value, ttl_seconds)
        logger.debug(f"Cached entry set for key: {key} (TTL: {ttl_seconds}s)")
    
    def delete(self, key: str) -> None:
        """Delete a cache entry"""
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Cache entry deleted for key: {key}")
    
    def clear(self) -> None:
        """Clear all cache entries"""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cache cleared ({count} entries removed)")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        active_entries = 0
        expired_entries = 0
        
        for entry in self._cache.values():
            if entry.is_expired():
                expired_entries += 1
            else:
                active_entries += 1
        
        return {
            "total_entries": len(self._cache),
            "active_entries": active_entries,
            "expired_entries": expired_entries
        }
