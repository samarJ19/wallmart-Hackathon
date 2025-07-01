import streamlit as st
import requests
import json
import uuid
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime
import time
import plotly.express as px
import plotly.graph_objects as go

# Configuration
BACKEND_URL = "http://localhost:8000"
st.set_page_config(
    page_title="TALK TO BUY",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Enhanced Custom CSS with modern design
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    .stApp {
        font-family: 'Inter', sans-serif;
    }
    
    /* Main header with glassmorphism effect */
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 20px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        position: relative;
        overflow: hidden;
    }
    
    .main-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
        transform: translateX(-100%);
        animation: shimmer 3s infinite;
    }
    
    @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
    
    .main-header h1 {
        margin: 0;
        font-size: 2.5rem;
        font-weight: 700;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .main-header p {
        margin: 0.5rem 0 0 0;
        font-size: 1.1rem;
        opacity: 0.9;
    }
    
    /* Modern chat messages */
    .chat-message {
        padding: 1.5rem;
        border-radius: 20px;
        margin: 1rem 0;
        max-width: 85%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        position: relative;
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .user-message {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin-left: auto;
        text-align: right;
        border-bottom-right-radius: 5px;
    }
    
    .assistant-message {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        color: #333;
        margin-right: auto;
        border-bottom-left-radius: 5px;
        border-left: 4px solid #667eea;
    }
    
    /* Enhanced product cards */
    .product-card {
        border: none;
        border-radius: 20px;
        padding: 1.5rem;
        margin: 1rem 0;
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .product-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transform: scaleX(0);
        transition: transform 0.3s ease;
    }
    
    .product-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }
    
    .product-card:hover::before {
        transform: scaleX(1);
    }
    
    /* Confidence indicators */
    .confidence-high { 
        color: #28a745; 
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(40,167,69,0.3);
    }
    .confidence-medium { 
        color: #ffc107; 
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(255,193,7,0.3);
    }
    .confidence-low { 
        color: #dc3545; 
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(220,53,69,0.3);
    }
    
    /* Modern stats container */
    .stats-container {
        background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 2rem;
        border-radius: 20px;
        margin: 1rem 0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        border: 1px solid rgba(255,255,255,0.5);
    }
    
    /* Enhanced metrics */
    .metric-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
        padding: 1.5rem;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        transition: transform 0.2s ease;
        border-top: 3px solid transparent;
        background-image: linear-gradient(white, white), linear-gradient(45deg, #667eea, #764ba2);
        background-origin: border-box;
        background-clip: content-box, border-box;
    }
    
    .metric-card:hover {
        transform: translateY(-5px);
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #667eea;
        margin-bottom: 0.5rem;
    }
    
    .metric-label {
        font-size: 0.9rem;
        color: #6c757d;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    /* Sidebar enhancements */
    .sidebar-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        text-align: center;
    }
    
    /* Loading spinner */
    .loading-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(102,126,234,.3);
        border-radius: 50%;
        border-top-color: #667eea;
        animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    /* Button enhancements */
    .stButton > button {
        border-radius: 50px;
        border: none;
        padding: 0.5rem 1.5rem;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 24px;
    }
    
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        padding-left: 20px;
        padding-right: 20px;
        border-radius: 25px;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    /* Form enhancements */
    .stTextInput > div > div > input {
        border-radius: 25px;
        border: 2px solid #e9ecef;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        transition: all 0.3s ease;
    }
    
    .stTextInput > div > div > input:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
    }
    
    /* Notification styles */
    .notification {
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        border-left: 4px solid;
        animation: slideInLeft 0.3s ease;
    }
    
    @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    .notification.success {
        background-color: #d4edda;
        border-color: #28a745;
        color: #155724;
    }
    
    .notification.warning {
        background-color: #fff3cd;
        border-color: #ffc107;
        color: #856404;
    }
    
    .notification.error {
        background-color: #f8d7da;
        border-color: #dc3545;
        color: #721c24;
    }
    
    /* Price styling */
    .price-tag {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        display: inline-block;
        box-shadow: 0 2px 10px rgba(40,167,69,0.3);
    }
    
    /* Feature tags */
    .feature-tag {
        background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
        margin: 0.25rem;
        display: inline-block;
    }
    
    /* Search bar enhancement */
    .search-container {
        background: white;
        border-radius: 25px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        padding: 0.5rem;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'session_id' not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4())
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []
if 'products' not in st.session_state:
    st.session_state.products = []
if 'all_products' not in st.session_state:
    st.session_state.all_products = []
if 'current_recommendations' not in st.session_state:
    st.session_state.current_recommendations = []

# Helper functions
def make_api_request(endpoint: str, method: str = "GET", data: Dict = None) -> Optional[Dict]:
    """Make API request to backend"""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        st.markdown("""
        <div class="notification error">
            <strong>❌ Backend Connection Error</strong><br>
            Cannot connect to backend. Please ensure the FastAPI server is running on http://localhost:8000
        </div>
        """, unsafe_allow_html=True)
        return None
    except Exception as e:
        st.error(f"Error making API request: {str(e)}")
        return None

def load_all_products():
    """Load all products from backend"""
    products_data = make_api_request("/products")
    if products_data:
        st.session_state.all_products = products_data.get('products', [])

def format_price(price: float) -> str:
    """Format price in Indian Rupees with enhanced styling"""
    return f'<span class="price-tag">₹{price:,.2f}</span>'

def get_confidence_color(confidence: float) -> str:
    """Get color class based on confidence score"""
    if confidence >= 0.7:
        return "confidence-high"
    elif confidence >= 0.4:
        return "confidence-medium"
    else:
        return "confidence-low"

def display_product_card(product: Dict[str, Any], key_suffix: str = ""):
    """Display an enhanced product card"""
    with st.container():
        st.markdown('<div class="product-card">', unsafe_allow_html=True)
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            if product.get('imageUrl'):
                st.image(product['imageUrl'], width=200, use_column_width=True)
            else:
                st.markdown("""
                <div style="
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    height: 150px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    color: #6c757d;
                ">📷</div>
                """, unsafe_allow_html=True)
        
        with col2:
            st.markdown(f"### {product['name']}")
            
            # Brand and category with badges
            col_info1, col_info2 = st.columns(2)
            with col_info1:
                st.markdown(f"**🏷️ Brand:** {product.get('brand', 'N/A')}")
            with col_info2:
                st.markdown(f"**📂 Category:** {product.get('category', 'N/A')}")
            
            # Price with enhanced styling
            st.markdown(f"**💰 Price:** {format_price(product.get('price', 0))}", 
                       unsafe_allow_html=True)
            
            # Stock status with color coding
            stock = product.get('inventory', 0)
            stock_color = "#28a745" if stock > 10 else "#ffc107" if stock > 0 else "#dc3545"
            st.markdown(f"**📦 Stock:** <span style='color: {stock_color}; font-weight: 600;'>{stock} items</span>", 
                       unsafe_allow_html=True)
            
            # Features as tags
            features = product.get('features', {})
            if features:
                st.markdown("**✨ Features:**")
                feature_html = ""
                for k, v in features.items():
                    if v:
                        feature_html += f'<span class="feature-tag">{k}: {v}</span>'
                st.markdown(feature_html, unsafe_allow_html=True)
            
            # Action buttons with enhanced styling
            col_btn1, col_btn2, col_btn3 = st.columns(3)
            with col_btn1:
                if st.button("🔍 Details", key=f"details_{product['id']}_{key_suffix}"):
                    show_product_details(product)
            with col_btn2:
                if st.button("💡 Similar", key=f"similar_{product['id']}_{key_suffix}"):
                    get_recommendations(product['id'])
            with col_btn3:
                if product.get('arEnabled', False):
                    st.markdown("🥽 **AR Ready**")
                else:
                    st.empty()
        
        st.markdown('</div>', unsafe_allow_html=True)

def show_product_details(product: Dict[str, Any]):
    """Show detailed product information"""
    st.session_state.selected_product = product

def get_recommendations(product_id: str):
    """Get recommendations for a product"""
    data = {"product_id": product_id, "num_recommendations": 5}
    result = make_api_request("/recommendations", "POST", data)
    if result:
        st.session_state.current_recommendations = result.get('recommendations', [])
        st.session_state.base_product = result.get('base_product', {})

def send_chat_message(message: str):
    """Send message to chatbot"""
    data = {
        "message": message,
        "session_id": st.session_state.session_id,
        "chat_history": st.session_state.chat_history
    }
    
    response = make_api_request("/chat", "POST", data)
    if response:
        # Add to chat history
        st.session_state.chat_history.append({
            "user": message,
            "assistant": response['response'],
            "timestamp": datetime.now().isoformat()
        })
        
        # Update products
        st.session_state.products = response.get('products', [])
        
        # Store response data
        st.session_state.last_response = response
        
        return response
    return None

# Enhanced Main App Layout
def main():
    # Enhanced Header
    st.markdown("""
    <div class="main-header">
        <h1>🛍️ AI Product Discovery Assistant</h1>
        <p>Your intelligent shopping companion powered by advanced AI</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Load products on first run
    if not st.session_state.all_products:
        with st.spinner("🔄 Loading products..."):
            load_all_products()
    
    # Enhanced Sidebar
    with st.sidebar:
        st.markdown("""
        <div class="sidebar-header">
            <h3>🎛️ Control Panel</h3>
        </div>
        """, unsafe_allow_html=True)
        
        # Session Info with enhanced styling
        with st.expander("📊 Session Info", expanded=True):
            st.markdown(f"**🆔 Session:** `{st.session_state.session_id[:8]}...`")
            st.markdown(f"**💬 Messages:** {len(st.session_state.chat_history)}")
            
            # Session time
            session_time = datetime.now().strftime("%H:%M:%S")
            st.markdown(f"**⏰ Time:** {session_time}")
        
        # Backend Status with enhanced indicators
        st.subheader("🔌 Backend Status")
        health_data = make_api_request("/health")
        if health_data:
            st.markdown("""
            <div class="notification success">
                <strong>✅ Backend Connected</strong>
            </div>
            """, unsafe_allow_html=True)
            
            # Enhanced metrics
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-value">{health_data.get('total_products', 0)}</div>
                    <div class="metric-label">Products</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-value">{health_data.get('active_sessions', 0)}</div>
                    <div class="metric-label">Sessions</div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.markdown("""
            <div class="notification error">
                <strong>❌ Backend Disconnected</strong>
            </div>
            """, unsafe_allow_html=True)
        
        st.divider()
        
        # Enhanced Quick Actions
        st.subheader("⚡ Quick Actions")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔄 Reload", use_container_width=True):
                result = make_api_request("/reload-products", "POST")
                if result:
                    st.success("✅ Reloaded!")
                    load_all_products()
        
        with col2:
            if st.button("🗑️ Clear", use_container_width=True):
                result = make_api_request(f"/session/{st.session_state.session_id}", "DELETE")
                st.session_state.chat_history = []
                st.session_state.products = []
                st.success("✅ Cleared!")
        
        if st.button("🆕 New Session", use_container_width=True):
            st.session_state.session_id = str(uuid.uuid4())
            st.session_state.chat_history = []
            st.session_state.products = []
            st.success("✅ New session!")
            st.rerun()
        
        st.divider()
        
        # Enhanced Product Statistics
        if st.session_state.all_products:
            st.subheader("📈 Live Stats")
            df = pd.DataFrame(st.session_state.all_products)
            
            # Category distribution with plotly
            if 'category' in df.columns:
                cat_counts = df['category'].value_counts().head(5)
                fig = px.pie(
                    values=cat_counts.values, 
                    names=cat_counts.index,
                    color_discrete_sequence=px.colors.qualitative.Set3
                )
                fig.update_layout(height=300, margin=dict(t=0, b=0, l=0, r=0))
                st.plotly_chart(fig, use_container_width=True)
            
            # Price insights
            if 'price' in df.columns:
                st.markdown(f"**💰 Price Range:** ₹{df['price'].min():,.0f} - ₹{df['price'].max():,.0f}")
                st.markdown(f"**📊 Average:** ₹{df['price'].mean():,.0f}")
    
    # Enhanced Main content tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        "💬 AI Chat", 
        "🔍 Browse", 
        "📊 Analytics", 
        "⚙️ Settings"
    ])
    
    with tab1:
        chat_interface()
    
    with tab2:
        browse_products()
    
    with tab3:
        analytics_dashboard()
    
    with tab4:
        settings_page()

def chat_interface():
    """Enhanced chat interface"""
    st.markdown("### 💬 Chat with AI Assistant")
    
    # Chat history display with improved styling
    chat_container = st.container()
    with chat_container:
        if not st.session_state.chat_history:
            st.markdown("""
            <div style="
                text-align: center; 
                padding: 3rem; 
                color: #6c757d;
                background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 20px;
                margin: 2rem 0;
            ">
                <h3>👋 Welcome to AI Shopping Assistant!</h3>
                <p>Start by asking me about products you're looking for...</p>
                <p><em>Try: "Show me red Nike shoes under ₹2000"</em></p>
            </div>
            """, unsafe_allow_html=True)
        
        for i, chat in enumerate(st.session_state.chat_history):
            # User message
            st.markdown(f"""
            <div class="chat-message user-message">
                <strong>You:</strong> {chat['user']}<br>
                <small>⏰ {chat.get('timestamp', '')}</small>
            </div>
            """, unsafe_allow_html=True)
            
            # Assistant message
            st.markdown(f"""
            <div class="chat-message assistant-message">
                <strong>🤖 AI Assistant:</strong> {chat['assistant']}<br>
                <small>⏰ {chat.get('timestamp', '')}</small>
            </div>
            """, unsafe_allow_html=True)
    
    # Enhanced Chat input
    st.markdown('<div class="search-container">', unsafe_allow_html=True)
    with st.form("chat_form", clear_on_submit=True):
        col1, col2 = st.columns([4, 1])
        with col1:
            user_input = st.text_input(
                "", 
                placeholder="Ask me anything about products... e.g., 'Show me red Nike shoes under ₹2000'",
                label_visibility="collapsed"
            )
        with col2:
            submitted = st.form_submit_button("Send 🚀", use_container_width=True)
        
        if submitted and user_input:
            with st.spinner("🧠 AI is thinking..."):
                response = send_chat_message(user_input)
                if response:
                    st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Enhanced response details
    if hasattr(st.session_state, 'last_response') and st.session_state.last_response:
        response = st.session_state.last_response
        
        # Response metadata with enhanced styling
        st.markdown("#### 📋 Response Details")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            confidence = response.get('confidence', 0)
            color_class = get_confidence_color(confidence)
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value {color_class}">{confidence:.0%}</div>
                <div class="metric-label">Confidence</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{len(response.get('products', []))}</div>
                <div class="metric-label">Products Found</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            status = "Clear" if not response.get('needs_clarification') else "Needs Clarification"
            status_color = "#28a745" if not response.get('needs_clarification') else "#ffc107"
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value" style="font-size: 1rem; color: {status_color};">
                    {"✅" if not response.get('needs_clarification') else "🤔"}
                </div>
                <div class="metric-label">{status}</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col4:
            processing_time = response.get('processing_time', 0)
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{processing_time:.2f}s</div>
                <div class="metric-label">Response Time</div>
            </div>
            """, unsafe_allow_html=True)
        
        # Search explanation
        if response.get('search_explanation'):
            st.info(f"🔍 **Search Process:** {response['search_explanation']}")
        
        # Clarifying questions with enhanced buttons
        if response.get('clarifying_questions'):
            st.markdown("#### ❓ Quick Questions")
            cols = st.columns(len(response['clarifying_questions']))
            for i, question in enumerate(response['clarifying_questions']):
                with cols[i]:
                    if st.button(question, key=f"clarify_{i}", use_container_width=True):
                        send_chat_message(question)
                        st.rerun()
        
        # Suggestions
        if response.get('suggestions'):
            st.markdown("#### 💡 Suggestions")
            cols = st.columns(min(len(response['suggestions']), 3))
            for i, suggestion in enumerate(response['suggestions']):
                with cols[i % 3]:
                    if st.button(suggestion, key=f"suggest_{i}", use_container_width=True):
                        send_chat_message(suggestion)
                        st.rerun()
    
    # Display found products
    if st.session_state.products:
        st.markdown("### 🛍️ Found Products")
        
        # Product grid with enhanced layout
        for i in range(0, len(st.session_state.products), 2):
            cols = st.columns(2)
            for j, col in enumerate(cols):
                if i + j < len(st.session_state.products):
                    with col:
                        display_product_card(st.session_state.products[i + j], f"chat_{i+j}")
    
    # Display recommendations
    if st.session_state.current_recommendations:
        st.markdown("### 🎯 Recommended Products")
        if hasattr(st.session_state, 'base_product'):
            st.markdown(f"**Based on:** {st.session_state.base_product.get('name', 'Unknown')}")
        
        for i in range(0, len(st.session_state.current_recommendations), 2):
            cols = st.columns(2)
            for j, col in enumerate(cols):
                if i + j < len(st.session_state.current_recommendations):
                    with col:
                        display_product_card(st.session_state.current_recommendations[i + j], f"rec_{i+j}")

def browse_products():
    """Enhanced product browsing interface"""
    st.markdown("### 🔍 Browse All Products")
    
    if not st.session_state.all_products:
        st.markdown("""
        <div class="notification warning">
            <strong>⚠️ No Products Available</strong><br>
            No products loaded. Please check backend connection.
        </div>
        """, unsafe_allow_html=True)
        return
    
    # Enhanced Filters Section
    st.markdown("#### 🎛️ Smart Filters")
    
    # Filter container
    with st.container():
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            categories = list(set(p.get('category', 'Unknown') for p in st.session_state.all_products))
            selected_category = st.selectbox("📂 Category", ["All"] + sorted(categories))
        
        with col2:
            brands = list(set(p.get('brand', 'Unknown') for p in st.session_state.all_products))
            selected_brand = st.selectbox("🏷️ Brand", ["All"] + sorted(brands))
        
        with col3:
            prices = [p.get('price', 0) for p in st.session_state.all_products if p.get('price', 0) > 0]
            if prices:
                min_price, max_price = st.slider(
                    "💰 Price Range", 
                    min_value=int(min(prices)), 
                    max_value=int(max(prices)),
                    value=(int(min(prices)), int(max(prices))),
                    format="₹%d"
                )
            else:
                min_price, max_price = 0, 0
        
        with col4:
            sort_options = {
                "Name A-Z": ("name", False),
                "Name Z-A": ("name", True),
                "Price Low-High": ("price", False),
                "Price High-Low": ("price", True),
                "Brand A-Z": ("brand", False)
            }
            sort_by = st.selectbox("🔄 Sort By", list(sort_options.keys()))
    
    # Enhanced Search
    st.markdown('<div class="search-container">', unsafe_allow_html=True)
    search_query = st.text_input(
        "", 
        placeholder="🔍 Search products by name, brand, or description...",
        label_visibility="collapsed"
    )
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Filter products
    filtered_products = st.session_state.all_products.copy()
    
    if selected_category != "All":
        filtered_products = [p for p in filtered_products if p.get('category') == selected_category]
    
    if selected_brand != "All":
        filtered_products = [p for p in filtered_products if p.get('brand') == selected_brand]
    
    if prices:  # Only filter by price if we have price data
        filtered_products = [p for p in filtered_products 
                            if min_price <= p.get('price', 0) <= max_price]
    
    if search_query:
        search_lower = search_query.lower()
        filtered_products = [p for p in filtered_products 
                           if search_lower in p.get('name', '').lower() or 
                              search_lower in p.get('description', '').lower() or
                              search_lower in p.get('brand', '').lower()]
    
    # Sort products
    sort_key, reverse = sort_options[sort_by]
    try:
        filtered_products.sort(key=lambda x: x.get(sort_key, ''), reverse=reverse)
    except:
        pass  # Handle any sorting errors gracefully
    
    # Display results with enhanced metrics
    st.markdown("#### 📊 Search Results")
    
    result_col1, result_col2, result_col3, result_col4 = st.columns(4)
    with result_col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{len(filtered_products)}</div>
            <div class="metric-label">Products Found</div>
        </div>
        """, unsafe_allow_html=True)
    
    with result_col2:
        if filtered_products:
            avg_price = sum(p.get('price', 0) for p in filtered_products) / len(filtered_products)
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">₹{avg_price:,.0f}</div>
                <div class="metric-label">Avg Price</div>
            </div>
            """, unsafe_allow_html=True)
    
    with result_col3:
        if filtered_products:
            categories_found = len(set(p.get('category', 'Unknown') for p in filtered_products))
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{categories_found}</div>
                <div class="metric-label">Categories</div>
            </div>
            """, unsafe_allow_html=True)
    
    with result_col4:
        if filtered_products:
            brands_found = len(set(p.get('brand', 'Unknown') for p in filtered_products))
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{brands_found}</div>
                <div class="metric-label">Brands</div>
            </div>
            """, unsafe_allow_html=True)
    
    # Enhanced Pagination
    items_per_page = 8
    total_pages = (len(filtered_products) + items_per_page - 1) // items_per_page
    
    if total_pages > 1:
        st.markdown("#### 📄 Navigation")
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            page = st.selectbox(
                f"Page (1-{total_pages})", 
                range(1, total_pages + 1),
                format_func=lambda x: f"Page {x} of {total_pages}"
            )
        start_idx = (page - 1) * items_per_page
        end_idx = start_idx + items_per_page
        page_products = filtered_products[start_idx:end_idx]
    else:
        page_products = filtered_products
    
    # Display products in enhanced grid
    if page_products:
        for i in range(0, len(page_products), 2):
            cols = st.columns(2)
            for j, col in enumerate(cols):
                if i + j < len(page_products):
                    with col:
                        display_product_card(page_products[i + j], f"browse_{i+j}")
    else:
        st.markdown("""
        <div style="
            text-align: center; 
            padding: 3rem; 
            color: #6c757d;
            background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 20px;
            margin: 2rem 0;
        ">
            <h3>🔍 No Products Found</h3>
            <p>Try adjusting your filters or search terms</p>
        </div>
        """, unsafe_allow_html=True)

def analytics_dashboard():
    """Enhanced analytics dashboard with interactive charts"""
    st.markdown("### 📊 Product Analytics Dashboard")
    
    if not st.session_state.all_products:
        st.markdown("""
        <div class="notification warning">
            <strong>⚠️ No Data Available</strong><br>
            No products loaded for analysis.
        </div>
        """, unsafe_allow_html=True)
        return
    
    df = pd.DataFrame(st.session_state.all_products)
    
    # Enhanced Summary Statistics
    st.markdown("#### 📈 Key Metrics")
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{len(df)}</div>
            <div class="metric-label">Total Products</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        if 'category' in df.columns:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{df['category'].nunique()}</div>
                <div class="metric-label">Categories</div>
            </div>
            """, unsafe_allow_html=True)
    
    with col3:
        if 'brand' in df.columns:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{df['brand'].nunique()}</div>
                <div class="metric-label">Brands</div>
            </div>
            """, unsafe_allow_html=True)
    
    with col4:
        if 'price' in df.columns:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">₹{df['price'].mean():.0f}</div>
                <div class="metric-label">Avg Price</div>
            </div>
            """, unsafe_allow_html=True)
    
    with col5:
        if 'inventory' in df.columns:
            total_inventory = df['inventory'].sum()
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-value">{total_inventory:,}</div>
                <div class="metric-label">Total Stock</div>
            </div>
            """, unsafe_allow_html=True)
    
    # Interactive Charts
    chart_col1, chart_col2 = st.columns(2)
    
    with chart_col1:
        if 'category' in df.columns:
            st.markdown("#### 📂 Category Distribution")
            category_counts = df['category'].value_counts()
            fig = px.pie(
                values=category_counts.values, 
                names=category_counts.index,
                color_discrete_sequence=px.colors.qualitative.Set3,
                hole=0.4
            )
            fig.update_traces(textposition='inside', textinfo='percent+label')
            fig.update_layout(height=400, showlegend=True)
            st.plotly_chart(fig, use_container_width=True)
    
    with chart_col2:
        if 'brand' in df.columns:
            st.markdown("#### 🏷️ Top Brands")
            brand_counts = df['brand'].value_counts().head(10)
            fig = px.bar(
                x=brand_counts.values,
                y=brand_counts.index,
                orientation='h',
                color=brand_counts.values,
                color_continuous_scale='viridis'
            )
            fig.update_layout(
                height=400,
                yaxis={'categoryorder': 'total ascending'},
                showlegend=False
            )
            st.plotly_chart(fig, use_container_width=True)
    
    # Price Analysis
    if 'price' in df.columns:
        st.markdown("#### 💰 Price Analysis")
        
        # Price distribution histogram
        fig = px.histogram(
            df, 
            x='price', 
            nbins=30,
            color_discrete_sequence=['#667eea']
        )
        fig.update_layout(
            title="Price Distribution",
            xaxis_title="Price (₹)",
            yaxis_title="Number of Products",
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Price by category box plot
        if 'category' in df.columns and 'price' in df.columns and len(df) > 0:
            # Remove rows with missing data
            plot_data = df.dropna(subset=['category', 'price'])
            
            if len(plot_data) > 0:
                fig = px.box(
                    plot_data,
                    x='category',
                    y='price',
                    color='category'
                )
                fig.update_layout(
                    title="Price Distribution by Category",
                    xaxis_title="Category",
                    yaxis_title="Price (₹)",
                    height=400,
                    showlegend=False
                )
                # Fixed: Changed update_xaxis to update_xaxes
                fig.update_xaxes(tickangle=45)
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No data available for price distribution")
    
    # Inventory Analysis
    if 'inventory' in df.columns:
        st.markdown("#### 📦 Inventory Analysis")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Low stock alert
            low_stock = df[df['inventory'] < 10]
            if not low_stock.empty:
                st.markdown("""
                <div class="notification warning">
                    <strong>⚠️ Low Stock Alert</strong><br>
                    {} products with less than 10 items in stock
                </div>
                """.format(len(low_stock)), unsafe_allow_html=True)
                
                st.dataframe(
                    low_stock[['name', 'brand', 'category', 'inventory']].head(10),
                    use_container_width=True
                )
        
        with col2:
            # Inventory distribution
            fig = px.histogram(
                df, 
                x='inventory', 
                nbins=20,
                color_discrete_sequence=['#28a745']
            )
            fig.update_layout(
                title="Inventory Distribution",
                xaxis_title="Stock Level",
                yaxis_title="Number of Products",
                height=300
            )
            st.plotly_chart(fig, use_container_width=True)
    
    # Advanced Analytics
    st.markdown("#### 🔬 Advanced Analytics")
    
    # Correlation analysis if we have numeric columns
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 1:
        correlation_matrix = df[numeric_cols].corr()
        fig = px.imshow(
            correlation_matrix,
            text_auto=True,
            aspect="auto",
            color_continuous_scale='RdBu'
        )
        fig.update_layout(
            title="Feature Correlation Matrix",
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)
    
    # Export functionality
    st.markdown("#### 💾 Export Data")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📊 Export Analytics Data", use_container_width=True):
            analytics_data = {
                "total_products": len(df),
                "categories": df['category'].nunique() if 'category' in df.columns else 0,
                "brands": df['brand'].nunique() if 'brand' in df.columns else 0,
                "avg_price": df['price'].mean() if 'price' in df.columns else 0,
                "generated_at": datetime.now().isoformat()
            }
            st.download_button(
                label="Download Analytics Report",
                data=json.dumps(analytics_data, indent=2),
                file_name=f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
    
    with col2:
        if st.button("📋 Export Product List", use_container_width=True):
            csv_data = df.to_csv(index=False)
            st.download_button(
                label="Download Products CSV",
                data=csv_data,
                file_name=f"products_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )
def settings_page():
    """Enhanced settings and configuration page"""
    st.markdown("### ⚙️ Application Settings")
    
    # Backend Configuration
    st.markdown("#### 🔧 Backend Configuration")
    
    with st.container():
        col1, col2 = st.columns([2, 1])
        
        with col1:
            current_backend = st.text_input(
                "Backend URL", 
                value=BACKEND_URL,
                help="Enter the backend API endpoint URL"
            )
        
        with col2:
            if st.button("🔍 Test Connection", use_container_width=True):
                try:
                    response = requests.get(f"{current_backend}/health", timeout=5)
                    if response.status_code == 200:
                        st.markdown("""
                        <div class="notification success">
                            <strong>✅ Connection Successful!</strong>
                        </div>
                        """, unsafe_allow_html=True)
                        with st.expander("Response Details"):
                            st.json(response.json())
                    else:
                        st.markdown(f"""
                        <div class="notification error">
                            <strong>❌ Connection Failed</strong><br>
                            Status Code: {response.status_code}
                        </div>
                        """, unsafe_allow_html=True)
                except requests.exceptions.Timeout:
                    st.markdown("""
                    <div class="notification error">
                        <strong>⏰ Connection Timeout</strong><br>
                        Backend is not responding
                    </div>
                    """, unsafe_allow_html=True)
                except Exception as e:
                    st.markdown(f"""
                    <div class="notification error">
                        <strong>❌ Connection Error</strong><br>
                        {str(e)}
                    </div>
                    """, unsafe_allow_html=True)
    
    st.divider()
    
    # Display Settings
    st.markdown("#### 🎨 Display Settings")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        show_debug = st.toggle("🐛 Debug Mode", value=False)
        st.caption("Show detailed debug information")
    
    with col2:
        auto_refresh = st.toggle("🔄 Auto Refresh", value=False)
        st.caption("Automatically refresh data")
    
    with col3:
        show_animations = st.toggle("✨ Animations", value=True)
        st.caption("Enable UI animations")
    
    # Performance Settings
    st.markdown("#### ⚡ Performance Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        items_per_page = st.slider(
            "Items per page",
            min_value=4,
            max_value=20,
            value=8,
            help="Number of products to display per page"
        )
    
    with col2:
        cache_duration = st.slider(
            "Cache duration (minutes)",
            min_value=1,
            max_value=60,
            value=10,
            help="How long to cache API responses"
        )
    
    if show_debug:
        st.divider()
        st.markdown("#### 🐛 Debug Information")
        
        debug_tabs = st.tabs(["Session State", "System Info", "API Logs"])
        
        with debug_tabs[0]:
            debug_state = {
                "session_id": st.session_state.session_id,
                "chat_history_length": len(st.session_state.chat_history),
                "products_count": len(st.session_state.products),
                "all_products_count": len(st.session_state.all_products),
                "current_recommendations_count": len(st.session_state.current_recommendations),
                "session_keys": list(st.session_state.keys())
            }
            st.json(debug_state)
        
        with debug_tabs[1]:
            import platform
            system_info = {
                "python_version": platform.python_version(),
                "platform": platform.platform(),
                "streamlit_version": st.__version__,
                "current_time": datetime.now().isoformat()
            }
            st.json(system_info)
        
        with debug_tabs[2]:
            st.info("API request logs would appear here in a production environment")
    
    st.divider()
    
    # Data Management
    st.markdown("#### 💾 Data Management")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("📥 Export Chat History", use_container_width=True):
            if st.session_state.chat_history:
                chat_data = {
                    "session_id": st.session_state.session_id,
                    "exported_at": datetime.now().isoformat(),
                    "chat_history": st.session_state.chat_history,
                    "total_messages": len(st.session_state.chat_history)
                }
                st.download_button(
                    label="📥 Download Chat History",
                    data=json.dumps(chat_data, indent=2),
                    file_name=f"chat_history_{st.session_state.session_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json",
                    use_container_width=True
                )
            else:
                st.info("💬 No chat history to export")
    
    with col2:
        if st.button("🗑️ Clear All Data", use_container_width=True):
            if st.button("⚠️ Confirm Clear", use_container_width=True):
                # Clear session state
                for key in ['chat_history', 'products', 'current_recommendations', 'last_response']:
                    if key in st.session_state:
                        st.session_state[key] = [] if key.endswith('history') or key.endswith('products') or key.endswith('recommendations') else None
                
                st.success("✅ All data cleared!")
                st.rerun()
    
    with col3:
        if st.button("🔄 Reset Application", use_container_width=True):
            if st.button("⚠️ Confirm Reset", use_container_width=True):
                # Reset entire session
                for key in list(st.session_state.keys()):
                    del st.session_state[key]
                st.success("✅ Application reset!")
                st.rerun()
    
    st.divider()
    
    # API Testing
    st.markdown("#### 🧪 API Testing")
    
    test_endpoints = {
        "Health Check": "/health",
        "Get Products": "/products", 
        "Get Categories": "/categories",
        "Get Brands": "/brands"
    }
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        selected_endpoint = st.selectbox(
            "Select Test Endpoint",
            list(test_endpoints.keys())
        )
    
    with col2:
        if st.button(f"🚀 Test {selected_endpoint}", use_container_width=True):
            endpoint = test_endpoints[selected_endpoint]
            with st.spinner(f"Testing {endpoint}..."):
                result = make_api_request(endpoint)
                if result:
                    st.success(f"✅ {selected_endpoint} successful!")
                    with st.expander("Response Data"):
                        st.json(result)
                else:
                    st.error(f"❌ {selected_endpoint} failed!")

# Enhanced Product Details Modal
if hasattr(st.session_state, 'selected_product') and st.session_state.selected_product:
    with st.expander("🔍 Product Details", expanded=True):
        product = st.session_state.selected_product
        
        # Header
        st.markdown(f"# {product['name']}")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            # Main image
            if product.get('imageUrl'):
                st.image(product['imageUrl'], width=400, use_column_width=True)
            
            # Additional images gallery
            if product.get('images') and len(product['images']) > 1:
                st.markdown("**📸 More Images:**")
                img_cols = st.columns(3)
                for i, img_url in enumerate(product['images'][1:4]):  # Show max 3 additional images
                    with img_cols[i % 3]:
                        st.image(img_url, width=100)
        
        with col2:
            # Product info
            info_col1, info_col2 = st.columns(2)
            
            with info_col1:
                st.markdown(f"**🏷️ Brand:** {product.get('brand', 'N/A')}")
                st.markdown(f"**📂 Category:** {product.get('category', 'N/A')}")
                st.markdown(f"**💰 Price:** {format_price(product.get('price', 0))}", unsafe_allow_html=True)
            
            with info_col2:
                stock = product.get('inventory', 0)
                stock_status = "✅ In Stock" if stock > 0 else "❌ Out of Stock"
                stock_color = "#28a745" if stock > 0 else "#dc3545"
                st.markdown(f"**📦 Status:** <span style='color: {stock_color};'>{stock_status}</span>", unsafe_allow_html=True)
                st.markdown(f"**📊 Quantity:** {stock} items")
                
                # Special features
                if product.get('has3DModel'):
                    st.markdown("**🎮 3D Model Available**")
                if product.get('arEnabled'):
                    st.markdown("**🥽 AR Experience Available**")
            
            # Description
            if product.get('description'):
                st.markdown("**📝 Description:**")
                st.write(product['description'])
            
            # Features in a nice table
            features = product.get('features', {})
            if features:
                st.markdown("**✨ Features & Specifications:**")
                
                # Create a DataFrame for better presentation
                feature_data = []
                for key, value in features.items():
                    if value:  # Only show non-empty features
                        feature_data.append({"Feature": key.title(), "Value": str(value)})
                
                if feature_data:
                    feature_df = pd.DataFrame(feature_data)
                    st.dataframe(feature_df, use_container_width=True, hide_index=True)
        
        # Action buttons
        st.divider()
        button_col1, button_col2, button_col3, button_col4 = st.columns(4)
        
        with button_col1:
            if st.button("💡 Get Recommendations", use_container_width=True):
                get_recommendations(product['id'])
                st.rerun()
        
        with button_col2:
            if st.button("🔍 Similar Products", use_container_width=True):
                # Search for similar products
                category = product.get('category', '')
                if category:
                    similar_query = f"Show me more {category} products"
                    send_chat_message(similar_query)
                    st.rerun()
        
        with button_col3:
            if st.button("💬 Ask About This", use_container_width=True):
                # Pre-fill chat with product question
                product_question = f"Tell me more about {product['name']}"
                send_chat_message(product_question)
                st.rerun()
        
        with button_col4:
            if st.button("❌ Close Details", use_container_width=True):
                del st.session_state.selected_product
                st.rerun()

if __name__ == "__main__":
    main()