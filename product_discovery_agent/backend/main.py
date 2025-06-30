from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import json
import re
# from langchain.schema import HumanMessage, AIMessage
# from langchain.chat_models import ChatOpenAI
# from langchain.prompts import ChatPromptTemplate
# import asyncio
from sklearn.metrics.pairwise import cosine_similarity
import logging
import pandas as pd
import ast


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Product Discovery Chatbot API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_products_from_csv(csv_path: str) -> List[Dict[str, Any]]:
    df = pd.read_csv(csv_path)

    # Convert semicolon-separated string to list of image URLs
    df['images'] = df['images'].apply(lambda x: x.split(';') if isinstance(x, str) else [])

    # Convert string 'true'/'false' to actual booleans (if applicable)
    df['has3DModel'] = df['has3DModel'].astype(str).str.lower() == 'true'
    df['arEnabled'] = df['arEnabled'].astype(str).str.lower() == 'true'

    products = []
    for _, row in df.iterrows():
        product = {
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'price': float(row['price']),
            'category': row['category'],
            'brand': row['brand'],
            'imageUrl': row['imageUrl'],
            'images': row['images'],
            'features': {
                'size': row['size'],
                'material': row['material'],
                'color': row['color'],
                'fit': row['fit'],
                'gender': row['gender'],
                'age_group': row['age_group'],
                'occasion': row['occasion']
            },
            'inventory': int(row['inventory']),
            'has3DModel': row['has3DModel'],
            'modelUrl': row['modelUrl'],
            'arEnabled': row['arEnabled']
        }
        products.append(product)

    return products

PRODUCTS = load_products_from_csv("backend/products_quoted.csv")


# Initialize embedding model (free open-source model)
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    chat_history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response: str
    products: List[Dict[str, Any]] = []
    confidence: float
    needs_clarification: bool = False
    clarifying_questions: List[str] = []

class ProductRetriever:
    def __init__(self, products: List[Dict]):
        self.products = products
        self.product_embeddings = None
        self.product_texts = []
        self._create_embeddings()
    
    def _create_embeddings(self):
        """Create embeddings for all products"""
        for product in self.products:
            # Create comprehensive text representation
            features_text = " ".join([f"{k}: {v}" for k, v in product['features'].items()])
            text = f"{product['name']} {product['description']} {product['category']} {product['brand']} {features_text}"
            self.product_texts.append(text)
        
        self.product_embeddings = embedding_model.encode(self.product_texts)
        logger.info(f"Created embeddings for {len(self.products)} products")
    
    def search_products(self, query: str, top_k: int = 3, threshold: float = 0.3):
        """Search products using semantic similarity"""
        query_embedding = embedding_model.encode([query])
        similarities = cosine_similarity(query_embedding, self.product_embeddings)[0]
        
        # Get top matches
        top_indices = np.argsort(similarities)[::-1][:top_k]
        top_products = []
        
        for idx in top_indices:
            if similarities[idx] >= threshold:
                product = self.products[idx].copy()
                product['similarity_score'] = float(similarities[idx])
                top_products.append(product)
        
        return top_products, float(max(similarities)) if len(similarities) > 0 else 0.0

class IntentExtractor:
    def __init__(self):
        self.intent_patterns = {
            'search': [r'looking for', r'want', r'need', r'find', r'show me', r'search'],
            'filter': [r'under \$?\d+', r'less than', r'more than', r'between \$?\d+ and \$?\d+'],
            'compare': [r'compare', r'difference', r'versus', r'vs'],
            'details': [r'tell me about', r'details', r'more info', r'specifications']
        }
        
        self.attribute_patterns = {
            'category': [r'shoes?', r'tee?s?', r'watch', r'bag', r'electronics?', r'accessories?', r'home'],
            'brand': [r'nike', r'adidas', r'puma', r'gucci', r'zara', r'h&m', r'reebok'],
            'color': [r'red', r'blue', r'white', r'black', r'green', r'yellow'],
            'size': [r'small', r'medium', r'large', r'xl', r'xxl', r's', r'm', r'l'],
            'gender': [r'men', r'women', r'male', r'female', r'unisex'],
            'price': [r'\$?\d+', r'cheap', r'expensive', r'budget', r'premium']
        }
    
    def extract_intent_and_attributes(self, text: str):
        """Extract intent and product attributes from user message"""
        text_lower = text.lower()
        
        # Extract intent
        intent = 'search'  # default
        for intent_type, patterns in self.intent_patterns.items():
            if any(re.search(pattern, text_lower) for pattern in patterns):
                intent = intent_type
                break
        
        # Extract attributes
        attributes = {}
        for attr_type, patterns in self.attribute_patterns.items():
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                if matches:
                    attributes[attr_type] = matches[0]
                    break
        
        return intent, attributes

class ConversationalAgent:
    def __init__(self, retriever: ProductRetriever):
        self.retriever = retriever
        self.intent_extractor = IntentExtractor()
        
        # Conversation prompts
        self.system_prompt = """You are a helpful product discovery assistant. Your role is to:
1. Help users find products that match their needs
2. Ask clarifying questions when the request is unclear
3. Suggest alternatives when exact matches aren't available
4. Be conversational and friendly

When responding:
- Be concise but helpful
- Ask specific questions to narrow down choices
- Explain why you're suggesting certain products
- Handle ambiguous requests by asking for clarification
"""
    
    def generate_clarifying_questions(self, query: str, attributes: Dict) -> List[str]:
        """Generate clarifying questions based on missing information"""
        questions = []
        
        if 'category' not in attributes:
            questions.append("What type of product are you looking for? (shoes, clothing, accessories, etc.)")
        
        if 'price' not in attributes:
            questions.append("What's your budget range?")
        
        if 'gender' not in attributes and 'category' in attributes:
            questions.append("Are you looking for men's, women's, or unisex items?")
        
        if 'occasion' not in attributes:
            questions.append("What occasion is this for? (casual, formal, party, etc.)")
        
        return questions[:2]  # Limit to 2 questions to avoid overwhelming
    
    def generate_response(self, query: str, products: List[Dict], confidence: float, chat_history: List[Dict]) -> str:
        """Generate conversational response"""
        if not products:
            return "I couldn't find any products matching your request. Could you provide more details about what you're looking for?"
        
        if confidence < 0.4:
            return "I found some products that might interest you, but I'd like to understand your needs better. Here are some options:"
        
        if len(products) == 1:
            product = products[0]
            return f"Great! I found the perfect match: **{product['name']}** by {product['brand']} for ₹{product['price']:.2f}. It's a {product['category']} item with {product['features']['color']} color. Would you like more details or shall I show you similar options?"
        
        return f"I found {len(products)} great options for you! Here are the top matches based on your preferences:"

# Initialize components
retriever = ProductRetriever(PRODUCTS)
agent = ConversationalAgent(retriever)

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_input: ChatMessage):
    """Main chat endpoint"""
    try:
        query = chat_input.message
        chat_history = chat_input.chat_history
        
        # Extract intent and attributes
        intent, attributes = agent.intent_extractor.extract_intent_and_attributes(query)
        
        # Search for products
        products, confidence = retriever.search_products(query, top_k=3)
        
        # Generate response
        response_text = agent.generate_response(query, products, confidence, chat_history)
        
        # Determine if clarification is needed
        needs_clarification = confidence < 0.4 or len(products) == 0
        clarifying_questions = []
        
        if needs_clarification:
            clarifying_questions = agent.generate_clarifying_questions(query, attributes)
        
        return ChatResponse(
            response=response_text,
            products=products,
            confidence=confidence,
            needs_clarification=needs_clarification,
            clarifying_questions=clarifying_questions
        )
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/products")
async def get_all_products():
    """Get all products"""
    return {"products": PRODUCTS}

@app.get("/products/{product_id}")
async def get_product_details(product_id: str):
    """Get specific product details"""
    product = next((p for p in PRODUCTS if p['id'] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": embedding_model is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)