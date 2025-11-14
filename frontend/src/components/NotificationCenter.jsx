import { Bell } from 'lucide-react'

function NotificationCenter({ notifications, onClose, onMarkAllAsRead }) {
  const unreadCount = notifications.filter(n => !n.read).length

  const formatTime = (timestamp) => {
    const now = new Date()
    const diff = Math.floor((now - timestamp) / 1000) // seconds

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`

    // Show time for today
    if (now.toDateString() === timestamp.toDateString()) {
      return timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    // Show date for older
    return timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getTypeStyles = (type, read) => {
    const baseStyle = read ? 'opacity-60' : ''
    switch (type) {
      case 'success':
        return `border-l-4 border-green-500 bg-green-900/10 ${baseStyle}`
      case 'error':
        return `border-l-4 border-red-500 bg-red-900/10 ${baseStyle}`
      default:
        return `border-l-4 border-blue-500 bg-blue-900/10 ${baseStyle}`
    }
  }

  return (
    <div className="fixed top-0 right-0 h-screen w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Bell className="w-12 h-12 mb-2" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded ${getTypeStyles(notification.type, notification.read)} relative`}
              >
                {!notification.read && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-xl">{notification.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 break-words">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(notification.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
