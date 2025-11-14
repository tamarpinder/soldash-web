"""
SolDash FastAPI Backend
Real-time lottery analysis API for Solpot.com
"""
import logging
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
from dotenv import load_dotenv

from models import GameResponse, PatternAnalysis, PatternComparison, ScraperStatus, ImportRequest, ImportResponse
from database import DatabaseManager
from analysis import PatternAnalyzer

# Optional import for scraper (not needed in production)
try:
    from collector import SolpotScraper
    SCRAPER_AVAILABLE = True
except ImportError:
    SCRAPER_AVAILABLE = False
    logger.warning("Playwright not available - /scrape endpoint disabled")

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SolDash API",
    description="Real-time lottery analysis and pattern recognition for Solpot.com",
    version="1.0.0"
)

# Configure CORS - Allow all origins for DevTools scraper
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (including solpot.com for DevTools scraper)
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db_manager: Optional[DatabaseManager] = None
pattern_analyzer: Optional[PatternAnalyzer] = None

# In-memory cache for live game state
live_game_cache = {
    "data": None,
    "last_updated": None
}


@app.on_event("startup")
async def startup_event():
    """Initialize database and analyzer on startup."""
    global db_manager, pattern_analyzer

    try:
        logger.info("Initializing SolDash backend...")

        # Initialize database
        db_manager = DatabaseManager()
        db_manager.init_db()

        # Initialize pattern analyzer
        pattern_analyzer = PatternAnalyzer(db_manager)

        logger.info("SolDash backend initialized successfully")

    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise


@app.get("/")
async def root():
    """API root endpoint with status and info."""
    stats = db_manager.get_database_stats() if db_manager else {}

    return {
        "name": "SolDash API",
        "version": "1.0.0",
        "status": "operational",
        "description": "Real-time lottery analysis for Solpot.com",
        "database_stats": stats,
        "endpoints": {
            "health": "/api/v1/health",
            "scrape": "/api/v1/scrape",
            "import": "/api/v1/import",
            "games": "/api/v1/games",
            "patterns": "/api/v1/patterns",
            "compare": "/api/v1/patterns/compare",
            "insights": "/api/v1/insights"
        }
    }


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check database connection
        stats = db_manager.get_database_stats() if db_manager else None

        return {
            "status": "healthy",
            "database": "connected" if stats else "disconnected",
            "total_games": stats.get('total_games', 0) if stats else 0
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.post("/api/v1/scrape", response_model=ScraperStatus)
async def scrape_games(pages: int = Query(5, ge=1, le=10, description="Number of pages to scrape")):
    """
    Trigger manual scrape of Solpot fairness page.
    NOTE: This endpoint is disabled in production (requires Playwright).

    Args:
        pages: Number of pages to scrape (1-10)

    Returns:
        Scraper status with counts
    """
    if not SCRAPER_AVAILABLE:
        raise HTTPException(
            status_code=501,
            detail="Scraping not available in production. Use Chrome Extension or /api/v1/import endpoint."
        )

    try:
        logger.info(f"Starting scrape of {pages} pages...")

        # Initialize scraper
        scraper = SolpotScraper(headless=True)

        # Scrape games
        games = scraper.scrape_multiple_pages(pages)

        if not games:
            return ScraperStatus(
                success=False,
                games_scraped=0,
                games_stored=0,
                message="No games scraped. Check Solpot website availability."
            )

        # Store in database
        total, inserted = db_manager.insert_games(games)

        return ScraperStatus(
            success=True,
            games_scraped=total,
            games_stored=inserted,
            message=f"Successfully scraped {total} games, stored {inserted} new games"
        )

    except Exception as e:
        logger.error(f"Error during scrape: {e}")
        raise HTTPException(status_code=500, detail=f"Scrape failed: {str(e)}")


@app.post("/api/v1/import", response_model=ImportResponse)
async def import_games(request: ImportRequest):
    """
    Import games from DevTools scraper or Chrome extension.

    Accepts bulk game data and stores in database, skipping duplicates.

    Args:
        request: ImportRequest with list of games

    Returns:
        ImportResponse with insertion statistics
    """
    try:
        if not request.games:
            raise HTTPException(status_code=400, detail="No games provided")

        logger.info(f"Importing {len(request.games)} games...")

        # Convert Pydantic models to dictionaries
        games_data = [game.model_dump() for game in request.games]

        # Store in database
        total, inserted = db_manager.insert_games(games_data)

        return ImportResponse(
            success=True,
            total_games=total,
            newly_inserted=inserted,
            duplicates_skipped=total - inserted,
            message=f"Successfully imported {inserted} new games ({total - inserted} duplicates skipped)"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during import: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@app.get("/api/v1/games", response_model=List[GameResponse])
async def get_games(limit: int = Query(50, ge=1, le=1000, description="Number of games to retrieve")):
    """
    Get historical games from database.

    Args:
        limit: Number of games to retrieve (1-1000)

    Returns:
        List of game data
    """
    try:
        games = db_manager.get_games(limit=limit)

        return [GameResponse(**game) for game in games]

    except Exception as e:
        logger.error(f"Error retrieving games: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve games: {str(e)}")


@app.get("/api/v1/patterns", response_model=PatternAnalysis)
async def get_pattern(count: int = Query(10, ge=1, le=100, description="Number of recent games to analyze")):
    """
    Get pattern analysis for last N games.

    Args:
        count: Number of recent games to analyze (1-100)

    Returns:
        Pattern analysis with decile distribution
    """
    try:
        pattern = pattern_analyzer.get_pattern_summary(count)
        return pattern

    except Exception as e:
        logger.error(f"Error analyzing pattern: {e}")
        raise HTTPException(status_code=500, detail=f"Pattern analysis failed: {str(e)}")


@app.get("/api/v1/patterns/compare", response_model=PatternComparison)
async def compare_patterns():
    """
    Compare patterns across 10, 30, and 50 game windows.

    Returns:
        Pattern comparison across different time windows
    """
    try:
        comparison = pattern_analyzer.compare_patterns()
        return comparison

    except Exception as e:
        logger.error(f"Error comparing patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Pattern comparison failed: {str(e)}")


@app.get("/api/v1/insights")
async def get_insights(count: int = Query(10, ge=1, le=100, description="Number of recent games to analyze")):
    """
    Get strategic insights based on pattern analysis.

    Args:
        count: Number of recent games to analyze (1-100)

    Returns:
        Strategic insights including hot zones, cold zones, and recommendations
    """
    try:
        insights = pattern_analyzer.get_strategic_insight(count)
        shift_analysis = pattern_analyzer.get_pattern_shift_analysis()

        return {
            "pattern_insights": insights,
            "shift_analysis": shift_analysis
        }

    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {str(e)}")


@app.get("/api/v1/stats")
async def get_stats():
    """
    Get database and system statistics.

    Returns:
        System statistics
    """
    try:
        db_stats = db_manager.get_database_stats()

        return {
            "database": db_stats,
            "api_version": "1.0.0",
            "status": "operational"
        }

    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.post("/api/v1/live-game")
async def update_live_game(game_data: dict):
    """
    Update live game state (from Chrome extension).

    Args:
        game_data: Live game state data

    Returns:
        Success confirmation
    """
    try:
        from datetime import datetime

        live_game_cache["data"] = game_data
        live_game_cache["last_updated"] = datetime.utcnow().isoformat()

        logger.info(f"Live game updated: {game_data.get('pot_value')} SOL")

        return {
            "success": True,
            "message": "Live game state updated"
        }

    except Exception as e:
        logger.error(f"Error updating live game: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update live game: {str(e)}")


@app.get("/api/v1/live-game")
async def get_live_game():
    """
    Get current live game state.

    Returns:
        Live game data or null if stale/unavailable
    """
    try:
        from datetime import datetime, timedelta

        if not live_game_cache["data"]:
            return {
                "available": False,
                "data": None,
                "message": "No live game data available"
            }

        # Check if data is stale (older than 30 seconds)
        if live_game_cache["last_updated"]:
            last_update = datetime.fromisoformat(live_game_cache["last_updated"])
            age = (datetime.utcnow() - last_update).total_seconds()

            if age > 30:
                return {
                    "available": False,
                    "data": None,
                    "message": f"Live data is stale ({int(age)}s old)",
                    "last_updated": live_game_cache["last_updated"]
                }

        return {
            "available": True,
            "data": live_game_cache["data"],
            "last_updated": live_game_cache["last_updated"]
        }

    except Exception as e:
        logger.error(f"Error getting live game: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get live game: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
