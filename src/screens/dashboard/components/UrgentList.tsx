/**
 * UrgentList — list of upcoming card due dates.
 * Returns null when items list is empty (zero DOM footprint).
 * Mirrors web UrgentStrip semantics.
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors } from '../../../theme'

interface UrgentItem {
  cardName: string
  bankName: string
  amountARS: number
  dueDate: string
  daysRemaining: number
}

interface UrgentListProps {
  items: UrgentItem[]
  onPress?: () => void
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

function dueDateLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Vence hoy'
  if (daysRemaining === 1) return 'Vence mañana'
  return `Vence en ${daysRemaining} días`
}

export const UrgentList: React.FC<UrgentListProps> = ({ items, onPress }) => {
  if (items.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>PENDIENTES</Text>
      {items.map((item, idx) => {
        const isUrgent = item.daysRemaining <= 3
        return (
          <TouchableOpacity
            key={idx}
            style={styles.item}
            onPress={onPress}
            activeOpacity={0.75}
          >
            <View style={[styles.accent, { backgroundColor: isUrgent ? colors.danger : colors.brand }]} />
            <View style={styles.itemContent}>
              <Text style={styles.cardName}>{item.cardName}</Text>
              <Text style={styles.bankName}>{item.bankName}</Text>
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.amount}>{formatARS(item.amountARS)}</Text>
              <Text style={[styles.dueLabel, { color: isUrgent ? colors.warn : colors.mute }]}>
                {dueDateLabel(item.daysRemaining)}
              </Text>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  heading: {
    fontSize: 10,
    color: colors.mute,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  itemContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bankName: {
    fontSize: 12,
    color: colors.mute,
    marginTop: 1,
  },
  itemRight: {
    paddingRight: 12,
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dueLabel: {
    fontSize: 11,
    marginTop: 2,
  },
})
