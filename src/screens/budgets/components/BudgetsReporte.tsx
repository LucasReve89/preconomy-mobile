/**
 * BudgetsReporte — Reporte tab content for the RN BudgetsScreen.
 * Calls getMonthlyReport(year, month) and renders sections matching
 * the MonthlyPaymentReportDTO shape:
 *   - Hero balance (dineroRestante)
 *   - Ingresos
 *   - Pagos únicos
 *   - Pagos recurrentes
 *   - Variables
 *   - Tarjetas con ciclos
 *   - Cuotas pendientes
 *   - Falta pagar total
 *
 * No hex literals — all colors via Foundation theme tokens.
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native'
import { apiClient } from '../../../api/api-client'
import type { MonthlyPaymentReportDTO } from '../../../api/api-client'
import { colors, spacing, radii, typography } from '../../../theme'

interface BudgetsReporteProps {
  year: number
  month: number
}

/** Format a number as ARS currency */
const formatARS = (value: number): string =>
  `$ ${Math.abs(value).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`

/** Month name in Spanish */
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface SectionRowProps {
  label: string
  value: number
  isNegative?: boolean
  isHighlight?: boolean
  isLast?: boolean
}

const SectionRow: React.FC<SectionRowProps> = ({
  label,
  value,
  isNegative = false,
  isHighlight = false,
  isLast = false,
}) => {
  const textColor = isHighlight
    ? value < 0
      ? colors.danger
      : colors.success
    : isNegative
    ? colors.danger
    : colors.text

  return (
    <View style={[styles.sectionRow, !isLast && styles.sectionRowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: textColor }]}>
        {isNegative && value > 0 ? '-' : ''}{formatARS(value)}
      </Text>
    </View>
  )
}

interface SectionCardProps {
  title: string
  children: React.ReactNode
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionCardTitle}>{title}</Text>
    {children}
  </View>
)

export const BudgetsReporte: React.FC<BudgetsReporteProps> = ({
  year,
  month,
}) => {
  const [report, setReport] = useState<MonthlyPaymentReportDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getMonthlyReport(year, month)
      setReport(data)
    } catch (err) {
      console.error('BudgetsReporte: error cargando reporte', err)
      setError('No se pudo cargar el reporte mensual.')
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Cargando reporte...</Text>
      </View>
    )
  }

  if (error || !report) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Sin datos disponibles.'}</Text>
        <Pressable style={styles.retryBtn} onPress={loadReport}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    )
  }

  const monthLabel = `${MONTH_NAMES[month - 1] ?? ''} ${year}`

  return (
    <View style={styles.container}>
      {/* Period label */}
      <Text style={styles.periodLabel}>{monthLabel}</Text>

      {/* Hero balance */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Dinero restante</Text>
        <Text
          style={[
            styles.heroAmount,
            { color: report.dineroRestante < 0 ? colors.danger : colors.success },
          ]}
        >
          {formatARS(report.dineroRestante)}
        </Text>
        <Text style={styles.heroSub}>
          {report.dineroRestante >= 0
            ? 'Vas en camino este mes'
            : 'Excediste tu presupuesto'}
        </Text>
      </View>

      {/* Ingresos */}
      <SectionCard title="Ingresos">
        <SectionRow
          label="Total ingresos"
          value={report.totalIncome}
          isLast
        />
      </SectionCard>

      {/* Pagos únicos */}
      <SectionCard title="Pagos únicos">
        <SectionRow
          label="Total"
          value={report.totalUniquePayments}
          isNegative
          isLast
        />
      </SectionCard>

      {/* Pagos recurrentes */}
      <SectionCard title="Pagos recurrentes">
        <SectionRow
          label="Total"
          value={report.totalRecurringPayments}
          isNegative
          isLast
        />
      </SectionCard>

      {/* Variables */}
      <SectionCard title="Variables">
        <SectionRow
          label="Total gastos variables"
          value={report.totalVariableExpenses}
          isNegative
          isLast
        />
      </SectionCard>

      {/* Tarjetas */}
      <SectionCard title="Tarjetas">
        <SectionRow
          label="Total tarjetas"
          value={report.totalCardPayments}
          isNegative
        />
        {report.cardCycles && report.cardCycles.length > 0 && (
          <View style={styles.cardCycleList}>
            {report.cardCycles.map((cycle, idx) => (
              <View key={idx} style={styles.cardCycleRow}>
                <View style={styles.cardCycleInfo}>
                  <Text style={styles.cardCycleName}>{cycle.cardName}</Text>
                  <Text style={styles.cardCycleDate}>
                    {cycle.cycleStart} — {cycle.cycleEnd}
                  </Text>
                </View>
                <View style={styles.cardCycleAmounts}>
                  <Text style={styles.cardCycleSpent}>
                    {formatARS(cycle.totalSpent)}
                  </Text>
                  {cycle.carryOver > 0 && (
                    <Text style={styles.carryOver}>
                      + {formatARS(cycle.carryOver)} carry-over
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {/* Cuotas pendientes */}
      <SectionCard title="Cuotas pendientes">
        <SectionRow
          label="Cuotas"
          value={report.pendingInstallments}
          isNegative
          isLast
        />
      </SectionCard>

      {/* Falta pagar total */}
      <View style={[styles.sectionCard, styles.faltaCard]}>
        <Text style={styles.sectionCardTitle}>Falta pagar</Text>
        <SectionRow
          label="Total pendiente"
          value={report.faltaPagar}
          isNegative
          isHighlight
          isLast
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
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
  periodLabel: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroLabel: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: '800',
  },
  heroSub: {
    color: colors.mute,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  faltaCard: {
    borderColor: colors.line2,
  },
  sectionCardTitle: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.fontSize.md,
    flex: 1,
  },
  rowValue: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  cardCycleList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cardCycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardCycleInfo: {
    flex: 1,
    gap: 2,
  },
  cardCycleName: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  cardCycleDate: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
  },
  cardCycleAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cardCycleSpent: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  carryOver: {
    color: colors.warn,
    fontSize: typography.fontSize.xs,
  },
})
