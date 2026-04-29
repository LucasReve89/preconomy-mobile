/**
 * BudgetCategoryRow — Single budget category row primitive.
 * Shows: category name, horizontal progress bar, spent / limit amounts.
 * No hex literals — all colors via Foundation theme tokens.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, radii, typography } from '../../../theme'

export interface BudgetCategoryRowProps {
  /** Expense type name */
  name: string
  /** Category label (e.g. "Fijo" | "Variable") */
  category: string
  /** Allocated monthly limit */
  allocated: number
  /** Amount spent this month */
  spent: number
}

/** Format a number as ARS currency (e.g. $ 1.234) */
const formatARS = (value: number): string => {
  return `$ ${Math.abs(value).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  })}`
}

export const BudgetCategoryRow: React.FC<BudgetCategoryRowProps> = ({
  name,
  category,
  allocated,
  spent,
}) => {
  const ratio = allocated > 0 ? Math.min(spent / allocated, 1) : 0
  const overspent = allocated > 0 && spent > allocated
  const atRisk = !overspent && ratio >= 0.75

  const barColor = overspent
    ? colors.danger
    : atRisk
    ? colors.warn
    : colors.brand

  const percentText = allocated > 0 ? `${Math.round(ratio * 100)}%` : '—'

  return (
    <View style={styles.row}>
      {/* Left: status indicator */}
      <View
        style={[
          styles.dot,
          {
            backgroundColor: overspent
              ? colors.danger
              : atRisk
              ? colors.warn
              : colors.success,
          },
        ]}
      />

      {/* Center: name + bar */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.categoryTag}>{category}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(ratio * 100)}%` as any,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {/* Amounts row */}
        <View style={styles.amountsRow}>
          <Text style={[styles.amountSpent, overspent && styles.amountDanger]}>
            {formatARS(spent)}
          </Text>
          <Text style={styles.amountLimit}>/ {formatARS(allocated)}</Text>
          <Text style={[styles.percent, { color: barColor }]}>
            {percentText}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginTop: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  categoryTag: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.line2,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.full,
    minWidth: 2,
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountSpent: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  amountDanger: {
    color: colors.danger,
  },
  amountLimit: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  percent: {
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
})
