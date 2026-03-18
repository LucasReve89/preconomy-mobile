/**
 * Zustand Auth Store for PREconomy Mobile
 * Handles authentication state and user data
 */

import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiClient } from '../api/api-client'

export interface User {
  id: number
  username: string
  email: string
  registrationDate: string
  roles: string[]
  hasCompletedQuestionnaire?: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  showQuestionnaire: boolean

  // Actions
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (googleToken: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  checkSession: () => Promise<void>
  setShowQuestionnaire: (show: boolean) => void
  completeQuestionnaire: () => Promise<void>
}

interface RegisterData {
  username: string
  email: string
  password: string
}

// Password hashing function (simplified for mobile)
const hashPassword = (password: string): string => {
  // For now, return the password as-is
  // In production, you might want to implement client-side hashing
  return password
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  showQuestionnaire: false,

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })

      const hashedPassword = hashPassword(password)
      const response = await apiClient.login(email, hashedPassword)

      const userData = response.user || response

      set({
        user: userData,
        isAuthenticated: true,
        loading: false,
        showQuestionnaire: !userData.hasCompletedQuestionnaire
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Login failed',
        loading: false,
        isAuthenticated: false,
        user: null
      })
      throw error
    }
  },

  loginWithGoogle: async (googleToken: string) => {
    try {
      set({ loading: true, error: null })

      const response = await apiClient.loginWithGoogle(googleToken)
      const userData = response.user || response

      set({
        user: userData,
        isAuthenticated: true,
        loading: false,
        showQuestionnaire: !userData.hasCompletedQuestionnaire,
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Google login failed',
        loading: false,
        isAuthenticated: false,
        user: null,
      })
      throw error
    }
  },

  register: async (userData: RegisterData) => {
    try {
      set({ loading: true, error: null })

      const hashedPassword = hashPassword(userData.password)
      await apiClient.register({
        ...userData,
        password: hashedPassword
      })

      set({ loading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Registration failed',
        loading: false
      })
      throw error
    }
  },

  logout: async () => {
    try {
      set({ loading: true })

      await apiClient.logout()

      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        showQuestionnaire: false
      })
    } catch (error: any) {
      // Even if logout fails on server, clear local state
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        showQuestionnaire: false
      })
    }
  },

  checkSession: async () => {
    try {
      set({ loading: true })

      const isAuth = await apiClient.isAuthenticated()
      if (!isAuth) {
        set({
          user: null,
          isAuthenticated: false,
          loading: false
        })
        return
      }

      // Get user profile
      try {
        const response = await apiClient.get('/users/profile')
        const userData = response.data.user || response.data

        set({
          user: userData,
          isAuthenticated: true,
          loading: false,
          showQuestionnaire: !userData.hasCompletedQuestionnaire
        })
      } catch (profileError: any) {
        // If profile fetch fails, user is not authenticated
        set({
          user: null,
          isAuthenticated: false,
          loading: false
        })
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        loading: false
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  setShowQuestionnaire: (show: boolean) => {
    set({ showQuestionnaire: show })
  },

  completeQuestionnaire: async () => {
    try {
      await apiClient.post('/users/complete-questionnaire')
      set({ showQuestionnaire: false })

      // Update user data
      const currentUser = get().user
      if (currentUser) {
        set({
          user: {
            ...currentUser,
            hasCompletedQuestionnaire: true
          }
        })
      }
    } catch (error) {
      console.error('Failed to complete questionnaire:', error)
    }
  }
}))

// Initialize auth state on app start
export const initializeAuth = async () => {
  const { checkSession } = useAuthStore.getState()
  await checkSession()
}