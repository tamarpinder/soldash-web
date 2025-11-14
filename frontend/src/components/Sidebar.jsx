import { useState } from 'react'

import { BarChart3, Target, ScrollText, TrendingUp } from 'lucide-react'

function Sidebar({ currentView, onViewChange, totalGames }) {
  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'strategy', icon: Target, label: 'Strategy' },
    { id: 'history', icon: ScrollText, label: 'History' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' }
  ]

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          SOLDASH
        </h1>
        <p className="text-xs text-gray-500 mt-1">Solpot Analytics</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                currentView === item.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          <p>v1.0.0</p>
          <p className="mt-1">{totalGames || 0} games analyzed</p>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
