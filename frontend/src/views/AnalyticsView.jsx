import { Line } from 'react-chartjs-2'
import { BarChart3, Flame, Snowflake, TrendingUp, Target, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { getDecileTiming } from '../utils/decileUtils'

function DecileBreakdown({ patterns }) {
  const pattern = patterns.last_50_games

  const getDecileStats = () => {
    const stats = []
    for (let i = 1; i <= 10; i++) {
      const wins = pattern.decile_distribution[i] || 0
      const percentage = pattern.decile_percentages[i] || 0
      const range = `${(i - 1) * 10}-${i * 10}%`
      stats.push({ decile: i, wins, percentage, range })
    }
    return stats.sort((a, b) => b.wins - a.wins)
  }

  const stats = getDecileStats()

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 text-indigo-300 flex items-center gap-2">
        <BarChart3 className="w-5 h-5" /> Complete Decile Breakdown
      </h3>
      <p className="text-sm text-gray-400 mb-4">Based on last 50 games</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="py-2 px-3 text-left">Rank</th>
              <th className="py-2 px-3 text-left">Decile</th>
              <th className="py-2 px-3 text-left">Timing</th>
              <th className="py-2 px-3 text-left">Range</th>
              <th className="py-2 px-3 text-right">Wins</th>
              <th className="py-2 px-3 text-right">Win Rate</th>
              <th className="py-2 px-3 text-left">Performance</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => {
              const isHot = idx < 3
              const isCold = idx >= 7
              return (
                <tr key={stat.decile} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-2 px-3 text-gray-400">#{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold">{stat.decile}</td>
                  <td className="py-2 px-3 text-gray-400 text-sm">{getDecileTiming(stat.decile)}</td>
                  <td className="py-2 px-3 text-gray-400">{stat.range}</td>
                  <td className="py-2 px-3 text-right font-bold">{stat.wins}</td>
                  <td className="py-2 px-3 text-right font-bold text-blue-400">{stat.percentage.toFixed(1)}%</td>
                  <td className="py-2 px-3">
                    {isHot && <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded flex items-center gap-1 w-fit"><Flame className="w-3 h-3" /> Hot</span>}
                    {isCold && <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded flex items-center gap-1 w-fit"><Snowflake className="w-3 h-3" /> Cold</span>}
                    {!isHot && !isCold && <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">Average</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrendComparison({ patterns }) {
  const deciles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const data = {
    labels: deciles.map(d => `D${d}`),
    datasets: [
      {
        label: 'Last 10 Games',
        data: deciles.map(d => patterns.last_10_games.decile_percentages[d] || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      },
      {
        label: 'Last 30 Games',
        data: deciles.map(d => patterns.last_30_games.decile_percentages[d] || 0),
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        tension: 0.4
      },
      {
        label: 'Last 50 Games',
        data: deciles.map(d => patterns.last_50_games.decile_percentages[d] || 0),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#9ca3af' }
      },
      title: {
        display: true,
        text: 'Pattern Evolution Across Time Windows',
        color: '#fff',
        font: { size: 16 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 30,
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
        title: {
          display: true,
          text: 'Win Rate (%)',
          color: '#9ca3af'
        }
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' },
        title: {
          display: true,
          text: 'Decile',
          color: '#9ca3af'
        }
      }
    }
  }

  return (
    <div className="card">
      <Line data={data} options={options} />
      <div className="mt-4 p-3 bg-gray-800/50 rounded text-xs text-gray-400">
        <p>This chart shows how win rates change across different time windows. Look for consistent patterns or sudden shifts.</p>
      </div>
    </div>
  )
}

function StatisticalMetrics({ patterns }) {
  const calculateMetrics = (pattern) => {
    const percentages = Object.values(pattern.decile_percentages)
    const mean = percentages.reduce((a, b) => a + b, 0) / percentages.length
    const variance = percentages.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / percentages.length
    const stdDev = Math.sqrt(variance)

    // Consistency score (lower std dev = more consistent/predictable)
    const consistencyScore = Math.max(0, 100 - (stdDev * 10))

    return { mean, stdDev, consistencyScore }
  }

  const metrics10 = calculateMetrics(patterns.last_10_games)
  const metrics30 = calculateMetrics(patterns.last_30_games)
  const metrics50 = calculateMetrics(patterns.last_50_games)

  return (
    <div className="card bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700">
      <h3 className="text-xl font-bold mb-4 text-purple-300 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" /> Statistical Metrics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last 10 Games */}
        <div className="p-4 bg-gray-800/50 rounded border border-red-700/30">
          <h4 className="text-sm font-semibold text-red-400 mb-3">Last 10 Games</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Std Deviation</p>
              <p className="text-lg font-bold text-red-400">{metrics10.stdDev.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consistency Score</p>
              <p className="text-lg font-bold text-red-400">{metrics10.consistencyScore.toFixed(0)}/100</p>
            </div>
          </div>
        </div>

        {/* Last 30 Games */}
        <div className="p-4 bg-gray-800/50 rounded border border-yellow-700/30">
          <h4 className="text-sm font-semibold text-yellow-400 mb-3">Last 30 Games</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Std Deviation</p>
              <p className="text-lg font-bold text-yellow-400">{metrics30.stdDev.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consistency Score</p>
              <p className="text-lg font-bold text-yellow-400">{metrics30.consistencyScore.toFixed(0)}/100</p>
            </div>
          </div>
        </div>

        {/* Last 50 Games */}
        <div className="p-4 bg-gray-800/50 rounded border border-blue-700/30">
          <h4 className="text-sm font-semibold text-blue-400 mb-3">Last 50 Games</h4>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Std Deviation</p>
              <p className="text-lg font-bold text-blue-400">{metrics50.stdDev.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consistency Score</p>
              <p className="text-lg font-bold text-blue-400">{metrics50.consistencyScore.toFixed(0)}/100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-900/20 border border-purple-700 rounded text-xs">
        <p className="text-purple-300">
          <strong>Consistency Score:</strong> Higher scores indicate more predictable patterns. Lower standard deviation means wins are more evenly distributed across deciles.
        </p>
      </div>
    </div>
  )
}

function PatternStability({ patterns }) {
  // Compare top decile across time windows
  const top10 = patterns.last_10_games.most_common_decile
  const top30 = patterns.last_30_games.most_common_decile
  const top50 = patterns.last_50_games.most_common_decile

  const isStable = top10 === top30 && top30 === top50
  const isSemiStable = top10 === top30 || top30 === top50 || top10 === top50

  return (
    <div className="card bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-700">
      <h3 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-2">
        <Target className="w-5 h-5" /> Pattern Stability Analysis
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center p-4 bg-gray-800/50 rounded">
          <p className="text-sm text-gray-400 mb-2">Last 10 Games</p>
          <p className="text-3xl font-bold text-red-400">D{top10}</p>
          <p className="text-xs text-gray-500 mt-1">{getDecileTiming(top10)}</p>
        </div>
        <div className="text-center p-4 bg-gray-800/50 rounded">
          <p className="text-sm text-gray-400 mb-2">Last 30 Games</p>
          <p className="text-3xl font-bold text-yellow-400">D{top30}</p>
          <p className="text-xs text-gray-500 mt-1">{getDecileTiming(top30)}</p>
        </div>
        <div className="text-center p-4 bg-gray-800/50 rounded">
          <p className="text-sm text-gray-400 mb-2">Last 50 Games</p>
          <p className="text-3xl font-bold text-blue-400">D{top50}</p>
          <p className="text-xs text-gray-500 mt-1">{getDecileTiming(top50)}</p>
        </div>
      </div>

      <div className={`p-4 rounded border ${
        isStable
          ? 'bg-green-900/20 border-green-700'
          : isSemiStable
          ? 'bg-yellow-900/20 border-yellow-700'
          : 'bg-red-900/20 border-red-700'
      }`}>
        <p className={`font-bold mb-2 flex items-center gap-2 ${
          isStable ? 'text-green-400' : isSemiStable ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {isStable ? <><CheckCircle className="w-5 h-5" /> Stable Pattern</> : isSemiStable ? <><AlertTriangle className="w-5 h-5" /> Semi-Stable Pattern</> : <><XCircle className="w-5 h-5" /> Unstable Pattern</>}
        </p>
        <p className="text-sm text-gray-300">
          {isStable
            ? `Decile ${top50} is consistently the hottest across all time windows. High confidence in this pattern.`
            : isSemiStable
            ? 'The hottest decile varies across time windows. Pattern is shifting - consider using longer time windows for stability.'
            : 'Significant variation in hottest decile across time windows. Patterns are highly volatile - proceed with caution.'}
        </p>
      </div>
    </div>
  )
}

function AnalyticsView({ patterns }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Advanced Analytics</h2>
        <p className="text-gray-400 text-sm">Deep statistical analysis and pattern insights</p>
      </div>

      {/* Pattern Stability */}
      <PatternStability patterns={patterns} />

      {/* Trend Comparison */}
      <TrendComparison patterns={patterns} />

      {/* Statistical Metrics */}
      <StatisticalMetrics patterns={patterns} />

      {/* Decile Breakdown */}
      <DecileBreakdown patterns={patterns} />

      {/* Disclaimer */}
      <div className="card bg-orange-900/20 border-orange-700">
        <p className="text-sm text-orange-300 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Important:</strong> All analytics are based on historical data and do not predict future outcomes. Each Solpot game uses cryptographically secure randomness. Use these insights to inform strategy, not as guarantees.
          </span>
        </p>
      </div>
    </div>
  )
}

export default AnalyticsView
