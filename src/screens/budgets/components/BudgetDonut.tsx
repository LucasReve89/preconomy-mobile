/**
 * BudgetDonut — Donut chart using react-native-svg.
 * Displays budget spend percentage with color-coded arc.
 * No hex literals — all colors via Foundation theme tokens.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { colors, typography } from '../../../theme'

export interface BudgetDonutProps {
  /** Total allocated budget amount */
  allocated: number
  /** Amount spent so far */
  spent: number
  /** SVG canvas side length in dp (default 200) */
  size?: number
  /** Stroke width of the ring (default 24) */
  stroke?: number
}

/**
 * Pure SVG donut — no chart library dependency.
 * Arc color:
 *   - spent > allocated → danger
 *   - ratio >= 0.75     → warn
 *   - otherwise         → brand
 */
export const BudgetDonut: React.FC<BudgetDonutProps> = ({
  allocated,
  spent,
  size = 200,
  stroke = 24,
}) => {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = allocated > 0 ? Math.min(spent / allocated, 1) : 0
  const dashOffset = circumference * (1 - ratio)
  const overspent = allocated > 0 && spent > allocated
  const arcColor = overspent
    ? colors.danger
    : ratio >= 0.75
    ? colors.warn
    : colors.brand

  const percent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0
  const percentLabel = allocated > 0 ? `${percent}%` : '—'

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityLabel={`Presupuesto: ${percentLabel} utilizado. ${spent} de ${allocated}.`}
    >
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.line2}
          strokeWidth={stroke}
          fill="none"
        />

        {/* Spend arc — only render when there is spend or allocation */}
        {allocated > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        )}

        {/* Center percentage */}
        <SvgText
          x="50%"
          y="46%"
          textAnchor="middle"
          fill={colors.text}
          fontSize={size * 0.18}
          fontWeight="800"
        >
          {percentLabel}
        </SvgText>

        {/* Center sub-label */}
        <SvgText
          x="50%"
          y="62%"
          textAnchor="middle"
          fill={colors.mute}
          fontSize={size * 0.08}
        >
          {allocated > 0 ? 'utilizado' : 'sin presupuesto'}
        </SvgText>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
})
