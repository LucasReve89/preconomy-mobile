/**
 * Analytics Screen - Financial health, spending breakdown, insights
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { apiClient } from '../../api/api-client'
import { AnimatedLogo } from '../../components/AnimatedLogo'

interface CategorySpending {
  name: string
  amount: number
}

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [healthScore, setHealthScore] = useState<number>(0)
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({})
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [categories, setCategories] = useState<CategorySpending[]>([])

  const parseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date(0)
    if (Array.isArray(dateVal))
      return new Date(dateVal[0], (dateVal[1] || 1) - 1, dateVal[2] || 1)
    if (typeof dateVal === 'string') {
      const d = new Date(dateVal.split('T')[0] + 'T00:00:00')
      return isNaN(d.getTime()) ? new Date(0) : d
    }
    return new Date(0)
  }

  const loadData = useCallback(async () => {
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()

      apiClient.clearCache()
      const [healthRes, variableRes, fixedRes, incomesRes] = await Promise.all([
        apiClient.getFinancialHealthScore(month, year).catch(() => null),
        apiClient.getVariableExpenses(0, 200).catch(() => ({ content: [] })),
        apiClient.getFixedExpenses(0, 200).catch(() => ({ content: [] })),
        apiClient.getIncomes().catch(() => []),
      ])

      if (healthRes) {
        setHealthScore(healthRes.overallScore || 0)
        setCategoryScores(healthRes.categoryScores || {})
        setRecommendations(healthRes.recommendations || [])
      }

      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const allExpenses = [...(variableRes.content || []), ...(fixedRes.content || [])]
      const allIncomes = incomesRes || []

      let incomeTotal = 0
      let expenseTotal = 0
      const categoryMap: Record<string, number> = {}

      allExpenses.forEach((e: any) => {
        const d = parseDate(e.date)
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const amt = e.amount || 0
          expenseTotal += amt
          const cat =
            e.expense_type?.expense_type ||
            e.expenseType?.expense_type ||
            e.expenseType?.expenseType ||
            e.category ||
            (typeof e.expense_type === 'string' ? e.expense_type : null) ||
            'Otros'
          categoryMap[cat] = (categoryMap[cat] || 0) + amt
        }
      })

      allIncomes.forEach((i: any) => {
        const d = parseDate(i.date)
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          incomeTotal += i.amount || 0
        }
      })

      setMonthlyIncome(incomeTotal)
      setMonthlyExpenses(expenseTotal)
      setCategories(
        Object.entries(categoryMap)
          .map(([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount)
      )
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos de análisis')
    } finally {
      lastLoadRef.current = Date.now()
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Only reload on focus if data is stale (more than 30 seconds old)
  const lastLoadRef = React.useRef(0)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (Date.now() - lastLoadRef.current > 30000) {
        loadData()
      }
    })
    return unsubscribe
  }, [navigation, loadData])

  const onRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    if (score >= 40) return '#f97316'
    return '#ef4444'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bueno'
    if (score >= 40) return 'Regular'
    return 'Necesita mejorar'
  }

  const getCategoryLabel = (key: string) => {
    const labels: Record<string, string> = {
      DEBT_TO_INCOME: 'Deuda/Ingreso',
      SAVINGS_RATE: 'Tasa de ahorro',
      EMERGENCY_FUND: 'Fondo emergencia',
      CREDIT_UTILIZATION: 'Uso de crédito',
      PAYMENT_HISTORY: 'Historial de pagos',
    }
    return labels[key] || key
  }

  const translateRecommendation = (text: string): string => {
    // Exact matches from backend FinancialHealthScoreServiceImpl
    const translations: Record<string, string> = {
      'Consider reducing your debt-to-income ratio by increasing income or reducing debt payments.':
        'Considerá reducir tu relación deuda/ingreso aumentando tus ingresos o reduciendo pagos de deuda.',
      'Try to increase your savings rate to at least 20% of your income.':
        'Intentá aumentar tu tasa de ahorro al menos al 20% de tus ingresos.',
      'Build your emergency fund to cover at least 6 months of expenses.':
        'Armá un fondo de emergencia que cubra al menos 6 meses de gastos.',
      'Reduce your credit utilization to below 30% to improve your credit score.':
        'Reducí el uso de tus tarjetas de crédito por debajo del 30% para mejorar tu score crediticio.',
      'Ensure all payments are made on time to improve your payment history score.':
        'Asegurate de realizar todos los pagos a tiempo para mejorar tu historial de pagos.',
    }
    // Try exact match first, then partial match
    if (translations[text]) return translations[text]
    for (const [en, es] of Object.entries(translations)) {
      if (text.toLowerCase().includes(en.toLowerCase().slice(0, 30))) return es
    }
    return text
  }

  const maxCat = categories.length > 0 ? categories[0].amount : 1
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedLogo />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        <Text style={styles.screenTitle}>Análisis</Text>

        {/* Health Score */}
        <View style={styles.scoreCard}>
          <View style={[styles.scoreRing, { borderColor: getScoreColor(healthScore) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(healthScore) }]}>{healthScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Salud Financiera</Text>
            <Text style={[styles.scoreLabel, { color: getScoreColor(healthScore) }]}>
              {getScoreLabel(healthScore)}
            </Text>
            <Text style={styles.scorePeriod}>
              {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* Indicators */}
        {Object.keys(categoryScores).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Indicadores</Text>
            {Object.entries(categoryScores).map(([key, score]) => (
              <View key={key} style={styles.indicatorRow}>
                <Text style={styles.indicatorLabel}>{getCategoryLabel(key)}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${score}%`, backgroundColor: getScoreColor(score) }]} />
                </View>
                <Text style={[styles.indicatorScore, { color: getScoreColor(score) }]}>{score}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Income vs Expenses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingresos vs Gastos</Text>
          <View style={styles.vsRow}>
            <View style={styles.vsItem}>
              <Text style={styles.vsLabel}>Ingresos</Text>
              <Text style={[styles.vsValue, { color: '#10b981' }]}>{formatCurrency(monthlyIncome)}</Text>
            </View>
            <View style={styles.vsDivider} />
            <View style={styles.vsItem}>
              <Text style={styles.vsLabel}>Gastos</Text>
              <Text style={[styles.vsValue, { color: '#ef4444' }]}>{formatCurrency(monthlyExpenses)}</Text>
            </View>
          </View>
          {monthlyIncome > 0 && (
            <View style={styles.vsBarWrap}>
              <View style={[styles.vsBarGreen, { flex: monthlyIncome }]} />
              <View style={[styles.vsBarRed, { flex: monthlyExpenses || 0.01 }]} />
            </View>
          )}
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>Tasa de ahorro</Text>
            <Text style={[styles.savingsValue, { color: savingsRate >= 0 ? '#10b981' : '#ef4444' }]}>
              {savingsRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gastos por Categoría</Text>
            {categories.slice(0, 8).map((cat, i) => (
              <View key={cat.name} style={styles.catRow}>
                <View style={styles.catInfo}>
                  <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                  <Text style={styles.catAmount}>{formatCurrency(cat.amount)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(cat.amount / maxCat) * 100}%`,
                        backgroundColor: i === 0 ? '#ef4444' : i < 3 ? '#f59e0b' : '#10b981',
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recomendaciones</Text>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <Text style={styles.recIcon}>💡</Text>
                <Text style={styles.recText}>{translateRecommendation(rec)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', paddingVertical: 16 },

  // Score
  scoreCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 20,
  },
  scoreRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 4,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a',
  },
  scoreNumber: { fontSize: 30, fontWeight: '800' },
  scoreMax: { fontSize: 11, color: '#64748b', marginTop: -4 },
  scoreInfo: { flex: 1 },
  scoreTitle: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  scoreLabel: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  scorePeriod: { color: '#64748b', fontSize: 12, marginTop: 4, textTransform: 'capitalize' },

  // Cards
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 14 },

  // Indicators
  indicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  indicatorLabel: { color: '#94a3b8', fontSize: 12, width: 110 },
  indicatorScore: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },

  // Bars (shared)
  barBg: { flex: 1, height: 6, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },

  // Income vs Expenses
  vsRow: { flexDirection: 'row', alignItems: 'center' },
  vsItem: { flex: 1, alignItems: 'center' },
  vsDivider: { width: 1, height: 36, backgroundColor: '#334155' },
  vsLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  vsValue: { fontSize: 16, fontWeight: '700' },
  vsBarWrap: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 14, backgroundColor: '#0f172a' },
  vsBarGreen: { backgroundColor: '#10b981', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  vsBarRed: { backgroundColor: '#ef4444', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#0f172a' },
  savingsLabel: { color: '#94a3b8', fontSize: 13 },
  savingsValue: { fontSize: 16, fontWeight: '700' },

  // Categories
  catRow: { marginBottom: 12 },
  catInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catName: { color: '#e2e8f0', fontSize: 13, flex: 1, marginRight: 8 },
  catAmount: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  // Recommendations
  recRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  recIcon: { fontSize: 16, marginTop: 1 },
  recText: { color: '#94a3b8', fontSize: 13, flex: 1, lineHeight: 19 },
})
