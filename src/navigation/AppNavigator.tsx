/**
 * Main App Navigator for PREconomy Mobile
 */

import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { useAuthStore, initializeAuth } from '../stores/authStore'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { LoadingScreen } from '../screens/LoadingScreen'

const Stack = createStackNavigator()

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore()

  useEffect(() => {
    // Initialize authentication when app starts
    initializeAuth()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}