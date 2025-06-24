from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
# Pydantic models for validation
class User(BaseModel):
    id: str
    clerkId: str
    email: str
    name: str
    avatar: Optional[str] = None
    preferences: Optional[dict] = None
    createdAt: datetime
    updatedAt: datetime

class Product(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    brand: str
    imageUrl: str
    images: List[str]
    features: dict
    inventory: int = 0
    isActive: bool = True
    has3DModel: bool = False
    modelUrl: Optional[str] = None
    arEnabled: bool = False
    createdAt: datetime
    updatedAt: datetime

class UserInteraction(BaseModel):
    id: str
    userId: str
    productId: str
    action: str  # 'view', 'tick', 'cross', 'cart_add', 'purchase', 'ar_view'
    reward: float
    context: Optional[dict] = None
    createdAt: datetime

class CreateUserRequest(BaseModel):
    clerkId: str
    email: str
    name: str
    avatar: Optional[str] = None

class CreateProductRequest(BaseModel):
    name: str
    description: str
    price: float
    category: str
    brand: str
    imageUrl: str
    images: List[str] = []
    features: dict = {}
    inventory: int = 0

class CreateInteractionRequest(BaseModel):
    userId: str
    productId: str
    action: str
    reward: float = 0.0
    context: Optional[dict] = None
