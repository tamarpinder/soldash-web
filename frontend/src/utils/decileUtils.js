// Utility functions for decile analysis

export const getDecileTiming = (decile) => {
  const timingMap = {
    1: 'Very Very Early',
    2: 'Very Early',
    3: 'Early',
    4: 'Late Early',
    5: 'Early Mid',
    6: 'Mid',
    7: 'Late Mid',
    8: 'Early Late',
    9: 'Late',
    10: 'Very Late'
  }
  return timingMap[decile] || '-'
}

export const getDecileRange = (decile) => {
  const start = (parseInt(decile) - 1) * 10
  const end = parseInt(decile) * 10
  return `${start}-${end}%`
}

export const getDecileLabel = (decile) => {
  return `D${decile} - ${getDecileTiming(decile)}`
}
