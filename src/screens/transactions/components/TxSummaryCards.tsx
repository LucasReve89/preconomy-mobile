/**
 * TxSummaryCards — 3-card summary strip for TransactionsScreen.
 * Shows Ingresos / Gastos / Neto using Foundation theme tokens.
 * Reuses KpiTile from dashboard components.
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '../../../theme'
import { KpiTile } from '../../dashboard/components/KpiList'

interface TxSummaryCardsProps {
  ingresos: number
  gastos: number
  neto: number
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const TxSummaryCards: React.FC<TxSummaryCardsProps> = ({
  ingresos,
  gastos,
  neto,
}) => (
  <View style={styles.container}>
    <KpiTile
      label="INGRESOS"
      value={formatARS(ingresos)}
      valueColor={colors.success}
    />
    <KpiTile
      label="GASTOS"
      value={formatARS(gastos)}
      valueColor={colors.danger}
    />
    <KpiTile
      label="NETO"
      value={formatARS(neto)}
      valueColor={neto >= 0 ? colors.success : colors.danger}
    />
  </View>
)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
})
