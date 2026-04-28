/**
 * HealthScoreCard — RN equivalent of HeroHealthCard (web)
 * Uses react-native-svg for the score ring.
 * Segment bar uses flex View (no SVG chart library).
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors } from '../../../theme'

interface HealthScoreCardProps {
  score: number | null
  monthlyIncome: number
  monthlyExpenses: number
  savings: number
  month?: string
}

const RING_RADIUS = 44
const STROKE_WIDTH = 8
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function scoreColor(score: number | null): string {
  if (score === null) return colors.mute
  if (score >= 85) return colors.success
  if (score >= 70) return '#60A5FA' // blue-400
  if (score >= 50) return colors.warn
  return colors.danger
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}k`
  }
  return `$${amount}`
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({
  score,
  monthlyIncome,
  monthlyExpenses,
  savings,
  month,
}) => {
  const safeSavings = Math.max(savings, 0)
  const slack = Math.max(monthlyIncome - monthlyExpenses - safeSavings, 0)
  const total = monthlyIncome + monthlyExpenses + safeSavings + slack

  const progressValue = score !== null ? Math.min(Math.max(score, 0), 100) : 0
  const strokeDashoffset = CIRCUMFERENCE - (progressValue / 100) * CIRCUMFERENCE
  const ringColor = scoreColor(score)

  const segments = [
    { label: 'Ingresos', amount: monthlyIncome, color: colors.success },
    { label: 'Gastos',   amount: monthlyExpenses, color: colors.danger },
    { label: 'Ahorros',  amount: safeSavings, color: colors.brand },
    { label: 'Margen',   amount: slack, color: colors.mute2 },
  ]

  return (
    <View style={styles.card}>
      {/* Ring + score */}
      <View style={styles.ringRow}>
        <View style={styles.ringContainer}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            {/* Track */}
            <Circle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              stroke={colors.line}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Progress */}
            <Circle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              // rotate -90deg so progress starts from top
              rotation={-90}
              originX={50}
              originY={50}
            />
          </Svg>
          {/* Score label in center */}
          <View style={styles.scoreOverlay}>
            <Text style={[styles.scoreNumber, { color: ringColor }]}>
              {score !== null ? score : '—'}
            </Text>
            <Text style={styles.scoreSlash}>/100</Text>
          </View>
        </View>

        {/* Segment legend */}
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendLabel}>{seg.label}</Text>
              <Text style={styles.legendAmount}>{formatCurrencyShort(seg.amount)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Segment bar */}
      {total > 0 && (
        <View style={styles.segBar}>
          {segments.map((seg) => (
            <View
              key={seg.label}
              style={{
                flex: total > 0 ? seg.amount / total : 0,
                backgroundColor: seg.color,
                minWidth: seg.amount > 0 ? 2 : 0,
              }}
            />
          ))}
        </View>
      )}

      {/* Footer */}
      {month ? (
        <Text style={styles.footer}>Tu salud financiera en {month}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  ringContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  scoreSlash: {
    fontSize: 10,
    color: colors.mute,
    fontWeight: '500',
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.mute,
  },
  legendAmount: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  segBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: colors.bgSoft,
  },
  footer: {
    fontSize: 11,
    color: colors.mute,
    textAlign: 'center',
    marginTop: 4,
  },
})
