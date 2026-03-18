/**
 * PREconomy Mobile App - Main Entry Point
 */

import React, { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Asset } from 'expo-asset'
import { AppNavigator } from './src/navigation/AppNavigator'

export default function App() {
  const [assetsReady, setAssetsReady] = useState(false)

  useEffect(() => {
    Asset.loadAsync([require('./assets/logo.png')])
      .then(() => setAssetsReady(true))
      .catch(() => setAssetsReady(true)) // Continue even if preload fails
  }, [])

  if (!assetsReady) {
    return null
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <AppNavigator />
    </SafeAreaProvider>
  )
}
