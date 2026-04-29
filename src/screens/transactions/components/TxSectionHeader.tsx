/**
 * TxSectionHeader — date label component for SectionList section headers.
 * Renders a mono uppercase label using Foundation theme tokens.
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../../theme'

interface TxSectionHeaderProps {
  label: string
}

export const TxSectionHeader: React.FC<TxSectionHeaderProps> = ({ label }) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  label: {
    fontSize: 11,
    color: colors.mute,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
