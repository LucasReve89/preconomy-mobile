/**
 * Login Screen for PREconomy Mobile
 */

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useAuthStore } from '../../stores/authStore'

WebBrowser.maybeCompleteAuthSession()

const GOOGLE_WEB_CLIENT_ID =
  '809244958120-sia4uaul3khtsmtc55j84o8hh3simmbk.apps.googleusercontent.com'
const GOOGLE_IOS_CLIENT_ID =
  '809244958120-fosmlb8tde85d8dt2fa41roj5idqvd95.apps.googleusercontent.com'

interface LoginScreenProps {
  navigation: any
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { login, loginWithGoogle, loading, error, clearError } = useAuthStore()

  // Google OAuth — get access token, then fetch user info to get id_token
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  })

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      // We got an access token — use it to get the id_token from userinfo
      const accessToken = response.authentication.accessToken
      const idToken = response.authentication.idToken
      if (idToken) {
        handleGoogleToken(idToken)
      } else if (accessToken) {
        // Fallback: fetch Google userinfo and login with that
        fetchGoogleUserAndLogin(accessToken)
      } else {
        Alert.alert('Error', 'No se pudo obtener el token de Google')
      }
    } else if (response?.type === 'error') {
      Alert.alert(
        'Error',
        'Error al iniciar sesión con Google: ' +
          (response.error?.message || 'Desconocido')
      )
    }
  }, [response])

  const fetchGoogleUserAndLogin = async (accessToken: string) => {
    setGoogleLoading(true)
    try {
      // Get user info from Google using access token
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const userInfo = await res.json()

      if (userInfo.email) {
        // Try to get an id_token by hitting the tokeninfo endpoint
        const tokenRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
        )
        const tokenInfo = await tokenRes.json()

        // If we can't get id_token, we need the backend to support access_token login
        // For now, alert the user
        Alert.alert('Error', 'No se pudo completar la autenticación con Google')
      }
    } catch (error) {
      Alert.alert('Error', 'Error al obtener datos de Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true)
    try {
      clearError()
      await loginWithGoogle(idToken)
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          'No se pudo iniciar sesión con Google. Verificá que tu cuenta esté registrada.'
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos')
      return
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido')
      return
    }

    try {
      clearError()
      await login(email.trim(), password)
    } catch (error: any) {
      Alert.alert(
        'Error de Login',
        error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.'
      )
    }
  }

  const navigateToRegister = () => {
    navigation.navigate('Register')
  }

  const isLoading = loading || googleLoading

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitleText}>
              Tu gestión financiera personal
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.disabledButton]}
              onPress={() => promptAsync()}
              disabled={isLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>
                    Continuar con Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>o</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Contraseña"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity
                onPress={navigateToRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerLink}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  separatorText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  passwordToggleText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  registerLink: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
})
