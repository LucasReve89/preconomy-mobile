/**
 * MoreMenuScreen — Secondary navigation hub ("Más" tab root)
 *
 * Lists secondary app sections (Análisis, Presupuestos, …).
 * Future items (Cuotas, Notificaciones, etc.) can be added to the `items`
 * array without touching layout code.
 */

import React from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { colors } from '../../theme'

// ─── Types ──────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  label: string
  description: string
  icon: string
  route: string
}

// ─── Menu items (extend here for Cuotas, Notificaciones, etc.) ──────────────

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'analytics',
    label: 'Análisis',
    description: 'Salud financiera y desglose de gastos',
    icon: '📈',
    route: 'Analytics',
  },
  {
    id: 'budgets',
    label: 'Presupuestos',
    description: 'Sobres, metas y reportes mensuales',
    icon: '💰',
    route: 'Budgets',
  },
]

// ─── Row component ───────────────────────────────────────────────────────────

interface MenuRowProps {
  item: MenuItem
  onPress: (route: string) => void
}

const MenuRow: React.FC<MenuRowProps> = ({ item, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.row,
      pressed && styles.rowPressed,
    ]}
    onPress={() => onPress(item.route)}
    accessibilityLabel={item.label}
    accessibilityRole="button"
  >
    <View style={styles.rowLeft}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        <Text style={styles.rowDescription}>{item.description}</Text>
      </View>
    </View>
    <Text style={styles.chevron}>›</Text>
  </Pressable>
)

// ─── Screen ──────────────────────────────────────────────────────────────────

export const MoreMenuScreen: React.FC = () => {
  const navigation = useNavigation<any>()

  const handleNavigate = (route: string) => {
    navigation.navigate(route)
  }

  const renderItem = ({ item }: ListRenderItemInfo<MenuItem>) => (
    <MenuRow item={item} onPress={handleNavigate} />
  )

  const renderSeparator = () => <View style={styles.separator} />

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={MENU_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.list}
        style={styles.flatList}
      />
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flatList: {
    flex: 1,
  },
  list: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: colors.cardSoft,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 22,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowDescription: {
    color: colors.mute,
    fontSize: 13,
  },
  chevron: {
    color: colors.mute2,
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  separator: {
    height: 10,
  },
})
