// User (already used in authStore but not typed separately)
export interface User {
  id: number
  username: string
  email: string
  role?: string
}

// Expense Category
export interface ExpenseCategory {
  id: number
  expense_category: string // "Fijo" | "Variable"
}

// Expense Type (user-created categories for expenses)
export interface ExpenseType {
  id: number
  expense_type: string
  monthly_estimate?: number
  expense_category: ExpenseCategory
  active: boolean
}

// Payment Method
export interface PaymentMethod {
  id: number
  payment_method: string
  isRequired?: boolean
}

// Bank
export interface Bank {
  id: number
  bank_name: string
  balance?: number
}

// Card
export interface Card {
  id: number
  card_name: string
  banks: Bank[]
  active: boolean
  creditLimit?: number
  currentBalance?: number
  // Per-card color override (mirrors backend ApiCard fields used in frontend)
  primary_color?: string | null
  secondary_color?: string | null
}

// Expense (response from backend)
export interface Expense {
  expense_id: number
  description: string
  amount: number
  date: string // yyyy-MM-dd
  submission_date: string
  expense_type: ExpenseType
  payment_method: PaymentMethod
  card?: Card | null
  bank?: Bank | null
  owner: User
  // Installment fields
  installment_number?: number
  total_installments?: number
}

// Income (response from backend)
export interface Income {
  id: number
  income_source: string
  amount: number
  date: string // yyyy-MM-dd
  submission_date: string
  owner: User
}

// ---- Request DTOs ----

// For creating/updating expenses
export interface ExpenseDTO {
  description: string
  amount: number
  date: string // yyyy-MM-dd
  expense_type: number // ExpenseType ID
  payment_method: number // PaymentMethod ID
  card?: string | null // "Card Name - Bank Name" format
  username: string
  email: string
  // Installment fields (optional)
  installment_number?: number
  total_installments?: number
}

// For creating/updating income
export interface IncomeDTO {
  income_source: string
  amount: number
  date: string // yyyy-MM-dd
  username: string
  email: string
}

// Paginated response from backend
export interface PaginatedResponse<T> {
  content: T[]
  pageable: {
    pageNumber: number
    pageSize: number
  }
  totalElements: number
  totalPages: number
  last: boolean
  first: boolean
}

// Transaction union type for display purposes
export interface Transaction {
  id: number
  description: string
  amount: number
  date: string
  type: 'income' | 'expense'
  category?: string // expense_type name or "Ingreso"
  paymentMethod?: string
}
