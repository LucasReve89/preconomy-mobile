/**
 * KpiList — vertical list of KPI tiles (Ingresos, Gastos, Ahorros, Dólar Blue).
 * Each tile uses KpiTile with label + value + optional subtitle.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../../theme'

interface KpiTileProps {
  label: string
  value: string
  subtitle?: string
  valueColor?: string
}

export const KpiTile: React.FC<KpiTileProps> = ({
  label,
  value,
  subtitle,
  valueColor = colors.text,
}) => (
  <View style={styles.tile}>
    <Text style={styles.tileLabel}>{label}</Text>
    <Text style={[styles.tileValue, { color: valueColor }]}>{value}</Text>
    {subtitle ? <Text style={styles.tileSubtitle}>{subtitle}</Text> : null}
  </View>
)

interface KpiListProps {
  income: number
  expenses: number
  savings: number
  savingsPct: number
  fxRate: number | null
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const KpiList: React.FC<KpiListProps> = ({
  income,
  expenses,
  savings,
  savingsPct,
  fxRate,
}) => (
  <View style={styles.container}>
    {/* 2-column grid of tiles */}
    <View style={styles.row}>
      <KpiTile
        label="INGRESOS"
        value={formatARS(income)}
        valueColor={colors.success}
      />
      <KpiTile
        label="GASTOS"
        value={formatARS(expenses)}
        valueColor={colors.danger}
      />
    </View>
    <View style={styles.row}>
      <KpiTile
        label="AHORROS"
        value={`${savingsPct}%`}
        subtitle={formatARS(savings)}
        valueColor={colors.brand}
      />
      <KpiTile
        label="DÓLAR BLUE"
        value={fxRate !== null ? `$${fxRate.toLocaleString('es-AR')}` : '—'}
        valueColor={colors.text}
      />
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 80,
  },
  tileLabel: {
    fontSize: 10,
    color: colors.mute,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  tileSubtitle: {
    fontSize: 11,
    color: colors.mute,
    marginTop: 2,
  },
})
