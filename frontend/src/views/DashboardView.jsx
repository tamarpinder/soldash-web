import { Bar } from 'react-chartjs-2'
import { Lightbulb, BarChart3 } from 'lucide-react'
import { getDecileTiming, getDecileLabel } from '../utils/decileUtils'

function PatternChart({ pattern, title }) {
  const data = {
    labels: ['0-10%', '11-20%', '21-30%', '31-40%', '41-50%', '51-60%', '61-70%', '71-80%', '81-90%', '91-100%'],
    datasets: [{
      label: 'Wins in Decile',
      data: Object.values(pattern.decile_distribution),
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, color: '#fff' }
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
      x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
    }
  }

  return (
    <div className="card">
      <Bar data={data} options={options} />
      <div className="mt-4 text-sm text-gray-400">
        <p>Most Common: <span className="font-semibold text-white">D{pattern.most_common_decile} - {getDecileTiming(pattern.most_common_decile)}</span> ({pattern.decile_percentages[pattern.most_common_decile]}%)</p>
        <p>Sample Size: {pattern.game_count} games</p>
      </div>
    </div>
  )
}

function PatternComparison({ patterns }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PatternChart pattern={patterns.last_10_games} title="Last 10 Games" />
      <PatternChart pattern={patterns.last_30_games} title="Last 30 Games" />
      <PatternChart pattern={patterns.last_50_games} title="Last 50 Games" />
    </div>
  )
}

function FilterSelector({ selected, onChange }) {
  const filters = [10, 30, 50]
  return (
    <div className="flex gap-2">
      {filters.map(f => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-4 py-2 rounded font-semibold transition ${
            selected === f ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Last {f}
        </button>
      ))}
    </div>
  )
}

function SuggestEntry({ pattern }) {
  // Get hottest decile
  const getHottestDecile = () => {
    const entries = Object.entries(pattern.decile_percentages)
    entries.sort((a, b) => b[1] - a[1])
    return parseInt(entries[0][0])
  }

  const getDecileRange = (decile) => {
    const start = (parseInt(decile) - 1) * 10
    const end = parseInt(decile) * 10
    return `${start}-${end}%`
  }

  const hottestDecile = getHottestDecile()
  const suggestedTiming = hottestDecile * 10 - 5 // Middle of the decile range
  const winCount = pattern.decile_distribution[hottestDecile] || 0
  const winRate = pattern.decile_percentages[hottestDecile] || 0
  const range = getDecileRange(hottestDecile)

  return (
    <div className="card bg-gradient-to-r from-green-900/30 via-emerald-900/30 to-teal-900/30 border-green-600">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-green-300 mb-1 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" /> Suggested Entry
          </h3>
          <p className="text-xs text-gray-400">Based on last {pattern.game_count} games</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-green-400">{suggestedTiming}%</div>
          <p className="text-xs text-gray-400">of final pot</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-green-800/50 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-green-400">D{hottestDecile} - {getDecileTiming(hottestDecile)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{range} • Hottest decile</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-green-400">{winCount} wins ({winRate.toFixed(1)}%)</p>
          <p className="text-xs text-gray-500 mt-1">Win rate</p>
        </div>
      </div>
    </div>
  )
}

function DashboardView({ filter, setFilter, patterns, selectedPattern }) {
  return (
    <div className="space-y-6">
      {/* Filter Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Winning Ticket Position Patterns</h2>
        <FilterSelector selected={filter} onChange={setFilter} />
      </div>

      {/* Suggest Entry */}
      <SuggestEntry pattern={selectedPattern} />

      {/* Main Pattern Display */}
      <PatternChart pattern={selectedPattern} title={`Pattern Analysis - Last ${filter} Games`} />

      {/* Pattern Comparison */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Compare Across Time Windows</h2>
        <PatternComparison patterns={patterns} />
      </div>

      {/* Info */}
      <div className="card bg-blue-900/20 border-blue-700">
        <h3 className="text-lg font-semibold mb-2 text-blue-300 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> About Pattern Analysis
        </h3>
        <p className="text-sm text-gray-300">
          This dashboard analyzes historical winning ticket positions from Solpot jackpot games.
          Tickets are divided into deciles (10% ranges) based on their position in the pot.
          The analysis shows which positions win most frequently over different time windows.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          <strong>Note:</strong> This is analysis of past data, not prediction of future outcomes.
          Each game uses cryptographically secure randomness.
        </p>
      </div>
    </div>
  )
}

export default DashboardView
