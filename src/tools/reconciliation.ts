/**
 * Reconciliation-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatAmount, formatDate, formatStatus } from "../utils/formatters.js";

export function registerReconciliationTools(server: McpServer) {
  // Tool: Reconcile Account with Adjustment
  server.registerTool(
    "reconcile-account-with-adjustment",
    {
      title: "Reconcile Account with Balance Adjustment",
      description: `Complete one-step reconciliation that marks transactions as reconciled and automatically creates a balance adjustment if needed.
IMPORTANT: Only use this when transactions CANNOT be matched and you need to create an adjustment.
For normal transaction matching, use create-transaction or update-transaction instead.
This tool will create a special "Reconciliation Balance Adjustment" transaction to fix discrepancies.`,
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().describe("Account ID to reconcile"),
        targetBalance: z.number().describe("Expected ending balance in dollars"),
        reconciliationDate: z.string().describe("Reconciliation date (ISO format: YYYY-MM-DD)"),
        createAdjustment: z.boolean().describe("Auto-create adjustment if needed"),
        adjustmentMemo: z.string().optional().describe("Optional custom memo for adjustment")
      }
    },
    async ({ budgetId, accountId, targetBalance, reconciliationDate, createAdjustment, adjustmentMemo }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Perform the reconciliation
        const result = await client.reconcileAccountWithAdjustment(
          actualBudgetId,
          accountId,
          targetBalance,
          reconciliationDate,
          createAdjustment,
          adjustmentMemo
        );
        
        let content = `# Account Reconciliation Complete\n\n`;
        
        // Account and Date Info
        content += `## Reconciliation Summary\n`;
        content += `- **Account**: ${result.account_name}\n`;
        content += `- **Reconciliation Date**: ${formatDate(result.reconciliation_date)}\n`;
        content += `- **Transactions Reconciled**: ${result.transactions_reconciled}\n\n`;
        
        // Balance Information
        content += `## Balance Summary\n`;
        content += `- **Starting Balance**: ${formatAmount(result.starting_balance)}\n`;
        content += `- **Target Balance**: ${formatAmount(result.target_balance)}\n`;
        content += `- **Actual Balance**: ${formatAmount(result.actual_balance)}\n`;
        
        const difference = result.adjustment_needed;
        if (difference !== 0) {
          content += `- **Difference**: ${formatAmount(difference)}`;
          if (difference > 0) {
            content += ` (account was under by this amount)\n`;
          } else {
            content += ` (account was over by this amount)\n`;
          }
        } else {
          content += `- **Difference**: ✅ Balanced perfectly!\n`;
        }
        content += `\n`;
        
        // Adjustment Information
        if (result.adjustment_created && result.adjustment_transaction) {
          const adj = result.adjustment_transaction;
          content += `## Balance Adjustment Created\n`;
          content += `An adjustment transaction was automatically created:\n\n`;
          content += `- **Amount**: ${formatAmount(adj.amount)}\n`;
          content += `- **Payee**: ${adj.payee_name || 'Reconciliation Balance Adjustment'}\n`;
          content += `- **Category**: ${adj.category_name || 'Inflow: Ready to Assign'}\n`;
          content += `- **Memo**: ${adj.memo || 'Reconciliation adjustment'}\n`;
          content += `- **Status**: ✅ Reconciled\n`;
          content += `- **Transaction ID**: ${adj.id}\n\n`;
        } else if (difference !== 0 && !createAdjustment) {
          content += `## Balance Adjustment Needed\n`;
          content += `⚠️ An adjustment of ${formatAmount(difference)} is needed but was not created.\n`;
          content += `To create the adjustment, run this tool again with \`createAdjustment: true\`\n\n`;
        }
        
        // Errors (if any)
        if (result.errors && result.errors.length > 0) {
          content += `## ⚠️ Warnings\n`;
          for (const error of result.errors) {
            content += `- ${error}\n`;
          }
          content += `\n`;
        }
        
        // Success Status
        if (result.adjustment_created || difference === 0) {
          content += `## ✅ Reconciliation Status: Complete\n\n`;
          content += `Your account has been successfully reconciled`;
          if (result.adjustment_created) {
            content += ` with a balance adjustment`;
          }
          content += `.\n\n`;
        } else {
          content += `## ⚠️ Reconciliation Status: Incomplete\n\n`;
          content += `Transactions have been marked as reconciled, but the balance doesn't match.\n`;
          content += `Consider running this tool again with \`createAdjustment: true\` to complete the reconciliation.\n\n`;
        }
        
        // Next Steps
        content += `## Next Steps\n`;
        content += `1. Review the reconciliation in YNAB to ensure accuracy\n`;
        if (result.adjustment_created) {
          content += `2. The adjustment transaction has been categorized to "Inflow: Ready to Assign"\n`;
          content += `3. You may want to review your budget categories if adjustments are frequent\n`;
        }
        content += `4. Use \`reconciliation-status-report\` to see overall reconciliation status\n`;
        content += `5. Schedule your next reconciliation (recommended: monthly minimum)\n`;
        
        // Tips
        if (Math.abs(difference) > 10000) { // More than $10
          content += `\n## 💡 Tip\n`;
          content += `The adjustment amount was relatively large (${formatAmount(Math.abs(difference))}). `;
          content += `Consider:\n`;
          content += `- Checking for missing or duplicate transactions\n`;
          content += `- Verifying transaction amounts are correct\n`;
          content += `- Using \`match-bank-transactions\` to compare with your bank statement\n`;
        }
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Reconcile Account Transactions
  server.registerTool(
    "reconcile-account-transactions",
    {
      title: "Reconcile Account Transactions",
      description: "Mark all transactions in an account as reconciled up to a specific date",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().describe("Account ID to reconcile"),
        reconciliationDate: z.string().describe("Reconciliation date (ISO format: YYYY-MM-DD) - transactions on or before this date will be reconciled"),
        endingBalance: z.number().optional().describe("Expected ending balance in dollars for verification")
      }
    },
    async ({ budgetId, accountId, reconciliationDate, endingBalance }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Get account details
        const accountResponse = await client.getAccount(actualBudgetId, accountId);
        const account = accountResponse.data.account;
        
        // Get all transactions for the account
        const transactionsResponse = await client.getAccountTransactions(actualBudgetId, accountId);
        
        // Filter transactions that should be reconciled (on or before reconciliation date and not already reconciled)
        const transactionsToReconcile = transactionsResponse.data.transactions.filter(t => 
          !t.deleted && 
          t.date <= reconciliationDate && 
          t.cleared !== 'reconciled'
        );
        
        if (transactionsToReconcile.length === 0) {
          let content = `# Account Reconciliation - No Transactions to Reconcile\n\n`;
          content += `## Account: ${account.name}\n`;
          content += `- **Reconciliation Date**: ${reconciliationDate}\n`;
          content += `- **Current Balance**: $${(account.balance / 1000).toFixed(2)}\n`;
          content += `\nAll transactions on or before ${reconciliationDate} are already reconciled.\n`;
          
          return {
            content: [{ type: "text", text: content }]
          };
        }
        
        // Prepare bulk updates - mark as reconciled and approved
        const bulkUpdates = transactionsToReconcile.map(t => ({
          transactionId: t.id,
          cleared: 'reconciled' as const,
          approved: true
        }));
        
        // Perform bulk reconciliation
        const results = await client.bulkUpdateTransactionStatus(actualBudgetId, bulkUpdates);
        
        // Calculate reconciliation summary
        const totalReconciledAmount = transactionsToReconcile.reduce((sum, t) => sum + t.amount, 0);
        
        let content = `# Account Reconciliation Complete\n\n`;
        content += `## Account: ${account.name}\n`;
        content += `- **Reconciliation Date**: ${formatDate(reconciliationDate)}\n`;
        content += `- **Transactions Reconciled**: ${results.length}\n`;
        content += `- **Total Amount Reconciled**: ${formatAmount(totalReconciledAmount)}\n`;
        content += `- **Current Account Balance**: $${(account.balance / 1000).toFixed(2)}\n`;
        
        if (endingBalance !== undefined) {
          const balanceDifference = (account.balance / 1000) - endingBalance;
          content += `- **Expected Ending Balance**: $${endingBalance.toFixed(2)}\n`;
          content += `- **Balance Difference**: ${balanceDifference >= 0 ? '+' : ''}$${balanceDifference.toFixed(2)}\n`;
          
          if (Math.abs(balanceDifference) > 0.01) {
            content += `\n⚠️ **Warning**: There is a difference between the expected and actual balance. This may indicate missing transactions or data entry errors.\n`;
          } else {
            content += `\n✅ **Success**: Account balance matches expected ending balance!\n`;
          }
        }
        
        content += `\n## Reconciled Transactions\n\n`;
        
        // Group transactions by month for better readability
        const transactionsByMonth = new Map<string, typeof transactionsToReconcile>();
        
        for (const transaction of transactionsToReconcile) {
          const monthKey = transaction.date.substring(0, 7); // YYYY-MM
          if (!transactionsByMonth.has(monthKey)) {
            transactionsByMonth.set(monthKey, []);
          }
          transactionsByMonth.get(monthKey)!.push(transaction);
        }
        
        // Sort months in descending order
        const sortedMonths = Array.from(transactionsByMonth.keys()).sort().reverse();
        
        for (const month of sortedMonths) {
          const monthTransactions = transactionsByMonth.get(month)!;
          const monthDate = new Date(month + '-01');
          content += `### ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
          
          for (const t of monthTransactions.sort((a, b) => b.date.localeCompare(a.date))) {
            content += `- **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'} - ${formatAmount(t.amount)}\n`;
          }
          content += `\n`;
        }
        
        content += `## Next Steps\n`;
        content += `- All transactions through ${formatDate(reconciliationDate)} have been marked as reconciled\n`;
        content += `- Review any balance discrepancies if present\n`;
        content += `- Consider reconciling again after your next bank statement\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Find Transactions for Reconciliation
  server.registerTool(
    "find-transactions-for-reconciliation",
    {
      title: "Find Transactions for Reconciliation",
      description: "Find transactions that need reconciliation based on their cleared and approved status",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().optional().describe("Account ID to filter by (optional - if not provided, searches all accounts)"),
        cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("Filter by cleared status"),
        approved: z.boolean().optional().describe("Filter by approved status"),
        sinceDate: z.string().optional().describe("Only include transactions on or after this date (ISO format: YYYY-MM-DD)"),
        untilDate: z.string().optional().describe("Only include transactions on or before this date (ISO format: YYYY-MM-DD)"),
        limit: z.number().optional().describe("Maximum number of transactions to return (default: 50)")
      }
    },
    async ({ budgetId, accountId, cleared, approved, sinceDate, untilDate, limit = 50 }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Get transactions using the client method
        const transactionsResponse = await client.getTransactionsByStatus(
          actualBudgetId, 
          accountId, 
          cleared, 
          approved, 
          { since_date: sinceDate }
        );
        
        let transactions = transactionsResponse.data.transactions
          .filter(t => !t.deleted)
          .sort((a, b) => b.date.localeCompare(a.date));
        
        // Apply additional date filtering if untilDate is provided
        if (untilDate) {
          transactions = transactions.filter(t => t.date <= untilDate);
        }
        
        // Apply limit
        transactions = transactions.slice(0, limit);
        
        let content = `# Transactions for Reconciliation\n\n`;
        
        // Build filter description
        const filters = [];
        if (accountId) {
          // Get account name for display
          try {
            const accountResponse = await client.getAccount(actualBudgetId, accountId);
            filters.push(`Account: ${accountResponse.data.account.name}`);
          } catch {
            filters.push(`Account ID: ${accountId}`);
          }
        }
        if (cleared) filters.push(`Cleared Status: ${cleared}`);
        if (approved !== undefined) filters.push(`Approved: ${approved ? 'Yes' : 'No'}`);
        if (sinceDate) filters.push(`From: ${formatDate(sinceDate)}`);
        if (untilDate) filters.push(`Until: ${formatDate(untilDate)}`);
        
        content += `## Search Criteria\n`;
        if (filters.length > 0) {
          content += filters.map(f => `- ${f}`).join('\n') + '\n';
        } else {
          content += `- All transactions\n`;
        }
        content += `- Limit: ${limit} transactions\n\n`;
        
        content += `## Summary\n`;
        content += `- **Total Transactions Found**: ${transactions.length}\n`;
        
        if (transactions.length === 0) {
          content += `\nNo transactions found matching the specified criteria.\n`;
          return {
            content: [{ type: "text", text: content }]
          };
        }
        
        // Calculate summary statistics
        const statusCounts = {
          uncleared_unapproved: 0,
          uncleared_approved: 0,
          cleared_unapproved: 0,
          cleared_approved: 0,
          reconciled: 0
        };
        
        let totalAmount = 0;
        
        for (const t of transactions) {
          totalAmount += t.amount;
          
          if (t.cleared === 'reconciled') {
            statusCounts.reconciled++;
          } else if (t.cleared === 'cleared') {
            if (t.approved) statusCounts.cleared_approved++;
            else statusCounts.cleared_unapproved++;
          } else { // uncleared
            if (t.approved) statusCounts.uncleared_approved++;
            else statusCounts.uncleared_unapproved++;
          }
        }
        
        content += `- **Net Amount**: ${formatAmount(totalAmount)}\n\n`;
        
        content += `### Status Breakdown\n`;
        if (statusCounts.uncleared_unapproved > 0) content += `- 🔴 **Uncleared & Unapproved**: ${statusCounts.uncleared_unapproved}\n`;
        if (statusCounts.uncleared_approved > 0) content += `- 🔵 **Uncleared & Approved**: ${statusCounts.uncleared_approved}\n`;
        if (statusCounts.cleared_unapproved > 0) content += `- 🟡 **Cleared & Unapproved**: ${statusCounts.cleared_unapproved}\n`;
        if (statusCounts.cleared_approved > 0) content += `- 🟢 **Cleared & Approved**: ${statusCounts.cleared_approved}\n`;
        if (statusCounts.reconciled > 0) content += `- ✅ **Reconciled**: ${statusCounts.reconciled}\n`;
        
        content += `\n## Transactions\n\n`;
        
        // Group transactions by month for better readability
        const transactionsByMonth = new Map<string, typeof transactions>();
        
        for (const transaction of transactions) {
          const monthKey = transaction.date.substring(0, 7); // YYYY-MM
          if (!transactionsByMonth.has(monthKey)) {
            transactionsByMonth.set(monthKey, []);
          }
          transactionsByMonth.get(monthKey)!.push(transaction);
        }
        
        // Sort months in descending order
        const sortedMonths = Array.from(transactionsByMonth.keys()).sort().reverse();
        
        for (const month of sortedMonths) {
          const monthTransactions = transactionsByMonth.get(month)!;
          const monthDate = new Date(month + '-01');
          content += `### ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
          
          for (const t of monthTransactions) {
            const statusEmoji = getStatusEmoji(t.cleared, t.approved);
            content += `${statusEmoji} **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'}\n`;
            content += `   - **Amount**: ${formatAmount(t.amount)}\n`;
            content += `   - **Account**: ${t.account_name}\n`;
            content += `   - **Status**: ${formatStatus(t.cleared, t.approved)}\n`;
            content += `   - **Category**: ${t.category_name || 'Uncategorized'}\n`;
            content += `   - **ID**: ${t.id}\n`;
            if (t.memo) {
              content += `   - **Memo**: ${t.memo}\n`;
            }
            content += `\n`;
          }
        }
        
        content += `## Reconciliation Actions\n`;
        content += `- Use \`bulk-update-transaction-status\` to update multiple transactions at once\n`;
        content += `- Use \`reconcile-account-transactions\` to reconcile an entire account through a specific date\n`;
        content += `- Use \`mark-transactions-cleared\` to mark specific transactions as cleared\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Mark Transactions as Cleared
  server.registerTool(
    "mark-transactions-cleared",
    {
      title: "Mark Transactions as Cleared",
      description: "Update transactions from uncleared to cleared status for reconciliation",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        transactionIds: z.array(z.string()).describe("Array of transaction IDs to mark as cleared"),
        alsoApprove: z.boolean().optional().describe("Also mark transactions as approved (default: true)")
      }
    },
    async ({ budgetId, transactionIds, alsoApprove = true }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Prepare bulk updates to mark as cleared (and optionally approved)
        const bulkUpdates = transactionIds.map(id => ({
          transactionId: id,
          cleared: 'cleared' as const,
          approved: alsoApprove
        }));
        
        // Perform bulk update
        const results = await client.bulkUpdateTransactionStatus(actualBudgetId, bulkUpdates);
        
        let content = `# Mark Transactions as Cleared - Complete\n\n`;
        content += `## Summary\n`;
        content += `- **Total Transactions Requested**: ${transactionIds.length}\n`;
        content += `- **Successfully Updated**: ${results.length}\n`;
        content += `- **Failed Updates**: ${transactionIds.length - results.length}\n`;
        content += `- **New Status**: Cleared${alsoApprove ? ' & Approved' : ''}\n\n`;
        
        if (results.length > 0) {
          content += `## Updated Transactions\n\n`;
          
          // Calculate total amount cleared
          const totalAmountCleared = results.reduce((sum, result) => sum + result.data.transaction.amount, 0);
          content += `**Total Amount Cleared**: ${formatAmount(totalAmountCleared)}\n\n`;
          
          // Group transactions by account for better organization
          const transactionsByAccount = new Map<string, typeof results>();
          
          for (const result of results) {
            const accountName = result.data.transaction.account_name || 'Unknown Account';
            if (!transactionsByAccount.has(accountName)) {
              transactionsByAccount.set(accountName, []);
            }
            transactionsByAccount.get(accountName)!.push(result);
          }
          
          // Sort accounts alphabetically
          const sortedAccounts = Array.from(transactionsByAccount.keys()).sort();
          
          for (const accountName of sortedAccounts) {
            const accountTransactions = transactionsByAccount.get(accountName)!;
            content += `### ${accountName}\n\n`;
            
            // Sort transactions by date (newest first)
            accountTransactions.sort((a, b) => b.data.transaction.date.localeCompare(a.data.transaction.date));
            
            for (const result of accountTransactions) {
              const t = result.data.transaction;
              content += `- **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'}\n`;
              content += `  - Amount: ${formatAmount(t.amount)}\n`;
              content += `  - Category: ${t.category_name || 'Uncategorized'}\n`;
              content += `  - Status: ✅ Cleared${t.approved ? ', ✓ Approved' : ''}\n`;
              content += `  - ID: ${t.id}\n`;
              if (t.memo) {
                content += `  - Memo: ${t.memo}\n`;
              }
              content += `\n`;
            }
          }
        }
        
        if (transactionIds.length - results.length > 0) {
          content += `## Failed Updates\n`;
          content += `${transactionIds.length - results.length} transaction(s) could not be updated.\n`;
          content += `This may be due to:\n`;
          content += `- Invalid transaction IDs\n`;
          content += `- Network connectivity issues\n`;
          content += `- Transactions that are already deleted\n`;
          content += `- API rate limiting\n\n`;
        }
        
        content += `## Balance Impact\n`;
        if (results.length > 0) {
          const totalAmount = results.reduce((sum, result) => sum + result.data.transaction.amount, 0);
          content += `These cleared transactions represent ${formatAmount(totalAmount)} in activity.\n`;
          content += `Your account's cleared balance will reflect these transactions.\n\n`;
        }
        
        content += `## Next Steps\n`;
        content += `- Review your account balances to ensure they match your bank statements\n`;
        content += `- Use \`reconcile-account-transactions\` to mark these as reconciled when ready\n`;
        content += `- Use \`find-transactions-for-reconciliation\` to find remaining uncleared transactions\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Reconciliation Status Report
  server.registerTool(
    "reconciliation-status-report",
    {
      title: "Generate Reconciliation Status Report",
      description: "Generate a comprehensive report showing the current reconciliation state of accounts",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountIds: z.array(z.string()).optional().describe("Array of account IDs to include (optional - if not provided, includes all accounts)"),
        includeReconciledTransactions: z.boolean().optional().describe("Include details of already reconciled transactions (default: false)")
      }
    },
    async ({ budgetId, accountIds, includeReconciledTransactions = false }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Get all accounts
        const accountsResponse = await client.getAccounts(actualBudgetId);
        let accounts = accountsResponse.data.accounts.filter(a => !a.closed && !a.deleted);
        
        // Filter by specified account IDs if provided
        if (accountIds && accountIds.length > 0) {
          accounts = accounts.filter(a => accountIds.includes(a.id));
        }
        
        if (accounts.length === 0) {
          return {
            content: [{ type: "text", text: "No accounts found matching the specified criteria." }]
          };
        }
        
        let content = `# Reconciliation Status Report\n\n`;
        content += `## Overview\n`;
        content += `- **Report Date**: ${formatDate(new Date().toISOString().split('T')[0])}\n`;
        content += `- **Accounts Included**: ${accounts.length}\n`;
        content += `- **Budget**: ${actualBudgetId === budgetId ? budgetId : `${budgetId} (${actualBudgetId})`}\n\n`;
        
        // Collect summary statistics
        let totalAccounts = 0;
        let totalUncleared = 0;
        let totalCleared = 0;
        let totalReconciled = 0;
        let totalUnapproved = 0;
        let totalUnprocessedBalance = 0;
        
        const accountReports: Array<{
          account: any;
          transactions: any[];
          summary: any;
        }> = [];
        
        // Process each account
        for (const account of accounts) {
          try {
            const transactionsResponse = await client.getAccountTransactions(actualBudgetId, account.id);
            const transactions = transactionsResponse.data.transactions.filter(t => !t.deleted);
            
            // Calculate statistics for this account
            const statusCounts = {
              uncleared: 0,
              cleared: 0,
              reconciled: 0,
              unapproved: 0
            };
            
            const statusBalances = {
              uncleared: 0,
              cleared: 0,
              reconciled: 0
            };
            
            let lastReconciledDate: string | null = null;
            
            for (const t of transactions) {
              // Count by status
              statusCounts[t.cleared]++;
              statusBalances[t.cleared] += t.amount;
              
              if (!t.approved) {
                statusCounts.unapproved++;
              }
              
              // Track last reconciled date
              if (t.cleared === 'reconciled') {
                if (!lastReconciledDate || t.date > lastReconciledDate) {
                  lastReconciledDate = t.date;
                }
              }
            }
            
            const accountSummary = {
              account_id: account.id,
              account_name: account.name,
              uncleared_count: statusCounts.uncleared,
              cleared_count: statusCounts.cleared,
              reconciled_count: statusCounts.reconciled,
              unapproved_count: statusCounts.unapproved,
              uncleared_balance: statusBalances.uncleared,
              cleared_balance: statusBalances.cleared,
              reconciled_balance: statusBalances.reconciled,
              total_balance: account.balance,
              last_reconciled_date: lastReconciledDate
            };
            
            accountReports.push({
              account,
              transactions,
              summary: accountSummary
            });
            
            // Add to totals
            totalAccounts++;
            totalUncleared += statusCounts.uncleared;
            totalCleared += statusCounts.cleared;
            totalReconciled += statusCounts.reconciled;
            totalUnapproved += statusCounts.unapproved;
            totalUnprocessedBalance += statusBalances.uncleared;
            
          } catch (error) {
            console.error(`Error processing account ${account.name}:`, error);
          }
        }
        
        // Overall summary
        content += `## Summary Statistics\n`;
        content += `- **Total Transactions Needing Attention**: ${totalUncleared + totalUnapproved}\n`;
        content += `- **Uncleared Transactions**: ${totalUncleared}\n`;
        content += `- **Cleared Transactions**: ${totalCleared}\n`;
        content += `- **Reconciled Transactions**: ${totalReconciled}\n`;
        content += `- **Unapproved Transactions**: ${totalUnapproved}\n`;
        content += `- **Unprocessed Balance**: $${formatAmount(totalUnprocessedBalance)}\n\n`;
        
        // Account-by-account breakdown
        content += `## Account Details\n\n`;
        
        // Sort accounts by the number of uncleared transactions (most needing attention first)
        accountReports.sort((a, b) => b.summary.uncleared_count - a.summary.uncleared_count);
        
        for (const report of accountReports) {
          const { account, transactions, summary } = report;
          
          content += `### ${getUrgencyEmoji(summary.uncleared_count)} ${account.name}\n\n`;
          content += `**Account Balance**: $${formatAmount(account.balance)}\n`;
          content += `**Account Type**: ${account.type}\n\n`;
          
          content += `**Transaction Status:**\n`;
          content += `- 🔴 Uncleared: ${summary.uncleared_count} ($${formatAmount(summary.uncleared_balance)})\n`;
          content += `- 🟡 Cleared: ${summary.cleared_count} ($${formatAmount(summary.cleared_balance)})\n`;
          content += `- ✅ Reconciled: ${summary.reconciled_count} ($${formatAmount(summary.reconciled_balance)})\n`;
          content += `- ⚠️ Unapproved: ${summary.unapproved_count}\n`;
          
          if (summary.last_reconciled_date) {
            content += `- **Last Reconciled**: ${formatDate(summary.last_reconciled_date)}\n`;
          } else {
            content += `- **Last Reconciled**: Never\n`;
          }
          
          // Recommendations
          content += `\n**Recommendations:**\n`;
          if (summary.uncleared_count > 0) {
            content += `- Use \`find-transactions-for-reconciliation\` to review ${summary.uncleared_count} uncleared transactions\n`;
            content += `- Use \`mark-transactions-cleared\` to mark verified transactions as cleared\n`;
          }
          if (summary.cleared_count > 0) {
            content += `- Consider using \`reconcile-account-transactions\` to reconcile ${summary.cleared_count} cleared transactions\n`;
          }
          if (summary.unapproved_count > 0) {
            content += `- Review and approve ${summary.unapproved_count} unapproved transactions\n`;
          }
          if (summary.uncleared_count === 0 && summary.cleared_count === 0) {
            content += `- ✅ Account is fully reconciled!\n`;
          }
          
          content += `\n`;
          
          // Show recent uncleared transactions if requested
          if (summary.uncleared_count > 0 && summary.uncleared_count <= 5) {
            const unclearedTransactions = transactions
              .filter(t => t.cleared === 'uncleared')
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5);
            
            content += `**Recent Uncleared Transactions:**\n`;
            for (const t of unclearedTransactions) {
              content += `- ${formatDate(t.date)} - ${t.payee_name || 'No Payee'} - $${formatAmount(t.amount)}\n`;
            }
            content += `\n`;
          }
        }
        
        // Reconciliation workflow guidance
        content += `## Recommended Reconciliation Workflow\n\n`;
        content += `1. **Review Uncleared Transactions**: Use \`find-transactions-for-reconciliation\` with \`cleared: "uncleared"\`\n`;
        content += `2. **Mark Verified Transactions**: Use \`mark-transactions-cleared\` for transactions that appear on your bank statement\n`;
        content += `3. **Reconcile Account**: Use \`reconcile-account-transactions\` when you have a complete bank statement\n`;
        content += `4. **Approve Transactions**: Ensure all transactions are approved for accurate reporting\n`;
        content += `5. **Regular Schedule**: Reconcile at least monthly, ideally weekly for active accounts\n\n`;
        
        content += `## Quick Actions\n`;
        content += `- **Find all uncleared**: \`find-transactions-for-reconciliation\` with \`cleared: "uncleared"\`\n`;
        content += `- **Find unapproved**: \`find-transactions-for-reconciliation\` with \`approved: false\`\n`;
        content += `- **Bulk clear transactions**: \`mark-transactions-cleared\` with transaction IDs\n`;
        content += `- **Full account reconciliation**: \`reconcile-account-transactions\` with account ID and date\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Match Bank Transactions
  server.registerTool(
    "match-bank-transactions",
    {
      title: "Match Bank Transactions",
      description: "Compare bank transactions with YNAB to find matches and discrepancies",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().describe("Account ID to match transactions for"),
        bankTransactions: z.array(z.object({
          date: z.string().describe("Transaction date (ISO format: YYYY-MM-DD)"),
          amount: z.number().describe("Transaction amount in dollars (negative for outflows)"),
          payee: z.string().optional().describe("Transaction payee/description")
        })).describe("Array of bank transactions to match"),
        tolerance: z.number().default(3).describe("Date range tolerance in days for matching")
      }
    },
    async ({ budgetId, accountId, bankTransactions, tolerance }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Perform the matching
        const matchResult = await client.matchBankTransactions(
          actualBudgetId,
          accountId,
          bankTransactions,
          tolerance
        );
        
        let content = `# Bank Transaction Matching Results\n\n`;
        
        // Summary section
        content += `## Summary\n`;
        content += `- **Bank Transactions**: ${matchResult.summary.totalBankTransactions}\n`;
        content += `- **YNAB Transactions**: ${matchResult.summary.totalYNABTransactions}\n`;
        content += `- **Matched**: ${matchResult.summary.matchedCount} (${(matchResult.summary.matchRate * 100).toFixed(1)}%)\n`;
        content += `- **Unmatched Bank**: ${matchResult.unmatchedBank.length}\n`;
        content += `- **Unmatched YNAB**: ${matchResult.unmatchedYNAB.length}\n\n`;
        
        // Matched transactions
        if (matchResult.matched.length > 0) {
          content += `## Matched Transactions\n\n`;
          
          // Group by confidence level
          const groupedMatches = matchResult.matched.reduce((acc, match) => {
            if (!acc[match.matchConfidence]) {
              acc[match.matchConfidence] = [];
            }
            acc[match.matchConfidence].push(match);
            return acc;
          }, {} as { [key: string]: typeof matchResult.matched });
          
          // Display in order of confidence
          const confidenceOrder = ['exact', 'high', 'medium', 'low'];
          for (const confidence of confidenceOrder) {
            const matches = groupedMatches[confidence];
            if (!matches || matches.length === 0) continue;
            
            content += `### ${getConfidenceEmoji(confidence)} ${confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence (${matches.length})\n\n`;
            
            for (const match of matches) {
              const bankTx = match.bankTransaction;
              const ynabTx = match.ynabTransaction;
              
              content += `**${formatDate(bankTx.date)} - ${bankTx.payee || 'No Description'}**\n`;
              content += `- Bank: ${formatAmount(bankTx.amount)} on ${formatDate(bankTx.date)}\n`;
              content += `- YNAB: ${formatAmount(ynabTx.amount)} on ${formatDate(ynabTx.date)} - ${ynabTx.payee_name || 'No Payee'}\n`;
              content += `- Category: ${ynabTx.category_name || 'Uncategorized'}\n`;
              content += `- Match Reasons: ${match.matchReasons.join(', ')}\n`;
              content += `- Transaction ID: ${ynabTx.id}\n\n`;
            }
          }
        }
        
        // Unmatched bank transactions
        if (matchResult.unmatchedBank.length > 0) {
          content += `## ❌ Unmatched Bank Transactions (${matchResult.unmatchedBank.length})\n`;
          content += `These transactions appear in your bank but not in YNAB:\n\n`;
          
          const sortedUnmatchedBank = [...matchResult.unmatchedBank].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          for (const bankTx of sortedUnmatchedBank) {
            content += `- **${formatDate(bankTx.date)}** - ${bankTx.payee || 'No Description'} - ${formatAmount(bankTx.amount)}\n`;
          }
          
          content += `\n### Recommended Actions:\n`;
          content += `1. Check if these transactions need to be imported into YNAB\n`;
          content += `2. Verify the date range - transactions might be outside the search window\n`;
          content += `3. Check if amounts might be slightly different due to fees or tips\n\n`;
        }
        
        // Unmatched YNAB transactions
        if (matchResult.unmatchedYNAB.length > 0) {
          content += `## ⚠️ Unmatched YNAB Transactions (${matchResult.unmatchedYNAB.length})\n`;
          content += `These transactions appear in YNAB but not in your bank data:\n\n`;
          
          const sortedUnmatchedYNAB = [...matchResult.unmatchedYNAB].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          for (const ynabTx of sortedUnmatchedYNAB) {
            const statusEmoji = ynabTx.cleared === 'cleared' ? '🟡' : 
                              ynabTx.cleared === 'reconciled' ? '✅' : '🔴';
            content += `- **${formatDate(ynabTx.date)}** - ${ynabTx.payee_name || 'No Payee'} - ${formatAmount(ynabTx.amount)} ${statusEmoji} ${ynabTx.cleared}\n`;
            if (ynabTx.memo) {
              content += `  Memo: ${ynabTx.memo}\n`;
            }
          }
          
          content += `\n### Possible Reasons:\n`;
          content += `1. Pending transactions not yet posted to bank\n`;
          content += `2. Bank data might be incomplete\n`;
          content += `3. Duplicate entries in YNAB\n`;
          content += `4. Manual transactions entered incorrectly\n\n`;
        }
        
        // Recommendations
        content += `## Recommendations\n\n`;
        
        if (matchResult.summary.matchRate < 0.8) {
          content += `⚠️ **Low match rate (${(matchResult.summary.matchRate * 100).toFixed(1)}%)**\n`;
          content += `- Consider increasing the date tolerance (currently ${tolerance} days)\n`;
          content += `- Check if bank amounts include fees that YNAB doesn't\n`;
          content += `- Verify date formats are consistent\n\n`;
        }
        
        if (matchResult.unmatchedBank.length > 0) {
          content += `📥 **Import Missing Transactions**\n`;
          content += `- Use \`create-transaction\` to add missing bank transactions\n`;
          content += `- Consider using YNAB's import feature for bulk additions\n\n`;
        }
        
        if (matchResult.unmatchedYNAB.length > 0) {
          content += `🔍 **Review YNAB Transactions**\n`;
          content += `- Check for duplicate entries\n`;
          content += `- Verify pending transactions\n`;
          content += `- Update cleared status for matched transactions\n\n`;
        }
        
        content += `## Next Steps\n`;
        content += `1. Review matched transactions with low confidence\n`;
        content += `2. Import missing bank transactions using \`create-transaction\`\n`;
        content += `3. Update transaction statuses using \`bulk-update-transaction-status\`\n`;
        content += `4. Run \`reconciliation-status-report\` after updates\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );
}

// Helper functions for formatting
const getStatusEmoji = (clearedStatus: string, approvedStatus: boolean): string => {
  if (clearedStatus === 'reconciled') return '✅';
  if (clearedStatus === 'cleared' && approvedStatus) return '🟢';
  if (clearedStatus === 'cleared' && !approvedStatus) return '🟡';
  if (clearedStatus === 'uncleared' && approvedStatus) return '🔵';
  return '🔴'; // uncleared and unapproved
};

const getUrgencyEmoji = (unclearedCount: number): string => {
  if (unclearedCount > 10) return '🔴';
  if (unclearedCount > 5) return '🟡';
  if (unclearedCount > 0) return '🔵';
  return '✅';
};

const getConfidenceEmoji = (confidence: string): string => {
  const emojis: { [key: string]: string } = {
    'exact': '✅',
    'high': '🟢',
    'medium': '🟡',
    'low': '🔴'
  };
  return emojis[confidence] || '❓';
}; 