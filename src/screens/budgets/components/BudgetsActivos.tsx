/**
 * BudgetsActivos — Activos tab content for the RN BudgetsScreen.
 * Fetches active expense types and fixed/variable expenses to compute
 * per-category spend vs budget, then renders:
 *   - BudgetDonut hero
 *   - 4-stat summary strip
 *   - BudgetCategoryRow list
 *
 * No hex literals — all colors via Foundation theme tokens.
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native'
import { apiClient } from '../../../api/api-client'
import type { ExpenseType, Expense } from '../../../types'
import { colors, spacing, radii, typography } from '../../../theme'
import { BudgetDonut } from './BudgetDonut'
import { BudgetCategoryRow } from './BudgetCategoryRow'

interface BudgetsActivosProps {
  year: number
  month: number
}

interface BudgetItem {
  id: number
  name: string
  category: string
  allocated: number
  spent: number
}

/** Format a number as ARS currency */
const formatARS = (value: number): string =>
  `$ ${Math.abs(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

/** Derive the month's expenses per expense type from the full expenses list */
const buildBudgetItems = (
  expenseTypes: ExpenseType[],
  fixedExpenses: Expense[],
  variableExpenses: Expense[],
  year: number,
  month: number,
): BudgetItem[] => {
  // Build a spend map: expenseTypeId → total spent this month
  const spendMap: Record<number, number> = {}

  const matchesMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  }

  for (const exp of [...fixedExpenses, ...variableExpenses]) {
    if (!matchesMonth(exp.date)) continue
    const typeId = exp.expense_type?.id
    if (typeId == null) continue
    spendMap[typeId] = (spendMap[typeId] ?? 0) + (exp.amount ?? 0)
  }

  return expenseTypes
    .filter((et) => et.active)
    .map((et) => ({
      id: et.id,
      name: et.expense_type,
      category: et.expense_category?.expense_category ?? 'Otro',
      allocated: et.monthly_estimate ?? 0,
      spent: spendMap[et.id] ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent)
}

export const BudgetsActivos: React.FC<BudgetsActivosProps> = ({
  year,
  month,
}) => {
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [expTypes, fixedPage, variablePage] = await Promise.all([
        apiClient.getExpenseTypes(),
        apiClient.getFixedExpenses(0, 200),
        apiClient.getVariableExpenses(0, 200),
      ])

      const fixed = fixedPage.content ?? []
      const variable = variablePage.content ?? []
      const built = buildBudgetItems(expTypes, fixed, variable, year, month)
      setItems(built)
    } catch (err) {
      console.error('BudgetsActivos: error cargando datos', err)
      setError('No se pudieron cargar los presupuestos.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    )
  }

  // Derived summary values
  const totalAllocated = items.reduce((s, i) => s + i.allocated, 0)
  const totalSpent = items.reduce((s, i) => s + i.spent, 0)
  const totalRemaining = totalAllocated - totalSpent
  const activeCount = items.filter((i) => i.allocated > 0).length

  const summaryStats = [
    { label: 'Asignado', value: formatARS(totalAllocated), color: colors.text },
    {
      label: 'Gastado',
      value: formatARS(totalSpent),
      color: totalSpent > totalAllocated ? colors.danger : colors.text,
    },
    {
      label: 'Restante',
      value: formatARS(totalRemaining),
      color: totalRemaining < 0 ? colors.danger : colors.success,
    },
    { label: 'Activos', value: `${activeCount}`, color: colors.brand },
  ]

  return (
    <View style={styles.container}>
      {/* Donut hero */}
      <View style={styles.donutWrapper}>
        <BudgetDonut allocated={totalAllocated} spent={totalSpent} size={180} />
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        {summaryStats.map((stat) => (
          <View key={stat.label} style={styles.statCell}>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Category rows */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Sin presupuestos activos</Text>
          <Text style={styles.emptySubtitle}>
            Creá tipos de gastos con estimación mensual para ver tu progreso.
          </Text>
        </View>
      ) : (
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>POR CATEGORÍA</Text>
          {items.map((item) => (
            <BudgetCategoryRow
              key={item.id}
              name={item.name}
              category={item.category}
              allocated={item.allocated}
              spent={item.spent}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  retryText: {
    color: colors.brand,
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  donutWrapper: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  listSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
})
