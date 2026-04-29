/**
 * Main Navigation for authenticated users
 *
 * Tab structure:
 *  1. Dashboard (Inicio)
 *  2. Transactions (Movimientos)
 *  3. Cards (Tarjetas)
 *  4. Profile (Perfil)
 *  5. More (Más) → MoreStack (MoreMenuScreen → Analytics | Budgets)
 */

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Platform, View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme'

import { DashboardScreen } from '../screens/dashboard/DashboardScreen'
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen'
import { AddTransactionScreen } from '../screens/transactions/AddTransactionScreen'
import { CardsScreen } from '../screens/cards/CardsScreen'
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'
import { MoreMenuScreen } from '../screens/more/MoreMenuScreen'

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const iconMap: Record<string, string> = {
    Dashboard: '📊',
    Transactions: '💳',
    Cards: '💳',
    Profile: '👤',
    More: '☰',
  }

  return <Text style={{ fontSize: 20 }}>{iconMap[name] || '•'}</Text>
}

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

// ─── Tab stacks (unchanged) ────────────────────────────────────────────────

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={DashboardScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
  </Stack.Navigator>
)

const TransactionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransactionsMain" component={TransactionsScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
  </Stack.Navigator>
)

// ─── BudgetsScreen placeholder (Batch 5 will replace this) ─────────────────

const BudgetsScreenPlaceholder: React.FC = () => (
  <View style={placeholderStyles.container}>
    <Text style={placeholderStyles.emoji}>💰</Text>
    <Text style={placeholderStyles.title}>Presupuestos</Text>
    <Text style={placeholderStyles.subtitle}>Próximamente</Text>
  </View>
)

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.mute,
    fontSize: 14,
  },
})

// ─── MoreStack (Analytics + Budgets behind Más tab) ────────────────────────

const MoreStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: colors.bgSoft,
        shadowColor: 'transparent',
        elevation: 0,
      },
      headerTintColor: colors.brand,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 17,
      },
    }}
  >
    <Stack.Screen
      name="MoreMenu"
      component={MoreMenuScreen}
      options={{ title: 'Más' }}
    />
    <Stack.Screen
      name="Analytics"
      component={AnalyticsScreen}
      options={{ title: 'Análisis' }}
    />
    <Stack.Screen
      name="Budgets"
      component={BudgetsScreenPlaceholder}
      options={{ title: 'Presupuestos' }}
    />
  </Stack.Navigator>
)

// ─── Main tab navigator ─────────────────────────────────────────────────────

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.mute,
        tabBarStyle: {
          backgroundColor: colors.bgSoft,
          borderTopColor: colors.line2,
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{ tabBarLabel: 'Movimientos' }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{ tabBarLabel: 'Tarjetas' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{ tabBarLabel: 'Más' }}
      />
    </Tab.Navigator>
  )
}
