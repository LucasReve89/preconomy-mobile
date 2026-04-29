/**
 * BudgetsScreen — Composition shell for the RN Presupuestos screen.
 *
 * Structure:
 *   - Header with title
 *   - 2-tab toggle: Activos | Reporte
 *   - Pull-to-refresh
 *   - Tab content (BudgetsActivos or BudgetsReporte)
 *
 * Histórico tab: DEFERRED (matching web spec P42).
 * No hex literals — all colors via Foundation theme tokens.
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing, radii, typography } from '../../theme'
import { BudgetsActivos } from './components/BudgetsActivos'
import { BudgetsReporte } from './components/BudgetsReporte'

type Tab = 'activos' | 'reporte'

const TABS: { key: Tab; label: string }[] = [
  { key: 'activos', label: 'Activos' },
  { key: 'reporte', label: 'Reporte' },
]

export const BudgetsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('activos')
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Current month/year for data fetching
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // 1-based

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    // Bump refreshKey so child components re-mount and re-fetch
    setRefreshKey((k) => k + 1)
    // Simulate brief refresh delay, then resolve
    setTimeout(() => setRefreshing(false), 600)
  }, [])

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>PRESUPUESTOS</Text>
        <Text style={styles.headerTitle}>Presupuestos</Text>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabStrip}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabButton,
                isActive ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Tab content with pull-to-refresh */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {activeTab === 'activos' ? (
          <BudgetsActivos key={`activos-${refreshKey}`} year={year} month={month} />
        ) : (
          <BudgetsReporte key={`reporte-${refreshKey}`} year={year} month={month} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerEyebrow: {
    color: colors.mute,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
  },
  tabStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.full,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.brand,
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.bg,
  },
  tabLabelInactive: {
    color: colors.mute,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing['2xl'],
  },
})
