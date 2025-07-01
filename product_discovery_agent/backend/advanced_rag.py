# backend/advanced_rag.py
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import re
from collections import defaultdict
import logging
from dataclasses import dataclass
import random
from datetime import datetime
import asyncio
import traceback

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    product: Dict[str, Any]
    similarity_score: float
    matched_attributes: List[str]
    explanation: str

class AdvancedRAGRetriever:
    """Advanced RAG system with multiple retrieval strategies"""
    
    def __init__(self, products: List[Dict], embedding_model_name: str = 'all-MiniLM-L6-v2'):
        self.products = products or []  # Ensure it's never None
        self.embedding_model = None
        self.tfidf_vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=1000
        )
        
        # Initialize indices
        self.semantic_embeddings = None
        self.keyword_vectors = None
        self.attribute_index = defaultdict(list)
        self.price_ranges = {}
        self.model_loaded = False
        
        # Load model and build indices safely
        try:
            self.embedding_model = SentenceTransformer(embedding_model_name)
            self.model_loaded = True
            if self.products:
                self._build_indices()
        except Exception as e:
            logger.error(f"Error initializing embedding model: {e}")
            self.model_loaded = False
    
    def _build_indices(self):
        """Build all search indices with error handling"""
        try:
            logger.info("Building search indices...")
            
            if not self.products:
                logger.warning("No products to index")
                return
            
            # 1. Semantic embeddings
            product_texts = []
            for i, product in enumerate(self.products):
                try:
                    text = self._create_product_text(product)
                    product_texts.append(text)
                    
                    # 2. Build attribute index
                    self._index_attributes(product, i)
                    
                    # 3. Build price ranges
                    self._index_price_ranges(product, i)
                except Exception as e:
                    logger.error(f"Error processing product {i}: {e}")
                    # Use a default text for failed products
                    product_texts.append(f"product {i}")
            
            if not product_texts:
                logger.error("No valid product texts generated")
                return
            
            # Create embeddings with error handling
            try:
                self.semantic_embeddings = self.embedding_model.encode(
                    product_texts, 
                    show_progress_bar=False,  # Disable progress bar in production
                    batch_size=32  # Add batch size to prevent memory issues
                )
            except Exception as e:
                logger.error(f"Error creating embeddings: {e}")
                # Fallback: create zero embeddings
                self.semantic_embeddings = np.zeros((len(product_texts), 384))
            
            # Create TF-IDF vectors with error handling
            try:
                self.keyword_vectors = self.tfidf_vectorizer.fit_transform(product_texts)
            except Exception as e:
                logger.error(f"Error creating TF-IDF vectors: {e}")
                # Don't set keyword_vectors to None, leave it as None for checks later
            
            logger.info(f"Built indices for {len(self.products)} products")
            
        except Exception as e:
            logger.error(f"Error building indices: {e}")
            logger.error(traceback.format_exc())
    
    def _create_product_text(self, product: Dict) -> str:
        """Create comprehensive text representation of product with error handling"""
        try:
            # Safely get product attributes with defaults
            name = product.get('name', 'Unknown Product')
            description = product.get('description', '')
            category = product.get('category', 'Unknown')
            brand = product.get('brand', 'Unknown')
            price = product.get('price', 0)
            
            features = product.get('features', {})
            if isinstance(features, dict):
                features_text = " ".join([f"{k}:{v}" for k, v in features.items() if v is not None])
            else:
                features_text = ""
            
            return f"""
            {name} {description} 
            category:{category} brand:{brand} 
            price:{price} {features_text}
            """.strip()
        except Exception as e:
            logger.error(f"Error creating product text: {e}")
            return f"product {product.get('id', 'unknown')}"
    
    def _index_attributes(self, product: Dict, index: int):
        """Index product attributes for structured search with error handling"""
        try:
            # Index basic attributes safely
            category = product.get('category', '')
            brand = product.get('brand', '')
            
            if category:
                self.attribute_index['category'].append((category.lower(), index))
            if brand:
                self.attribute_index['brand'].append((brand.lower(), index))
            
            # Index features safely
            features = product.get('features', {})
            if isinstance(features, dict):
                for key, value in features.items():
                    if value is not None:
                        self.attribute_index[key.lower()].append((str(value).lower(), index))
        except Exception as e:
            logger.error(f"Error indexing attributes for product {index}: {e}")
    
    def _index_price_ranges(self, product: Dict, index: int):
        """Index products by price ranges with error handling"""
        try:
            price = product.get('price', 0)
            if not isinstance(price, (int, float)):
                # Try to convert string prices
                try:
                    price = float(str(price).replace('$', '').replace(',', ''))
                except:
                    price = 0
            
            ranges = [
                ('budget', 0, 1000),
                ('mid-range', 1000, 2000),
                ('premium', 2000, 3000),
                ('luxury', 3000, float('inf'))
            ]
            
            for range_name, min_price, max_price in ranges:
                if min_price <= price < max_price:
                    if range_name not in self.price_ranges:
                        self.price_ranges[range_name] = []
                    self.price_ranges[range_name].append(index)
        except Exception as e:
            logger.error(f"Error indexing price ranges for product {index}: {e}")
    
    async def search(self, processed_query: Dict[str, Any], top_k: int = 10) -> List[SearchResult]:
        """Unified search method with comprehensive error handling"""
        try:
            if not self.model_loaded or not self.products:
                logger.warning("Model not loaded or no products available")
                return []
            
            query_text = processed_query.get('enriched_query', processed_query.get('original_query', ''))
            if not query_text:
                logger.warning("No query text provided")
                return []
            
            # Start with hybrid search
            combined_results = await self._safe_hybrid_search(query_text, top_k * 2)
            
            # Apply structured filters from processed_query['entities']
            entities = processed_query.get('entities', {})
            filtered_results = self._apply_structured_filters(combined_results, entities)
            
            # Apply price sensitivity
            price_sensitivity = processed_query.get('price_sensitivity', 'neutral')
            final_results = self._apply_price_sensitivity(filtered_results, price_sensitivity)

            # Re-rank and limit
            final_results.sort(key=lambda x: x.similarity_score, reverse=True)
            return final_results[:top_k]
            
        except Exception as e:
            logger.error(f"Error in search: {e}")
            logger.error(traceback.format_exc())
            return []

    async def _safe_hybrid_search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """Wrapper for hybrid_search that handles async properly"""
        try:
            # Run the hybrid search in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, self.hybrid_search, query, top_k)
        except Exception as e:
            logger.error(f"Error in safe hybrid search: {e}")
            return []

    def _apply_structured_filters(self, search_results: List[SearchResult], filters: Dict[str, List[str]]) -> List[SearchResult]:
        """Apply exact attribute filters to a list of SearchResults with error handling"""
        try:
            if not filters or not search_results:
                return search_results

            filtered = []
            for result in search_results:
                try:
                    product = result.product
                    match = True
                    
                    for attr_type, values in filters.items():
                        if not values:  # Skip empty filter values
                            continue
                            
                        # Convert values to lowercase for comparison
                        values_lower = [v.lower() for v in values if v]
                        
                        if attr_type == 'category':
                            product_category = product.get('category', '').lower()
                            if product_category not in values_lower:
                                match = False
                                break
                        elif attr_type == 'brand':
                            product_brand = product.get('brand', '').lower()
                            if product_brand not in values_lower:
                                match = False
                                break
                        elif attr_type == 'color':
                            product_color = product.get('features', {}).get('color', '').lower()
                            if product_color not in values_lower:
                                match = False
                                break
                        elif attr_type == 'size':
                            product_size = product.get('features', {}).get('size', '').lower()
                            if product_size not in values_lower:
                                match = False
                                break
                        # Add more attribute types as needed
                    
                    if match:
                        filtered.append(result)
                except Exception as e:
                    logger.error(f"Error filtering result: {e}")
                    # Continue with other results
                    continue
                    
            return filtered
        except Exception as e:
            logger.error(f"Error applying structured filters: {e}")
            return search_results  # Return original results on error

    def _apply_price_sensitivity(self, search_results: List[SearchResult], sensitivity: str) -> List[SearchResult]:
        """Apply price sensitivity filtering with error handling"""
        try:
            if sensitivity == 'neutral' or not search_results:
                return search_results
            
            filtered_results = []
            for result in search_results:
                try:
                    price = result.product.get('price', 0)
                    if not isinstance(price, (int, float)):
                        try:
                            price = float(str(price).replace('$', '').replace(',', ''))
                        except:
                            price = 0
                    
                    if sensitivity == 'budget' and price <= 2000:
                        filtered_results.append(result)
                    elif sensitivity == 'premium' and price >= 1500:
                        filtered_results.append(result)
                    # For neutral or unmatched sensitivity, include all results
                    elif sensitivity == 'neutral':
                        filtered_results.append(result)
                except Exception as e:
                    logger.error(f"Error applying price sensitivity to result: {e}")
                    # Include the result if there's an error processing it
                    filtered_results.append(result)
            
            return filtered_results if filtered_results else search_results
        except Exception as e:
            logger.error(f"Error in price sensitivity filtering: {e}")
            return search_results

    def hybrid_search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """Perform hybrid search combining multiple strategies with error handling"""
        try:
            if not self.products or self.semantic_embeddings is None:
                logger.warning("Indices not built. Returning empty search results.")
                return []

            # 1. Semantic search
            semantic_results = self._semantic_search(query, top_k * 2)
            
            # 2. Keyword search (only if TF-IDF is available)
            keyword_results = []
            if self.keyword_vectors is not None:
                keyword_results = self._keyword_search(query, top_k * 2)
            
            # 3. Structured attribute search
            attribute_results = self._attribute_search(query, top_k * 2)
            
            # 4. Combine and re-rank results
            combined_results = self._combine_results(
                semantic_results, keyword_results, attribute_results
            )
            
            return combined_results[:top_k]
        except Exception as e:
            logger.error(f"Error in hybrid search: {e}")
            logger.error(traceback.format_exc())
            return []
    
    def _semantic_search(self, query: str, top_k: int) -> List[Tuple[int, float, str]]:
        """Semantic similarity search using embeddings with error handling"""
        try:
            if not self.model_loaded or self.semantic_embeddings is None:
                return []
                
            query_embedding = self.embedding_model.encode([query])
            similarities = cosine_similarity(query_embedding, self.semantic_embeddings)[0]
            
            top_indices = np.argsort(similarities)[::-1][:top_k]
            return [(idx, float(similarities[idx]), "semantic") for idx in top_indices if similarities[idx] > 0.1]
        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return []
    
    def _keyword_search(self, query: str, top_k: int) -> List[Tuple[int, float, str]]:
        """Keyword-based search using TF-IDF with error handling"""
        try:
            if self.keyword_vectors is None:
                return []
                
            query_vector = self.tfidf_vectorizer.transform([query])
            similarities = cosine_similarity(query_vector, self.keyword_vectors)[0]
            
            top_indices = np.argsort(similarities)[::-1][:top_k]
            return [(idx, float(similarities[idx]), "keyword") for idx in top_indices if similarities[idx] > 0.1]
        except Exception as e:
            logger.error(f"Error in keyword search: {e}")
            return []
    
    def _attribute_search(self, query: str, top_k: int) -> List[Tuple[int, float, str]]:
        """Structured attribute search with error handling"""
        try:
            query_lower = query.lower()
            results = []
            
            # Search through attribute index
            for attr_type, values in self.attribute_index.items():
                for value, product_idx in values:
                    try:
                        if value in query_lower or query_lower in value:
                            # Higher score for exact matches
                            score = 1.0 if value == query_lower else 0.8
                            results.append((product_idx, score, f"attribute:{attr_type}"))
                    except Exception as e:
                        logger.error(f"Error in attribute search for {attr_type}: {e}")
                        continue
            
            # Search price ranges
            price_keywords = {
                'cheap': 'budget', 'budget': 'budget', 'affordable': 'budget',
                'mid': 'mid-range', 'moderate': 'mid-range',
                'premium': 'premium', 'expensive': 'premium',
                'luxury': 'luxury', 'high-end': 'luxury'
            }
            
            for keyword, range_name in price_keywords.items():
                if keyword in query_lower and range_name in self.price_ranges:
                    for product_idx in self.price_ranges[range_name]:
                        results.append((product_idx, 0.7, f"price_range:{range_name}"))
            
            # Sort by score and return top results
            results.sort(key=lambda x: x[1], reverse=True)
            return results[:top_k]
        except Exception as e:
            logger.error(f"Error in attribute search: {e}")
            return []
    
    def _combine_results(self, *result_sets: List[Tuple[int, float, str]]) -> List[SearchResult]:
        """Combine and re-rank results from different search strategies with error handling"""
        try:
            # Create a proper type for the product scores data
            class ProductScoreData:
                def __init__(self):
                    self.total_score: float = 0.0
                    self.methods: List[str] = []
                    self.max_score: float = 0.0
            
            product_scores: Dict[int, ProductScoreData] = defaultdict(ProductScoreData)
            
            weights = {'semantic': 0.4, 'keyword': 0.3, 'attribute': 0.3, 'price_range': 0.2}
            
            for results_from_one_strategy in result_sets:
                for product_idx, score, method in results_from_one_strategy:
                    try:
                        # Validate product index
                        if not (0 <= product_idx < len(self.products)):
                            continue
                            
                        method_type = method.split(':')[0]
                        weight = weights.get(method_type, 0.1)
                        weighted_score = score * weight
                        
                        current_product_entry = product_scores[product_idx]
                        current_product_entry.total_score += weighted_score
                        current_product_entry.methods.append(method)
                        current_product_entry.max_score = max(current_product_entry.max_score, score)
                    except Exception as e:
                        logger.error(f"Error processing result for product {product_idx}: {e}")
                        continue
            
            # Create SearchResult objects
            search_results: List[SearchResult] = []
            for product_idx, scores_data in product_scores.items():
                try:
                    if scores_data.total_score > 0.1 and 0 <= product_idx < len(self.products):
                        product = self.products[product_idx]
                        
                        # Create explanation
                        explanation = self._create_explanation(scores_data.methods, scores_data.total_score)
                        
                        search_result = SearchResult(
                            product=product,
                            similarity_score=scores_data.total_score,
                            matched_attributes=scores_data.methods,
                            explanation=explanation
                        )
                        search_results.append(search_result)
                except Exception as e:
                    logger.error(f"Error creating search result for product {product_idx}: {e}")
                    continue
            
            # Sort by total score
            search_results.sort(key=lambda x: x.similarity_score, reverse=True)
            return search_results
        except Exception as e:
            logger.error(f"Error combining results: {e}")
            return []
    
    def _create_explanation(self, methods: List[str], score: float) -> str:
        """Create human-readable explanation for why product was matched"""
        try:
            method_counts = defaultdict(int)
            for method in methods:
                method_type = method.split(':')[0]
                method_counts[method_type] += 1
            
            explanations = []
            if method_counts['semantic']:
                explanations.append("semantic similarity")
            if method_counts['keyword']:
                explanations.append("keyword match")
            if method_counts['attribute']:
                explanations.append("attribute match")
            if method_counts['price_range']:
                explanations.append("price range match")
            
            if not explanations:
                explanations.append("general match")
            
            return f"Matched by {', '.join(explanations)} (confidence: {score:.1%})"
        except Exception as e:
            logger.error(f"Error creating explanation: {e}")
            return f"Matched (confidence: {score:.1%})"

    def find_similar_products(self, base_product: Dict[str, Any], num_recommendations: int = 3) -> List[Dict[str, Any]]:
        """Finds similar products based on a given product's attributes and semantic similarity."""
        try:
            if not self.products or self.semantic_embeddings is None or not self.model_loaded:
                logger.warning("Products or embeddings not loaded for similarity search.")
                return []

            base_product_text = self._create_product_text(base_product)
            base_product_embedding = self.embedding_model.encode([base_product_text])

            similarities = cosine_similarity(base_product_embedding, self.semantic_embeddings)[0]

            # Get indices of products sorted by similarity, excluding the base product itself
            product_indices = np.argsort(similarities)[::-1]
            
            similar_products = []
            base_product_id = base_product.get('id')
            
            for idx in product_indices:
                try:
                    if 0 <= idx < len(self.products):
                        current_product = self.products[idx]
                        if current_product.get('id') != base_product_id:
                            similar_products.append(current_product)
                            if len(similar_products) >= num_recommendations:
                                break
                except Exception as e:
                    logger.error(f"Error processing similar product at index {idx}: {e}")
                    continue
            
            return similar_products
        except Exception as e:
            logger.error(f"Error finding similar products: {e}")
            return []


class ConversationMemory:
    """Manages conversation context and user preferences"""
    
    def __init__(self, session_id: str, max_history: int = 10):
        self.session_id = session_id
        self.max_history = max_history
        self.conversation_history = []
        self.user_preferences = defaultdict(list)
        self.search_context = {}
    
    def add_interaction(self, user_query: str, bot_response: str, search_results: List[SearchResult]):
        """Add interaction to conversation memory with error handling"""
        try:
            interaction = {
                'user_query': user_query or "",
                'assistant': bot_response or "",
                'products_found': [res.product for res in search_results if res and res.product],
                'timestamp': datetime.now().isoformat()
            }
            
            self.conversation_history.append(interaction)
            
            # Keep only recent history
            if len(self.conversation_history) > self.max_history:
                self.conversation_history = self.conversation_history[-self.max_history:]
            
            # Extract user preferences from the products in search_results
            self._extract_preferences(user_query, search_results)
        except Exception as e:
            logger.error(f"Error adding interaction to memory: {e}")
    
    def _extract_preferences(self, query: str, search_results: List[SearchResult]):
        """Extract user preferences from successful searches with error handling"""
        try:
            if not query or not search_results:
                return
                
            query_lower = query.lower()
            
            # Consider products that were highly relevant
            for res in search_results[:min(3, len(search_results))]:
                try:
                    product = res.product
                    if not product:
                        continue
                        
                    # Check if attributes of this product were mentioned in the query
                    features = product.get('features', {})
                    if isinstance(features, dict):
                        for key, value in features.items():
                            if isinstance(value, str) and value.lower() in query_lower:
                                self.user_preferences[key].append(value)
                    
                    # Brand and category preferences
                    brand = product.get('brand', '')
                    if brand and brand.lower() in query_lower:
                        self.user_preferences['brand'].append(brand)
                    
                    category = product.get('category', '')
                    if category and category.lower() in query_lower:
                        self.user_preferences['category'].append(category)
                except Exception as e:
                    logger.error(f"Error extracting preferences from product: {e}")
                    continue
        except Exception as e:
            logger.error(f"Error in extract preferences: {e}")
    
    def get_context_for_query(self, current_query: str) -> str:
        """Get relevant context for current query by summarizing recent interactions."""
        try:
            if not self.conversation_history:
                return ""
            
            # Get recent queries and responses
            recent_context = []
            for interaction in self.conversation_history[-3:]:
                try:
                    user_query = interaction.get('user_query', '')
                    assistant_response = interaction.get('assistant', '')
                    
                    if user_query:
                        recent_context.append(f"User: {user_query}")
                    if assistant_response:
                        recent_context.append(f"Assistant: {assistant_response[:100]}...")
                except Exception as e:
                    logger.error(f"Error processing interaction: {e}")
                    continue
            
            # Also, include the summarized user preferences
            pref_summary = self.get_user_preferences_summary()
            if pref_summary:
                pref_strings = [f"{k}: {v}" for k, v in pref_summary.items()]
                recent_context.append(f"User Preferences: {'; '.join(pref_strings)}")

            return "\n".join(recent_context)
        except Exception as e:
            logger.error(f"Error getting context for query: {e}")
            return ""
    
    def get_user_preferences_summary(self) -> Dict[str, Any]:
        """Get summary of user preferences with error handling"""
        try:
            summary = {}
            for pref_type, values in self.user_preferences.items():
                try:
                    # Get most common preferences
                    value_counts = defaultdict(int)
                    for value in values:
                        if value:  # Skip empty values
                            value_counts[value] += 1
                    
                    if value_counts:
                        most_common = max(value_counts.items(), key=lambda x: x[1])
                        summary[pref_type] = most_common[0]
                except Exception as e:
                    logger.error(f"Error processing preferences for {pref_type}: {e}")
                    continue
            
            return summary
        except Exception as e:
            logger.error(f"Error getting preferences summary: {e}")
            return {}

class SmartQueryProcessor:
    """Processes and enriches user queries with context and intent"""
    
    def __init__(self):
        self.intent_patterns = {
            'search': [r'looking for', r'want', r'need', r'find', r'show me', r'search for'],
            'filter': [r'under \$?\d+', r'less than', r'more than', r'between', r'budget', r'price range'],
            'compare': [r'compare', r'difference', r'versus', r'vs', r'better'],
            'recommend': [r'recommend', r'suggest', r'best', r'top', r'popular'],
            'details': [r'tell me about', r'details', r'more info', r'specifications', r'features'],
            'similar': [r'similar', r'like this', r'alternatives', r'other options']
        }
        
        self.urgency_indicators = [r'urgent', r'asap', r'quickly', r'now', r'today']
        self.quality_indicators = [r'best', r'high quality', r'premium', r'top', r'excellent', r'durable']
        self.price_sensitivity_keywords = {
            'budget': ['cheap', 'budget', 'affordable', 'low cost', 'inexpensive'],
            'premium': ['premium', 'expensive', 'luxury', 'high-end', 'top-tier']
        }
        
        # Expanded entities for better parsing
        self.product_categories = ['shoes', 'tee', 'watch', 'bag', 'electronics', 'accessories', 'clothing', 'home', 'footwear']
        self.brands = ['nike', 'adidas', 'puma', 'gucci', 'zara', 'h&m', 'reebok']
        self.colors = ['red', 'blue', 'white', 'black', 'green', 'yellow', 'brown', 'pink', 'grey', 'gray', 'purple', 'orange']
        self.sizes = ['small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l', 'xs']
        self.genders = ['men', 'women', 'unisex', 'male', 'female', 'kids']
        self.materials = ['cotton', 'leather', 'mesh', 'denim', 'polyester']
        self.occasions = ['casual', 'formal', 'party', 'sports', 'everyday']


    def process_query(self, query: str, conversation_memory: ConversationMemory) -> Dict[str, Any]:
        """Process query and extract enhanced information with error handling"""
        try:
            if not query:
                query = ""
            
            processed = {
                'original_query': query,
                'intent': self._extract_intent(query),
                'entities': self._extract_entities(query),
                'urgency': self._detect_urgency(query),
                'quality_focus': self._detect_quality_focus(query),
                'price_sensitivity': self._detect_price_sensitivity(query),
                'context': conversation_memory.get_context_for_query(query) if conversation_memory else "",
                'user_preferences': conversation_memory.get_user_preferences_summary() if conversation_memory else {}
            }
            
            # Enrich query with context
            processed['enriched_query'] = self._enrich_query(processed)
            
            return processed
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            # Return basic processed query on error
            return {
                'original_query': query or "",
                'intent': 'search',
                'entities': {},
                'urgency': False,
                'quality_focus': False,
                'price_sensitivity': 'neutral',
                'context': "",
                'user_preferences': {},
                'enriched_query': query or ""
            }
    
    def _extract_intent(self, query: str) -> str:
        """Extract primary intent from query with error handling"""
        try:
            if not query:
                return 'search'
                
            query_lower = query.lower()
            
            for intent, patterns in self.intent_patterns.items():
                if any(re.search(pattern, query_lower) for pattern in patterns):
                    return intent
            
            return 'search'  # default intent
        except Exception as e:
            logger.error(f"Error extracting intent: {e}")
            return 'search'
    
    def _extract_entities(self, query: str) -> Dict[str, List[str]]:
        """Extract product entities from query with error handling"""
        try:
            if not query:
                return {}
                
            entities = defaultdict(list)
            query_lower = query.lower()
            
            # Product categories
            for category in self.product_categories:
                if re.search(r'\b' + re.escape(category) + r'\b', query_lower):
                    entities['category'].append(category)
            
            # Brands
            for brand in self.brands:
                if re.search(r'\b' + re.escape(brand) + r'\b', query_lower):
                    entities['brand'].append(brand)
            
            # Colors
            for color in self.colors:
                if re.search(r'\b' + re.escape(color) + r'\b', query_lower):
                    entities['color'].append(color)
            
            # Sizes
            for size in self.sizes:
                # Match whole words or common size patterns like "size m"
                if re.search(r'\b' + re.escape(size) + r'\b', query_lower) or \
                   re.search(r'size\s+' + re.escape(size), query_lower):
                    entities['size'].append(size)
            
            # Genders
            for gender in self.genders:
                if re.search(r'\b' + re.escape(gender) + r'\b', query_lower):
                    entities['gender'].append(gender)

            # Materials
            for material in self.materials:
                if re.search(r'\b' + re.escape(material) + r'\b', query_lower):
                    entities['material'].append(material)

            # Occasions
            for occasion in self.occasions:
                if re.search(r'\b' + re.escape(occasion) + r'\b', query_lower):
                    entities['occasion'].append(occasion)

            # Price range numerical extraction (simple regex for now)
            try:
                price_match = re.search(r'(\d+)\s*(?:to|-)\s*(\d+)', query_lower)
                if price_match:
                    entities['price_range'] = [int(price_match.group(1)), int(price_match.group(2))]
                else:
                    price_less_than = re.search(r'under\s*(\d+)|less than\s*(\d+)', query_lower)
                    if price_less_than:
                        entities['max_price'] = [int(price_less_than.group(1) or price_less_than.group(2))]
                    
                    price_more_than = re.search(r'over\s*(\d+)|more than\s*(\d+)', query_lower)
                    if price_more_than:
                        entities['min_price'] = [int(price_more_than.group(1) or price_more_than.group(2))]
            except ValueError as e:
                logger.error(f"Error parsing price from query: {e}")

            return dict(entities)
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return {}
    
    def _detect_urgency(self, query: str) -> bool:
        """Detect if query indicates urgency with error handling"""
        try:
            if not query:
                return False
            query_lower = query.lower()
            return any(re.search(pattern, query_lower) for pattern in self.urgency_indicators)
        except Exception as e:
            logger.error(f"Error detecting urgency: {e}")
            return False
    
    def _detect_quality_focus(self, query: str) -> bool:
        """Detect if user is focused on quality with error handling"""
        try:
            if not query:
                return False
            query_lower = query.lower()
            return any(re.search(pattern, query_lower) for pattern in self.quality_indicators)
        except Exception as e:
            logger.error(f"Error detecting quality focus: {e}")
            return False
    
    def _detect_price_sensitivity(self, query: str) -> str:
        """Detect price sensitivity level with error handling"""
        try:
            if not query:
                return 'neutral'
            query_lower = query.lower()
            
            if any(word in query_lower for word in self.price_sensitivity_keywords['budget']):
                return 'budget'
            elif any(word in query_lower for word in self.price_sensitivity_keywords['premium']):
                return 'premium'
            else:
                return 'neutral'
        except Exception as e:
            logger.error(f"Error detecting price sensitivity: {e}")
            return 'neutral'
    
    def _enrich_query(self, processed: Dict[str, Any]) -> str:
        """Create enriched query with context and preferences with error handling"""
        try:
            enriched_parts = [processed.get('original_query', '')]
            
            # Add user preferences if relevant
            preferences = processed.get('user_preferences', {})
            if preferences and isinstance(preferences, dict):
                # Only add preferences not already explicitly in the original query
                original_query_lower = processed.get('original_query', '').lower()
                for k, v in preferences.items():
                    if isinstance(v, str) and v.lower() not in original_query_lower:
                        enriched_parts.append(f"{k}:{v}")
            
            # Add quality/price context if not already covered by direct price sensitivity
            if processed.get('quality_focus') and processed.get('price_sensitivity') == 'neutral':
                enriched_parts.append("high_quality premium")
            
            # Price sensitivity is already handled in the search function logic through filters,
            # but adding keywords can help semantic search.
            price_sensitivity = processed.get('price_sensitivity', 'neutral')
            if price_sensitivity == 'budget':
                enriched_parts.append("budget affordable cheap")
            elif price_sensitivity == 'premium':
                enriched_parts.append("premium expensive luxury")
            
            # Add context from conversation history
            context = processed.get('context', '')
            if context:
                enriched_parts.append(f"context: {context}")

            return " ".join(filter(None, enriched_parts))  # Filter out empty strings
        except Exception as e:
            logger.error(f"Error enriching query: {e}")
            return processed.get('original_query', '')