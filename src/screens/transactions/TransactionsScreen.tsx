/**
 * TransactionsScreen — SectionList-based transactions view.
 *
 * Phase F rewrite (dashboard-redesign-tx SDD, M24):
 *  - FlatList → SectionList with relative-date sections (Hoy / Ayer / Lun 21 …)
 *  - TxSummaryCards strip above SectionList (Ingresos / Gastos / Neto)
 *  - TxFilterChips row (Todas / Gastos / Ingresos / Cuotas)
 *  - TxSectionHeader for section headers
 *  - Foundation theme tokens — zero inline hex color literals
 *  - PRESERVED: long-press to delete, pull-to-refresh, all data hooks,
 *    loading state, focus-based reload, navigation to AddTransaction
 *
 * NOTE — Cuotas filter:
 *   The current data fetch does NOT include installment expenses (no
 *   getInstallmentExpenses call). The Cuotas chip renders but will show an
 *   empty list until dashboard-redesign-rn-installments-fetch SDD lands.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'
import { colors } from '../../theme'
import {
  TxSectionHeader,
  TxSummaryCards,
  TxFilterChips,
  type TxFilterType,
} from './components'
import {
  groupTransactionsByRelativeDate,
  type GroupableTransaction,
} from '../../lib/date-grouping'
import type { Transaction } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Extended Transaction with originalType for Cuotas filter support.
 * originalType is populated from installment data when available.
 */
interface TxItem extends Transaction, GroupableTransaction {
  originalType?: 'fixed' | 'variable' | 'installment' | 'income'
}

interface SectionData {
  title: string
  data: TxItem[]
}

// ─── Category emoji mapping ────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Supermercado: '🛒',
  Servicios: '💡',
  Salidas: '🍽️',
  Transporte: '🚇',
  Shopping: '🛍️',
  Salud: '⚕️',
  Educación: '📚',
  Ingreso: '💰',
  Sueldo: '💼',
  Hogar: '🏠',
  Entretenimiento: '🎬',
  Viajes: '✈️',
}

function getEmoji(item: TxItem): string {
  if (item.category && CATEGORY_EMOJI[item.category]) {
    return CATEGORY_EMOJI[item.category]
  }
  return item.type === 'income' ? '💰' : '💳'
}

// ─── TransactionRow component ─────────────────────────────────────────────────

interface TransactionRowProps {
  item: TxItem
  onLongPress: (item: TxItem) => void
}

const TransactionRow: React.FC<TransactionRowProps> = ({ item, onLongPress }) => {
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount)

  const isIncome = item.type === 'income'
  const amountColor = isIncome ? colors.success : colors.danger
  const amountPrefix = isIncome ? '+' : '−'
  const emoji = getEmoji(item)

  return (
    <TouchableOpacity
      style={styles.transactionItem}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor: isIncome
              ? `${colors.success}20`
              : `${colors.danger}20`,
          },
        ]}
      >
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>

      {/* Info */}
      <View style={styles.transactionInfo}>
        <View style={styles.transactionDescRow}>
          <Text style={styles.transactionDesc} numberOfLines={1}>
            {item.description}
          </Text>
          {item.originalType === 'fixed' && (
            <View style={styles.badgeFijo}>
              <Text style={styles.badgeFijoText}>FIJO</Text>
            </View>
          )}
          {item.originalType === 'installment' && (
            <View style={styles.badgeCuota}>
              <Text style={styles.badgeCuotaText}>CUOTA</Text>
            </View>
          )}
        </View>
        <Text style={styles.transactionCategory} numberOfLines={1}>
          {item.category || 'Sin categoría'}
          {item.paymentMethod ? ` · ${item.paymentMethod}` : ''}
        </Text>
      </View>

      {/* Amount */}
      <Text style={[styles.transactionAmount, { color: amountColor }]}>
        {amountPrefix}
        {formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  )
}

// ─── TransactionsScreen ────────────────────────────────────────────────────────

export const TransactionsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuthStore()

  const [transactions, setTransactions] = useState<TxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<TxFilterType>('all')
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)

  // ─── Data loading (PRESERVED from original) ────────────────────────────────

  const lastLoadRef = React.useRef(0)

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

      const allVariableExpenses: TxItem[] = (variableRes.content || []).map(
        (e: any, index: number) => ({
          id: e.expense_id ?? e.id ?? index,
          description: e.description,
          amount: e.amount,
          date: toDateString(e.date),
          type: 'expense' as const,
          category:
            e.expense_type?.expense_type ?? e.expenseType?.expense_type,
          paymentMethod:
            e.payment_method?.payment_method ??
            e.paymentMethodDTO?.payment_method,
          originalType: 'variable' as const,
        }),
      )

      const allFixedExpenses: TxItem[] = (fixedRes.content || []).map(
        (e: any, index: number) => ({
          id: e.expense_id ?? e.id ?? index + 5000,
          description: e.description,
          amount: e.amount,
          date: toDateString(e.date),
          type: 'expense' as const,
          category:
            e.expense_type?.expense_type ?? e.expenseType?.expense_type,
          paymentMethod:
            e.payment_method?.payment_method ??
            e.paymentMethodDTO?.payment_method,
          originalType: 'fixed' as const,
        }),
      )

      const allIncomes: TxItem[] = (incomesRes || []).map(
        (i: any, index: number) => ({
          id: i.id ?? index + 10000,
          description: i.income_source,
          amount: i.amount,
          date: toDateString(i.date),
          type: 'income' as const,
          category: 'Ingreso',
          originalType: 'income' as const,
        }),
      )

      const merged: TxItem[] = [
        ...allVariableExpenses,
        ...allFixedExpenses,
        ...allIncomes,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Calculate monthly totals
      const monthlyIncome = allIncomes
        .filter((t) => {
          const d = new Date(t.date)
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          )
        })
        .reduce((sum, t) => sum + t.amount, 0)

      const monthlyExpenses = [...allVariableExpenses, ...allFixedExpenses]
        .filter((t) => {
          const d = new Date(t.date)
          return (
            d.getMonth() === currentMonth && d.getFullYear() === currentYear
          )
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

  // Reload on focus — throttled to avoid double-fetch after navigation (PRESERVED)
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

  // ─── Delete handler (PRESERVED — long-press) ───────────────────────────────

  const handleDelete = (item: TxItem) => {
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
                await apiClient.deleteIncome(item.id as number)
              } else {
                await apiClient.deleteVariableExpense(item.id as number)
              }
              loadTransactions()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar')
            }
          },
        },
      ],
    )
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const neto = totalIncome - totalExpenses

  /**
   * Apply filter to merged transactions BEFORE grouping.
   * Cuotas chip: filters by originalType === 'installment'.
   * NOTE: installments are not fetched in this SDD — Cuotas will show empty
   * until dashboard-redesign-rn-installments-fetch SDD adds the fetch.
   */
  const filteredTransactions = useMemo<TxItem[]>(() => {
    if (filter === 'all') return transactions
    if (filter === 'installment') {
      return transactions.filter((t) => t.originalType === 'installment')
    }
    return transactions.filter((t) => t.type === filter)
  }, [transactions, filter])

  /**
   * Build SectionList sections from filtered transactions using the
   * date-grouping helper (same logic as web version).
   */
  const sections = useMemo<SectionData[]>(() => {
    return groupTransactionsByRelativeDate(filteredTransactions).map((g) => ({
      title: g.label,
      data: g.items,
    }))
  }, [filteredTransactions])

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedLogo />
        </View>
      </SafeAreaView>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transacciones</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <SectionList<TxItem, SectionData>
        sections={sections}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        renderSectionHeader={({ section }) => (
          <TxSectionHeader label={section.title} />
        )}
        renderItem={({ item }) => (
          <TransactionRow item={item} onLongPress={handleDelete} />
        )}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <>
            {/* Summary strip — Ingresos / Gastos / Neto */}
            <TxSummaryCards
              ingresos={totalIncome}
              gastos={totalExpenses}
              neto={neto}
            />

            {/* Filter chips — Todas / Gastos / Ingresos / Cuotas */}
            <TxFilterChips
              activeFilter={filter}
              onFilterChange={setFilter}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay movimientos</Text>
            <Text style={styles.emptySubtext}>
              Agregá tu primer gasto o ingreso
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
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
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
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
    marginRight: 12,
  },
  transactionDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionDesc: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  transactionCategory: {
    color: colors.mute,
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Badges
  badgeFijo: {
    backgroundColor: `${colors.warn}25`,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeFijoText: {
    color: colors.warn,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeCuota: {
    backgroundColor: colors.brandSoft,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeCuotaText: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.mute,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.mute2,
    fontSize: 14,
    marginTop: 4,
  },
})
