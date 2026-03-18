/**
 * Add Transaction Screen - Create expenses or income
 * Uses the same backend endpoints as the web app
 */

import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Switch,
  Image,
  Animated as RNAnimated,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { apiClient } from '../../api/api-client'
import { useAuthStore } from '../../stores/authStore'
import { AnimatedLogo } from '../../components/AnimatedLogo'
import type { ExpenseType, PaymentMethod, Card } from '../../types'

type TransactionType = 'expense' | 'income'

interface PickerModalProps {
  visible: boolean
  title: string
  data: { id: number; label: string }[]
  onSelect: (item: { id: number; label: string }) => void
  onClose: () => void
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  data,
  onSelect,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Cerrar</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                onSelect(item)
                onClose()
              }}
            >
              <Text style={styles.modalItemText}>{item.label}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.modalEmpty}>No hay opciones disponibles</Text>
          }
        />
      </View>
    </View>
  </Modal>
)

export const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<any>()
  const { user } = useAuthStore()

  // Form state
  const [txType, setTxType] = useState<TransactionType>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Expense-specific
  const [selectedExpenseType, setSelectedExpenseType] = useState<{
    id: number
    label: string
    category: string
  } | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<{
    id: number
    label: string
  } | null>(null)
  const [selectedCard, setSelectedCard] = useState<{
    id: number
    label: string
    cardString: string
  } | null>(null)

  // Installment state
  const [isInstallment, setIsInstallment] = useState(false)
  const [totalInstallments, setTotalInstallments] = useState('')
  const [installmentNumber, setInstallmentNumber] = useState('1')

  // Dropdown data from API
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [cards, setCards] = useState<Card[]>([])

  // Toast state
  const [toastMessage, setToastMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const toastOpacity = useRef(new RNAnimated.Value(0)).current

  const showToast = (message: string) => {
    Keyboard.dismiss()
    setSaved(true)
    setToastMessage(message)
    RNAnimated.sequence([
      RNAnimated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      RNAnimated.delay(1200),
      RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      navigation.goBack()
    })
  }

  // UI state
  const [saving, setSaving] = useState(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState(true)
  const [showExpenseTypePicker, setShowExpenseTypePicker] = useState(false)
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false)
  const [showCardPicker, setShowCardPicker] = useState(false)

  useEffect(() => {
    loadDropdownData()
  }, [])

  const loadDropdownData = async () => {
    try {
      const [types, methods, cardList] = await Promise.all([
        apiClient.getExpenseTypes().catch(() => []),
        apiClient.getPaymentMethods().catch(() => []),
        apiClient.getCards().catch(() => []),
      ])
      setExpenseTypes(types.filter((t) => t.active))
      setPaymentMethods(methods)
      setCards(cardList.filter((c) => c.active))
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos del formulario')
    } finally {
      setLoadingDropdowns(false)
    }
  }

  const needsCard =
    selectedPaymentMethod?.label?.toLowerCase().includes('tarjeta de crédito') ||
    selectedPaymentMethod?.label?.toLowerCase().includes('tarjeta de credito')

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateISO = (date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setSelectedDate(date)
    }
    setShowDatePicker(false)
  }

  const validate = (): string | null => {
    if (!description.trim()) return 'La descripción es obligatoria'
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0)
      return 'El monto debe ser un número válido mayor a 0'

    if (txType === 'expense') {
      if (!selectedExpenseType) return 'El tipo de gasto es obligatorio'
      if (!selectedPaymentMethod) return 'El método de pago es obligatorio'
      if (needsCard && !selectedCard) return 'La tarjeta es obligatoria'

      if (isInstallment) {
        const total = parseInt(totalInstallments)
        const current = parseInt(installmentNumber)
        if (!totalInstallments || isNaN(total) || total < 2)
          return 'El total de cuotas debe ser al menos 2'
        if (!installmentNumber || isNaN(current) || current < 1)
          return 'El número de cuota debe ser al menos 1'
        if (current > total)
          return 'El número de cuota no puede ser mayor al total'
      }
    }
    return null
  }

  const handleSave = async () => {
    const error = validate()
    if (error) {
      Alert.alert('Validación', error)
      return
    }

    if (!user) {
      Alert.alert('Error', 'No se encontró la sesión del usuario')
      return
    }

    setSaving(true)

    try {
      const numAmount = parseFloat(amount)
      const dateStr = formatDateISO(selectedDate)

      if (txType === 'income') {
        await apiClient.saveIncome({
          income_source: description.trim(),
          amount: numAmount,
          date: dateStr,
          username: user.username,
          email: user.email,
        })
      } else {
        const expenseData = {
          description: description.trim(),
          amount: numAmount,
          date: dateStr,
          expense_type: selectedExpenseType!.id,
          payment_method: selectedPaymentMethod!.id,
          card: selectedCard?.cardString || null,
          username: user.username,
          email: user.email,
          ...(isInstallment && {
            installment_number: parseInt(installmentNumber),
            total_installments: parseInt(totalInstallments),
          }),
        }

        if (isInstallment) {
          await apiClient.saveInstallmentExpense(expenseData)
        } else {
          const category = selectedExpenseType!.category
          if (category === 'Fijo') {
            await apiClient.saveFixedExpense(expenseData)
          } else {
            await apiClient.saveVariableExpense(expenseData)
          }
        }
      }

      showToast(txType === 'income' ? 'Ingreso guardado' : 'Gasto guardado')
    } catch (error: any) {
      const msg =
        error.response?.data?.message || 'No se pudo guardar la transacción'
      Alert.alert('Error', msg)
    } finally {
      setSaving(false)
    }
  }

  const expenseTypeItems = expenseTypes.map((et) => ({
    id: et.id,
    label: et.expense_type,
    category: et.expense_category?.expense_category || 'Variable',
  }))

  const paymentMethodItems = paymentMethods.map((pm) => ({
    id: pm.id,
    label: pm.payment_method,
  }))

  const cardItems = cards.map((c) => ({
    id: c.id,
    label: `${c.card_name}${c.banks?.[0] ? ' - ' + c.banks[0].bank_name : ''}`,
    cardString: `${c.card_name}${c.banks?.[0] ? ' - ' + c.banks[0].bank_name : ''}`,
  }))

  if (loadingDropdowns) {
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
        {saved ? (
          <View style={styles.savedContainer}>
            <RNAnimated.View style={{ opacity: toastOpacity, alignItems: 'center' }}>
              <Text style={styles.savedCheck}>✓</Text>
              <Text style={styles.savedMessage}>{toastMessage}</Text>
            </RNAnimated.View>
          </View>
        ) : (
        <>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva transacción</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.form}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                txType === 'expense' && styles.toggleActive,
              ]}
              onPress={() => {
                setTxType('expense')
                setIsInstallment(false)
              }}
            >
              <Text
                style={[
                  styles.toggleText,
                  txType === 'expense' && styles.toggleTextActive,
                ]}
              >
                Gasto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                txType === 'income' && styles.toggleActiveIncome,
              ]}
              onPress={() => {
                setTxType('income')
                setIsInstallment(false)
              }}
            >
              <Text
                style={[
                  styles.toggleText,
                  txType === 'income' && styles.toggleTextActive,
                ]}
              >
                Ingreso
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.label}>
            {txType === 'income' ? 'Fuente de ingreso' : 'Descripción'}
          </Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder={
              txType === 'income'
                ? 'Ej: Sueldo, Freelance...'
                : 'Ej: Supermercado...'
            }
            placeholderTextColor="#64748b"
          />

          {/* Amount */}
          <Text style={styles.label}>Monto (ARS)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
          />

          {/* Date Picker */}
          <Text style={styles.label}>Fecha</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {formatDateDisplay(selectedDate)}
            </Text>
            <Text style={styles.pickerArrow}>📅</Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="fade">
              <View style={styles.dateModalOverlay}>
                <View style={styles.dateModalContent}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="inline"
                    onChange={handleDateChange}
                    themeVariant="dark"
                    accentColor="#10b981"
                  />
                </View>
              </View>
            </Modal>
          )}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {/* Expense-specific fields */}
          {txType === 'expense' && (
            <>
              {/* Expense Type */}
              <Text style={styles.label}>Tipo de gasto</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowExpenseTypePicker(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedExpenseType && { color: '#64748b' },
                  ]}
                >
                  {selectedExpenseType?.label || 'Seleccionar tipo de gasto'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Payment Method */}
              <Text style={styles.label}>Método de pago</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPaymentMethodPicker(true)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedPaymentMethod && { color: '#64748b' },
                  ]}
                >
                  {selectedPaymentMethod?.label || 'Seleccionar método de pago'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Card (conditional — only for credit card) */}
              {needsCard && (
                <>
                  <Text style={styles.label}>Tarjeta</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowCardPicker(true)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !selectedCard && { color: '#64748b' },
                      ]}
                    >
                      {selectedCard?.label || 'Seleccionar tarjeta'}
                    </Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>

                  {/* Installment toggle — only when credit card is selected */}
                  <View style={styles.installmentToggle}>
                    <Text style={styles.installmentToggleLabel}>
                      ¿Es en cuotas?
                    </Text>
                    <Switch
                      value={isInstallment}
                      onValueChange={(val) => {
                        setIsInstallment(val)
                        if (!val) {
                          setTotalInstallments('')
                          setInstallmentNumber('1')
                        }
                      }}
                      trackColor={{ false: '#334155', true: '#065f46' }}
                      thumbColor={isInstallment ? '#10b981' : '#64748b'}
                    />
                  </View>

                  {/* Installment fields */}
                  {isInstallment && (
                    <View style={styles.installmentFields}>
                      <View style={styles.installmentRow}>
                        <View style={styles.installmentCol}>
                          <Text style={styles.installmentLabel}>
                            Cuota N°
                          </Text>
                          <TextInput
                            style={styles.installmentInput}
                            value={installmentNumber}
                            onChangeText={setInstallmentNumber}
                            keyboardType="number-pad"
                            placeholder="1"
                            placeholderTextColor="#64748b"
                          />
                        </View>
                        <Text style={styles.installmentSeparator}>de</Text>
                        <View style={styles.installmentCol}>
                          <Text style={styles.installmentLabel}>
                            Total cuotas
                          </Text>
                          <TextInput
                            style={styles.installmentInput}
                            value={totalInstallments}
                            onChangeText={setTotalInstallments}
                            keyboardType="number-pad"
                            placeholder="12"
                            placeholderTextColor="#64748b"
                          />
                        </View>
                      </View>
                      {totalInstallments && amount ? (
                        <Text style={styles.installmentInfo}>
                          Monto por cuota: $
                          {(
                            parseFloat(amount) /
                            parseInt(totalInstallments || '1')
                          ).toLocaleString('es-AR', {
                            maximumFractionDigits: 0,
                          })}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {txType === 'income'
                  ? 'Guardar Ingreso'
                  : isInstallment
                    ? `Guardar Cuota ${installmentNumber}/${totalInstallments || '?'}`
                    : 'Guardar Gasto'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Picker Modals */}
        <PickerModal
          visible={showExpenseTypePicker}
          title="Tipo de gasto"
          data={expenseTypeItems}
          onSelect={(item) =>
            setSelectedExpenseType({
              id: item.id,
              label: item.label,
              category:
                expenseTypes.find((et) => et.id === item.id)?.expense_category
                  ?.expense_category || 'Variable',
            })
          }
          onClose={() => setShowExpenseTypePicker(false)}
        />
        <PickerModal
          visible={showPaymentMethodPicker}
          title="Método de pago"
          data={paymentMethodItems}
          onSelect={(item) => {
            setSelectedPaymentMethod(item)
            const isCreditCard =
              item.label.toLowerCase().includes('tarjeta de crédito') ||
              item.label.toLowerCase().includes('tarjeta de credito')
            if (!isCreditCard) {
              setSelectedCard(null)
              setIsInstallment(false)
            }
          }}
          onClose={() => setShowPaymentMethodPicker(false)}
        />
        <PickerModal
          visible={showCardPicker}
          title="Tarjeta"
          data={cardItems}
          onSelect={(item) => {
            const card = cardItems.find((c) => c.id === item.id)
            setSelectedCard(
              card
                ? { id: card.id, label: card.label, cardString: card.cardString }
                : null
            )
          }}
          onClose={() => setShowCardPicker(false)}
        />
        </>
        )}
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
    gap: 16,
  },
  loadingLogo: {
    width: 120,
    height: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#ef4444',
  },
  toggleActiveIncome: {
    backgroundColor: '#10b981',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
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
  pickerButton: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  pickerArrow: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 8,
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  datePickerDoneText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  // Installment styles
  installmentToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  installmentToggleLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  installmentFields: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  installmentCol: {
    flex: 1,
  },
  installmentLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  installmentInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  installmentSeparator: {
    color: '#64748b',
    fontSize: 16,
    paddingBottom: 14,
  },
  installmentInfo: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  // Date modal
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 8,
    marginHorizontal: 20,
  },
  // Saved state
  savedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedCheck: {
    fontSize: 48,
    color: '#10b981',
    marginBottom: 12,
  },
  savedMessage: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
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
  modalItem: {
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalItemText: {
    color: '#ffffff',
    fontSize: 16,
  },
  modalEmpty: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    padding: 30,
  },
})
