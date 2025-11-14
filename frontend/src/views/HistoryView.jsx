import { useState, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { Award, Trophy, TrendingUp, DollarSign, Hash, ChevronDown, ChevronUp, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { getDecileTiming } from '../utils/decileUtils'

function TopWinners({ games }) {
  const topWinners = useMemo(() => {
    const winnerStats = {}

    games.forEach(game => {
      if (!winnerStats[game.winner]) {
        winnerStats[game.winner] = {
          username: game.winner,
          totalWinnings: 0,
          wins: 0,
          decileBreakdown: {}
        }
      }
      winnerStats[game.winner].totalWinnings += game.game_value
      winnerStats[game.winner].wins += 1
      winnerStats[game.winner].decileBreakdown[game.decile] = (winnerStats[game.winner].decileBreakdown[game.decile] || 0) + 1
    })

    return Object.values(winnerStats)
      .sort((a, b) => b.totalWinnings - a.totalWinnings)
      .slice(0, 3) // Show only top 3 winners
  }, [games])

  const getMedalIcon = (index) => {
    if (index === 0) return <Award className="w-6 h-6 text-yellow-400" /> // Gold
    if (index === 1) return <Award className="w-6 h-6 text-gray-400" /> // Silver
    if (index === 2) return <Award className="w-6 h-6 text-orange-600" /> // Bronze
  }

  const getMostCommonDecile = (decileBreakdown) => {
    const entries = Object.entries(decileBreakdown)
    if (entries.length === 0) return '-'
    entries.sort((a, b) => b[1] - a[1])
    return entries[0][0]
  }

  return (
    <div className="card bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-700/50">
      <h3 className="text-xl font-bold mb-4 text-yellow-300 flex items-center gap-2">
        <Trophy className="w-6 h-6" /> Top 3 Winners
      </h3>

      <div className="space-y-3">
        {topWinners.map((winner, idx) => (
          <div key={winner.username} className={`p-4 rounded border ${
            idx === 0 ? 'bg-yellow-900/30 border-yellow-600' :
            idx === 1 ? 'bg-gray-800/50 border-gray-600' :
            'bg-orange-900/30 border-orange-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getMedalIcon(idx)}
                <div>
                  <p className="font-bold text-white">{winner.username}</p>
                  <p className="text-xs text-gray-400">{winner.wins} win{winner.wins !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-green-400">{winner.totalWinnings.toFixed(3)} SOL</p>
                <p className="text-xs text-gray-500">
                  Avg: {(winner.totalWinnings / winner.wins).toFixed(3)} SOL
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-xs text-gray-400">
                Favorite Decile: <span className="text-yellow-400 font-semibold">D{getMostCommonDecile(winner.decileBreakdown)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickStats({ games }) {
  const stats = useMemo(() => {
    const totalGames = games.length
    const totalSOL = games.reduce((sum, game) => sum + game.game_value, 0)
    const avgValue = totalSOL / totalGames
    const biggestWin = Math.max(...games.map(g => g.game_value))

    return { totalGames, totalSOL, avgValue, biggestWin }
  }, [games])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card bg-blue-900/20 border-blue-700">
        <div className="flex items-center gap-3">
          <Hash className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.totalGames}</p>
            <p className="text-xs text-gray-500">Total Games</p>
          </div>
        </div>
      </div>

      <div className="card bg-green-900/20 border-green-700">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-400" />
          <div>
            <p className="text-2xl font-bold text-green-400">{stats.totalSOL.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total SOL Distributed</p>
          </div>
        </div>
      </div>

      <div className="card bg-yellow-900/20 border-yellow-700">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-yellow-400" />
          <div>
            <p className="text-2xl font-bold text-yellow-400">{stats.avgValue.toFixed(3)}</p>
            <p className="text-xs text-gray-500">Avg Game Value</p>
          </div>
        </div>
      </div>

      <div className="card bg-purple-900/20 border-purple-700">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-purple-400" />
          <div>
            <p className="text-2xl font-bold text-purple-400">{stats.biggestWin.toFixed(3)}</p>
            <p className="text-xs text-gray-500">Biggest Win</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function WinTimeline({ games }) {
  const timelineData = useMemo(() => {
    // Group by game ID ranges for visualization
    const bins = 10
    const sortedGames = [...games].sort((a, b) => a.game_id - b.game_id)
    const minId = Math.min(...games.map(g => g.game_id))
    const maxId = Math.max(...games.map(g => g.game_id))
    const binSize = Math.ceil((maxId - minId + 1) / bins)

    const binData = Array(bins).fill(0)
    const binLabels = []

    for (let i = 0; i < bins; i++) {
      const start = minId + (i * binSize)
      const end = start + binSize - 1
      binLabels.push(`#${start}-${end}`)
    }

    sortedGames.forEach(game => {
      const binIndex = Math.min(Math.floor((game.game_id - minId) / binSize), bins - 1)
      binData[binIndex]++
    })

    return { labels: binLabels, data: binData }
  }, [games])

  const chartData = {
    labels: timelineData.labels,
    datasets: [{
      label: 'Games',
      data: timelineData.data,
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
      x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
        <TrendingUp className="w-5 h-5" /> Win Distribution Timeline
      </h3>
      <Bar data={chartData} options={options} />
    </div>
  )
}

function HistoryView({ games }) {
  const [filter, setFilter] = useState(10) // Last 10, 30, 50, or 'all'
  const [searchTerm, setSearchTerm] = useState('')
  const [decileFilter, setDecileFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [expandedRow, setExpandedRow] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const ITEMS_PER_PAGE = 10

  // Filter games based on selected filter (Last 10, 30, 50, or All)
  const baseFilteredGames = useMemo(() => {
    if (filter === 'all') return games
    // Sort by most recent and take the specified number
    const sorted = [...games].sort((a, b) => b.game_id - a.game_id)
    return sorted.slice(0, filter)
  }, [games, filter])

  const getDecileColor = (decile) => {
    if (decile <= 3) return 'text-blue-400'
    if (decile <= 6) return 'text-green-400'
    if (decile <= 9) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getEntryTiming = (percentile) => {
    if (percentile < 10) return 'Very Early Entry'
    if (percentile < 30) return 'Early Entry'
    if (percentile < 50) return 'Mid-Early Entry'
    if (percentile < 70) return 'Mid-Late Entry'
    if (percentile < 90) return 'Late Entry'
    return 'Very Late Entry'
  }

  const filteredGames = useMemo(() => {
    let filtered = baseFilteredGames.filter(game =>
      game.winner.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (decileFilter !== 'all') {
      const decile = parseInt(decileFilter)
      filtered = filtered.filter(game => game.decile === decile)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'recent') return b.game_id - a.game_id
      if (sortBy === 'oldest') return a.game_id - b.game_id
      if (sortBy === 'highest') return b.game_value - a.game_value
      if (sortBy === 'lowest') return a.game_value - b.game_value
      return 0
    })

    return filtered
  }, [baseFilteredGames, searchTerm, decileFilter, sortBy])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [filter, searchTerm, decileFilter, sortBy])

  // Pagination calculations
  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedGames = filteredGames.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Game History</h2>
        <p className="text-gray-400 text-sm">Recent winning tickets and entry patterns</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter(10)}
          className={`px-4 py-2 rounded transition ${
            filter === 10
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Last 10 Games
        </button>
        <button
          onClick={() => setFilter(30)}
          className={`px-4 py-2 rounded transition ${
            filter === 30
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Last 30 Games
        </button>
        <button
          onClick={() => setFilter(50)}
          className={`px-4 py-2 rounded transition ${
            filter === 50
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Last 50 Games
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          All Games ({games.length})
        </button>
      </div>

      {/* Quick Stats */}
      <QuickStats games={baseFilteredGames} />

      {/* Top Winners and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopWinners games={baseFilteredGames} />
        <WinTimeline games={baseFilteredGames} />
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by winner username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={decileFilter}
              onChange={(e) => setDecileFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Deciles</option>
              {[1,2,3,4,5,6,7,8,9,10].map(d => (
                <option key={d} value={d}>Decile {d}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Value</option>
              <option value="lowest">Lowest Value</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredGames.length)} of {filteredGames.length} games
          {filteredGames.length < baseFilteredGames.length && ` (filtered from ${baseFilteredGames.length})`}
          {filter !== 'all' && ` • Viewing last ${filter} games from ${games.length} total`}
        </p>
      </div>

      {/* Games Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="py-3 px-4 w-12"></th>
                <th className="py-3 px-4">Game ID</th>
                <th className="py-3 px-4">Final Pot</th>
                <th className="py-3 px-4">Winner Entered At</th>
                <th className="py-3 px-4">Entry Timing</th>
                <th className="py-3 px-4">Decile</th>
                <th className="py-3 px-4">Winner</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGames.map((game) => {
                const enteredAt = (game.game_value * (game.ticket_percentile / 100)).toFixed(3)
                const isExpanded = expandedRow === game.game_id

                return (
                  <>
                    <tr
                      key={game.game_id}
                      className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : game.game_id)}
                    >
                      <td className="py-3 px-4">
                        {isExpanded ?
                          <ChevronUp className="w-4 h-4 text-gray-400" /> :
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        }
                      </td>
                      <td className="py-3 px-4">#{game.game_id}</td>
                      <td className="py-3 px-4">{game.game_value.toFixed(3)} SOL</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">{enteredAt} SOL</div>
                        <div className="text-xs text-gray-500">({game.ticket_percentile.toFixed(1)}%)</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {getEntryTiming(game.ticket_percentile)}
                      </td>
                      <td className={`py-3 px-4 ${getDecileColor(game.decile)}`}>
                        <div className="font-bold">D{game.decile}</div>
                        <div className="text-xs text-gray-500">{getDecileTiming(game.decile)}</div>
                      </td>
                      <td className="py-3 px-4">{game.winner}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-800 bg-gray-800/50">
                        <td colSpan="7" className="py-4 px-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-gray-900/50 rounded">
                              <p className="text-xs text-gray-500 mb-1">Winning Ticket</p>
                              <p className="font-mono text-white">{game.winning_ticket}</p>
                            </div>
                            <div className="p-3 bg-gray-900/50 rounded">
                              <p className="text-xs text-gray-500 mb-1">Percentile Position</p>
                              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${game.ticket_percentile}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{game.ticket_percentile.toFixed(2)}% of pot</p>
                            </div>
                            <div className="p-3 bg-gray-900/50 rounded">
                              <p className="text-xs text-gray-500 mb-1">Decile Range</p>
                              <p className="text-white">
                                {((game.decile - 1) * 10)}% - {game.decile * 10}%
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{getDecileTiming(game.decile)}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, idx) => {
                  const pageNum = idx + 1
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded border transition ${
                          currentPage === pageNum
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-gray-800/50 rounded text-sm">
          <p className="text-gray-300 mb-2">
            <strong>How to read this:</strong> "Winner Entered At" shows when the winner bought their ticket.
          </p>
          <p className="text-gray-400 text-xs">
            Example: If final pot = 1.0 SOL and winner entered at 0.5 SOL (50%), they were in Decile 5.
            This means they entered mid-game when the pot was half full.
          </p>
        </div>
      </div>
    </div>
  )
}

export default HistoryView
