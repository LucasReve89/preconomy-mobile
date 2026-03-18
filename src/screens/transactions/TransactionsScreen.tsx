/**
 * Transactions Screen - View expenses and income with real balance
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'
import type { Expense, Income, Transaction } from '../../types'

type FilterType = 'all' | 'expense' | 'income'

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)

  const loadTransactions = useCallback(async () => {
    try {
      const [variableRes, fixedRes, incomesRes] = await Promise.all([
        apiClient.getVariableExpenses(0, 100).catch(() => ({ content: [] })),
        apiClient.getFixedExpenses(0, 100).catch(() => ({ content: [] })),
        apiClient.getIncomes().catch(() => []),
      ])

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Parse date from various backend formats (string, array, etc.)
      const parseDate = (dateVal: any): Date => {
        if (!dateVal) return new Date(0)
        if (Array.isArray(dateVal)) {
          return new Date(dateVal[0], (dateVal[1] || 1) - 1, dateVal[2] || 1)
        }
        if (typeof dateVal === 'string') {
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

      const allExpenses: Transaction[] = [
        ...(variableRes.content || []),
        ...(fixedRes.content || []),
      ].map((e: any, index: number) => ({
        id: e.expense_id ?? e.id ?? index,
        description: e.description,
        amount: e.amount,
        date: toDateString(e.date),
        type: 'expense' as const,
        category: e.expense_type?.expense_type ?? e.expenseType?.expense_type,
        paymentMethod: e.payment_method?.payment_method ?? e.paymentMethodDTO?.payment_method,
      }))

      const allIncomes: Transaction[] = (incomesRes || []).map((i: any, index: number) => ({
        id: i.id ?? index + 10000,
        description: i.income_source,
        amount: i.amount,
        date: toDateString(i.date),
        type: 'income' as const,
        category: 'Ingreso',
      }))

      const merged = [...allExpenses, ...allIncomes].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      // Calculate monthly totals
      const monthlyIncome = allIncomes
        .filter((t) => {
          const d = new Date(t.date)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((sum, t) => sum + t.amount, 0)

      const monthlyExpenses = allExpenses
        .filter((t) => {
          const d = new Date(t.date)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })
        .reduce((sum, t) => sum + t.amount, 0)

      setTotalIncome(monthlyIncome)
      setTotalExpenses(monthlyExpenses)
      setTransactions(merged)
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las transacciones')
    } finally {
      lastLoadRef.current = Date.now()
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Reload when coming back from add screen (throttled — skip if loaded within 5s)
  const lastLoadRef = React.useRef(0)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (Date.now() - lastLoadRef.current > 5000) {
        loadTransactions()
      }
    })
    return unsubscribe
  }, [navigation, loadTransactions])

  const onRefresh = () => {
    setRefreshing(true)
    loadTransactions()
  }

  const handleDelete = (item: Transaction) => {
    Alert.alert(
      'Eliminar',
      `¿Eliminar "${item.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (item.type === 'income') {
                await apiClient.deleteIncome(item.id)
              } else {
                await apiClient.deleteVariableExpense(item.id)
              }
              loadTransactions()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar')
            }
          },
        },
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true
    return t.type === filter
  })

  const balance = totalIncome - totalExpenses

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.transactionLeft}>
        <View
          style={[
            styles.transactionIcon,
            { backgroundColor: item.type === 'income' ? '#065f4620' : '#7f1d1d20' },
          ]}
        >
          <Text style={{ fontSize: 18 }}>
            {item.type === 'income' ? '📈' : '📉'}
          </Text>
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.transactionCategory}>
            {item.category || 'Sin categoría'} · {formatDate(item.date)}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: item.type === 'income' ? '#10b981' : '#ef4444' },
        ]}
      >
        {item.type === 'income' ? '+' : '-'}
        {formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  )

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Ingresos</Text>
            <Text style={[styles.balanceValue, { color: '#10b981' }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Gastos</Text>
            <Text style={[styles.balanceValue, { color: '#ef4444' }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: balance >= 0 ? '#10b981' : '#ef4444' },
              ]}
            >
              {formatCurrency(balance)}
            </Text>
          </View>
        </View>
        <Text style={styles.balancePeriod}>
          {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.filterText, filter === f && styles.filterTextActive]}
            >
              {f === 'all' ? 'Todos' : f === 'expense' ? 'Gastos' : 'Ingresos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction list */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay movimientos</Text>
            <Text style={styles.emptySubtext}>
              Agregá tu primer gasto o ingreso
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  balancePeriod: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
    textTransform: 'capitalize',
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  transactionCategory: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
})
