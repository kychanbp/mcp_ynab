/**
 * Prompt registrations for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer) {
  // Prompt: Reconciliation Workflow
  server.registerPrompt(
    "reconciliation-workflow",
    {
      title: "Reconciliation Workflow",
      description: "Guide for reconciling YNAB accounts with bank statements",
      argsSchema: {}
    },
    () => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `You are helping reconcile YNAB accounts. Follow this workflow:

**System Constraints to Remember:**
- For normal matched transactions:
  * Use create-transaction for missing bank transactions
  * Use update-transaction for status changes or payee updates
  * Follow standard transaction rules
- Reconciliation adjustments (ONLY when transactions cannot be matched):
  * Use payeeId for "Reconciliation Balance Adjustment" (not payeeName)
  * Category must be "Inflow: Ready to Assign" (get ID from list-categories)
  * Set cleared="reconciled" and approved=true
- Cannot create system payees - must use existing IDs
- For mathematical operations:
  * Always show your calculations step-by-step
  * Double-check all arithmetic (additions, subtractions)
  * Remember: YNAB amounts are in milliunits (divide by 1000 for dollars)
  * When comparing balances, show: Bank Balance - YNAB Balance = Difference

0. **Budget Selection**
   - Use list-budgets to show available budgets
   - If multiple budgets exist, ask user which one to reconcile
   - Use the selected budget ID for all subsequent operations

1. **Check Current State**
   - Use list-accounts to see account balances
   - Note the Cleared vs Uncleared amounts
   - Identify which accounts need reconciliation:
     * Has uncleared transactions (uncleared > 0), OR
     * Account balance differs from bank statement (ask user for bank balances)
   - Sort accounts by:
     * Credit cards first (most frequent reconciliation need)
     * Then checking/savings accounts
     * Investment accounts last
   - Show last reconciliation date for each account
   - List accounts with their reconciliation status

2. **Loop Through Accounts**
   For each account that needs reconciliation:
   
   a) **Ask User**: "Would you like to reconcile [Account Name]? (yes/no/skip all)"
      - If "skip all", end the reconciliation process
      - If "no" or "skip", continue to next account
      - If "yes", proceed with steps below
   
   b) **Review Uncleared Transactions**
      - Use find-transactions-for-reconciliation with cleared="uncleared" for this account
      - Group by date and show summary
      - Highlight any old uncleared transactions (>30 days)
   
   c) **Match Bank Data**
      - Ask user: "Please provide bank data for [Account Name] (paste transactions or type 'skip')"
      - If user provides data:
        * Extract: date, payee, amount from bank data
        * Use match-bank-transactions to find matches
        * For pending transactions, expect them to be uncleared
        * Bank amounts are in dollars, YNAB stores in milliunits
        * For unmatched transactions, suggest likely matches based on:
          - Amount similarity (within $0.10)
          - Date proximity (within 3 days)
          - Partial payee name matches
        * Common matching scenarios:
          - "No Payee" in YNAB often matches bank transactions
          - Check amounts first, then dates (may differ by 1-2 days)
          - Pending transactions in bank may already be cleared in YNAB
          - Multiple small transactions (transit, fees) are often missing
       - **After matching transactions:**
         * Show all matched transactions that have 'No Payee'
         * Ask: 'Would you like to update payee names? (yes/no)'
         * If yes, for each transaction:
           - Show: Date, Amount, Suggested Payee
           - Update using bulk-update-transaction-status
         * Important: Update payees BEFORE marking as reconciled
       - **Balance Check**:
        * Ask user: "What is the ending balance shown on your bank statement?"
        * Calculate expected YNAB balance (cleared + provided bank transactions)
        * If mismatch detected:
          - Show: "⚠️ Balance mismatch detected!"
          - Show: "Bank statement balance: $X.XX"
          - Show: "YNAB calculated balance: $Y.YY"
          - Show: "Difference: $Z.ZZ"
          - Ask: "Would you like to: 
            1) Provide more transactions
            2) Create adjustment transaction for the difference
            3) Ignore and proceed anyway"
        * If user chooses option 1, loop back to ask for more bank data
        * If user chooses option 2, use reconcile-account-with-adjustment tool
        * If user chooses option 3, continue with reconciliation
   
   d) **Handle Discrepancies**
      - Missing in YNAB: Create with create-transaction
      - Extra in YNAB: Investigate if duplicate or pending
      - Status mismatch: Update with bulk-update-transaction-status
   
   e) **Finalize Account**
      - Mark matched transactions as cleared/reconciled
      - Verify final balance matches bank
      - Show account summary with ✅ if balanced, ❌ if not

3. **Final Summary**
   - List all accounts with their reconciliation status
   - Show which accounts were:
     * ✅ Successfully reconciled
     * ⏭️ Skipped by user
     * ❌ Have discrepancies
     * ✔️ Already reconciled (no uncleared)

Remember: All amounts in YNAB are milliunits (multiply dollars by 1000).`
        }
      }]
    })
  );

  // TODO: Add analyze-budget prompt when needed
} 