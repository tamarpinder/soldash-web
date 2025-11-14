"""
Web scraper for Solpot.com jackpot data.
Uses Playwright to scrape historical game data from the fairness page.
"""
import logging
from typing import List, Dict, Optional
from playwright.sync_api import sync_playwright, Page, Browser
from bs4 import BeautifulSoup
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SolpotScraper:
    """
    Web scraper for Solpot jackpot fairness page.

    Scrapes historical game data including game ID, pot value, winning ticket,
    winner username, and EOS block hash.
    """

    BASE_URL = "https://solpot.com/fairness/jackpot"
    LAMPORTS_PER_SOL = 1_000_000_000

    def __init__(self, headless: bool = True):
        """
        Initialize the scraper.

        Args:
            headless: Whether to run browser in headless mode
        """
        self.headless = headless
        self.browser: Optional[Browser] = None

    def _start_browser(self) -> Browser:
        """Start Playwright browser."""
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(headless=self.headless)
        return browser

    def _extract_game_data_from_row(self, row) -> Optional[Dict]:
        """
        Extract game data from a table row.

        Args:
            row: BeautifulSoup table row element

        Returns:
            Dictionary with game data or None if parsing fails
        """
        try:
            cells = row.find_all('td')
            if len(cells) < 5:
                return None

            # Extract data from cells
            game_id = int(cells[0].get_text(strip=True).replace('#', ''))
            game_value = float(cells[1].get_text(strip=True).replace(' SOL', ''))
            winning_ticket_str = cells[2].get_text(strip=True)
            winner = cells[3].get_text(strip=True)
            eos_block = cells[4].get_text(strip=True) if len(cells) > 4 else None

            # Parse winning ticket (might be formatted with commas)
            winning_ticket = int(winning_ticket_str.replace(',', ''))

            # Calculate percentile and decile
            game_value_lamports = int(game_value * self.LAMPORTS_PER_SOL)
            ticket_percentile = (winning_ticket / game_value_lamports) * 100 if game_value_lamports > 0 else 0

            # Determine decile (1-10)
            decile = min(10, max(1, int((ticket_percentile / 10) + 1))) if ticket_percentile < 100 else 10

            return {
                'game_id': game_id,
                'game_value': game_value,
                'winning_ticket': winning_ticket,
                'winner': winner,
                'eos_block': eos_block,
                'ticket_percentile': round(ticket_percentile, 2),
                'decile': decile
            }

        except (ValueError, IndexError, AttributeError) as e:
            logger.error(f"Error parsing row: {e}")
            return None

    def scrape_fairness_page(self, page_number: int = 1) -> List[Dict]:
        """
        Scrape a single page of the fairness table.

        Args:
            page_number: Page number to scrape (1-indexed)

        Returns:
            List of game dictionaries
        """
        games = []
        url = f"{self.BASE_URL}?page={page_number}" if page_number > 1 else self.BASE_URL

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    headless=self.headless,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080}
                )
                page = context.new_page()

                logger.info(f"Navigating to {url}")
                page.goto(url, wait_until='domcontentloaded', timeout=60000)

                # Wait a bit for dynamic content
                time.sleep(5)

                # Get page content
                content = page.content()

                # Close properly
                page.close()
                context.close()
                browser.close()

                # Parse with BeautifulSoup
                soup = BeautifulSoup(content, 'html.parser')
                table = soup.find('table')

                if not table:
                    logger.warning(f"No table found on page {page_number}")
                    return games

                # Find table body
                tbody = table.find('tbody')
                if not tbody:
                    logger.warning(f"No tbody found on page {page_number}")
                    return games

                # Extract rows
                rows = tbody.find_all('tr')
                logger.info(f"Found {len(rows)} rows on page {page_number}")

                for row in rows:
                    game_data = self._extract_game_data_from_row(row)
                    if game_data:
                        games.append(game_data)

        except Exception as e:
            logger.error(f"Error scraping page {page_number}: {e}")

        return games

    def scrape_multiple_pages(self, num_pages: int = 5) -> List[Dict]:
        """
        Scrape multiple pages of the fairness table.

        Args:
            num_pages: Number of pages to scrape

        Returns:
            Combined list of game dictionaries from all pages
        """
        all_games = []

        for page_num in range(1, num_pages + 1):
            logger.info(f"Scraping page {page_num}/{num_pages}")
            games = self.scrape_fairness_page(page_num)
            all_games.extend(games)

            # Be respectful with delays between pages
            if page_num < num_pages:
                time.sleep(2)

        logger.info(f"Total games scraped: {len(all_games)}")
        return all_games

    def scrape_last_n_games(self, n: int = 50) -> List[Dict]:
        """
        Scrape the last N games (each page has ~10 games).

        Args:
            n: Number of recent games to scrape

        Returns:
            List of game dictionaries
        """
        # Estimate pages needed (assuming 10 games per page)
        pages_needed = (n // 10) + 1
        all_games = self.scrape_multiple_pages(pages_needed)

        # Return only the first n games (most recent)
        return all_games[:n]


# Test function
def test_scraper():
    """Test the scraper with a single page."""
    scraper = SolpotScraper(headless=True)
    games = scraper.scrape_fairness_page(1)

    print(f"\nScraped {len(games)} games:")
    for game in games[:3]:  # Print first 3
        print(f"Game #{game['game_id']}: {game['game_value']} SOL, "
              f"Ticket {game['winning_ticket']}, "
              f"Percentile {game['ticket_percentile']}%, "
              f"Decile {game['decile']}, "
              f"Winner: {game['winner']}")


if __name__ == "__main__":
    test_scraper()
