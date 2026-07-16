"""
FastAPI Application for ML Recommendation Service.
Refactored for clean architecture and modularity.
"""
import uvicorn
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from utils import setup_logging, get_logger
from services import (
    BackendClient,
    ColdStartRecommender,
    PersonalizationEngine,
    RecommendationEngine
)
from routes import router
from routes.recommendations import set_engine, set_backend_client

# Setup logging first
setup_logging()
logger = get_logger(__name__)

# Global service instances
backend_client: BackendClient = None
recommendation_engine: RecommendationEngine = None
initialization_task: asyncio.Task = None
is_initializing = False


async def initialize_services() -> bool:
    """Initialize all services with retry logic"""
    global backend_client, recommendation_engine, is_initializing
    
    if is_initializing:
        logger.info("Initialization already in progress")
        return False
    
    is_initializing = True
    
    try:
        logger.info("Initializing recommendation service...")
        
        # Initialize backend client
        backend_client = BackendClient()
        init_success = await backend_client.initialize()
        
        if not init_success:
            logger.error("Failed to initialize backend client")
            is_initializing = False
            return False
        
        logger.info(f"Backend client initialized with {len(backend_client.get_all_products())} products")
        
        # Fetch initial interactions
        interactions = await backend_client.fetch_user_interactions()
        logger.info(f"Fetched {len(interactions)} initial interactions")
        
        # Initialize personalization engine
        personalization_engine = PersonalizationEngine(backend_client.get_all_products())
        personalization_engine.update_from_interactions(interactions)
        logger.info("Personalization engine initialized")
        
        # Initialize cold start recommender
        cold_start_recommender = ColdStartRecommender(backend_client.get_all_products())
        logger.info("Cold start recommender initialized")
        
        # Initialize recommendation engine
        recommendation_engine = RecommendationEngine(
            backend_client=backend_client,
            cold_start_recommender=cold_start_recommender,
            personalization_engine=personalization_engine
        )
        logger.info("Recommendation engine initialized")
        
        # Set global references in routes
        set_engine(recommendation_engine)
        set_backend_client(backend_client)
        
        logger.info("✅ All services initialized successfully")
        is_initializing = False
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        is_initializing = False
        return False


async def retry_initialization():
    """Retry initialization with exponential backoff"""
    retry_count = 0
    delay = Config.INIT_RETRY_DELAY
    
    while retry_count < Config.MAX_INIT_RETRIES:
        success = await initialize_services()
        if success:
            break
        
        retry_count += 1
        logger.warning(f"Initialization failed, retrying in {delay}s... (attempt {retry_count}/{Config.MAX_INIT_RETRIES})")
        await asyncio.sleep(delay)
        
        # Exponential backoff with cap
        delay = min(delay * 2, Config.MAX_RETRY_DELAY)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.
    Initialization on startup, cleanup on shutdown.
    """
    # Startup
    logger.info(f"Starting recommendation service (Environment: {Config.ENVIRONMENT})")
    await retry_initialization()
    
    # Keep service running
    yield
    
    # Shutdown
    logger.info("Shutting down recommendation service")


# Create FastAPI app
app = FastAPI(
    title="ML Recommendation Service",
    description="Personalized product recommendation service using adaptive algorithms",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

# Root endpoint
@app.get("/")
async def root():
    """Service information"""
    return {
        "service": "ML Recommendation Service",
        "version": "2.0.0",
        "status": "online",
        "docs_url": "/docs",
        "health_check_url": "/api/health"
    }


# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=Config.DEBUG,
        log_level=Config.LOG_LEVEL.lower()
    )
