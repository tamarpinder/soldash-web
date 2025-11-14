import { useState } from 'react'
import { Target, Flame, Snowflake, Lightbulb, DollarSign, BarChart3, AlertTriangle, Award } from 'lucide-react'
import { getDecileTiming } from '../utils/decileUtils'

function StrategyInsights({ pattern }) {
  const getMostCommon = () => {
    const entries = Object.entries(pattern.decile_percentages)
    entries.sort((a, b) => b[1] - a[1])
    return entries.slice(0, 3)
  }

  const getLeastCommon = () => {
    const entries = Object.entries(pattern.decile_percentages)
    entries.sort((a, b) => a[1] - b[1])
    return entries.slice(0, 3)
  }

  const getDecileRange = (decile) => {
    const start = (parseInt(decile) - 1) * 10
    const end = parseInt(decile) * 10
    return `${start}-${end}%`
  }

  const getWinCount = (decile) => {
    return pattern.decile_distribution[decile] || 0
  }

  const getTimingRecommendation = (decile) => {
    if (decile <= 3) return 'Enter very early (0-30% of final pot)'
    if (decile <= 6) return 'Enter mid-game (30-60% of final pot)'
    return 'Enter late (60-100% of final pot)'
  }

  const hotDeciles = getMostCommon()
  const coldDeciles = getLeastCommon()

  return (
    <div className="card bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-700">
      <h3 className="text-xl font-bold mb-4 text-purple-300 flex items-center gap-2">
        <Target className="w-5 h-5" /> Strategic Insights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Hot Deciles */}
        <div className="p-4 bg-green-900/20 border border-green-700 rounded">
          <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4" /> Hot Deciles (Most Wins)
          </h4>
          <div className="space-y-2">
            {hotDeciles.map(([decile, pct], idx) => {
              const winCount = getWinCount(decile)
              const range = getDecileRange(decile)
              return (
                <div key={decile} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Award className="w-4 h-4 text-yellow-400" />}
                    {idx === 1 && <Award className="w-4 h-4 text-gray-400" />}
                    {idx === 2 && <Award className="w-4 h-4 text-orange-600" />}
                    <div className="flex flex-col">
                      <span className="text-gray-300">D{decile} - {getDecileTiming(decile)}</span>
                      <span className="text-xs text-gray-500">{range}</span>
                    </div>
                  </div>
                  <span className="font-bold text-green-400">{winCount} wins ({pct.toFixed(1)}%)</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cold Deciles */}
        <div className="p-4 bg-blue-900/20 border border-blue-700 rounded">
          <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
            <Snowflake className="w-4 h-4" /> Cold Deciles (Fewest Wins)
          </h4>
          <div className="space-y-2">
            {coldDeciles.map(([decile, pct]) => {
              const winCount = getWinCount(decile)
              const range = getDecileRange(decile)
              return (
                <div key={decile} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-gray-300">D{decile} - {getDecileTiming(decile)}</span>
                    <span className="text-xs text-gray-500">{range}</span>
                  </div>
                  <span className="font-bold text-blue-400">{winCount} wins ({pct.toFixed(1)}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded">
        <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" /> Strategy Recommendation
        </h4>
        <p className="text-gray-300 text-sm mb-2">
          Based on the last {pattern.game_count} games, Decile {hotDeciles[0][0]} ({getDecileRange(hotDeciles[0][0])}) has the highest win rate with {getWinCount(hotDeciles[0][0])} wins ({hotDeciles[0][1].toFixed(1)}%).
        </p>
        <p className="text-yellow-300 text-sm font-semibold">
          → {getTimingRecommendation(parseInt(hotDeciles[0][0]))}
        </p>
        <p className="text-gray-400 text-xs mt-2">
          Remember: Past patterns don't guarantee future results. Each game uses cryptographically secure randomness.
        </p>
      </div>
    </div>
  )
}

function BetCalculator({ pattern }) {
  const [bankroll, setBankroll] = useState(10)
  const [potSize, setPotSize] = useState(1.0)

  // Auto-suggest entry timing based on hottest decile
  const getHottestDecile = () => {
    const entries = Object.entries(pattern.decile_percentages)
    entries.sort((a, b) => b[1] - a[1])
    return parseInt(entries[0][0])
  }

  const hottestDecile = getHottestDecile()
  const suggestedTiming = hottestDecile * 10 - 5 // Middle of the decile range

  const calculateRecommendation = () => {
    // Kelly Criterion-inspired: bet 1-5% of bankroll
    const conservative = bankroll * 0.01
    const moderate = bankroll * 0.03
    const aggressive = bankroll * 0.05

    // Entry cost estimate (based on pot size and suggested timing)
    const estimatedEntryCost = potSize * (suggestedTiming / 100) * 0.1 // ~10% of current pot

    return {
      conservative: Math.max(0.01, conservative),
      moderate: Math.max(0.01, moderate),
      aggressive: Math.max(0.01, aggressive),
      estimatedEntryCost
    }
  }

  const rec = calculateRecommendation()
  const winCount = pattern.decile_distribution[hottestDecile] || 0
  const winRate = pattern.decile_percentages[hottestDecile] || 0

  return (
    <div className="card mt-6 bg-gradient-to-br from-green-900/30 to-teal-900/30 border-green-700">
      <h3 className="text-xl font-bold mb-4 text-green-300 flex items-center gap-2">
        <DollarSign className="w-5 h-5" /> Bet Calculator
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Your Bankroll (SOL)</label>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              step="1"
              min="0"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Target Pot Size (SOL)</label>
            <input
              type="number"
              value={potSize}
              onChange={(e) => setPotSize(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              step="0.1"
              min="0"
            />
          </div>

          <div className="p-3 bg-purple-900/30 border border-purple-700 rounded">
            <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Suggested Entry Timing
            </h4>
            <p className="text-2xl font-bold text-purple-400">D{hottestDecile} - {getDecileTiming(hottestDecile)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Enter around {suggestedTiming}% of final pot
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Based on {winCount} wins ({winRate.toFixed(1)}%) in last {pattern.game_count} games
            </p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="font-semibold text-green-400 mb-3">Recommended Bet Sizes</h4>

          <div className="p-3 bg-blue-900/30 border border-blue-700 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-blue-300">Conservative (1%)</span>
              <span className="font-bold text-blue-400">{rec.conservative.toFixed(3)} SOL</span>
            </div>
            <p className="text-xs text-gray-400">Low risk, protects bankroll</p>
          </div>

          <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-yellow-300">Moderate (3%)</span>
              <span className="font-bold text-yellow-400">{rec.moderate.toFixed(3)} SOL</span>
            </div>
            <p className="text-xs text-gray-400">Balanced risk/reward</p>
          </div>

          <div className="p-3 bg-red-900/30 border border-red-700 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-red-300">Aggressive (5%)</span>
              <span className="font-bold text-red-400">{rec.aggressive.toFixed(3)} SOL</span>
            </div>
            <p className="text-xs text-gray-400">Higher risk, max upside</p>
          </div>

          <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded text-xs">
            <p className="text-gray-400">
              <strong className="text-gray-300">Estimated Entry Cost:</strong> ~{rec.estimatedEntryCost.toFixed(3)} SOL
            </p>
            <p className="text-gray-500 mt-1">
              Based on entering at {suggestedTiming}% of target pot
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-orange-900/20 border border-orange-700 rounded">
        <p className="text-sm text-orange-300 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Risk Warning:</strong> Only bet what you can afford to lose. These are estimates, not guarantees.
          </span>
        </p>
      </div>
    </div>
  )
}

function StrategyView({ pattern }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Strategic Analysis</h2>
        <p className="text-gray-400 text-sm">Data-driven insights and betting recommendations</p>
      </div>

      <StrategyInsights pattern={pattern} />
      <BetCalculator pattern={pattern} />
    </div>
  )
}

export default StrategyView
