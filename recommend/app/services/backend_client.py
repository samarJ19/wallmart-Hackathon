"""
Backend client service for communicating with the Node.js backend.
Handles product fetching, caching, and retry logic.
"""
import httpx
import asyncio
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

from config import Config
from models.data_models import Product, UserInteraction
from utils.cache import InMemoryCache

logger = logging.getLogger(__name__)


class BackendClient:
    """
    Manages communication with the backend service.
    Handles product fetching, caching, and error recovery.
    """
    
    def __init__(self):
        self.backend_url = Config.BACKEND_URL
        self.timeout = Config.BACKEND_TIMEOUT
        self.products_cache = InMemoryCache()
        self.interactions_cache = InMemoryCache()
        self.is_connected = False
        self.products: Dict[str, Product] = {}
        self.all_interactions: List[UserInteraction] = []
    
    async def initialize(self) -> bool:
        """
        Initialize backend client by fetching products and interactions.
        Returns True if successful, False otherwise.
        """
        try:
            logger.info(f"Initializing backend client connecting to {self.backend_url}")
            
            # Fetch products
            products_result = await self._fetch_products_from_backend()
            if not products_result:
                logger.error("Failed to fetch products from backend")
                return False
            
            self.products = products_result
            self.is_connected = True
            
            logger.info(f"Successfully loaded {len(self.products)} products from backend")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize backend client: {e}")
            self.is_connected = False
            return False
    
    async def _fetch_products_from_backend(self) -> Dict[str, Product]:
        """Fetch and parse products from backend API"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.backend_url}/api/products/categories/list")
                response.raise_for_status()
                
                data = response.json()
                categories = data.get("categories", [])
                
                all_products = {}
                total_count = 0
                
                for category_data in categories:
                    category_name = category_data.get("name")
                    products_list = category_data.get("products", [])
                    
                    if not products_list:
                        logger.warning(f"No products found for category {category_name}")
                        continue
                    
                    for product_data in products_list:
                        try:
                            product = self._parse_product_from_dict(product_data, category_name)
                            all_products[product.id] = product
                            total_count += 1
                        except Exception as e:
                            logger.error(f"Error parsing product: {e}")
                            continue
                    
                    logger.info(f"Loaded {len(products_list)} products from category {category_name}")
                
                return all_products
                
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch from backend: {e}")
            return {}
    
    async def fetch_user_interactions(self, user_id: Optional[str] = None) -> List[UserInteraction]:
        """
        Fetch user interactions from backend.
        If user_id is provided, fetch only that user's interactions.
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                endpoint = f"{self.backend_url}/api/interactions"
                if user_id:
                    endpoint += f"?userId={user_id}"
                
                response = await client.get(endpoint)
                response.raise_for_status()
                
                data = response.json()
                interactions_list = data.get("interactions", [])
                
                interactions = []
                for interaction_data in interactions_list:
                    try:
                        interaction = self._parse_interaction_from_dict(interaction_data)
                        interactions.append(interaction)
                    except Exception as e:
                        logger.error(f"Error parsing interaction: {e}")
                        continue
                
                logger.info(f"Fetched {len(interactions)} interactions")
                return interactions
                
        except httpx.RequestError as e:
            logger.error(f"Failed to fetch interactions from backend: {e}")
            return []
    
    @staticmethod
    def _parse_product_from_dict(data: Dict[str, Any], category: str) -> Product:
        """Parse product from backend response"""
        return Product(
            id=data.get("id"),
            name=data.get("name", ""),
            description=data.get("description", ""),
            price=float(data.get("price", 0)),
            category=category,
            brand=data.get("brand", ""),
            imageUrl=data.get("imageUrl", ""),
            features=data.get("features"),
            rating=float(data.get("rating", 0)),
            review_count=int(data.get("review_count", 0)),
            images=data.get("images", []),
            has_3d_model=data.get("has3DModel", False),
            ar_enabled=data.get("arEnabled", False)
        )
    
    @staticmethod
    def _parse_interaction_from_dict(data: Dict[str, Any]) -> UserInteraction:
        """Parse interaction from backend response"""
        return UserInteraction(
            id=data.get("id"),
            user_id=data.get("userId"),
            product_id=data.get("productId"),
            action=data.get("action"),
            reward=float(data.get("reward", 0)),
            context=data.get("context"),
            created_at=data.get("createdAt", datetime.now().isoformat())
        )
    
    async def record_feedback(self, user_id: str, product_id: str, action: str) -> bool:
        """Record user feedback to backend"""
        try:
            payload = {
                "userId": user_id,
                "productId": product_id,
                "action": action,
                "createdAt": datetime.now().isoformat()
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.backend_url}/api/interactions/record",
                    json=payload
                )
                response.raise_for_status()
                logger.info(f"Recorded feedback: {user_id} -> {product_id} ({action})")
                return True
                
        except httpx.RequestError as e:
            logger.error(f"Failed to record feedback: {e}")
            return False
    
    def get_product(self, product_id: str) -> Optional[Product]:
        """Get product from cache"""
        return self.products.get(product_id)
    
    def get_all_products(self) -> Dict[str, Product]:
        """Get all loaded products"""
        return self.products
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Get backend connection status"""
        return {
            "connected": self.is_connected,
            "products_loaded": len(self.products),
            "backend_url": self.backend_url
        }
