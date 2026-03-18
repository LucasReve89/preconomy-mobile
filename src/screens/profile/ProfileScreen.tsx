/**
 * Profile Screen - User info, edit profile, change password, logout
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'

type Tab = 'info' | 'password'

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('info')

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiClient.getUserProfile()
      const p = data.user || data
      setProfile(p)
      setFirstName(p.firstName || '')
      setLastName(p.lastName || '')
      setPhone(p.mobileNumber || p.phone || '')

      // Load profile image
      const imgName = p.profileImage || p.profileImageUrl
      if (imgName && imgName !== '/placeholder.svg') {
        if (imgName.includes('googleapis.com')) {
          setProfileImageUrl(imgName)
        } else {
          const signedUrl = await apiClient.getProfileImageSignedUrl(imgName)
          if (signedUrl) setProfileImageUrl(signedUrl)
        }
      }
    } catch {
      // Use data from auth store as fallback
      if (user) {
        setProfile(user)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const parseDate = (dateVal: any): string => {
    if (!dateVal) return '-'
    if (Array.isArray(dateVal)) {
      return `${dateVal[2] || 1}/${dateVal[1] || 1}/${dateVal[0]}`
    }
    if (typeof dateVal === 'string') {
      const d = new Date(dateVal)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-AR')
      }
    }
    return '-'
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await apiClient.editUser({
        id: profile?.id || user?.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: phone.trim(),
        email: user.email,
        username: user.username,
      })
      setEditing(false)
      Alert.alert('Listo', 'Perfil actualizado')
      loadProfile()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validación', 'Ingresá tu contraseña actual')
      return
    }
    if (newPassword.length < 8) {
      Alert.alert('Validación', 'La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validación', 'Las contraseñas no coinciden')
      return
    }
    if (!user) return

    setSavingPassword(true)
    try {
      await apiClient.updatePassword({
        currentPassword,
        newPassword,
        email: user.email,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Listo', 'Contraseña actualizada')
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo cambiar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <AnimatedLogo />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.username || user?.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.profileName}>
              {profile?.firstName && profile?.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : profile?.username || user?.username}
            </Text>
            <Text style={styles.profileEmail}>
              {profile?.email || user?.email}
            </Text>
            <Text style={styles.profileSince}>
              Miembro desde {parseDate(profile?.registrationDate)}
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}
            >
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                Datos personales
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'password' && styles.tabActive]}
              onPress={() => setActiveTab('password')}
            >
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
                Contraseña
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Tab */}
          {activeTab === 'info' && (
            <View style={styles.section}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Usuario</Text>
                <Text style={styles.fieldValue}>{profile?.username || user?.username}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{profile?.email || user?.email}</Text>
              </View>

              {editing ? (
                <>
                  <Text style={styles.inputLabel}>Nombre</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Nombre"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>Apellido</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Apellido"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Teléfono"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                  />

                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setEditing(false)
                        setFirstName(profile?.firstName || '')
                        setLastName(profile?.lastName || '')
                        setPhone(profile?.mobileNumber || profile?.phone || '')
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, { marginTop: 0 }, savingProfile && styles.saveButtonDisabled]}
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                    >
                      {savingProfile ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>Guardar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {profile?.firstName && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Nombre</Text>
                      <Text style={styles.fieldValue}>
                        {profile.firstName} {profile.lastName || ''}
                      </Text>
                    </View>
                  )}
                  {(profile?.mobileNumber || profile?.phone) && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Teléfono</Text>
                      <Text style={styles.fieldValue}>{profile.mobileNumber || profile.phone}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setEditing(true)}
                  >
                    <Text style={styles.editButtonText}>Editar perfil</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <View style={styles.section}>
              <Text style={styles.inputLabel}>Contraseña actual</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#64748b"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repetir contraseña"
                placeholderTextColor="#64748b"
                secureTextEntry
              />

              {newPassword.length > 0 && (
                <View style={styles.requirements}>
                  <Text style={[styles.req, newPassword.length >= 8 && styles.reqMet]}>
                    {newPassword.length >= 8 ? '✓' : '✗'} Mínimo 8 caracteres
                  </Text>
                  <Text style={[styles.req, /[A-Z]/.test(newPassword) && styles.reqMet]}>
                    {/[A-Z]/.test(newPassword) ? '✓' : '✗'} Una mayúscula
                  </Text>
                  <Text style={[styles.req, /[0-9]/.test(newPassword) && styles.reqMet]}>
                    {/[0-9]/.test(newPassword) ? '✓' : '✗'} Un número
                  </Text>
                  <Text style={[styles.req, newPassword === confirmPassword && confirmPassword.length > 0 && styles.reqMet]}>
                    {newPassword === confirmPassword && confirmPassword.length > 0 ? '✓' : '✗'} Contraseñas coinciden
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveButton, savingPassword && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Cambiar contraseña</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  profileSince: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  // Section
  section: {
    marginHorizontal: 20,
  },
  fieldRow: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  fieldValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editButton: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  editButtonText: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Password requirements
  requirements: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    gap: 6,
  },
  req: {
    color: '#ef4444',
    fontSize: 13,
  },
  reqMet: {
    color: '#10b981',
  },
  // Logout
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
})
