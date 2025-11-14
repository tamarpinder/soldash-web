import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// API Service for SolDash Backend
export const apiService = {
  // Get historical games
  async fetchGames(limit = 50) {
    try {
      const response = await api.get(`/api/v1/games`, { params: { limit } })
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching games:', error)
      return { data: null, error: error.message }
    }
  },

  // Get pattern analysis for N games
  async fetchPatterns(count = 10) {
    try {
      const response = await api.get(`/api/v1/patterns`, { params: { count } })
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching patterns:', error)
      return { data: null, error: error.message }
    }
  },

  // Get pattern comparison (10/30/50 games)
  async fetchComparison() {
    try {
      const response = await api.get(`/api/v1/patterns/compare`)
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching comparison:', error)
      return { data: null, error: error.message }
    }
  },

  // Get strategic insights
  async fetchInsights(count = 10) {
    try {
      const response = await api.get(`/api/v1/insights`, { params: { count } })
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching insights:', error)
      return { data: null, error: error.message }
    }
  },

  // Get database stats
  async fetchStats() {
    try {
      const response = await api.get(`/api/v1/stats`)
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching stats:', error)
      return { data: null, error: error.message }
    }
  },

  // Trigger manual scrape
  async triggerScrape(pageNumber = 1) {
    try {
      const response = await api.post(`/api/v1/scrape`, { page_number: pageNumber })
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error triggering scrape:', error)
      return { data: null, error: error.message }
    }
  },

  // Health check
  async checkHealth() {
    try {
      const response = await api.get(`/api/v1/health`)
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error checking health:', error)
      return { data: null, error: error.message }
    }
  },

  // Get live game state
  async fetchLiveGame() {
    try {
      const response = await api.get(`/api/v1/live-game`)
      return { data: response.data, error: null }
    } catch (error) {
      console.error('Error fetching live game:', error)
      return { data: null, error: error.message }
    }
  },
}

export default apiService
