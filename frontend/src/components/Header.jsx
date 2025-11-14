import { Bell, RefreshCw } from 'lucide-react'
import { getDecileTiming } from '../utils/decileUtils'

function Header({ stats, onRefresh, loading, notificationCount, onNotificationClick }) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-8 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Welcome back</h2>
          <p className="text-sm text-gray-400">Here's your Solpot analysis overview</p>
        </div>

        <div className="flex gap-6 items-center">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{stats?.totalGames || 0}</p>
            <p className="text-xs text-gray-500">Total Games</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">D{stats?.hotDecile || '-'}</p>
            <p className="text-xs text-gray-500">{stats?.hotDecile ? getDecileTiming(stats.hotDecile) : 'Hot Decile'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats?.winRate || '0'}%</p>
            <p className="text-xs text-gray-500">Top Decile Rate</p>
          </div>

          {/* Notification Bell */}
          <button
            onClick={onNotificationClick}
            className="relative text-gray-400 hover:text-white transition"
            title="Notifications"
          >
            <Bell className="w-6 h-6" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`transition ${
              loading
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Refresh data"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Header
