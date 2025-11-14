"""
Data models for SolDash application.
Defines SQLAlchemy models for database and Pydantic schemas for API validation.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, BigInteger, DateTime
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field

Base = declarative_base()


class HistoricalGame(Base):
    """
    SQLAlchemy model for storing historical Solpot jackpot game data.

    Attributes:
        game_id: Unique game identifier from Solpot
        game_value: Total pot size in SOL
        winning_ticket: The winning ticket number (0 to game_value_lamports)
        winner: Username of the winner
        eos_block: EOS block hash used for randomness
        timestamp: When the game ended
        ticket_percentile: Position of winning ticket as percentage (0-100)
        decile: Which decile the winning ticket fell in (1-10)
    """
    __tablename__ = 'historical_games'

    game_id = Column(Integer, primary_key=True, index=True)
    game_value = Column(Float, nullable=False)
    winning_ticket = Column(BigInteger, nullable=False)
    winner = Column(String, nullable=False)
    eos_block = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    ticket_percentile = Column(Float, nullable=False)
    decile = Column(Integer, nullable=False)

    def __repr__(self):
        return f"<HistoricalGame(game_id={self.game_id}, winner={self.winner}, decile={self.decile})>"


class GameResponse(BaseModel):
    """Pydantic schema for game data in API responses."""
    game_id: int
    game_value: float
    winning_ticket: int
    winner: str
    eos_block: Optional[str] = None
    timestamp: datetime
    ticket_percentile: float
    decile: int

    class Config:
        from_attributes = True


class PatternAnalysis(BaseModel):
    """Pydantic schema for pattern analysis results."""
    game_count: int = Field(description="Number of games analyzed")
    decile_distribution: dict[int, int] = Field(description="Count of wins per decile (1-10)")
    decile_percentages: dict[int, float] = Field(description="Percentage of wins per decile")
    most_common_decile: int = Field(description="Decile with most wins")
    least_common_decile: int = Field(description="Decile with fewest wins")

    class Config:
        json_schema_extra = {
            "example": {
                "game_count": 50,
                "decile_distribution": {1: 5, 2: 3, 3: 7, 4: 4, 5: 6, 6: 8, 7: 5, 8: 4, 9: 3, 10: 5},
                "decile_percentages": {1: 10.0, 2: 6.0, 3: 14.0, 4: 8.0, 5: 12.0, 6: 16.0, 7: 10.0, 8: 8.0, 9: 6.0, 10: 10.0},
                "most_common_decile": 6,
                "least_common_decile": 2
            }
        }


class PatternComparison(BaseModel):
    """Pydantic schema for comparing patterns across different game counts."""
    last_10_games: PatternAnalysis
    last_30_games: PatternAnalysis
    last_50_games: PatternAnalysis

    class Config:
        json_schema_extra = {
            "example": {
                "last_10_games": {
                    "game_count": 10,
                    "decile_distribution": {1: 1, 2: 0, 3: 2, 4: 1, 5: 1, 6: 2, 7: 1, 8: 1, 9: 0, 10: 1},
                    "decile_percentages": {1: 10.0, 2: 0.0, 3: 20.0, 4: 10.0, 5: 10.0, 6: 20.0, 7: 10.0, 8: 10.0, 9: 0.0, 10: 10.0},
                    "most_common_decile": 3,
                    "least_common_decile": 2
                },
                "last_30_games": {},
                "last_50_games": {}
            }
        }


class ScraperStatus(BaseModel):
    """Pydantic schema for scraper status responses."""
    success: bool
    games_scraped: int
    games_stored: int
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "games_scraped": 50,
                "games_stored": 45,
                "message": "Successfully scraped 50 games, stored 45 new games"
            }
        }


class GameImport(BaseModel):
    """Pydantic schema for importing game data."""
    game_id: int
    game_value: float
    winning_ticket: int
    winner: str
    eos_block: Optional[str] = None
    ticket_percentile: float
    decile: int
    eos_block_hash: Optional[str] = None
    eos_block_timestamp: Optional[str] = None
    eos_block_producer: Optional[str] = None
    server_seed: Optional[str] = None
    verified: Optional[bool] = False


class ImportRequest(BaseModel):
    """Pydantic schema for bulk import requests."""
    games: list[GameImport]


class ImportResponse(BaseModel):
    """Pydantic schema for import responses."""
    success: bool
    total_games: int
    newly_inserted: int
    duplicates_skipped: int
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "total_games": 10,
                "newly_inserted": 8,
                "duplicates_skipped": 2,
                "message": "Successfully imported 8 new games (2 duplicates skipped)"
            }
        }
