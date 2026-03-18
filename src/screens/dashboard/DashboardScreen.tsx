/**
 * Dashboard Screen - Main overview of user's finances
 * Uses real data from backend endpoints
 */

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'
import { apiClient } from '../../api/api-client'
import type { Expense, Income } from '../../types'

interface DashboardData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  currencyRates: {
    USD: number
    EUR: number
  }
  recentTransactions: { description: string; amount: number; type: 'income' | 'expense'; date: string }[]
}

export const DashboardScreen: React.FC = () => {
  const { user, logout } = useAuthStore()
  const navigation = useNavigation<any>()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  // FAB animations
  const fabScale = useRef(new Animated.Value(1)).current
  const fabBreath = useRef(new Animated.Value(1)).current
  const auraOpacity = useRef(new Animated.Value(0.15)).current
  const auraScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Subtle breathing on the button itself
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(fabBreath, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(fabBreath, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    )
    // Aura expanding and fading
    const aura = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(auraScale, { toValue: 1.6, duration: 1800, useNativeDriver: true }),
          Animated.timing(auraOpacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(auraScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(auraOpacity, { toValue: 0.2, duration: 0, useNativeDriver: true }),
        ]),
      ])
    )
    breath.start()
    aura.start()
    return () => { breath.stop(); aura.stop() }
  }, [fabBreath, auraScale, auraOpacity])

  const handleFabPressIn = () => {
    Animated.spring(fabScale, { toValue: 0.85, useNativeDriver: true }).start()
  }

  const handleFabPressOut = () => {
    Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 250, useNativeDriver: true }).start()
  }

  const loadDashboardData = useCallback(async () => {
    try {
      const [variableRes, fixedRes, incomesRes, financialContext] =
        await Promise.all([
          apiClient.getVariableExpenses(0, 100).catch(() => ({ content: [] })),
          apiClient.getFixedExpenses(0, 100).catch(() => ({ content: [] })),
          apiClient.getIncomes().catch(() => []),
          apiClient.getArgentineFinancialContext().catch(() => null),
        ])

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Parse date from various backend formats (string "YYYY-MM-DD", array [Y,M,D,...], etc.)
      const parseDate = (dateVal: any): Date => {
        if (!dateVal) return new Date(0)
        if (Array.isArray(dateVal)) {
          return new Date(dateVal[0], (dateVal[1] || 1) - 1, dateVal[2] || 1)
        }
        if (typeof dateVal === 'string') {
          // Force local timezone by appending T00:00:00
          const d = new Date(dateVal.split('T')[0] + 'T00:00:00')
          return isNaN(d.getTime()) ? new Date(0) : d
        }
        return new Date(0)
      }

      const toDateString = (dateVal: any): string => {
        const d = parseDate(dateVal)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      const isCurrentMonth = (dateVal: any) => {
        const d = parseDate(dateVal)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }

      const allExpenses = [
        ...(variableRes.content || []),
        ...(fixedRes.content || []),
      ]
      const allIncomes = incomesRes || []

      const monthlyExpenses = allExpenses
        .filter((e: any) => isCurrentMonth(e.date))
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0)

      const monthlyIncome = allIncomes
        .filter((i: any) => isCurrentMonth(i.date))
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)

      // Build recent transactions (last 5)
      const recent = [
        ...allExpenses.map((e: any) => ({
          description: e.description,
          amount: e.amount,
          type: 'expense' as const,
          date: toDateString(e.date),
        })),
        ...allIncomes.map((i: any) => ({
          description: i.income_source,
          amount: i.amount,
          type: 'income' as const,
          date: toDateString(i.date),
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4)

      setDashboardData({
        totalBalance: monthlyIncome - monthlyExpenses,
        monthlyIncome,
        monthlyExpenses,
        currencyRates: {
          USD: financialContext?.currencyRates?.USD || 0,
          EUR: financialContext?.currencyRates?.EUR || 0,
        },
        recentTransactions: recent,
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard')
    } finally {
      lastLoadRef.current = Date.now()
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Reload when screen gets focus (throttled — skip if loaded within 10s)
  const lastLoadRef = useRef(0)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (Date.now() - lastLoadRef.current > 10000) {
        loadDashboardData()
      }
    })
    return unsubscribe
  }, [navigation, loadDashboardData])

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboardData()
  }

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' },
      ]
    )
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatUSD = (amount: number, rate: number): string => {
    if (!rate || rate === 0) return ''
    const usdAmount = amount / rate
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usdAmount)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedLogo />
        </View>
      </SafeAreaView>
    )
  }

  const balance = dashboardData?.totalBalance || 0

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {/* Logo Bar */}
        <View style={styles.logoBar}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.logoTitle}>PREconomy</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hola, {user?.username}</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance del Mes</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: balance >= 0 ? '#10b981' : '#ef4444' },
            ]}
          >
            {formatCurrency(balance)}
          </Text>
          {dashboardData?.currencyRates?.USD ? (
            <Text style={styles.balanceUSD}>
              ≈ {formatUSD(balance, dashboardData.currencyRates.USD)}
            </Text>
          ) : null}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ingresos</Text>
            <Text style={[styles.statAmount, { color: '#10b981' }]}>
              {formatCurrency(dashboardData?.monthlyIncome || 0)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gastos</Text>
            <Text style={[styles.statAmount, { color: '#ef4444' }]}>
              {formatCurrency(dashboardData?.monthlyExpenses || 0)}
            </Text>
          </View>
        </View>

        {/* Currency Rates */}
        {dashboardData?.currencyRates?.USD ? (
          <View style={styles.currencyCard}>
            <Text style={styles.currencyTitle}>Cotizaciones</Text>
            <View style={styles.currencyRates}>
              <View style={styles.currencyItem}>
                <Text style={styles.currencyLabel}>USD Blue</Text>
                <Text style={styles.currencyValue}>
                  ${dashboardData.currencyRates.USD}
                </Text>
              </View>
              <View style={styles.currencyItem}>
                <Text style={styles.currencyLabel}>EUR</Text>
                <Text style={styles.currencyValue}>
                  ${dashboardData.currencyRates.EUR}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Recent Transactions */}
        {dashboardData?.recentTransactions &&
          dashboardData.recentTransactions.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Últimos movimientos</Text>
              {dashboardData.recentTransactions.map((tx, i) => (
                <View key={i} style={styles.recentItem}>
                  <View style={styles.recentLeft}>
                    <Text style={{ fontSize: 16 }}>
                      {tx.type === 'income' ? '📈' : '📉'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentDesc} numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text style={styles.recentDate}>
                        {new Date(tx.date + 'T00:00:00').toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.recentAmount,
                      { color: tx.type === 'income' ? '#10b981' : '#ef4444' },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}

      </ScrollView>

      {/* FAB with aura */}
      <View style={styles.fabWrapper}>
        <Animated.View
          style={[
            styles.fabAura,
            { opacity: auraOpacity, transform: [{ scale: auraScale }] },
          ]}
        />
        <Animated.View
          style={[
            styles.fab,
            { transform: [{ scale: Animated.multiply(fabScale, fabBreath) }] },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate('AddTransaction')}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={1}
            style={styles.fabTouchable}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  logoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logoutButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
    textAlign: 'center',
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  currencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  currencyRates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  currencyItem: {
    alignItems: 'center',
  },
  currencyLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  currencyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  recentSection: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 10,
  },
  recentDesc: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  recentDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabAura: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabTouchable: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '600',
    marginTop: -2,
  },
})
