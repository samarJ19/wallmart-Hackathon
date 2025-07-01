# backend/enhanced_main.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import asyncio
from datetime import datetime
import uuid
import random
import json
import os
from pathlib import Path
from contextlib import asynccontextmanager

# Import our advanced RAG components
from advanced_rag import AdvancedRAGRetriever, ConversationMemory, SmartQueryProcessor, SearchResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global products variable
PRODUCTS = []

def load_products_from_json(file_path: str = "data/products.json") -> List[Dict[str, Any]]:
    """Load products from JSON file with error handling"""
    try:
        # Try relative path first, then absolute
        if not os.path.exists(file_path):
            # Try different possible locations
            possible_paths = [
                file_path,
                f"backend/{file_path}",
                f"../{file_path}",
                "products.json",
                "data/products.json",
                "backend/data/products.json"
            ]
            
            file_path = ""
            for path in possible_paths:
                if os.path.exists(path):
                    file_path = path
                    break
            
            if len(file_path)==0:
                logger.warning("Products JSON file not found, using fallback data")
                return get_fallback_products()
        
        with open(file_path, 'r', encoding='utf-8') as file:
            products_data = json.load(file)
            
            # Handle different JSON structures
            if isinstance(products_data, dict):
                if 'products' in products_data:
                    products = products_data['products']
                else:
                    products = list(products_data.values())
            else:
                products = products_data
            
            logger.info(f"Successfully loaded {len(products)} products from {file_path}")
            return products
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in products file: {e}")
        return get_fallback_products()
    except Exception as e:
        logger.error(f"Error loading products from JSON: {e}")
        return get_fallback_products()

def get_fallback_products() -> List[Dict[str, Any]]:
    """Fallback products data if JSON file is not available"""
    logger.info("Using fallback product data")
    return [
        {
            'id': 'prod_0bc80931',
            'name': 'H&M Tee 0',
            'description': 'This is a high-quality footwear product from Nike.',
            'price': 1498.82,
            'category': 'electronics',
            'brand': 'Gucci',
            'imageUrl': 'https://images.unsplash.com/photo-1587825140708-7d4f45b81c0a?w=400',
            'images': ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
            'features': {
                'size': 'XL',
                'material': 'Mesh',
                'color': 'Red',
                'fit': 'Loose',
                'gender': 'Unisex',
                'age_group': 'Adult',
                'occasion': 'Party'
            },
            'inventory': 77,
            'has3DModel': False,
            'modelUrl': 'https://cdn.example.com/models/sample_model.glb',
            'arEnabled': False
        },
        {
            'id': 'prod_b1e14a0f',
            'name': 'Reebok Watch 1',
            'description': 'This is a high-quality accessories product from Zara.',
            'price': 1781.13,
            'category': 'accessories',
            'brand': 'Zara',
            'imageUrl': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            'images': [
                'https://images.unsplash.com/photo-1587825140708-7d4f45b81c0a?w=400',
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400'
            ],
            'features': {
                'size': 'XL',
                'material': 'Leather',
                'color': 'White',
                'fit': 'Loose',
                'gender': 'Female',
                'age_group': 'Kids',
                'occasion': 'Formal'
            },
            'inventory': 26,
            'has3DModel': False,
            'modelUrl': 'https://cdn.example.com/models/sample_model.glb',
            'arEnabled': False
        },
        {
            'id': 'prod_fcef2370',
            'name': 'Adidas Shoes 2',
            'description': 'This is a high-quality electronics product from Puma.',
            'price': 1132.16,
            'category': 'electronics',
            'brand': 'H&M',
            'imageUrl': 'https://images.unsplash.com/photo-1587825140708-7d4f45b81c0a?w=400',
            'images': ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400'],
            'features': {
                'size': 'L',
                'material': 'Denim',
                'color': 'White',
                'fit': 'Regular',
                'gender': 'Male',
                'age_group': 'Teen',
                'occasion': 'Party'
            },
            'inventory': 22,
            'has3DModel': False,
            'modelUrl': 'https://cdn.example.com/models/sample_model.glb',
            'arEnabled': True
        },
        {
            'id': 'prod_bdd2e297',
            'name': 'Zara Shoes 3',
            'description': 'This is a high-quality accessories product from H&M.',
            'price': 2860.86,
            'category': 'accessories',
            'brand': 'Zara',
            'imageUrl': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            'images': ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
            'features': {
                'size': 'XL',
                'material': 'Polyester',
                'color': 'Blue',
                'fit': 'Athletic',
                'gender': 'Unisex',
                'age_group': 'Teen',
                'occasion': 'Casual'
            },
            'inventory': 32,
            'has3DModel': True,
            'modelUrl': 'https://cdn.example.com/models/sample_model.glb',
            'arEnabled': True
        },
        {
            'id': 'prod_ef201fab',
            'name': 'Adidas Bag 4',
            'description': 'This is a high-quality footwear product from Adidas.',
            'price': 2185.84,
            'category': 'home',
            'brand': 'Puma',
            'imageUrl': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
            'images': ['https://images.unsplash.com/photo-1587825140708-7d4f45b81c0a?w=400'],
            'features': {
                'size': 'XL',
                'material': 'Cotton',
                'color': 'White',
                'fit': 'Athletic',
                'gender': 'Female',
                'age_group': 'Kids',
                'occasion': 'Formal'
            },
            'inventory': 25,
            'has3DModel': False,
            'modelUrl': 'https://cdn.example.com/models/sample_model.glb',
            'arEnabled': False
        }
    ]

def reload_products():
    """Reload products from JSON file"""
    global PRODUCTS
    PRODUCTS = load_products_from_json()
    logger.info(f"Products reloaded: {len(PRODUCTS)} products available")

# Pydantic models
class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    chat_history: List[Dict[str, str]] = []

class ChatResponse(BaseModel):
    response: str
    products: List[Dict[str, Any]] = []
    confidence: float
    needs_clarification: bool = False
    clarifying_questions: List[str] = []
    search_explanation: str = ""
    session_id: str
    suggestions: List[str] = []

class ProductRecommendationRequest(BaseModel):
    product_id: str
    num_recommendations: int = 3

# Global components
advanced_retriever = None
query_processor = None
user_sessions = {}  # In-memory session storage


class EnhancedConversationalAgent:
    """Enhanced conversational agent with advanced capabilities"""
    
    def __init__(self, retriever: AdvancedRAGRetriever, query_processor: SmartQueryProcessor):
        self.retriever = retriever
        self.query_processor = query_processor
        
        # Response templates
        self.response_templates = {
            'no_results': [
                "I couldn't find any products matching your exact criteria. Let me suggest some alternatives:",
                "No perfect matches found, but here are some similar options you might like:",
                "I don't have exactly what you're looking for, but these products might interest you:"
            ],
            'low_confidence': [
                "I found some products that might match your needs. Let me know if you'd like me to refine the search:",
                "Here are some potential matches. Would you like me to ask a few questions to find better options?",
                "I found a few possibilities. Can you give me more details to improve the recommendations?"
            ],
            'high_confidence': [
                "Great! I found some excellent matches for you:",
                "Perfect! Here are the products that best match your requirements:",
                "Excellent! I found exactly what you're looking for:"
            ]
        }
    
    def generate_clarifying_questions(self, processed_query: Dict[str, Any], search_results: List[SearchResult]) -> List[str]:
        """Generate smart clarifying questions"""
        questions = []
        entities = processed_query['entities']
        intent = processed_query['intent']
        
        # If no category specified
        if 'category' not in entities:
            questions.append("What type of product are you looking for? (e.g., shoes, clothing, accessories)")
        
        # If no price preference and intent is search
        if intent == 'search' and processed_query['price_sensitivity'] == 'neutral':
            questions.append("What's your budget range? (budget-friendly, mid-range, or premium)")
        
        # If no gender specified for clothing/accessories
        if ('category' in entities and 
            any(cat in ['clothing', 'shoes', 'accessories'] for cat in entities['category']) and
            'gender' not in entities):
            questions.append("Are you looking for men's, women's, or unisex items?")
        
        # If no occasion specified
        if 'occasion' not in entities:
            questions.append("What's the occasion? (casual, formal, party, sports)")
        
        # Context-aware questions based on search results
        if search_results:
            # If results have mixed categories
            categories = set(result.product['category'] for result in search_results)
            if len(categories) > 1:
                cat_list = ', '.join(categories)
                questions.append(f"I found products in multiple categories ({cat_list}). Which category interests you most?")
            
            # If results have wide price range
            prices = [result.product['price'] for result in search_results]
            if prices and (max(prices) - min(prices)) > 1000:
                questions.append("The products I found have a wide price range. What's your preferred budget?")
        
        # Limit to 3 most relevant questions
        return questions[:3]
    
    def generate_search_explanation(self, processed_query: Dict[str, Any], search_results: List[SearchResult]) -> str:
        """Generate explanation of search process"""
        entities = processed_query['entities']
        
        explanations = []
        
        if 'category' in entities:
            explanations.append(f"searched in {', '.join(entities['category'])} category")
        
        if 'brand' in entities:
            explanations.append(f"filtered by {', '.join(entities['brand'])} brand")
        
        if 'color' in entities:
            explanations.append(f"looking for {', '.join(entities['color'])} colors")
        
        if processed_query['price_sensitivity'] != 'neutral':
            explanations.append(f"considering {processed_query['price_sensitivity']} price range")
        
        if explanations:
            base = "I " + " and ".join(explanations)
            if search_results:
                return f"{base}, and found {len(search_results)} matching products."
            else:
                return f"{base}, but didn't find exact matches."
        
        return f"I searched through our product catalog and found {len(search_results)} results."
    
    def generate_suggestions(self, processed_query: Dict[str, Any], search_results: List[SearchResult]) -> List[str]:
        """Generate helpful suggestions for the user"""
        suggestions = []
        entities = processed_query['entities']
        
        # Suggest exploring related categories
        if 'category' in entities:
            current_cats = entities['category']
            related_mapping = {
                'shoes': ['accessories', 'clothing'],
                'clothing': ['shoes', 'accessories'],
                'accessories': ['clothing', 'shoes'],
                'electronics': ['home'],
                'home': ['electronics']
            }
            
            for cat in current_cats:
                if cat in related_mapping:
                    for related in related_mapping[cat]:
                        suggestions.append(f"Explore {related} to complete your look")
        
        # Suggest trying different brands
        if search_results:
            result_brands = set(result.product['brand'] for result in search_results)
            all_brands = set(product['brand'] for product in PRODUCTS)
            other_brands = all_brands - result_brands
            if other_brands:
                suggestions.append(f"Try searching for {', '.join(list(other_brands)[:2])} brands")
        
        # Suggest price flexibility
        if processed_query['price_sensitivity'] == 'budget':
            suggestions.append("Consider mid-range options for better quality")
        elif processed_query['price_sensitivity'] == 'premium':
            suggestions.append("Check out our premium collection for exclusive items")
        
        # Suggest seasonal items
        suggestions.append("Browse our seasonal collection for trending items")
        
        return suggestions[:3]
    
    async def process_message(self, message: str, session_memory: ConversationMemory) -> ChatResponse:
        """Process user message and generate response"""
        try:
            # Process the query
            # Pass the current message to get_context_for_query for better context extraction
            processed_query = self.query_processor.process_query(message, session_memory)
            
            # Perform search
            search_results = await self.retriever.search(processed_query)

            # Update conversation memory with search results for preference extraction
            session_memory.add_interaction(message, "", search_results)
            
            # Determine confidence and response type
            confidence = self.calculate_confidence(processed_query, search_results)
            needs_clarification = confidence < 0.6 or len(search_results) == 0
            
            # Generate response components
            clarifying_questions = []
            if needs_clarification:
                clarifying_questions = self.generate_clarifying_questions(processed_query, search_results)
            
            search_explanation = self.generate_search_explanation(processed_query, search_results)
            suggestions = self.generate_suggestions(processed_query, search_results)
            
            # Generate main response text
            response_text = self.generate_response_text(processed_query, search_results, confidence)
            
            # Update session memory with actual response text
            if session_memory.conversation_history: # Corrected: Use conversation_history
                session_memory.conversation_history[-1]['assistant'] = response_text
            
            return ChatResponse(
                response=response_text,
                products=[result.product for result in search_results[:6]],  # Limit to 6 products
                confidence=confidence,
                needs_clarification=needs_clarification,
                clarifying_questions=clarifying_questions,
                search_explanation=search_explanation,
                session_id=session_memory.session_id,
                suggestions=suggestions
            )
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return ChatResponse(
                response="I apologize, but I encountered an error while processing your request. Please try again.",
                products=[],
                confidence=0.0,
                needs_clarification=True,
                clarifying_questions=["Could you please rephrase your request?"],
                search_explanation="",
                session_id=session_memory.session_id,
                suggestions=[]
            )
    
    def calculate_confidence(self, processed_query: Dict[str, Any], search_results: List[SearchResult]) -> float:
        """Calculate confidence score for the search results"""
        if not search_results:
            return 0.0
        
        base_confidence = 0.5
        
        # Boost for exact matches
        entities = processed_query['entities']
        if entities:
            exact_matches = sum(1 for result in search_results if result.similarity_score > 0.8) # Changed from score to similarity_score
            base_confidence += (exact_matches / len(search_results)) * 0.3
        
        # Boost for specific intent
        if processed_query['intent'] in ['search', 'compare']:
            base_confidence += 0.1
        
        # Boost for clear entities
        entity_specificity = len(entities) * 0.05
        base_confidence += min(entity_specificity, 0.3)
        
        # Average result scores
        avg_score = sum(result.similarity_score for result in search_results) / len(search_results) # Changed from score to similarity_score
        base_confidence += avg_score * 0.2
        
        return min(base_confidence, 1.0)
    
    def generate_response_text(self, processed_query: Dict[str, Any], search_results: List[SearchResult], confidence: float) -> str:
        """Generate the main response text"""
        if not search_results:
            template = random.choice(self.response_templates['no_results'])
            # Get some random products as alternatives
            alternatives = random.sample(PRODUCTS, min(3, len(PRODUCTS)))
            return f"{template} You might be interested in products from our {', '.join(set(p['category'] for p in alternatives))} collections."
        
        if confidence < 0.6:
            template = random.choice(self.response_templates['low_confidence'])
        else:
            template = random.choice(self.response_templates['high_confidence'])
        
        # Add context about the results
        result_summary = self.generate_result_summary(search_results)
        
        return f"{template} {result_summary}"
    
    def generate_result_summary(self, search_results: List[SearchResult]) -> str:
        """Generate a summary of the search results"""
        if not search_results:
            return ""
        
        # Analyze results
        brands = list(set(result.product['brand'] for result in search_results))
        categories = list(set(result.product['category'] for result in search_results))
        price_range = {
            'min': min(result.product['price'] for result in search_results),
            'max': max(result.product['price'] for result in search_results)
        }
        
        summary_parts = []
        
        if len(categories) == 1:
            summary_parts.append(f"All results are from the {categories[0]} category")
        else:
            summary_parts.append(f"Results span {', '.join(categories)} categories")
        
        if len(brands) <= 3:
            summary_parts.append(f"featuring {', '.join(brands)} brands")
        else:
            summary_parts.append(f"from {len(brands)} different brands")
        
        if price_range['max'] - price_range['min'] > 500:
            summary_parts.append(f"with prices ranging from ₹{price_range['min']:.0f} to ₹{price_range['max']:.0f}")
        
        return ". ".join(summary_parts) + "."

# Initialize the conversational agent
conversational_agent = None

app = FastAPI(title="Advanced Product Discovery Chatbot API", version="2.0") # Moved app definition here

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    global advanced_retriever, query_processor, conversational_agent
    
    logger.info("Loading products from JSON...")
    reload_products()
    
    logger.info("Initializing Advanced RAG system...")
    advanced_retriever = AdvancedRAGRetriever(PRODUCTS)
    query_processor = SmartQueryProcessor()
    conversational_agent = EnhancedConversationalAgent(advanced_retriever, query_processor)
    logger.info("Advanced RAG system initialized successfully!")

def get_or_create_session(session_id: Optional[str]) -> tuple[str, ConversationMemory]:
    """Get existing session or create new one"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in user_sessions:
        user_sessions[session_id] = ConversationMemory(session_id=session_id) # Pass session_id to ConversationMemory
    
    return session_id, user_sessions[session_id]

# API Endpoints

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatMessage):
    """Enhanced chat endpoint with advanced RAG capabilities"""
    try:
        # Get or create session
        session_id, session_memory = get_or_create_session(request.session_id)
        
        # Process message
        if conversational_agent is not None:
            response = await conversational_agent.process_message(request.message, session_memory)
            response.session_id = session_id
        else:
            raise HTTPException(status_code=500, detail="Chatbot agent not initialized.")
        
        return response
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/products")
async def get_products():
    """Get all products"""
    return {"products": PRODUCTS}

class ProductRequest(BaseModel):
    product: str

@app.post("/predict")
async def predict_category(request: ProductRequest):
    # For now, use a mock response
    mock_categories = [
        "Kitchen Storage & Containers",
        "Home Décor",
        "Furniture",
        "Bathroom Accessories",
        "Office Supplies",
        "Electronics",
        "Garden Tools",
        "Pet Supplies"
    ]
    # Simulate AI logic
    prediction = random.choice(mock_categories)
    return {
        "product": request.product,
        "predicted_category": prediction
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Product Advisor!"}

@app.get("/products/{product_id}")
async def get_product(product_id: str):
    """Get specific product by ID"""
    product = next((p for p in PRODUCTS if p['id'] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/recommendations")
async def get_recommendations(request: ProductRecommendationRequest):
    """Get product recommendations based on a specific product"""
    try:
        # Find the base product
        base_product = next((p for p in PRODUCTS if p['id'] == request.product_id), None)
        if not base_product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Use the correct method name
        if advanced_retriever:
            recommendations = advanced_retriever.find_similar_products(
                base_product, 
                request.num_recommendations
            )
        else:
            recommendations = [] # Fallback if retriever not initialized
        
        return {
            "base_product": base_product,
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"Recommendations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/categories")
async def get_categories():
    """Get all available categories"""
    categories = list(set(product['category'] for product in PRODUCTS))
    return {"categories": categories}

@app.get("/brands")
async def get_brands():
    """Get all available brands"""
    brands = list(set(product['brand'] for product in PRODUCTS))
    return {"brands": brands}

@app.post("/search")
async def search_products(query: dict):
    """Direct product search endpoint"""
    try:
        # Create a mock session for search - not strictly needed for direct search but good practice
        # session_memory = ConversationMemory() 
        
        # Process the search query
        search_query_text = query.get('query', '')
        filters = query.get('filters', {})
        
        # Create processed query structure
        # When using direct search, we don't have conversation memory, so pass an empty one
        # or adapt SmartQueryProcessor to handle no memory for direct searches
        mock_conversation_memory = ConversationMemory(session_id="direct_search")
        query_processor_instance = SmartQueryProcessor()
        processed_query = query_processor_instance.process_query(search_query_text, mock_conversation_memory)
        
        # Add filters from the request to the processed query entities
        for key, value in filters.items():
            if key not in processed_query['entities']:
                processed_query['entities'][key] = []
            if isinstance(value, list):
                processed_query['entities'][key].extend([str(v).lower() for v in value])
            else:
                processed_query['entities'][key].append(str(value).lower())

        if advanced_retriever is not None:
            search_results = await advanced_retriever.search(processed_query) # Corrected function call
        else:
            search_results=[]
        
        return {
            "query": search_query_text,
            "results": [result.product for result in search_results],
            "total_results": len(search_results)
        }
        
    except Exception as e:
        logger.error(f"Search endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/reload-products")
async def reload_products_endpoint():
    """Reload products from JSON file"""
    try:
        global advanced_retriever, conversational_agent
        reload_products()
        
        # Reinitialize the retriever and conversational agent with new products
        advanced_retriever = AdvancedRAGRetriever(PRODUCTS)
        if query_processor is not None: # Ensure query_processor is initialized before creating agent
            conversational_agent = EnhancedConversationalAgent(advanced_retriever, query_processor)
        
        return {
            "message": "Products reloaded successfully",
            "total_products": len(PRODUCTS)
        }
    except Exception as e:
        logger.error(f"Error reloading products: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reload products")

@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a specific session"""
    if session_id in user_sessions:
        del user_sessions[session_id]
        return {"message": "Session cleared successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0",
        "active_sessions": len(user_sessions),
        "total_products": len(PRODUCTS)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)