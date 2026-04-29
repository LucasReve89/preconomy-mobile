/**
 * React Native API Client for PREconomy Mobile
 * Adapted from web frontend with mobile-specific optimizations
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ExpenseType, PaymentMethod, Card, Bank, Expense, Income, ExpenseDTO, IncomeDTO, PaginatedResponse } from '../types'

// API Configuration - pointing to production backend
const API_URL = 'https://api.preconomyapp.com/api'

// Simple cache for React Native
class MobileAPICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  set(key: string, data: any, ttl: number = 180000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

const apiCache = new MobileAPICache()

// Types from frontend
export interface CurrencyRate {
  ARS: number
  USD: number
  EUR: number
  lastUpdated: string
}

export interface InflationData {
  monthlyRate: number
  annualRate: number
  cumulativeRate: number
  lastUpdated: string
}

export interface ArgentineFinancialContext {
  inflationData: InflationData
  currencyRates: CurrencyRate
  economicIndicators: {
    blueRate: number
    officialRate: number
    gap: number
  }
}

class MobileAPIClient {
  private axiosInstance!: AxiosInstance
  private isOnline: boolean = true

  constructor() {
    this.initializeAxios()
    this.setupNetworkMonitoring()
  }

  private initializeAxios(): void {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 15000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
    })

    this.setupRequestInterceptor()
    this.setupResponseInterceptor()
  }

  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add auth token from AsyncStorage if available
        try {
          const token = await AsyncStorage.getItem('auth_token')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          console.warn('Failed to get auth token from storage:', error)
        }

        // Add request timestamp
        config.headers['X-Request-Time'] = Date.now().toString()

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
  }

  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Cache successful GET requests
        if (response.config.method?.toLowerCase() === 'get' && response.status === 200) {
          const cacheKey = this.generateRequestKey(response.config)
          const cacheTTL = this.determineCacheTTL(response.config.url || '')
          apiCache.set(cacheKey, response.data, cacheTTL)
        }

        return response
      },
      async (error) => {
        await this.handleApiError(error)
        return Promise.reject(error)
      }
    )
  }

  private setupNetworkMonitoring(): void {
    // Network monitoring will be implemented when available in React Native
    // For now, assume online
    this.isOnline = true
  }

  private generateRequestKey(config: AxiosRequestConfig): string {
    const method = config.method || 'get'
    const url = config.url || ''
    const params = JSON.stringify(config.params || {})
    return `${method}:${url}:${params}`
  }

  private determineCacheTTL(url: string): number {
    if (url.includes('/currency') || url.includes('/exchange-rate')) return 300000 // 5 minutes
    if (url.includes('/inflation')) return 3600000 // 1 hour
    if (url.includes('/banks') || url.includes('/payment-methods')) return 1800000 // 30 minutes
    if (url.includes('/profile') || url.includes('/user')) return 600000 // 10 minutes
    if (url.includes('/insights') || url.includes('/analytics')) return 900000 // 15 minutes
    return 180000 // 3 minutes default
  }

  private async handleApiError(error: any): Promise<void> {
    // Handle authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (error.config?.url?.includes('/admin/') ||
          error.config?.url?.includes('/expense-due-dates/batch') ||
          error.config?.url?.includes('/variable-expenses/save') ||
          error.config?.url?.includes('/fixed-expenses/save') ||
          error.config?.url?.includes('/installment-expenses/save')) {
        console.warn('API call failed with 401/403 - might be permission issue:', error.config?.url)
        return
      }

      await this.handleAuthenticationError()
      return
    }

    // Log server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.config?.url, 'Status:', error.response?.status)
    }
  }

  private async handleAuthenticationError(): Promise<void> {
    try {
      // Clear all authentication data
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'refresh_token'])

      // Navigation to login will be handled by the app's auth state management
      console.log('Authentication error - user needs to login again')
    } catch (logoutError) {
      console.error('Error during logout:', logoutError)
    }
  }

  // Enhanced request method with caching
  async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const requestKey = this.generateRequestKey(config)

    // Check cache for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const cachedData = apiCache.get(requestKey)
      if (cachedData !== null) {
        return {
          data: cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        } as AxiosResponse<T>
      }
    }

    return this.axiosInstance.request<T>(config)
  }

  // Convenience methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  // Argentina-specific financial data endpoints
  async getArgentineFinancialContext(): Promise<ArgentineFinancialContext> {
    try {
      const [inflationData, currencyRates, economicIndicators] = await Promise.all([
        this.get<any>('/ar/inflation').then(r => r.data),
        this.get<any>('/ar/currency-rates').then(r => r.data),
        this.get<any>('/ar/economic-dashboard').then(r => r.data)
      ])

      return {
        inflationData: {
          monthlyRate: inflationData.latestMonthlyRate || 8.5,
          annualRate: inflationData.latestAnnualRate || 102.5,
          cumulativeRate: inflationData.yearToDateInflation || 125.8,
          lastUpdated: inflationData.lastUpdated || new Date().toISOString()
        },
        currencyRates: {
          ARS: 1,
          USD: currencyRates.usdToArsRates?.blue || 350,
          EUR: currencyRates.eurToArsRates?.blue || 380,
          lastUpdated: currencyRates.lastUpdated || new Date().toISOString()
        },
        economicIndicators: {
          blueRate: currencyRates.usdToArsRates?.blue || 380,
          officialRate: currencyRates.usdToArsRates?.official || 350,
          gap: currencyRates.blueOfficialGap || 8.6
        }
      }
    } catch (error) {
      // Return fallback data
      return {
        inflationData: {
          monthlyRate: 8.5,
          annualRate: 102.5,
          cumulativeRate: 125.8,
          lastUpdated: new Date().toISOString()
        },
        currencyRates: {
          ARS: 1,
          USD: 350,
          EUR: 380,
          lastUpdated: new Date().toISOString()
        },
        economicIndicators: {
          blueRate: 380,
          officialRate: 350,
          gap: 8.6
        }
      }
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<any> {
    try {
      const response = await this.post('/users/login', {
        email,
        password
      })

      // Save auth token to AsyncStorage
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token)
      }

      if (response.data.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user))
      }

      return response.data
    } catch (error) {
      throw error
    }
  }

  async logout(): Promise<void> {
    try {
      await this.post('/users/logout')
    } catch (error) {
      // Continue with logout even if server call fails
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'refresh_token'])
    }
  }

  async register(userData: any): Promise<any> {
    try {
      const response = await this.post('/users/register', userData)

      // Save auth token if provided
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token)
      }

      if (response.data.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user))
      }

      return response.data
    } catch (error) {
      throw error
    }
  }

  // Get current user from storage
  async getCurrentUser(): Promise<any> {
    try {
      const userData = await AsyncStorage.getItem('user_data')
      return userData ? JSON.parse(userData) : null
    } catch (error) {
      return null
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token')
      return !!token
    } catch (error) {
      return false
    }
  }

  // Get all transactions
  async getTransactions(): Promise<any> {
    try {
      const response = await this.get('/transactions')
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Get dashboard data
  async getDashboardData(): Promise<any> {
    try {
      const response = await this.get('/dashboard')
      return response.data
    } catch (error) {
      throw error
    }
  }

  // Get cards (typed)
  async getCards(): Promise<Card[]> {
    const response = await this.get<Card[]>('/cards/')
    return response.data
  }

  // Get budgets
  async getBudgets(): Promise<any> {
    const response = await this.get('/budgets')
    return response.data
  }

  // ---- Expense Types ----
  async getExpenseTypes(): Promise<ExpenseType[]> {
    const response = await this.get<ExpenseType[]>('/expense-types/')
    return response.data
  }

  // ---- Payment Methods ----
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await this.get<PaymentMethod[]>('/payment_method/')
    return response.data
  }

  // ---- Banks ----
  async getBanks(): Promise<Bank[]> {
    const response = await this.get<Bank[]>('/banks/')
    return response.data
  }

  // ---- Variable Expenses ----
  async getVariableExpenses(page = 0, size = 50): Promise<PaginatedResponse<Expense>> {
    const response = await this.get<PaginatedResponse<Expense>>(
      `/variable-expenses/?page=${page}&size=${size}&sortBy=date&direction=desc`
    )
    return response.data
  }

  async saveVariableExpense(data: ExpenseDTO): Promise<Expense> {
    apiCache.clear()
    const response = await this.post<Expense>('/variable-expenses/save', data)
    return response.data
  }

  async deleteVariableExpense(id: number): Promise<void> {
    apiCache.clear()
    await this.delete(`/variable-expenses/delete/${id}`)
  }

  // ---- Fixed Expenses ----
  async getFixedExpenses(page = 0, size = 50): Promise<PaginatedResponse<Expense>> {
    const response = await this.get<PaginatedResponse<Expense>>(
      `/fixed-expenses/?page=${page}&size=${size}&sortBy=date&direction=desc`
    )
    return response.data
  }

  async saveFixedExpense(data: ExpenseDTO): Promise<Expense> {
    apiCache.clear()
    const response = await this.post<Expense>('/fixed-expenses/save', data)
    return response.data
  }

  async deleteFixedExpense(id: number): Promise<void> {
    apiCache.clear()
    await this.delete(`/fixed-expenses/delete/${id}`)
  }

  // ---- Installment Expenses ----
  async saveInstallmentExpense(data: ExpenseDTO): Promise<Expense> {
    apiCache.clear()
    const response = await this.post<Expense>('/installment-expenses/save', data)
    return response.data
  }

  // ---- Incomes ----
  async getIncomes(): Promise<Income[]> {
    const response = await this.get<Income[]>('/incomes/')
    return response.data
  }

  async saveIncome(data: IncomeDTO): Promise<Income> {
    apiCache.clear()
    const response = await this.post<Income>('/incomes/save', data)
    return response.data
  }

  async deleteIncome(id: number): Promise<void> {
    apiCache.clear()
    await this.delete(`/incomes/delete/${id}`)
  }

  // Google OAuth login
  async loginWithGoogle(googleToken: string): Promise<any> {
    try {
      const response = await this.post('/users/login/google', { token: googleToken })

      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token)
      }

      // The backend might return user data directly or nested
      const userData = response.data.user || response.data
      await AsyncStorage.setItem('user_data', JSON.stringify(userData))

      return response.data
    } catch (error) {
      throw error
    }
  }

  // ---- Financial Health ----
  async getFinancialHealthScore(month?: number, year?: number): Promise<{
    score: number;
    overallScore?: number;
    categoryScores?: Record<string, number>;
    recommendations?: string[];
  } | null> {
    try {
      const params = new URLSearchParams()
      if (month !== undefined) params.append('month', month.toString())
      if (year !== undefined) params.append('year', year.toString())
      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await this.get<any>(`/v1/financial-health/score${query}`)
      const data = response.data
      const score = data?.overallScore ?? data?.score ?? 0
      return {
        score,
        overallScore: data?.overallScore,
        categoryScores: data?.categoryScores,
        recommendations: data?.recommendations,
      }
    } catch (error) {
      console.warn('Health score fetch failed:', error)
      return null
    }
  }

  // ---- Card Cycles ----
  async getCardCycle(cardId: number, year: number, month: number): Promise<any> {
    const response = await this.get(`/cards/${cardId}/closing-dates/${year}/${month}`)
    return response.data
  }

  // ---- Cards (extended) ----
  async saveCard(data: { bank_name: string; card_name: string; username: string; email: string }): Promise<any> {
    apiCache.clear()
    const response = await this.post('/cards/save', data)
    return response.data
  }

  async deleteCard(id: number): Promise<void> {
    apiCache.clear()
    await this.delete(`/cards/delete/${id}`)
  }

  // ---- Profile Image ----
  async getProfileImageSignedUrl(fileName: string): Promise<string | null> {
    try {
      const response = await this.get(`/profile-image/signed-url?fileName=${encodeURIComponent(fileName)}`)
      return response.data.signedUrl || null
    } catch {
      return null
    }
  }

  // ---- User Profile ----
  async getUserProfile(): Promise<any> {
    const response = await this.get('/users/profile')
    return response.data
  }

  async editUser(data: any): Promise<any> {
    apiCache.clear()
    const response = await this.put('/users/edit', data)
    return response.data
  }

  async updatePassword(data: { currentPassword: string; newPassword: string; email: string }): Promise<any> {
    apiCache.clear()
    const response = await this.put('/users/update-password', data)
    return response.data
  }

  // ---- Monthly Report ----
  async getMonthlyReport(year: number, month: number): Promise<MonthlyPaymentReportDTO> {
    const response = await this.get<MonthlyPaymentReportDTO>(
      `/reports/monthly?year=${year}&month=${month}`
    )
    return response.data
  }

  // Cache management
  clearCache(): void {
    apiCache.clear()
  }

  getCacheStats(): { size: number } {
    return {
      size: apiCache.size()
    }
  }
}

// Export singleton instance
export const apiClient = new MobileAPIClient()

// React Query compatible fetcher function
export const fetcher = async (url: string) => {
  const response = await apiClient.get(url)
  return response.data
}

// ---- Monthly Report DTO ----
// Mirrors the shape returned by GET /reports/monthly?year=&month=
export interface MonthlyCardCycle {
  cardName: string
  cycleStart: string
  cycleEnd: string
  totalSpent: number
  carryOver: number
}

export interface MonthlyPaymentReportDTO {
  year: number
  month: number
  totalIncome: number
  totalUniquePayments: number
  totalRecurringPayments: number
  totalVariableExpenses: number
  totalCardPayments: number
  pendingInstallments: number
  dineroRestante: number
  faltaPagar: number
  cardCycles: MonthlyCardCycle[]
}

