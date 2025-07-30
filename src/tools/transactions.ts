/**
 * Transaction-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatAmount, formatDate, getFlagEmoji, formatStatus } from "../utils/formatters.js";
import { SaveTransactionWrapper, UpdateTransaction } from "../types.js";

export function registerTransactionTools(server: McpServer) {
  // Tool: List Transactions
  server.registerTool(
    "list-transactions",
    {
      title: "List YNAB Transactions",
      description: "List transactions for a specific budget with formatted output",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        sinceDate: z.string().optional().describe("Only return transactions on or after this date (ISO format: YYYY-MM-DD)"),
        type: z.enum(['uncategorized', 'unapproved']).optional().describe("Filter by transaction type"),
        accountId: z.string().optional().describe("Filter by account ID"),
        categoryId: z.string().optional().describe("Filter by category ID"),
        payeeId: z.string().optional().describe("Filter by payee ID"),
        limit: z.number().optional().describe("Maximum number of transactions to return (default: 50)")
      }
    },
    async ({ budgetId, sinceDate, type, accountId, categoryId, payeeId, limit = 50 }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Get transactions based on filters
        let response;
        if (accountId) {
          response = await client.getAccountTransactions(actualBudgetId, accountId, { since_date: sinceDate, type });
        } else if (categoryId) {
          response = await client.getCategoryTransactions(actualBudgetId, categoryId, { since_date: sinceDate, type });
        } else if (payeeId) {
          response = await client.getPayeeTransactions(actualBudgetId, payeeId, { since_date: sinceDate, type });
        } else {
          response = await client.getTransactions(actualBudgetId, { since_date: sinceDate, type });
        }
        
        const transactions = response.data.transactions
          .filter(t => !t.deleted)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, limit);
        
        let content = "# YNAB Transactions\n\n";
        
        if (transactions.length === 0) {
          content += "*No transactions found matching the criteria*\n";
          return {
            content: [{ type: "text", text: content }]
          };
        }
        
        // Group transactions by month for better readability
        const transactionsByMonth = new Map<string, typeof transactions>();
        
        for (const transaction of transactions) {
          const monthKey = transaction.date.substring(0, 7); // YYYY-MM
          if (!transactionsByMonth.has(monthKey)) {
            transactionsByMonth.set(monthKey, []);
          }
          transactionsByMonth.get(monthKey)!.push(transaction);
        }
        
        for (const [month, monthTransactions] of transactionsByMonth) {
          const monthDate = new Date(month + '-01');
          content += `## ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
          
          for (const t of monthTransactions) {
            const flag = getFlagEmoji(t.flag_color || null);
            const approvalStatus = t.approved ? '' : ' ⚠️';
            
            content += `### ${formatDate(t.date)} - ${t.payee_name || 'No Payee'}${flag}${approvalStatus}\n`;
            content += `- **Amount**: ${formatAmount(t.amount)}\n`;
            content += `- **Account**: ${t.account_name}\n`;
            content += `- **Category**: ${t.category_name || 'Uncategorized'}\n`;
            content += `- **Status**: ${t.cleared} ${t.approved ? '✓' : '(Unapproved)'}\n`;
            
            if (t.memo) {
              content += `- **Memo**: ${t.memo}\n`;
            }
            
            if (t.subtransactions && t.subtransactions.length > 0) {
              content += `- **Split Transaction**:\n`;
              for (const sub of t.subtransactions) {
                content += `  - ${sub.category_name || 'Uncategorized'}: ${formatAmount(sub.amount)}`;
                if (sub.memo) content += ` (${sub.memo})`;
                content += `\n`;
              }
            }
            
            content += `- **ID**: ${t.id}\n`;
            content += "\n";
          }
        }
        
        // Summary
        content += "## Summary\n";
        content += `- **Total Transactions**: ${transactions.length}\n`;
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        content += `- **Net Amount**: ${formatAmount(totalAmount)}\n`;
        
        const inflows = transactions.filter(t => t.amount > 0);
        const outflows = transactions.filter(t => t.amount < 0);
        
        if (inflows.length > 0) {
          const inflowTotal = inflows.reduce((sum, t) => sum + t.amount, 0);
          content += `- **Total Inflows**: ${formatAmount(inflowTotal)} (${inflows.length} transactions)\n`;
        }
        
        if (outflows.length > 0) {
          const outflowTotal = outflows.reduce((sum, t) => sum + t.amount, 0);
          content += `- **Total Outflows**: ${formatAmount(outflowTotal)} (${outflows.length} transactions)\n`;
        }
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Get Transaction Details
  server.registerTool(
    "get-transaction-details",
    {
      title: "Get YNAB Transaction Details",
      description: "Get detailed information about a specific transaction",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        transactionId: z.string().describe("Transaction ID")
      }
    },
    async ({ budgetId, transactionId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getTransaction(actualBudgetId, transactionId);
        const transaction = response.data.transaction;
        
        let content = `# Transaction Details\n\n`;
        content += `## ${transaction.payee_name || 'No Payee'}\n`;
        content += `- **Date**: ${formatDate(transaction.date)}\n`;
        content += `- **Amount**: ${formatAmount(transaction.amount)}\n`;
        content += `- **Account**: ${transaction.account_name}\n`;
        content += `- **Category**: ${transaction.category_name || 'Uncategorized'}\n`;
        
        if (transaction.flag_color) {
          content += `- **Flag**: ${getFlagEmoji(transaction.flag_color)} ${transaction.flag_color}\n`;
        }
        
        content += `\n## Status\n`;
        content += `- **Cleared**: ${transaction.cleared}\n`;
        content += `- **Approved**: ${transaction.approved ? 'Yes' : 'No'}\n`;
        content += `- **Deleted**: ${transaction.deleted ? 'Yes' : 'No'}\n`;
        
        if (transaction.memo) {
          content += `\n## Memo\n${transaction.memo}\n`;
        }
        
        if (transaction.subtransactions && transaction.subtransactions.length > 0) {
          content += `\n## Split Transaction Details\n`;
          for (const sub of transaction.subtransactions) {
            content += `### ${sub.payee_name || transaction.payee_name || 'No Payee'}\n`;
            content += `- **Amount**: ${formatAmount(sub.amount)}\n`;
            content += `- **Category**: ${sub.category_name || 'Uncategorized'}\n`;
            if (sub.memo) {
              content += `- **Memo**: ${sub.memo}\n`;
            }
            content += `- **ID**: ${sub.id}\n\n`;
          }
        }
        
        content += `\n## Metadata\n`;
        content += `- **Transaction ID**: ${transaction.id}\n`;
        content += `- **Import ID**: ${transaction.import_id || 'N/A'}\n`;
        content += `- **Matched Transaction ID**: ${transaction.matched_transaction_id || 'N/A'}\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Create Transaction
  server.registerTool(
    "create-transaction",
    {
      title: "Create YNAB Transaction",
      description: "Create a new transaction in YNAB",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().describe("Account ID for the transaction"),
        date: z.string().describe("Transaction date (ISO format: YYYY-MM-DD)"),
        amount: z.number().describe("Transaction amount in dollars (negative for outflows, positive for inflows)"),
        payeeId: z.string().optional().describe("Payee ID (optional, can use payeeName instead)"),
        payeeName: z.string().optional().describe("Payee name (optional, will create new payee if doesn't exist)"),
        categoryId: z.string().optional().describe("Category ID (optional)"),
        cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("Cleared status (default: uncleared)"),
        approved: z.boolean().optional().describe("Whether transaction is approved (default: false)"),
        flagColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).optional().describe("Flag color"),
        memo: z.string().optional().describe("Transaction memo"),
        importId: z.string().optional().describe("Import ID to prevent duplicate imports")
      }
    },
    async ({ budgetId, accountId, date, amount, payeeId, payeeName, categoryId, cleared, approved, flagColor, memo, importId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Convert amount to milliunits
        const amountInMilliunits = Math.round(amount * 1000);
        
        const transactionWrapper: SaveTransactionWrapper = {
          transaction: {
            account_id: accountId,
            date,
            amount: amountInMilliunits,
            payee_id: payeeId,
            payee_name: payeeName,
            category_id: categoryId,
            cleared: cleared || 'uncleared',
            approved: approved || false,
            flag_color: flagColor || null,
            memo: memo || null,
            import_id: importId
          }
        };
        
        const response = await client.createTransaction(actualBudgetId, transactionWrapper);
        const transaction = response.data.transaction;
        
        let content = `# Transaction Created Successfully!\n\n`;
        content += `## Transaction Details\n`;
        content += `- **Date**: ${formatDate(transaction.date)}\n`;
        content += `- **Payee**: ${transaction.payee_name || 'No Payee'}\n`;
        content += `- **Amount**: ${formatAmount(transaction.amount)}\n`;
        content += `- **Account**: ${transaction.account_name}\n`;
        content += `- **Category**: ${transaction.category_name || 'Uncategorized'}\n`;
        
        if (transaction.memo) {
          content += `- **Memo**: ${transaction.memo}\n`;
        }
        
        if (transaction.flag_color) {
          content += `- **Flag**: ${getFlagEmoji(transaction.flag_color)} ${transaction.flag_color}\n`;
        }
        
        content += `\n## Status\n`;
        content += `- **Cleared**: ${transaction.cleared}\n`;
        content += `- **Approved**: ${transaction.approved ? 'Yes' : 'No'}\n`;
        
        content += `\n## Transaction ID\n`;
        content += `\`${transaction.id}\`\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Update Transaction
  server.registerTool(
    "update-transaction",
    {
      title: "Update YNAB Transaction",
      description: "Update an existing transaction in YNAB",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        transactionId: z.string().describe("Transaction ID to update"),
        accountId: z.string().optional().describe("New account ID"),
        date: z.string().optional().describe("New date (ISO format: YYYY-MM-DD)"),
        amount: z.number().optional().describe("New amount in dollars"),
        payeeId: z.string().optional().describe("New payee ID"),
        payeeName: z.string().optional().describe("New payee name"),
        categoryId: z.string().optional().describe("New category ID"),
        cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("New cleared status"),
        approved: z.boolean().optional().describe("New approved status"),
        flagColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).optional().describe("New flag color"),
        memo: z.string().optional().describe("New memo")
      }
    },
    async ({ budgetId, transactionId, accountId, date, amount, payeeId, payeeName, categoryId, cleared, approved, flagColor, memo }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Build the transaction update object dynamically
        const transaction: any = {};
        
        if (accountId !== undefined) transaction.account_id = accountId;
        if (date !== undefined) transaction.date = date;
        if (amount !== undefined) transaction.amount = Math.round(amount * 1000);
        if (payeeId !== undefined) transaction.payee_id = payeeId;
        if (payeeName !== undefined) transaction.payee_name = payeeName;
        if (categoryId !== undefined) transaction.category_id = categoryId;
        if (cleared !== undefined) transaction.cleared = cleared;
        if (approved !== undefined) transaction.approved = approved;
        if (flagColor !== undefined) transaction.flag_color = flagColor;
        if (memo !== undefined) transaction.memo = memo;
        
        const response = await client.updateTransaction(actualBudgetId, transactionId, { transaction });
        const updatedTransaction = response.data.transaction;
        
        let content = `# Transaction Updated Successfully!\n\n`;
        content += `## Updated Transaction Details\n`;
        content += `- **Date**: ${formatDate(updatedTransaction.date)}\n`;
        content += `- **Payee**: ${updatedTransaction.payee_name || 'No Payee'}\n`;
        content += `- **Amount**: ${formatAmount(updatedTransaction.amount)}\n`;
        content += `- **Account**: ${updatedTransaction.account_name}\n`;
        content += `- **Category**: ${updatedTransaction.category_name || 'Uncategorized'}\n`;
        
        if (updatedTransaction.memo) {
          content += `- **Memo**: ${updatedTransaction.memo}\n`;
        }
        
        if (updatedTransaction.flag_color) {
          content += `- **Flag**: ${getFlagEmoji(updatedTransaction.flag_color)} ${updatedTransaction.flag_color}\n`;
        }
        
        content += `\n## Status\n`;
        content += `- **Cleared**: ${updatedTransaction.cleared}\n`;
        content += `- **Approved**: ${updatedTransaction.approved ? 'Yes' : 'No'}\n`;
        
        content += `\n## Transaction ID\n`;
        content += `\`${updatedTransaction.id}\`\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Delete Transaction
  server.registerTool(
    "delete-transaction",
    {
      title: "Delete YNAB Transaction",
      description: "Delete a transaction from YNAB",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        transactionId: z.string().describe("Transaction ID to delete")
      }
    },
    async ({ budgetId, transactionId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.deleteTransaction(actualBudgetId, transactionId);
        const transaction = response.data.transaction;
        
        let content = `# Transaction Deleted Successfully!\n\n`;
        content += `## Deleted Transaction Details\n`;
        content += `- **Date**: ${formatDate(transaction.date)}\n`;
        content += `- **Payee**: ${transaction.payee_name || 'No Payee'}\n`;
        content += `- **Amount**: ${formatAmount(transaction.amount)}\n`;
        content += `- **Account**: ${transaction.account_name}\n`;
        content += `- **Category**: ${transaction.category_name || 'Uncategorized'}\n`;
        
        if (transaction.memo) {
          content += `- **Memo**: ${transaction.memo}\n`;
        }
        
        content += `\n## Transaction ID\n`;
        content += `\`${transaction.id}\` (deleted)\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Bulk Update Transaction Status
  server.registerTool(
    "bulk-update-transaction-status",
    {
      title: "Bulk Update Transaction Status",
      description: "Update multiple transactions at once with support for all transaction fields",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        updates: z.array(z.object({
          transactionId: z.string().describe("Transaction ID to update"),
          accountId: z.string().optional().describe("New account ID"),
          payeeId: z.string().nullable().optional().describe("New payee ID"),
          payeeName: z.string().nullable().optional().describe("New payee name"),
          categoryId: z.string().nullable().optional().describe("New category ID"),
          amount: z.number().optional().describe("New amount in dollars"),
          memo: z.string().nullable().optional().describe("New memo"),
          flagColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).nullable().optional().describe("New flag color"),
          cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("New cleared status"),
          approved: z.boolean().optional().describe("New approved status"),
          date: z.string().optional().describe("New date (ISO format: YYYY-MM-DD)"),
          importId: z.string().nullable().optional().describe("New import ID"),
          subtransactions: z.array(z.object({
            amount: z.number().describe("Subtransaction amount in dollars"),
            payeeId: z.string().nullable().optional().describe("Subtransaction payee ID"),
            payeeName: z.string().nullable().optional().describe("Subtransaction payee name"),
            categoryId: z.string().nullable().optional().describe("Subtransaction category ID"),
            memo: z.string().nullable().optional().describe("Subtransaction memo")
          })).optional().describe("New subtransactions (replaces existing)")
        })).describe("Array of transaction updates")
      }
    },
    async ({ budgetId, updates }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Convert updates to YNAB API format
        const ynabUpdates: UpdateTransaction[] = updates.map(update => {
          const updateTransaction: UpdateTransaction = {
            id: update.transactionId
          };
          
          // Add optional fields if provided
          if (update.accountId !== undefined) updateTransaction.account_id = update.accountId;
          if (update.payeeId !== undefined) updateTransaction.payee_id = update.payeeId;
          if (update.payeeName !== undefined) updateTransaction.payee_name = update.payeeName;
          if (update.categoryId !== undefined) updateTransaction.category_id = update.categoryId;
          if (update.amount !== undefined) updateTransaction.amount = Math.round(update.amount * 1000); // Convert to milliunits
          if (update.memo !== undefined) updateTransaction.memo = update.memo;
          if (update.flagColor !== undefined) updateTransaction.flag_color = update.flagColor;
          if (update.cleared !== undefined) updateTransaction.cleared = update.cleared;
          if (update.approved !== undefined) updateTransaction.approved = update.approved;
          if (update.date !== undefined) updateTransaction.date = update.date;
          if (update.importId !== undefined) updateTransaction.import_id = update.importId;
          
          // Handle subtransactions
          if (update.subtransactions !== undefined) {
            updateTransaction.subtransactions = update.subtransactions.map(sub => ({
              amount: Math.round(sub.amount * 1000), // Convert to milliunits
              payee_id: sub.payeeId,
              payee_name: sub.payeeName,
              category_id: sub.categoryId,
              memo: sub.memo
            }));
          }
          
          return updateTransaction;
        });
        
        // Perform bulk update using the PATCH endpoint
        const response = await client.bulkUpdateTransactions(actualBudgetId, ynabUpdates);
        
        let content = `# Bulk Transaction Update Complete\n\n`;
        content += `## Summary\n`;
        content += `- **Total Updates Requested**: ${updates.length}\n`;
        content += `- **Successful Updates**: ${response.data.transactions.length}\n`;
        content += `- **Failed Updates**: ${updates.length - response.data.transactions.length}\n\n`;
        
        if (response.data.transactions.length > 0) {
          content += `## Updated Transactions\n\n`;
          
          // Group transactions by what was updated
          const updatedFields: { [key: string]: number } = {};
          
          for (let i = 0; i < response.data.transactions.length; i++) {
            const transaction = response.data.transactions[i];
            const update = updates.find(u => u.transactionId === transaction.id);
            
            if (!update) continue;
            
            // Track which fields were updated
            Object.keys(update).forEach(key => {
              if (key !== 'transactionId' && update[key as keyof typeof update] !== undefined) {
                updatedFields[key] = (updatedFields[key] || 0) + 1;
              }
            });
            
            const flag = getFlagEmoji(transaction.flag_color || null);
            content += `### ${transaction.payee_name || 'No Payee'} ${flag}\n`;
            content += `- **Date**: ${formatDate(transaction.date)}\n`;
            content += `- **Amount**: ${formatAmount(transaction.amount)}\n`;
            content += `- **Account**: ${transaction.account_name}\n`;
            content += `- **Category**: ${transaction.category_name || 'Uncategorized'}\n`;
            content += `- **Status**: ${formatStatus(transaction.cleared, transaction.approved)}\n`;
            
            if (transaction.memo) {
              content += `- **Memo**: ${transaction.memo}\n`;
            }
            
            // Show what was updated
            content += `- **Updated Fields**:`;
            const updatesList = [];
            if (update.accountId !== undefined) updatesList.push('Account');
            if (update.payeeId !== undefined || update.payeeName !== undefined) updatesList.push('Payee');
            if (update.categoryId !== undefined) updatesList.push('Category');
            if (update.amount !== undefined) updatesList.push('Amount');
            if (update.memo !== undefined) updatesList.push('Memo');
            if (update.flagColor !== undefined) updatesList.push('Flag');
            if (update.cleared !== undefined) updatesList.push('Cleared Status');
            if (update.approved !== undefined) updatesList.push('Approved Status');
            if (update.date !== undefined) updatesList.push('Date');
            if (update.subtransactions !== undefined) updatesList.push('Subtransactions');
            
            content += ` ${updatesList.join(', ')}\n`;
            content += `- **Transaction ID**: ${transaction.id}\n`;
            
            if (transaction.subtransactions && transaction.subtransactions.length > 0) {
              content += `- **Split Transaction**:\n`;
              for (const sub of transaction.subtransactions) {
                content += `  - ${sub.category_name || 'Uncategorized'}: ${formatAmount(sub.amount)}`;
                if (sub.memo) content += ` (${sub.memo})`;
                content += `\n`;
              }
            }
            
            content += `\n`;
          }
          
          // Summary of updated fields
          content += `## Field Update Summary\n`;
          for (const [field, count] of Object.entries(updatedFields)) {
            const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            content += `- **${fieldName}**: ${count} transaction(s)\n`;
          }
        }
        
        if (updates.length - response.data.transactions.length > 0) {
          content += `\n## Failed Updates\n`;
          content += `${updates.length - response.data.transactions.length} transaction(s) could not be updated.\n`;
          content += `This may be due to:\n`;
          content += `- Invalid transaction IDs\n`;
          content += `- Invalid field values (e.g., non-existent account/category/payee IDs)\n`;
          content += `- Network connectivity issues\n`;
          content += `- API rate limiting\n`;
        }
        
        content += `\n## Next Steps\n`;
        content += `- Use \`list-transactions\` to verify the updates\n`;
        content += `- Use \`get-transaction-details\` to see full details of updated transactions\n`;
        content += `- Use \`reconciliation-status-report\` if you updated cleared/approved statuses\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );
} 