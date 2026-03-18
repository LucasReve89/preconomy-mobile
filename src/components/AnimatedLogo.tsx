import React, { useEffect, useRef } from 'react'
import { View, Image, Animated, StyleSheet } from 'react-native'

interface AnimatedLogoProps {
  size?: number
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 120 }) => {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [scale])

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/logo.png')}
        style={[
          { width: size, height: size },
          { transform: [{ scale }] },
        ]}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
