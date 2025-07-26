import fetch from 'node-fetch';
import { 
  UserResponse, 
  BudgetsResponse, 
  BudgetDetailResponse,
  YNABError,
  AccountsResponse,
  AccountResponse,
  CategoriesResponse,
  CategoryResponse,
  MonthSummariesResponse,
  MonthDetailResponse,
  MonthCategoryResponse,
  PayeesResponse,
  PayeeResponse,
  PayeeLocationsResponse,
  TransactionsResponse,
  TransactionResponse,
  SaveTransactionWrapper,
  SaveTransactionsWrapper,
  UpdateTransactionsWrapper
} from './types.js';

export class YNABClient {
  private baseUrl = 'https://api.ynab.com/v1';
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('YNAB access token is required');
    }
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options?: { method?: string; body?: string }): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options?.method || 'GET',
      body: options?.body,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json() as YNABError;
      throw new Error(`YNAB API Error: ${error.error.detail}`);
    }

    return await response.json() as T;
  }

  async getUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/user');
  }

  async getBudgets(): Promise<BudgetsResponse> {
    return this.request<BudgetsResponse>('/budgets');
  }

  async getBudget(budgetId: string): Promise<BudgetDetailResponse> {
    return this.request<BudgetDetailResponse>(`/budgets/${budgetId}`);
  }

  async getAccounts(budgetId: string): Promise<AccountsResponse> {
    return this.request<AccountsResponse>(`/budgets/${budgetId}/accounts`);
  }

  async getAccount(budgetId: string, accountId: string): Promise<AccountResponse> {
    return this.request<AccountResponse>(`/budgets/${budgetId}/accounts/${accountId}`);
  }

  async getCategories(budgetId: string): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>(`/budgets/${budgetId}/categories`);
  }

  async getCategory(budgetId: string, categoryId: string): Promise<CategoryResponse> {
    return this.request<CategoryResponse>(`/budgets/${budgetId}/categories/${categoryId}`);
  }

  async getMonths(budgetId: string): Promise<MonthSummariesResponse> {
    return this.request<MonthSummariesResponse>(`/budgets/${budgetId}/months`);
  }

  async getMonth(budgetId: string, month: string): Promise<MonthDetailResponse> {
    return this.request<MonthDetailResponse>(`/budgets/${budgetId}/months/${month}`);
  }

  async getMonthCategory(budgetId: string, month: string, categoryId: string): Promise<MonthCategoryResponse> {
    return this.request<MonthCategoryResponse>(`/budgets/${budgetId}/months/${month}/categories/${categoryId}`);
  }

  async getPayees(budgetId: string): Promise<PayeesResponse> {
    return this.request<PayeesResponse>(`/budgets/${budgetId}/payees`);
  }

  async getPayee(budgetId: string, payeeId: string): Promise<PayeeResponse> {
    return this.request<PayeeResponse>(`/budgets/${budgetId}/payees/${payeeId}`);
  }

  async getPayeeLocations(budgetId: string): Promise<PayeeLocationsResponse> {
    return this.request<PayeeLocationsResponse>(`/budgets/${budgetId}/locations`);
  }

  // Transaction methods
  async getTransactions(budgetId: string, params?: { since_date?: string; type?: 'uncategorized' | 'unapproved'; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.since_date) queryParams.append('since_date', params.since_date);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.last_knowledge_of_server) queryParams.append('last_knowledge_of_server', params.last_knowledge_of_server.toString());
    
    const query = queryParams.toString();
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/transactions${query ? `?${query}` : ''}`);
  }

  async getTransaction(budgetId: string, transactionId: string): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/budgets/${budgetId}/transactions/${transactionId}`);
  }

  async getAccountTransactions(budgetId: string, accountId: string, params?: { since_date?: string; type?: 'uncategorized' | 'unapproved'; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.since_date) queryParams.append('since_date', params.since_date);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.last_knowledge_of_server) queryParams.append('last_knowledge_of_server', params.last_knowledge_of_server.toString());
    
    const query = queryParams.toString();
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/accounts/${accountId}/transactions${query ? `?${query}` : ''}`);
  }

  async getCategoryTransactions(budgetId: string, categoryId: string, params?: { since_date?: string; type?: 'uncategorized' | 'unapproved'; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.since_date) queryParams.append('since_date', params.since_date);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.last_knowledge_of_server) queryParams.append('last_knowledge_of_server', params.last_knowledge_of_server.toString());
    
    const query = queryParams.toString();
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/categories/${categoryId}/transactions${query ? `?${query}` : ''}`);
  }

  async getPayeeTransactions(budgetId: string, payeeId: string, params?: { since_date?: string; type?: 'uncategorized' | 'unapproved'; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.since_date) queryParams.append('since_date', params.since_date);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.last_knowledge_of_server) queryParams.append('last_knowledge_of_server', params.last_knowledge_of_server.toString());
    
    const query = queryParams.toString();
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/payees/${payeeId}/transactions${query ? `?${query}` : ''}`);
  }

  async getMonthTransactions(budgetId: string, month: string, params?: { since_date?: string; type?: 'uncategorized' | 'unapproved'; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    const queryParams = new URLSearchParams();
    if (params?.since_date) queryParams.append('since_date', params.since_date);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.last_knowledge_of_server) queryParams.append('last_knowledge_of_server', params.last_knowledge_of_server.toString());
    
    const query = queryParams.toString();
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/months/${month}/transactions${query ? `?${query}` : ''}`);
  }

  async createTransaction(budgetId: string, data: SaveTransactionWrapper): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/budgets/${budgetId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createTransactions(budgetId: string, data: SaveTransactionsWrapper): Promise<TransactionsResponse> {
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTransaction(budgetId: string, transactionId: string, data: SaveTransactionWrapper): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/budgets/${budgetId}/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateTransactions(budgetId: string, data: UpdateTransactionsWrapper): Promise<TransactionsResponse> {
    return this.request<TransactionsResponse>(`/budgets/${budgetId}/transactions`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteTransaction(budgetId: string, transactionId: string): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(`/budgets/${budgetId}/transactions/${transactionId}`, {
      method: 'DELETE'
    });
  }
} 