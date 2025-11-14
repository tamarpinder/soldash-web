import { useState, useEffect, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js'
import toast, { Toaster } from 'react-hot-toast'
import { Flame, Lightbulb, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import apiService from './services/api'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import NotificationCenter from './components/NotificationCenter'
import DashboardView from './views/DashboardView'
import StrategyView from './views/StrategyView'
import HistoryView from './views/HistoryView'
import AnalyticsView from './views/AnalyticsView'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

// Mock data for pattern analysis
const mockPatterns = {
  last_10_games: {
    game_count: 10,
    decile_distribution: { 1: 1, 2: 0, 3: 2, 4: 1, 5: 1, 6: 3, 7: 1, 8: 1, 9: 0, 10: 0 },
    decile_percentages: { 1: 10, 2: 0, 3: 20, 4: 10, 5: 10, 6: 30, 7: 10, 8: 10, 9: 0, 10: 0 },
    most_common_decile: 6,
    least_common_decile: 2
  },
  last_30_games: {
    game_count: 30,
    decile_distribution: { 1: 2, 2: 3, 3: 4, 4: 3, 5: 4, 6: 6, 7: 3, 8: 3, 9: 1, 10: 1 },
    decile_percentages: { 1: 6.67, 2: 10, 3: 13.33, 4: 10, 5: 13.33, 6: 20, 7: 10, 8: 10, 9: 3.33, 10: 3.33 },
    most_common_decile: 6,
    least_common_decile: 10
  },
  last_50_games: {
    game_count: 50,
    decile_distribution: { 1: 4, 2: 5, 3: 6, 4: 5, 5: 7, 6: 9, 7: 5, 8: 5, 9: 2, 10: 2 },
    decile_percentages: { 1: 8, 2: 10, 3: 12, 4: 10, 5: 14, 6: 18, 7: 10, 8: 10, 9: 4, 10: 4 },
    most_common_decile: 6,
    least_common_decile: 10
  }
}

const mockGames = [
  { game_id: 159853, game_value: 0.826, winning_ticket: 537485032, winner: "TONYsadCTV", ticket_percentile: 65.04, decile: 7 },
  { game_id: 159852, game_value: 0.23, winning_ticket: 145238965, winner: "SpScam", ticket_percentile: 63.15, decile: 7 },
  { game_id: 159851, game_value: 0.637, winning_ticket: 421053987, winner: "BizyLosesSol", ticket_percentile: 66.09, decile: 7 },
  { game_id: 159850, game_value: 1.25, winning_ticket: 234567890, winner: "PlayerX", ticket_percentile: 18.77, decile: 2 },
  { game_id: 159849, game_value: 0.95, winning_ticket: 567890123, winner: "Winner123", ticket_percentile: 59.78, decile: 6 },
]

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [filter, setFilter] = useState(10)
  const [patterns, setPatterns] = useState(mockPatterns)
  const [games, setGames] = useState(mockGames)
  const [totalGamesInDB, setTotalGamesInDB] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [useMockData, setUseMockData] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)

  // Track previous values for notifications
  const prevHotDecileRef = useRef(null)
  const prevSuggestedEntryRef = useRef(null)
  const prevStabilityRef = useRef(null)
  const isInitialLoadRef = useRef(true)

  // Helper to add notification to history
  const addNotification = (message, type = 'info', icon = <Lightbulb className="w-4 h-4" />) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      icon,
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [notification, ...prev].slice(0, 50)) // Keep last 50

    // Show toast
    if (type === 'success') {
      toast.success(message)
    } else if (type === 'error') {
      toast.error(message)
    } else {
      toast(message, { icon })
    }
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Auto-mark notifications as read when notification center opens
  useEffect(() => {
    if (showNotificationCenter) {
      markAllAsRead()
    }
  }, [showNotificationCenter])

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch patterns comparison
      const { data: comparisonData, error: comparisonError } = await apiService.fetchComparison()

      // Fetch ALL games for history analysis (no limit)
      const { data: gamesData, error: gamesError } = await apiService.fetchGames(1000)

      // Fetch stats for total game count
      const { data: statsData, error: statsError } = await apiService.fetchStats()

      if (comparisonError || gamesError) {
        console.warn('API error, using mock data:', comparisonError || gamesError)
        setUseMockData(true)

        // Determine error type and provide actionable message
        const errorMessage = comparisonError?.message || gamesError?.message || ''
        if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
          setError('⚠️ Backend disconnected - Please restart the backend server (uvicorn main:app --reload)')
        } else if (errorMessage.includes('timeout')) {
          setError('⚠️ Backend timeout - Check if backend is running or restart it')
        } else {
          setError('⚠️ Backend error - Using demo data. Check backend logs or restart the server.')
        }
      } else if (comparisonData && gamesData) {
        // Check if we have real data (game_count > 0)
        const hasRealData = comparisonData.last_10_games && comparisonData.last_10_games.game_count > 0

        if (hasRealData) {
          setPatterns(comparisonData)
          setUseMockData(false)
          setError(null)

          // Update total games from stats
          if (statsData && statsData.database && statsData.database.total_games) {
            setTotalGamesInDB(statsData.database.total_games)
          }

          // Update games if we have real data (API returns array directly)
          if (Array.isArray(gamesData) && gamesData.length > 0) {
            setGames(gamesData) // Store all games for history analysis
          }
        } else {
          setUseMockData(true)
          setError('ℹ️ No data in database yet - using demo data. Use Chrome Extension to collect games.')
        }
      } else {
        setUseMockData(true)
        setError('⚠️ Backend not responding - Please restart the backend server')
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setUseMockData(true)

      // Provide specific error message based on error type
      if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        setError('⚠️ Cannot connect to backend - Restart backend: cd Backend && ./venv/bin/uvicorn main:app --reload')
      } else if (err.message?.includes('timeout')) {
        setError('⚠️ Backend timeout - Server may be overloaded or crashed. Please restart.')
      } else {
        setError(`⚠️ Backend error: ${err.message || 'Unknown error'} - Try restarting the backend.`)
      }

      if (!isInitialLoadRef.current) {
        addNotification('Backend connection failed - restart required', 'error', <XCircle className="w-4 h-4" />)
      }
    } finally {
      setLoading(false)
      isInitialLoadRef.current = false
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const selectedPattern = filter === 10 ? patterns.last_10_games :
                          filter === 30 ? patterns.last_30_games :
                          patterns.last_50_games

  // Monitor hot decile changes
  useEffect(() => {
    if (!selectedPattern || loading || useMockData) return

    const currentHotDecile = selectedPattern.most_common_decile

    if (prevHotDecileRef.current !== null && prevHotDecileRef.current !== currentHotDecile) {
      addNotification('Hot decile changed: D' + prevHotDecileRef.current + ' → D' + currentHotDecile, 'info', <Flame className="w-4 h-4" />)
    }

    prevHotDecileRef.current = currentHotDecile
  }, [selectedPattern?.most_common_decile, loading, useMockData])

  // Monitor suggested entry changes
  useEffect(() => {
    if (!selectedPattern || loading || useMockData) return

    const getHottestDecile = () => {
      const entries = Object.entries(selectedPattern.decile_percentages)
      entries.sort((a, b) => b[1] - a[1])
      return parseInt(entries[0][0])
    }

    const hottestDecile = getHottestDecile()
    const suggestedEntry = hottestDecile * 10 - 5

    if (prevSuggestedEntryRef.current !== null && prevSuggestedEntryRef.current !== suggestedEntry) {
      addNotification('Suggested entry updated: ' + prevSuggestedEntryRef.current + '% → ' + suggestedEntry + '%', 'info', <Lightbulb className="w-4 h-4" />)
    }

    prevSuggestedEntryRef.current = suggestedEntry
  }, [selectedPattern, loading, useMockData])

  // Monitor pattern stability
  useEffect(() => {
    if (!patterns.last_10_games || !patterns.last_30_games || !patterns.last_50_games || loading || useMockData) return

    const top10 = patterns.last_10_games.most_common_decile
    const top30 = patterns.last_30_games.most_common_decile
    const top50 = patterns.last_50_games.most_common_decile

    const isStable = top10 === top30 && top30 === top50
    const isSemiStable = top10 === top30 || top30 === top50 || top10 === top50

    const currentStability = isStable ? 'stable' : isSemiStable ? 'semi-stable' : 'unstable'

    if (prevStabilityRef.current !== null && prevStabilityRef.current !== currentStability) {
      if (currentStability === 'unstable') {
        addNotification('Pattern stability decreased - High volatility detected', 'error', <AlertTriangle className="w-4 h-4" />)
      } else if (currentStability === 'stable' && prevStabilityRef.current === 'semi-stable') {
        addNotification('Pattern stabilized - Consistent trend detected', 'success', <CheckCircle className="w-4 h-4" />)
      } else if (currentStability === 'semi-stable' && prevStabilityRef.current === 'unstable') {
        addNotification('Pattern becoming more stable', 'info', <AlertTriangle className="w-4 h-4" />)
      }
    }

    prevStabilityRef.current = currentStability
  }, [patterns, loading, useMockData])

  // Calculate stats for Header based on selected filter
  const stats = {
    totalGames: selectedPattern?.game_count || 0,
    hotDecile: selectedPattern?.most_common_decile || '-',
    winRate: selectedPattern?.decile_percentages[selectedPattern?.most_common_decile] || 0
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            filter={filter}
            setFilter={setFilter}
            patterns={patterns}
            selectedPattern={selectedPattern}
          />
        )
      case 'strategy':
        return <StrategyView pattern={selectedPattern} />
      case 'history':
        return <HistoryView games={games} />
      case 'analytics':
        return <AnalyticsView patterns={patterns} />
      default:
        return (
          <DashboardView
            filter={filter}
            setFilter={setFilter}
            patterns={patterns}
            selectedPattern={selectedPattern}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} totalGames={totalGamesInDB} />

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <Header
          stats={stats}
          onRefresh={fetchData}
          loading={loading}
          notificationCount={notifications.filter(n => !n.read).length}
          onNotificationClick={() => setShowNotificationCenter(!showNotificationCenter)}
        />

        {/* Status Banner */}
        {error && (
          <div className="mx-8 mt-4">
            <div className={`px-4 py-2 rounded text-sm ${useMockData ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700' : 'bg-green-900/30 text-green-300 border border-green-700'}`}>
              {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="mx-8 mt-4">
            <div className="px-4 py-2 rounded text-sm bg-blue-900/30 text-blue-300 border border-blue-700">
              Loading data...
            </div>
          </div>
        )}

        {/* View Content */}
        <div className="p-8">
          {renderView()}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 text-center text-gray-500 text-sm">
          <p>SolDash v1.0.0 | Backend API: {import.meta.env.VITE_API_URL || 'http://localhost:8001'}</p>
          <p>{useMockData ? 'Using demo data - Add data to Supabase to see real patterns' : 'Connected to backend - Displaying real data'}</p>
        </div>
      </div>

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setShowNotificationCenter(false)}
          onMarkAllAsRead={markAllAsRead}
        />
      )}

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  )
}

export default App
