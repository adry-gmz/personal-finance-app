/**
 * Tipos de la base de datos.
 *
 * Espejan exactamente el esquema de `supabase/migrations/`. Se pasan al
 * cliente de Supabase para que `.from('transactions').select()` devuelva
 * datos tipados y el editor avise si escribes mal un nombre de columna.
 *
 * Cada tabla tiene tres formas:
 *   · Row    — lo que devuelve una consulta
 *   · Insert — lo que se necesita para crear (sin columnas con default)
 *   · Update — todo opcional
 *
 * Si cambias una migración, actualiza este archivo. También puedes
 * regenerarlo con la CLI de Supabase:
 *   npx supabase gen types typescript --project-id TU_ID > src/types/database.ts
 */

// ---------------------------------------------------------------------------
// Enums (reflejan los CREATE TYPE del esquema)
// ---------------------------------------------------------------------------

export type UserRole = 'ADMIN' | 'USER'

/** Un movimiento entra (INCOME) o sale (EXPENSE). */
export type TransactionType = 'INCOME' | 'EXPENSE'

/** FIXED se repite cada mes; VARIABLE depende del consumo. */
export type ExpenseType = 'FIXED' | 'VARIABLE'

export type DebtStatus = 'ACTIVE' | 'PAID' | 'CANCELLED'

/** PROVISION: por si ocurre algo. SAVING: para conseguir una meta. */
export type FundType = 'PROVISION' | 'SAVING'

export type FundMovementType = 'CONTRIBUTION' | 'WITHDRAWAL'

// ---------------------------------------------------------------------------
// Esquema
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        // Su única clave foránea apunta a auth.users, que es un esquema
        // gestionado por Supabase y no forma parte de estos tipos.
        Relationships: []
        Row: {
          id: string
          username: string
          full_name: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string
        }
        // `role` no se incluye: la base de datos revoca su escritura
        // para que nadie pueda ascenderse a ADMIN desde la API.
        Update: {
          username?: string
          full_name?: string
        }
      }

      categories: {
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          user_id: string
          name: string
          type: TransactionType
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: TransactionType
          color?: string
        }
        Update: {
          name?: string
          color?: string
        }
      }

      transactions: {
        Relationships: [
          {
            // Clave foránea compuesta: la categoría debe coincidir en id y
            // en tipo, para que un gasto no pueda usar una categoría de
            // ingreso. Ver 001_initial_schema.sql.
            foreignKeyName: 'transactions_category_fk'
            columns: ['category_id', 'type']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id', 'type']
          },
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          user_id: string
          category_id: string
          type: TransactionType
          expense_type: ExpenseType | null
          description: string
          amount: number
          /** Formato "YYYY-MM-DD". */
          date: string
          is_recurring: boolean
          created_at: string
          /** Calculada por PostgreSQL desde `date`. Solo lectura. */
          year: number
          /** 1-12. Calculada por PostgreSQL desde `date`. Solo lectura. */
          month: number
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          type: TransactionType
          /** Obligatorio si type es EXPENSE; debe ser null si es INCOME. */
          expense_type?: ExpenseType | null
          description?: string
          amount: number
          date: string
          is_recurring?: boolean
        }
        Update: {
          category_id?: string
          type?: TransactionType
          expense_type?: ExpenseType | null
          description?: string
          amount?: number
          date?: string
          is_recurring?: boolean
        }
      }

      debts: {
        Relationships: [
          {
            foreignKeyName: 'debts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          user_id: string
          name: string
          total_amount: number
          /** Suma de debt_payments, mantenida por trigger. Solo lectura. */
          paid_amount: number
          interest_rate: number | null
          due_date: string | null
          status: DebtStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          total_amount: number
          interest_rate?: number | null
          due_date?: string | null
          status?: DebtStatus
        }
        // `paid_amount` no se incluye: la base de datos revoca su escritura.
        Update: {
          name?: string
          total_amount?: number
          interest_rate?: number | null
          due_date?: string | null
          status?: DebtStatus
        }
      }

      debt_payments: {
        Relationships: [
          {
            foreignKeyName: 'debt_payments_debt_id_fkey'
            columns: ['debt_id']
            isOneToOne: false
            referencedRelation: 'debts'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          debt_id: string
          amount: number
          date: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          debt_id: string
          amount: number
          date?: string
          description?: string
        }
        Update: {
          amount?: number
          date?: string
          description?: string
        }
      }

      funds: {
        Relationships: [
          {
            foreignKeyName: 'funds_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          user_id: string
          name: string
          type: FundType
          target_amount: number
          /** Aportes menos retiros, mantenido por trigger. Solo lectura. */
          current_amount: number
          target_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: FundType
          target_amount: number
          target_date?: string | null
        }
        // `current_amount` no se incluye: la base de datos revoca su escritura.
        Update: {
          name?: string
          target_amount?: number
          target_date?: string | null
        }
      }

      fund_movements: {
        Relationships: [
          {
            foreignKeyName: 'fund_movements_fund_id_fkey'
            columns: ['fund_id']
            isOneToOne: false
            referencedRelation: 'funds'
            referencedColumns: ['id']
          },
        ]
        Row: {
          id: string
          fund_id: string
          type: FundMovementType
          amount: number
          date: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          fund_id: string
          type: FundMovementType
          amount: number
          date?: string
          description?: string
        }
        Update: {
          type?: FundMovementType
          amount?: number
          date?: string
          description?: string
        }
      }
    }

    // Sin vistas por ahora, pero la clave debe existir: supabase-js exige
    // la forma completa del esquema para poder inferir los tipos.
    Views: Record<string, never>

    Functions: {
      seed_demo_data: {
        Args: { p_email: string; p_reset?: boolean }
        Returns: string
      }
    }

    Enums: {
      user_role: UserRole
      transaction_type: TransactionType
      expense_type: ExpenseType
      debt_status: DebtStatus
      fund_type: FundType
      fund_movement_type: FundMovementType
    }

    CompositeTypes: Record<string, never>
  }
}

// ---------------------------------------------------------------------------
// Atajos para usar en la aplicación
// ---------------------------------------------------------------------------

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Category = Tables['categories']['Row']
export type Transaction = Tables['transactions']['Row']
export type Debt = Tables['debts']['Row']
export type DebtPayment = Tables['debt_payments']['Row']
export type Fund = Tables['funds']['Row']
export type FundMovement = Tables['fund_movements']['Row']

export type CategoryInsert = Tables['categories']['Insert']
export type TransactionInsert = Tables['transactions']['Insert']
export type TransactionUpdate = Tables['transactions']['Update']
export type DebtInsert = Tables['debts']['Insert']
export type DebtPaymentInsert = Tables['debt_payments']['Insert']
export type FundInsert = Tables['funds']['Insert']
export type FundMovementInsert = Tables['fund_movements']['Insert']

/** Transacción con su categoría resuelta, tal como la muestra la interfaz. */
export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'type' | 'color'> | null
}
