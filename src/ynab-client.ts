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
  UpdateTransactionsWrapper,
  UpdateTransaction,
  BankTransaction,
  TransactionMatch,
  TransactionMatchResult,
  TransactionDetail,
  ReconciliationResult
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

  // Reconciliation methods
  async updateTransactionStatus(budgetId: string, transactionId: string, cleared?: 'cleared' | 'uncleared' | 'reconciled', approved?: boolean): Promise<TransactionResponse> {
    const transaction: any = {};
    if (cleared !== undefined) transaction.cleared = cleared;
    if (approved !== undefined) transaction.approved = approved;
    
    return this.request<TransactionResponse>(`/budgets/${budgetId}/transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify({ transaction })
    });
  }

  async getTransactionsByStatus(budgetId: string, accountId?: string, cleared?: 'cleared' | 'uncleared' | 'reconciled', approved?: boolean, params?: { since_date?: string; last_knowledge_of_server?: number }): Promise<TransactionsResponse> {
    // Get all transactions and filter by status
    let response: TransactionsResponse;
    
    if (accountId) {
      response = await this.getAccountTransactions(budgetId, accountId, params);
    } else {
      response = await this.getTransactions(budgetId, params);
    }
    
    // Filter transactions based on status criteria
    let filteredTransactions = response.data.transactions;
    
    if (cleared !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.cleared === cleared);
    }
    
    if (approved !== undefined) {
      filteredTransactions = filteredTransactions.filter(t => t.approved === approved);
    }
    
    return {
      data: {
        transactions: filteredTransactions,
        server_knowledge: response.data.server_knowledge
      }
    };
  }

  async bulkUpdateTransactionStatus(budgetId: string, updates: Array<{transactionId: string, cleared?: 'cleared' | 'uncleared' | 'reconciled', approved?: boolean}>): Promise<Array<TransactionResponse>> {
    const results: TransactionResponse[] = [];
    
    // Process updates sequentially to avoid rate limiting
    for (const update of updates) {
      try {
        const result = await this.updateTransactionStatus(budgetId, update.transactionId, update.cleared, update.approved);
        results.push(result);
      } catch (error) {
        // Continue with other updates even if one fails
        console.error(`Failed to update transaction ${update.transactionId}:`, error);
      }
    }
    
    return results;
  }

  // Enhanced bulk update method that supports full transaction updates
  async bulkUpdateTransactions(budgetId: string, updates: UpdateTransaction[]): Promise<TransactionsResponse> {
    const updateWrapper: UpdateTransactionsWrapper = {
      transactions: updates
    };
    
    return this.updateTransactions(budgetId, updateWrapper);
  }

  // Bank transaction matching
  async matchBankTransactions(
    budgetId: string,
    accountId: string,
    bankTransactions: BankTransaction[],
    tolerance: number = 3
  ): Promise<TransactionMatchResult> {
    // Get YNAB transactions for the account
    // Calculate date range based on bank transactions
    const bankDates = bankTransactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...bankDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...bankDates.map(d => d.getTime())));
    
    // Add tolerance to date range
    minDate.setDate(minDate.getDate() - tolerance);
    maxDate.setDate(maxDate.getDate() + tolerance);
    
    const ynabResponse = await this.getAccountTransactions(budgetId, accountId, {
      since_date: minDate.toISOString().split('T')[0]
    });
    
    const ynabTransactions = ynabResponse.data.transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate <= maxDate;
    });
    
    // Helper functions
    const dateDifference = (date1: string, date2: string): number => {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
    
    const amountMatches = (amount1: number, amount2: number, tolerance: number): boolean => {
      return Math.abs(amount1 - amount2) <= tolerance;
    };
    
    const payeeSimilarity = (payee1: string | undefined, payee2: string | undefined): number => {
      if (!payee1 || !payee2) return 0;
      
      const p1 = payee1.toLowerCase().trim();
      const p2 = payee2.toLowerCase().trim();
      
      if (p1 === p2) return 1;
      
      // Simple similarity check - could be enhanced with Levenshtein distance
      const words1 = p1.split(/\s+/);
      const words2 = p2.split(/\s+/);
      
      let matches = 0;
      for (const word1 of words1) {
        if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
          matches++;
        }
      }
      
      return matches / Math.max(words1.length, words2.length);
    };
    
    // Match transactions
    const matched: TransactionMatch[] = [];
    const usedYnabIds = new Set<string>();
    const unmatchedBank: BankTransaction[] = [];
    
    // Sort bank transactions by amount (descending) to match larger amounts first
    const sortedBankTransactions = [...bankTransactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    
    for (const bankTx of sortedBankTransactions) {
      let bestMatch: TransactionDetail | null = null;
      let bestConfidence: 'exact' | 'high' | 'medium' | 'low' = 'low';
      let bestReasons: string[] = [];
      
      // Convert bank amount to milliunits for comparison
      const bankAmountMilliunits = Math.round(bankTx.amount * 1000);
      
      for (const ynabTx of ynabTransactions) {
        if (usedYnabIds.has(ynabTx.id)) continue;
        
        const daysDiff = dateDifference(bankTx.date, ynabTx.date);
        if (daysDiff > tolerance) continue;
        
        const reasons: string[] = [];
        let confidence: 'exact' | 'high' | 'medium' | 'low' = 'low';
        
        // Check amount match
        const exactAmountMatch = bankAmountMilliunits === ynabTx.amount;
        const closeAmountMatch = amountMatches(bankAmountMilliunits, ynabTx.amount, 1000); // ±$1
        
        if (exactAmountMatch) {
          reasons.push('Exact amount match');
        } else if (closeAmountMatch) {
          reasons.push(`Amount within $1 (Bank: $${bankTx.amount}, YNAB: $${ynabTx.amount / 1000})`);
        } else {
          continue; // Skip if amount doesn't match
        }
        
        // Check date match
        if (daysDiff === 0) {
          reasons.push('Same date');
        } else if (daysDiff === 1) {
          reasons.push('Date within 1 day');
        } else {
          reasons.push(`Date within ${daysDiff} days`);
        }
        
        // Check payee match
        const payeeSim = payeeSimilarity(bankTx.payee, ynabTx.payee_name || undefined);
        if (payeeSim === 1) {
          reasons.push('Exact payee match');
        } else if (payeeSim > 0.5) {
          reasons.push('Similar payee name');
        }
        
        // Determine confidence level
        if (exactAmountMatch && daysDiff === 0 && payeeSim === 1) {
          confidence = 'exact';
        } else if (exactAmountMatch && daysDiff <= 1 && payeeSim > 0.5) {
          confidence = 'high';
        } else if (exactAmountMatch && daysDiff <= tolerance) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
        
        // Update best match if this is better
        const confidenceOrder = { 'exact': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const bestConfidenceOrder = { 'exact': 4, 'high': 3, 'medium': 2, 'low': 1 };
        
        if (!bestMatch || confidenceOrder[confidence] > bestConfidenceOrder[bestConfidence]) {
          bestMatch = ynabTx;
          bestConfidence = confidence;
          bestReasons = reasons;
        }
      }
      
      if (bestMatch) {
        matched.push({
          bankTransaction: bankTx,
          ynabTransaction: bestMatch,
          matchConfidence: bestConfidence,
          matchReasons: bestReasons
        });
        usedYnabIds.add(bestMatch.id);
      } else {
        unmatchedBank.push(bankTx);
      }
    }
    
    // Find unmatched YNAB transactions
    const unmatchedYNAB = ynabTransactions.filter(t => !usedYnabIds.has(t.id));
    
    // Calculate summary
    const summary = {
      totalBankTransactions: bankTransactions.length,
      totalYNABTransactions: ynabTransactions.length,
      matchedCount: matched.length,
      matchRate: bankTransactions.length > 0 ? matched.length / bankTransactions.length : 0
    };
    
    return {
      matched,
      unmatchedBank,
      unmatchedYNAB,
      summary
    };
  }

  // Reconcile account with automatic balance adjustment
  async reconcileAccountWithAdjustment(
    budgetId: string,
    accountId: string,
    targetBalance: number,
    reconciliationDate: string,
    createAdjustment: boolean = true,
    adjustmentMemo?: string
  ): Promise<ReconciliationResult> {
    const errors: string[] = [];
    
    // System payee and category IDs for reconciliation adjustments
    const RECONCILIATION_PAYEE_ID = 'f942249d-8be6-4c16-8cb8-3007897cdfc8';
    const INFLOW_CATEGORY_ID = '27e74120-8c36-43df-bac2-2ac4b033879e';
    
    try {
      // Step 1: Get account details
      const accountResponse = await this.getAccount(budgetId, accountId);
      const account = accountResponse.data.account;
      const startingBalance = account.balance;
      
      // Step 2: Get all transactions up to reconciliation date
      const transactionsResponse = await this.getAccountTransactions(budgetId, accountId);
      const reconciliationDateObj = new Date(reconciliationDate);
      
      // Filter transactions that need to be reconciled
      const transactionsToReconcile = transactionsResponse.data.transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate <= reconciliationDateObj && 
               (t.cleared === 'cleared' || t.cleared === 'uncleared');
      });
      
      // Step 3: Mark transactions as reconciled
      let transactionsReconciled = 0;
      if (transactionsToReconcile.length > 0) {
        const updates: UpdateTransaction[] = transactionsToReconcile.map(t => ({
          id: t.id,
          cleared: 'reconciled' as const
        }));
        
        try {
          const updateResponse = await this.bulkUpdateTransactions(budgetId, updates);
          transactionsReconciled = updateResponse.data.transactions.length;
        } catch (error) {
          errors.push(`Failed to update some transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Step 4: Calculate actual balance after reconciliation
      // Re-fetch account to get updated balance
      const updatedAccountResponse = await this.getAccount(budgetId, accountId);
      const actualBalance = updatedAccountResponse.data.account.balance;
      
      // Calculate if adjustment is needed
      const targetBalanceMilliunits = Math.round(targetBalance * 1000);
      const adjustmentNeeded = targetBalanceMilliunits - actualBalance;
      
      let adjustmentCreated = false;
      let adjustmentTransaction: TransactionDetail | undefined;
      
      // Step 5: Create adjustment transaction if needed
      if (adjustmentNeeded !== 0 && createAdjustment) {
        try {
          // Verify the system payee exists
          const payeesResponse = await this.getPayees(budgetId);
          const reconciliationPayee = payeesResponse.data.payees.find(p => p.id === RECONCILIATION_PAYEE_ID);
          
          if (!reconciliationPayee) {
            errors.push('System reconciliation payee not found. Using manual adjustment instead.');
          }
          
          // Create the adjustment transaction
          const adjustmentData: SaveTransactionWrapper = {
            transaction: {
              account_id: accountId,
              date: reconciliationDate,
              amount: adjustmentNeeded,
              payee_id: reconciliationPayee ? RECONCILIATION_PAYEE_ID : null,
              payee_name: reconciliationPayee ? null : 'Manual Balance Adjustment',
              category_id: adjustmentNeeded > 0 ? INFLOW_CATEGORY_ID : null,
              memo: adjustmentMemo || `Reconciliation adjustment to match balance of $${targetBalance.toFixed(2)}`,
              cleared: 'reconciled' as const,
              approved: true
            }
          };
          
          const adjustmentResponse = await this.createTransaction(budgetId, adjustmentData);
          adjustmentTransaction = adjustmentResponse.data.transaction;
          adjustmentCreated = true;
        } catch (error) {
          errors.push(`Failed to create adjustment transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Return comprehensive result
      return {
        account_id: accountId,
        account_name: account.name,
        reconciliation_date: reconciliationDate,
        transactions_reconciled: transactionsReconciled,
        starting_balance: startingBalance,
        target_balance: targetBalanceMilliunits,
        actual_balance: adjustmentCreated ? targetBalanceMilliunits : actualBalance,
        adjustment_needed: adjustmentNeeded,
        adjustment_created: adjustmentCreated,
        adjustment_transaction: adjustmentTransaction,
        errors: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      throw new Error(`Reconciliation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 