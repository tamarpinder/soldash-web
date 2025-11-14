"""
Database manager for SolDash application.
Handles all database operations with Supabase PostgreSQL.
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker, Session
from models import Base, HistoricalGame

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Manages database operations for SolDash.

    Handles connection to Supabase PostgreSQL, game data storage,
    and pattern analysis queries.
    """

    def __init__(self):
        """Initialize database connection."""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")

        # Create Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # Create SQLAlchemy engine (for direct PostgreSQL access if needed)
        # Extract database connection string from Supabase URL
        db_connection_string = self._get_db_connection_string()
        self.engine = create_engine(db_connection_string) if db_connection_string else None

        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine) if self.engine else None

        logger.info("DatabaseManager initialized")

    def _get_db_connection_string(self) -> Optional[str]:
        """
        Get PostgreSQL connection string from environment.
        For Supabase, this needs to be constructed or provided separately.
        """
        # Supabase provides a direct Postgres connection string
        # Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
        db_url = os.getenv("DATABASE_URL")
        return db_url

    def init_db(self):
        """Create all tables if they don't exist."""
        try:
            if self.engine:
                Base.metadata.create_all(bind=self.engine)
                logger.info("Database tables created/verified")
            else:
                # Use Supabase SQL editor to create tables manually
                logger.warning("No SQLAlchemy engine. Use Supabase dashboard to create tables.")
                logger.info("SQL for table creation:")
                logger.info(self._get_table_creation_sql())
        except Exception as e:
            logger.error(f"Error initializing database: {e}")

    def _get_table_creation_sql(self) -> str:
        """Return SQL for creating tables in Supabase."""
        return """
        CREATE TABLE IF NOT EXISTS historical_games (
            game_id INTEGER PRIMARY KEY,
            game_value FLOAT NOT NULL,
            winning_ticket BIGINT NOT NULL,
            winner VARCHAR NOT NULL,
            eos_block VARCHAR,
            eos_block_hash VARCHAR,
            eos_block_timestamp TIMESTAMP,
            eos_block_producer VARCHAR,
            server_seed VARCHAR,
            verified BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMP DEFAULT NOW(),
            ticket_percentile FLOAT NOT NULL,
            decile INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_game_id ON historical_games(game_id);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON historical_games(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_decile ON historical_games(decile);
        CREATE INDEX IF NOT EXISTS idx_verified ON historical_games(verified);
        """

    def insert_game(self, game_data: Dict) -> bool:
        """
        Insert a single game into the database.

        Args:
            game_data: Dictionary containing game information

        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if game already exists
            existing = self.supabase.table('historical_games').select('game_id').eq('game_id', game_data['game_id']).execute()

            if existing.data:
                logger.debug(f"Game {game_data['game_id']} already exists, skipping")
                return False

            # Insert new game
            result = self.supabase.table('historical_games').insert({
                'game_id': game_data['game_id'],
                'game_value': game_data['game_value'],
                'winning_ticket': game_data['winning_ticket'],
                'winner': game_data['winner'],
                'eos_block': game_data.get('eos_block'),
                'eos_block_hash': game_data.get('eos_block_hash'),
                'eos_block_timestamp': game_data.get('eos_block_timestamp'),
                'eos_block_producer': game_data.get('eos_block_producer'),
                'server_seed': game_data.get('server_seed'),
                'verified': game_data.get('verified', False),
                'timestamp': datetime.utcnow().isoformat(),
                'ticket_percentile': game_data['ticket_percentile'],
                'decile': game_data['decile']
            }).execute()

            logger.info(f"Inserted game {game_data['game_id']}")
            return True

        except Exception as e:
            logger.error(f"Error inserting game {game_data.get('game_id')}: {e}")
            return False

    def insert_games(self, games: List[Dict]) -> tuple[int, int]:
        """
        Insert multiple games into the database.

        Args:
            games: List of game dictionaries

        Returns:
            Tuple of (total_games, newly_inserted_games)
        """
        total = len(games)
        inserted = 0

        for game in games:
            if self.insert_game(game):
                inserted += 1

        logger.info(f"Inserted {inserted} new games out of {total} total")
        return total, inserted

    def get_games(self, limit: int = 50) -> List[Dict]:
        """
        Retrieve recent games from the database.

        Args:
            limit: Maximum number of games to retrieve

        Returns:
            List of game dictionaries
        """
        try:
            result = self.supabase.table('historical_games')\
                .select('*')\
                .order('game_id', desc=True)\
                .limit(limit)\
                .execute()

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Error retrieving games: {e}")
            return []

    def get_games_for_pattern_analysis(self, count: int = 10) -> List[Dict]:
        """
        Get the most recent N games for pattern analysis.

        Args:
            count: Number of recent games to retrieve

        Returns:
            List of game dictionaries
        """
        return self.get_games(limit=count)

    def get_decile_distribution(self, game_count: int = 10) -> Dict[int, int]:
        """
        Calculate decile distribution for the last N games.

        Args:
            game_count: Number of recent games to analyze

        Returns:
            Dictionary mapping decile (1-10) to count of wins
        """
        games = self.get_games_for_pattern_analysis(game_count)

        # Initialize all deciles with 0
        distribution = {i: 0 for i in range(1, 11)}

        # Count games in each decile
        for game in games:
            decile = game['decile']
            if 1 <= decile <= 10:
                distribution[decile] += 1

        return distribution

    def calculate_decile(self, winning_ticket: int, pot_value_lamports: int) -> int:
        """
        Calculate which decile a winning ticket falls into.

        Args:
            winning_ticket: The winning ticket number
            pot_value_lamports: Total pot value in lamports

        Returns:
            Decile number (1-10)
        """
        if pot_value_lamports == 0:
            return 1

        percentile = (winning_ticket / pot_value_lamports) * 100
        decile = min(10, max(1, int((percentile / 10) + 1))) if percentile < 100 else 10

        return decile

    def get_database_stats(self) -> Dict:
        """
        Get statistics about the database.

        Returns:
            Dictionary with database statistics
        """
        try:
            count_result = self.supabase.table('historical_games').select('game_id', count='exact').execute()
            total_games = count_result.count if count_result.count else 0

            oldest_result = self.supabase.table('historical_games')\
                .select('game_id, timestamp')\
                .order('game_id')\
                .limit(1)\
                .execute()

            newest_result = self.supabase.table('historical_games')\
                .select('game_id, timestamp')\
                .order('game_id', desc=True)\
                .limit(1)\
                .execute()

            return {
                'total_games': total_games,
                'oldest_game': oldest_result.data[0] if oldest_result.data else None,
                'newest_game': newest_result.data[0] if newest_result.data else None
            }

        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {'total_games': 0, 'oldest_game': None, 'newest_game': None}


# Test function
def test_database():
    """Test database connection and operations."""
    try:
        db = DatabaseManager()
        stats = db.get_database_stats()
        print(f"Database stats: {stats}")

        # Test getting games
        games = db.get_games(limit=5)
        print(f"Retrieved {len(games)} games")

        if games:
            print("\nFirst game:")
            print(games[0])

    except Exception as e:
        print(f"Error testing database: {e}")


if __name__ == "__main__":
    test_database()
