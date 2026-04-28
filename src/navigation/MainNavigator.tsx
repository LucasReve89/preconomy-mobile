/**
 * Main Navigation for authenticated users
 */

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Platform } from 'react-native'
import { colors } from '../theme'

import { DashboardScreen } from '../screens/dashboard/DashboardScreen'
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen'
import { AddTransactionScreen } from '../screens/transactions/AddTransactionScreen'
import { CardsScreen } from '../screens/cards/CardsScreen'
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'

import { Text } from 'react-native'

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const iconMap: Record<string, string> = {
    Dashboard: '📊',
    Transactions: '💳',
    Cards: '💳',
    Analytics: '📈',
    Profile: '👤',
  }

  return <Text style={{ fontSize: 20 }}>{iconMap[name] || '•'}</Text>
}

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

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

const CardsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CardsMain" component={CardsScreen} />
  </Stack.Navigator>
)

const AnalyticsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} />
  </Stack.Navigator>
)

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
  </Stack.Navigator>
)

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
        options={{
          title: 'Inicio'
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{
          title: 'Movimientos'
        }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsStack}
        options={{
          title: 'Tarjetas'
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsStack}
        options={{
          title: 'Análisis'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Perfil'
        }}
      />
    </Tab.Navigator>
  )
}