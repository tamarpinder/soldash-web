"""
Pattern analysis engine for SolDash.
Analyzes historical winning ticket patterns across deciles.
"""
import logging
from typing import Dict, List
from collections import Counter
from models import PatternAnalysis, PatternComparison
from database import DatabaseManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PatternAnalyzer:
    """
    Analyzes winning ticket patterns from historical game data.

    Calculates decile distributions, identifies trends, and compares
    patterns across different time windows (10/30/50 games).
    """

    def __init__(self, db_manager: DatabaseManager):
        """
        Initialize the pattern analyzer.

        Args:
            db_manager: DatabaseManager instance for data access
        """
        self.db = db_manager

    def analyze_decile_distribution(self, games: List[Dict]) -> Dict[int, int]:
        """
        Calculate the distribution of winning tickets across deciles.

        Args:
            games: List of game dictionaries

        Returns:
            Dictionary mapping decile (1-10) to count of wins
        """
        # Initialize all deciles with 0
        distribution = {i: 0 for i in range(1, 11)}

        # Count games in each decile
        for game in games:
            decile = game.get('decile', 0)
            if 1 <= decile <= 10:
                distribution[decile] += 1

        return distribution

    def calculate_decile_percentages(self, distribution: Dict[int, int], total_games: int) -> Dict[int, float]:
        """
        Convert decile counts to percentages.

        Args:
            distribution: Decile distribution (count per decile)
            total_games: Total number of games

        Returns:
            Dictionary mapping decile to percentage
        """
        if total_games == 0:
            return {i: 0.0 for i in range(1, 11)}

        percentages = {}
        for decile, count in distribution.items():
            percentages[decile] = round((count / total_games) * 100, 2)

        return percentages

    def find_most_common_decile(self, distribution: Dict[int, int]) -> int:
        """
        Find the decile with the most wins.

        Args:
            distribution: Decile distribution

        Returns:
            Decile number with most wins
        """
        if not distribution:
            return 1

        return max(distribution.items(), key=lambda x: x[1])[0]

    def find_least_common_decile(self, distribution: Dict[int, int]) -> int:
        """
        Find the decile with the fewest wins.

        Args:
            distribution: Decile distribution

        Returns:
            Decile number with fewest wins
        """
        if not distribution:
            return 1

        return min(distribution.items(), key=lambda x: x[1])[0]

    def get_pattern_summary(self, game_count: int = 10) -> PatternAnalysis:
        """
        Generate a complete pattern analysis for the last N games.

        Args:
            game_count: Number of recent games to analyze

        Returns:
            PatternAnalysis object with complete statistics
        """
        # Fetch games from database
        games = self.db.get_games_for_pattern_analysis(game_count)

        if not games:
            # Return empty analysis if no games
            return PatternAnalysis(
                game_count=0,
                decile_distribution={i: 0 for i in range(1, 11)},
                decile_percentages={i: 0.0 for i in range(1, 11)},
                most_common_decile=1,
                least_common_decile=1
            )

        # Calculate distribution
        distribution = self.analyze_decile_distribution(games)

        # Calculate percentages
        percentages = self.calculate_decile_percentages(distribution, len(games))

        # Find extremes
        most_common = self.find_most_common_decile(distribution)
        least_common = self.find_least_common_decile(distribution)

        return PatternAnalysis(
            game_count=len(games),
            decile_distribution=distribution,
            decile_percentages=percentages,
            most_common_decile=most_common,
            least_common_decile=least_common
        )

    def compare_patterns(self) -> PatternComparison:
        """
        Compare patterns across different time windows.

        Returns:
            PatternComparison with analysis for 10, 30, and 50 games
        """
        pattern_10 = self.get_pattern_summary(10)
        pattern_30 = self.get_pattern_summary(30)
        pattern_50 = self.get_pattern_summary(50)

        return PatternComparison(
            last_10_games=pattern_10,
            last_30_games=pattern_30,
            last_50_games=pattern_50
        )

    def get_pattern_shift_analysis(self) -> Dict:
        """
        Analyze how patterns are shifting between time windows.

        Returns:
            Dictionary with shift analysis
        """
        comparison = self.compare_patterns()

        # Compare most common deciles across time windows
        shift = {
            'most_common_10': comparison.last_10_games.most_common_decile,
            'most_common_30': comparison.last_30_games.most_common_decile,
            'most_common_50': comparison.last_50_games.most_common_decile,
            'consistent': (
                comparison.last_10_games.most_common_decile ==
                comparison.last_30_games.most_common_decile ==
                comparison.last_50_games.most_common_decile
            ),
            'trend': self._determine_trend(comparison)
        }

        return shift

    def _determine_trend(self, comparison: PatternComparison) -> str:
        """
        Determine if there's a trend in the pattern shifts.

        Args:
            comparison: PatternComparison object

        Returns:
            String describing the trend
        """
        most_common_10 = comparison.last_10_games.most_common_decile
        most_common_30 = comparison.last_30_games.most_common_decile
        most_common_50 = comparison.last_50_games.most_common_decile

        if most_common_10 == most_common_30 == most_common_50:
            return "STABLE - Same hot decile across all time windows"
        elif most_common_10 == most_common_30:
            return "RECENT_SHIFT - Pattern changed in last 30 games"
        elif most_common_30 == most_common_50:
            return "NEW_TREND - New pattern emerging in last 10 games"
        else:
            return "VOLATILE - Pattern changing frequently"

    def get_decile_range_description(self, decile: int) -> str:
        """
        Get human-readable description of a decile range.

        Args:
            decile: Decile number (1-10)

        Returns:
            String description (e.g., "0-10% of pot")
        """
        ranges = {
            1: "0-10% of pot (Very Low)",
            2: "11-20% of pot (Low)",
            3: "21-30% of pot (Low-Medium)",
            4: "31-40% of pot (Medium-Low)",
            5: "41-50% of pot (Medium)",
            6: "51-60% of pot (Medium-High)",
            7: "61-70% of pot (High-Medium)",
            8: "71-80% of pot (High)",
            9: "81-90% of pot (Very High)",
            10: "91-100% of pot (Extreme High)"
        }
        return ranges.get(decile, "Unknown")

    def get_strategic_insight(self, game_count: int = 10) -> Dict:
        """
        Generate strategic insights based on pattern analysis.

        Args:
            game_count: Number of recent games to analyze

        Returns:
            Dictionary with strategic insights
        """
        pattern = self.get_pattern_summary(game_count)

        # Find hot and cold zones
        hot_deciles = [d for d, count in pattern.decile_distribution.items() if count >= (game_count * 0.15)]
        cold_deciles = [d for d, count in pattern.decile_distribution.items() if count == 0]

        insight = {
            'hot_zones': hot_deciles,
            'cold_zones': cold_deciles,
            'most_common_range': self.get_decile_range_description(pattern.most_common_decile),
            'least_common_range': self.get_decile_range_description(pattern.least_common_decile),
            'sample_size': pattern.game_count,
            'recommendation': self._generate_recommendation(pattern, hot_deciles, cold_deciles)
        }

        return insight

    def _generate_recommendation(self, pattern: PatternAnalysis, hot_deciles: List[int], cold_deciles: List[int]) -> str:
        """
        Generate a strategic recommendation based on pattern.

        Args:
            pattern: PatternAnalysis object
            hot_deciles: List of frequently winning deciles
            cold_deciles: List of rarely winning deciles

        Returns:
            Recommendation string
        """
        if pattern.game_count < 10:
            return "Insufficient data for reliable recommendations. Collect more historical games."

        if len(hot_deciles) == 1:
            hot_range = self.get_decile_range_description(hot_deciles[0])
            return f"Strong pattern detected: {hot_range} is winning frequently. Consider positioning bets in this range."
        elif len(hot_deciles) > 5:
            return "Pattern is widely distributed. No clear hot zone. Use standard probability-based betting."
        elif hot_deciles:
            ranges = ", ".join([self.get_decile_range_description(d) for d in hot_deciles[:3]])
            return f"Multiple hot zones detected: {ranges}. Spread bets across these ranges."
        else:
            return "Pattern appears random. Use bankroll management and expected value calculations."


# Test function
def test_analyzer():
    """Test the pattern analyzer."""
    try:
        from database import DatabaseManager

        db = DatabaseManager()
        analyzer = PatternAnalyzer(db)

        # Get pattern summary for last 10 games
        pattern = analyzer.get_pattern_summary(10)
        print(f"Pattern for last 10 games:")
        print(f"Distribution: {pattern.decile_distribution}")
        print(f"Percentages: {pattern.decile_percentages}")
        print(f"Most common: Decile {pattern.most_common_decile}")
        print(f"Least common: Decile {pattern.least_common_decile}")

        # Get strategic insight
        insight = analyzer.get_strategic_insight(10)
        print(f"\nStrategic Insight:")
        print(f"Hot zones: {insight['hot_zones']}")
        print(f"Cold zones: {insight['cold_zones']}")
        print(f"Recommendation: {insight['recommendation']}")

    except Exception as e:
        print(f"Error testing analyzer: {e}")


if __name__ == "__main__":
    test_analyzer()
