// YNAB API Types

export interface YNABUser {
  id: string;
}

export interface UserResponse {
  data: {
    user: YNABUser;
  };
}

export interface Budget {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  date_format?: {
    format: string;
  };
  currency_format?: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
}

export interface BudgetSummary {
  id: string;
  name: string;
  last_modified_on: string;
  first_month: string;
  last_month: string;
  date_format?: {
    format: string;
  };
  currency_format?: {
    iso_code: string;
    example_format: string;
    decimal_digits: number;
    decimal_separator: string;
    symbol_first: boolean;
    group_separator: string;
    currency_symbol: string;
    display_symbol: boolean;
  };
}

export interface BudgetsResponse {
  data: {
    budgets: BudgetSummary[];
    default_budget?: BudgetSummary;
  };
}

export interface BudgetDetailResponse {
  data: {
    budget: Budget;
    server_knowledge: number;
  };
}

export interface ErrorDetail {
  id: string;
  name: string;
  detail: string;
}

export interface YNABError {
  error: {
    id: string;
    name: string;
    detail: string;
  };
}

// Account Types
export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'cash' | 'creditCard' | 'lineOfCredit' | 'otherAsset' | 'otherLiability' | 'mortgage' | 'autoLoan' | 'studentLoan' | 'personalLoan' | 'medicalDebt' | 'otherDebt';
  on_budget: boolean;
  closed: boolean;
  note?: string | null;
  balance: number;
  cleared_balance: number;
  uncleared_balance: number;
  transfer_payee_id: string;
  direct_import_linked?: boolean;
  direct_import_in_error?: boolean;
  deleted: boolean;
}

export interface AccountsResponse {
  data: {
    accounts: Account[];
    server_knowledge: number;
  };
}

export interface AccountResponse {
  data: {
    account: Account;
  };
}

// Category Types
export interface Category {
  id: string;
  category_group_id: string;
  category_group_name?: string;
  name: string;
  hidden: boolean;
  original_category_group_id?: string | null;
  note?: string | null;
  budgeted: number;
  activity: number;
  balance: number;
  goal_type?: 'TB' | 'TBD' | 'MF' | 'NEED' | 'DEBT' | null;
  goal_day?: number | null;
  goal_cadence?: number | null;
  goal_cadence_frequency?: number | null;
  goal_creation_month?: string | null;
  goal_target?: number | null;
  goal_target_month?: string | null;
  goal_percentage_complete?: number | null;
  goal_months_to_budget?: number | null;
  goal_under_funded?: number | null;
  goal_overall_funded?: number | null;
  goal_overall_left?: number | null;
  deleted: boolean;
}

export interface CategoryGroup {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
}

export interface CategoryGroupWithCategories {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  categories: Category[];
}

export interface CategoriesResponse {
  data: {
    category_groups: CategoryGroupWithCategories[];
    server_knowledge: number;
  };
}

export interface CategoryResponse {
  data: {
    category: Category;
  };
}

// Month Types
export interface MonthSummary {
  month: string;
  note?: string | null;
  income: number;
  budgeted: number;
  activity: number;
  to_be_budgeted: number;
  age_of_money?: number | null;
  deleted: boolean;
}

export interface MonthDetail {
  month: string;
  note?: string | null;
  income: number;
  budgeted: number;
  activity: number;
  to_be_budgeted: number;
  age_of_money?: number | null;
  deleted: boolean;
  categories: Category[];
}

export interface MonthSummariesResponse {
  data: {
    months: MonthSummary[];
    server_knowledge: number;
  };
}

export interface MonthDetailResponse {
  data: {
    month: MonthDetail;
  };
}

// Month Category Types
export interface MonthCategoryResponse {
  data: {
    category: Category;
  };
}

// Payee Types
export interface Payee {
  id: string;
  name: string;
  transfer_account_id?: string | null;
  deleted: boolean;
}

export interface PayeeLocation {
  id: string;
  payee_id: string;
  latitude: string;
  longitude: string;
  deleted: boolean;
}

export interface PayeesResponse {
  data: {
    payees: Payee[];
    server_knowledge: number;
  };
}

export interface PayeeResponse {
  data: {
    payee: Payee;
  };
}

export interface PayeeLocationsResponse {
  data: {
    payee_locations: PayeeLocation[];
  };
}

// Transaction Types
export interface TransactionDetail {
  id: string;
  date: string;
  amount: number;
  memo?: string | null;
  cleared: 'cleared' | 'uncleared' | 'reconciled';
  approved: boolean;
  flag_color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
  account_id: string;
  account_name?: string;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  matched_transaction_id?: string | null;
  import_id?: string | null;
  import_payee_name?: string | null;
  import_payee_name_original?: string | null;
  debt_transaction_type?: 'payment' | 'refund' | 'fee' | 'interest' | 'escrow' | 'balancedAdjustment' | 'credit' | 'charge' | null;
  deleted: boolean;
  
  // Subtransactions for split transactions
  subtransactions?: SubTransaction[];
}

export interface SubTransaction {
  id: string;
  transaction_id: string;
  amount: number;
  memo?: string | null;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  transfer_account_id?: string | null;
  transfer_transaction_id?: string | null;
  deleted: boolean;
}

export interface SaveTransaction {
  account_id: string;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  frequency?: string | null;
  amount: number;
  memo?: string | null;
  flag_color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
  cleared?: 'cleared' | 'uncleared' | 'reconciled';
  approved?: boolean;
  date: string;
  import_id?: string | null;
  subtransactions?: SaveSubTransaction[];
}

export interface SaveSubTransaction {
  amount: number;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  memo?: string | null;
}

export interface UpdateTransaction {
  id: string;
  account_id?: string;
  payee_id?: string | null;
  payee_name?: string | null;
  category_id?: string | null;
  amount?: number;
  memo?: string | null;
  flag_color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
  cleared?: 'cleared' | 'uncleared' | 'reconciled';
  approved?: boolean;
  date?: string;
  import_id?: string | null;
  subtransactions?: SaveSubTransaction[];
}

export interface TransactionsResponse {
  data: {
    transactions: TransactionDetail[];
    server_knowledge: number;
  };
}

export interface TransactionResponse {
  data: {
    transaction: TransactionDetail;
  };
}

export interface SaveTransactionWrapper {
  transaction: SaveTransaction;
}

export interface SaveTransactionsWrapper {
  transaction?: SaveTransaction;
  transactions?: SaveTransaction[];
}

export interface UpdateTransactionsWrapper {
  transactions: UpdateTransaction[];
}

export interface TransactionsImportResponse {
  data: {
    transaction_ids: string[];
  };
}

// Reconciliation Types
export interface TransactionStatusUpdate {
  transaction_id: string;
  current_cleared: 'cleared' | 'uncleared' | 'reconciled';
  new_cleared?: 'cleared' | 'uncleared' | 'reconciled';
  current_approved: boolean;
  new_approved?: boolean;
}

export interface BulkTransactionStatusUpdate {
  transaction_id: string;
  cleared?: 'cleared' | 'uncleared' | 'reconciled';
  approved?: boolean;
}

export interface ReconciliationStatus {
  account_id: string;
  account_name: string;
  uncleared_count: number;
  cleared_count: number;
  reconciled_count: number;
  unapproved_count: number;
  uncleared_balance: number;
  cleared_balance: number;
  reconciled_balance: number;
  total_balance: number;
  last_reconciled_date?: string;
}

export interface ReconciliationSummary {
  account_id: string;
  account_name: string;
  reconciliation_date: string;
  transactions_reconciled: number;
  total_amount_reconciled: number;
  new_reconciled_balance: number;
  transactions_updated: TransactionStatusUpdate[];
}

export interface BulkUpdateTransactionWrapper {
  transactions: Array<{
    id: string;
    cleared?: 'cleared' | 'uncleared' | 'reconciled';
    approved?: boolean;
  }>;
} 