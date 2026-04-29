/**
 * TxFilterChips — horizontal chip row for TransactionsScreen.
 * 4 chips: Todas / Gastos / Ingresos / Cuotas.
 * Uses Foundation theme tokens — NO inline color hex literals.
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { colors } from '../../../theme'

export type TxFilterType = 'all' | 'expense' | 'income' | 'installment'

interface Chip {
  key: TxFilterType
  label: string
}

const CHIPS: Chip[] = [
  { key: 'all', label: 'Todas' },
  { key: 'expense', label: 'Gastos' },
  { key: 'income', label: 'Ingresos' },
  { key: 'installment', label: 'Cuotas' },
]

interface TxFilterChipsProps {
  activeFilter: TxFilterType
  onFilterChange: (filter: TxFilterType) => void
}

export const TxFilterChips: React.FC<TxFilterChipsProps> = ({
  activeFilter,
  onFilterChange,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.scrollContent}
    style={styles.scroll}
  >
    {CHIPS.map((chip) => {
      const isActive = chip.key === activeFilter
      return (
        <TouchableOpacity
          key={chip.key}
          style={[styles.chip, isActive && styles.chipActive]}
          onPress={() => onFilterChange(chip.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
            {chip.label}
          </Text>
        </TouchableOpacity>
      )
    })}
  </ScrollView>
)

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 8,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.mute,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.bg,
  },
})
