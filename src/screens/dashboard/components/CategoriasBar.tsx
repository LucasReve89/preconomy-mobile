/**
 * CategoriasBar — StackedBar via flex View (no SVG/chart library).
 * Top 5 categories + "Otros" aggregation. Shows empty state if no spend.
 * Mirrors web CategoriasStackedBar semantics.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../../theme'

interface CategoryItem {
  name: string
  amount: number
}

interface CategoriasBarProps {
  categories: CategoryItem[]
  totalAmount: number
}

const PALETTE = [
  colors.brand,        // index 0
  '#7C5CFF',           // violet
  colors.warn,         // index 2
  colors.success,      // index 3
  '#5CE1E6',           // cyan
  colors.mute2,        // Otros — neutral
]

export const CategoriasBar: React.FC<CategoriasBarProps> = ({
  categories,
  totalAmount,
}) => {
  const isEmpty = totalAmount === 0 || categories.length === 0

  // Top 5 + Otros
  const top5 = categories.slice(0, 5)
  const otros = categories.slice(5)
  const otrosAmount = otros.reduce((sum, c) => sum + c.amount, 0)

  const segments: { name: string; amount: number; color: string }[] = [
    ...top5.map((c, i) => ({ name: c.name, amount: c.amount, color: PALETTE[i] ?? colors.mute })),
    ...(otrosAmount > 0 ? [{ name: 'Otros', amount: otrosAmount, color: PALETTE[5] as string }] : []),
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.title}>GASTOS POR CATEGORÍA</Text>

      {isEmpty ? (
        <>
          <View style={styles.emptyBar} />
          <Text style={styles.emptyText}>No hay gastos en este mes</Text>
        </>
      ) : (
        <>
          {/* Stacked bar */}
          <View style={styles.bar}>
            {segments.map((seg) =>
              seg.amount > 0 ? (
                <View
                  key={seg.name}
                  style={{
                    flex: seg.amount / totalAmount,
                    backgroundColor: seg.color,
                  }}
                />
              ) : null
            )}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {segments.map((seg, i) => (
              <View key={seg.name} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.legendName} numberOfLines={1}>
                  {seg.name}
                </Text>
                <Text style={styles.legendAmount}>
                  {new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                    maximumFractionDigits: 0,
                  }).format(seg.amount)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: {
    fontSize: 10,
    color: colors.mute,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.bgSoft,
    marginBottom: 12,
  },
  emptyBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.bgSoft,
    opacity: 0.5,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.mute,
    textAlign: 'center',
    paddingVertical: 8,
  },
  legend: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  legendAmount: {
    fontSize: 12,
    color: colors.mute,
    fontVariant: ['tabular-nums'],
  },
})
