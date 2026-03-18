/**
 * Cards Screen - View and manage credit/debit cards with cycle details
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'
import type { Card, Bank } from '../../types'

interface CycleInfo {
  cycleTotalAmount?: number
  cyclePaidAmount?: number
  cycleStatus?: string
  closeDay?: number
  dueDate?: string | number[]
  totalFixedExpenses?: number
  totalVariableExpenses?: number
  totalInstallmentExpenses?: number
}

export const CardsScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuthStore()
  const [cards, setCards] = useState<Card[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Expanded card detail
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null)
  const [cycleData, setCycleData] = useState<Record<number, CycleInfo | null>>({})
  const [loadingCycle, setLoadingCycle] = useState<number | null>(null)

  // Add card modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [newBankName, setNewBankName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCards = useCallback(async () => {
    try {
      const [cardsRes, banksRes] = await Promise.all([
        apiClient.getCards().catch(() => []),
        apiClient.getBanks().catch(() => []),
      ])
      setCards(cardsRes || [])
      setBanks(banksRes || [])
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las tarjetas')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCards()
    })
    return unsubscribe
  }, [navigation, loadCards])

  const onRefresh = () => {
    setRefreshing(true)
    setCycleData({})
    setExpandedCardId(null)
    loadCards()
  }

  const handleCardPress = async (card: Card) => {
    if (expandedCardId === card.id) {
      setExpandedCardId(null)
      return
    }

    setExpandedCardId(card.id)

    // Load cycle data if not cached
    if (!cycleData[card.id]) {
      setLoadingCycle(card.id)
      try {
        const now = new Date()
        const data = await apiClient.getCardCycle(card.id, now.getFullYear(), now.getMonth() + 1)
        setCycleData((prev) => ({ ...prev, [card.id]: data }))
      } catch {
        setCycleData((prev) => ({ ...prev, [card.id]: null }))
      } finally {
        setLoadingCycle(null)
      }
    }
  }

  const handleAddCard = async () => {
    if (!newCardName.trim()) {
      Alert.alert('Validación', 'El tipo de tarjeta es obligatorio')
      return
    }
    if (!newBankName.trim()) {
      Alert.alert('Validación', 'El banco es obligatorio')
      return
    }
    if (!user) return

    setSaving(true)
    try {
      await apiClient.saveCard({
        card_name: newCardName.trim(),
        bank_name: newBankName.trim(),
        username: user.username,
        email: user.email,
      })
      setShowAddModal(false)
      setNewCardName('')
      setNewBankName('')
      loadCards()
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo agregar la tarjeta')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = (card: Card) => {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Eliminar "${card.card_name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteCard(card.id)
              loadCards()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la tarjeta')
            }
          },
        },
      ]
    )
  }

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount)

  const parseDueDate = (val: any): string => {
    if (!val) return '-'
    if (Array.isArray(val)) {
      return `${val[2] || 1}/${val[1] || 1}/${val[0]}`
    }
    if (typeof val === 'string') {
      const d = new Date(val)
      return !isNaN(d.getTime()) ? d.toLocaleDateString('es-AR') : '-'
    }
    return '-'
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return '#10b981'
      case 'ACTIVE': case 'OPEN': return '#f59e0b'
      case 'OVERDUE': return '#ef4444'
      default: return '#94a3b8'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return 'Pagado'
      case 'ACTIVE': case 'OPEN': return 'Activo'
      case 'OVERDUE': return 'Vencido'
      case 'CLOSED': return 'Cerrado'
      default: return status || 'Sin datos'
    }
  }

  const cardTypes = ['Visa', 'Mastercard', 'American Express', 'Visa Débito', 'Mastercard Débito']

  const renderCard = ({ item }: { item: Card }) => {
    const bankName = item.banks?.[0]?.bank_name || 'Sin banco'
    const isExpanded = expandedCardId === item.id
    const cycle = cycleData[item.id]
    const isLoadingThis = loadingCycle === item.id

    return (
      <View>
        <TouchableOpacity
          style={[styles.cardItem, isExpanded && styles.cardItemExpanded]}
          onPress={() => handleCardPress(item)}
          onLongPress={() => handleDeleteCard(item)}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardChip} />
            <Text style={styles.cardType}>{item.card_name}</Text>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.cardBank}>{bankName}</Text>
            <View
              style={[
                styles.cardStatus,
                { backgroundColor: item.active !== false ? '#065f4620' : '#7f1d1d20' },
              ]}
            >
              <Text
                style={[
                  styles.cardStatusText,
                  { color: item.active !== false ? '#10b981' : '#ef4444' },
                ]}
              >
                {item.active !== false ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={styles.detailContainer}>
            {isLoadingThis ? (
              <ActivityIndicator color="#10b981" style={{ padding: 20 }} />
            ) : cycle ? (
              <>
                {/* Status + Total */}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado del ciclo</Text>
                  <Text style={[styles.detailBadge, { color: getStatusColor(cycle.cycleStatus) }]}>
                    {getStatusLabel(cycle.cycleStatus)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total del período</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(cycle.cycleTotalAmount || 0)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pagado</Text>
                  <Text style={[styles.detailValue, { color: '#10b981' }]}>
                    {formatCurrency(cycle.cyclePaidAmount || 0)}
                  </Text>
                </View>

                {(cycle.cycleTotalAmount || 0) - (cycle.cyclePaidAmount || 0) > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pendiente</Text>
                    <Text style={[styles.detailValue, { color: '#ef4444' }]}>
                      {formatCurrency((cycle.cycleTotalAmount || 0) - (cycle.cyclePaidAmount || 0))}
                    </Text>
                  </View>
                )}

                {/* Due date */}
                {cycle.dueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Vencimiento</Text>
                    <Text style={styles.detailValue}>{parseDueDate(cycle.dueDate)}</Text>
                  </View>
                )}

                {cycle.closeDay && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Cierre</Text>
                    <Text style={styles.detailValue}>Día {cycle.closeDay}</Text>
                  </View>
                )}

                {/* Expense breakdown */}
                {(cycle.totalFixedExpenses || cycle.totalVariableExpenses || cycle.totalInstallmentExpenses) ? (
                  <View style={styles.breakdownSection}>
                    <Text style={styles.breakdownTitle}>Desglose</Text>
                    {cycle.totalFixedExpenses ? (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Gastos fijos</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(cycle.totalFixedExpenses)}</Text>
                      </View>
                    ) : null}
                    {cycle.totalVariableExpenses ? (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Gastos variables</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(cycle.totalVariableExpenses)}</Text>
                      </View>
                    ) : null}
                    {cycle.totalInstallmentExpenses ? (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Cuotas</Text>
                        <Text style={styles.breakdownValue}>{formatCurrency(cycle.totalInstallmentExpenses)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.noDataText}>
                No hay datos del ciclo actual para esta tarjeta
              </Text>
            )}
          </View>
        )}
      </View>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tarjetas</Text>
          <Text style={styles.subtitle}>
            {cards.length} tarjeta{cards.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Card list */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💳</Text>
            <Text style={styles.emptyText}>No tenés tarjetas</Text>
            <Text style={styles.emptySubtext}>Agregá tu primera tarjeta</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>+ Agregar tarjeta</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add Card Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva tarjeta</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tipo de tarjeta</Text>
            <View style={styles.cardTypeRow}>
              {cardTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chipButton,
                    newCardName === type && styles.chipButtonActive,
                  ]}
                  onPress={() => setNewCardName(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      newCardName === type && styles.chipTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Banco</Text>
            <TextInput
              style={styles.input}
              value={newBankName}
              onChangeText={setNewBankName}
              placeholder="Nombre del banco"
              placeholderTextColor="#64748b"
            />
            {banks.length > 0 && (
              <View style={styles.bankSuggestions}>
                {banks.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.chipButton,
                      newBankName === b.bank_name && styles.chipButtonActive,
                    ]}
                    onPress={() => setNewBankName(b.bank_name)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        newBankName === b.bank_name && styles.chipTextActive,
                      ]}
                    >
                      {b.bank_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddCard}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Agregar tarjeta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Card item
  cardItem: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardChip: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    opacity: 0.8,
  },
  cardType: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBank: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
  cardStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Detail panel
  detailContainer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    borderTopColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  breakdownSection: {
    marginTop: 8,
    paddingTop: 8,
  },
  breakdownTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  breakdownValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  noDataText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Form
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bankSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  cardTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
})
