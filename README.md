# YNAB MCP Server

A Model Context Protocol (MCP) server that provides access to YNAB (You Need A Budget) data through a standardized interface. This server implements resources, tools, and prompts to interact with YNAB user information and budgets.

## Features

### Resources
- **User Information** (`ynab://user`) - Get authenticated user details
- **Budget List** (`ynab://budgets`) - List all budgets for the authenticated user
- **Budget Details** (`ynab://budgets/{budgetId}`) - Get detailed information for a specific budget
- **Account List** (`ynab://budgets/{budgetId}/accounts`) - List all accounts for a specific budget
- **Account Details** (`ynab://budgets/{budgetId}/accounts/{accountId}`) - Get detailed information for a specific account
- **Category List** (`ynab://budgets/{budgetId}/categories`) - List all categories for a specific budget
- **Category Details** (`ynab://budgets/{budgetId}/categories/{categoryId}`) - Get detailed information for a specific category
- **Month List** (`ynab://budgets/{budgetId}/months`) - List all months for a specific budget
- **Month Details** (`ynab://budgets/{budgetId}/months/{month}`) - Get detailed information for a specific month including category balances
- **Month Category** (`ynab://budgets/{budgetId}/months/{month}/categories/{categoryId}`) - Get category information for a specific month
- **Payee List** (`ynab://budgets/{budgetId}/payees`) - List all payees for a specific budget
- **Payee Details** (`ynab://budgets/{budgetId}/payees/{payeeId}`) - Get detailed information for a specific payee
- **Payee Locations** (`ynab://budgets/{budgetId}/locations`) - List all payee locations for a specific budget
- **Transaction List** (`ynab://budgets/{budgetId}/transactions`) - List all transactions for a specific budget
- **Transaction Details** (`ynab://budgets/{budgetId}/transactions/{transactionId}`) - Get detailed information for a specific transaction

### Tools

#### Budget Tools

**list-budgets**
- **Input**: 
  - `includeDetails` (optional boolean) - Include full budget details
- **Output**: Formatted markdown list of all budgets with name, ID, date range, currency, and last modified date

**get-budget-summary**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used' for default budget
- **Output**: Formatted markdown with budget overview including name, date range, currency settings

#### Account Tools

**list-accounts**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `includeBalance` (optional boolean, default: true) - Include account balances
- **Output**: Formatted markdown grouped by account type (On Budget, Off Budget, Closed) with balances in dollars

**get-account-details**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (string) - Account ID
- **Output**: Formatted markdown with account type, balances, direct import status, and notes

#### Category Tools

**list-categories**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `includeBudgeted` (optional boolean, default: true) - Include budgeted amounts
- **Output**: Formatted markdown grouped by category groups showing budgeted amounts, activity, and goals

**get-category-details**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `categoryId` (string) - Category ID
- **Output**: Formatted markdown with category group, budget amounts, goal details, and progress

#### Month Tools

**list-months**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `includeDetails` (optional boolean, default: true) - Include financial details
- **Output**: Formatted markdown sorted newest first, showing Ready to Assign, budgeted, activity, income, and Age of Money

**get-month-details**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `month` (string) - Month in ISO format (e.g., '2016-12-01') or 'current'
- **Output**: Formatted markdown with month overview and all categories grouped by category group with balances

**get-month-category**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `month` (string) - Month in ISO format (e.g., '2016-12-01') or 'current'
  - `categoryId` (string) - Category ID
- **Output**: Formatted markdown with category's budgeted, activity, and available amounts for the specific month

#### Payee Tools

**list-payees**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `includeTransferPayees` (optional boolean, default: true) - Include transfer payees
- **Output**: Formatted markdown separated into Regular Payees and Transfer Payees sections with IDs and transfer account details

**get-payee-details**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `payeeId` (string) - Payee ID
- **Output**: Formatted markdown showing payee type, transfer account details if applicable, and status

**list-payee-locations**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `groupByPayee` (optional boolean, default: true) - Group locations by payee
- **Output**: Formatted markdown with GPS coordinates and Google Maps links for each location

#### Transaction Tools

**list-transactions**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `sinceDate` (optional string) - Only return transactions on or after this date (ISO format: YYYY-MM-DD)
  - `type` (optional enum: 'uncategorized', 'unapproved') - Filter by transaction type
  - `accountId` (optional string) - Filter by account
  - `categoryId` (optional string) - Filter by category
  - `payeeId` (optional string) - Filter by payee
  - `limit` (optional number, default: 50) - Maximum number of transactions
- **Output**: Formatted markdown grouped by month showing date, payee, amount, account, category, status, with summary totals

**get-transaction-details**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `transactionId` (string) - Transaction ID
- **Output**: Formatted markdown with complete transaction details including splits, transfers, import info, and flags

**create-transaction**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (string) - Account ID
  - `date` (string) - Transaction date (ISO format: YYYY-MM-DD)
  - `amount` (number) - Amount in dollars (negative for outflows)
  - `payeeId` (optional string) - Payee ID
  - `payeeName` (optional string) - Payee name (creates new if doesn't exist)
  - `categoryId` (optional string) - Category ID
  - `memo` (optional string) - Transaction memo
  - `cleared` (optional enum: 'cleared', 'uncleared', 'reconciled') - Cleared status
  - `approved` (optional boolean) - Approval status
  - `flagColor` (optional enum: 'red', 'orange', 'yellow', 'green', 'blue', 'purple') - Flag color
  - `importId` (optional string) - Import ID for duplicate prevention
- **Output**: Confirmation with created transaction details

**update-transaction**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `transactionId` (string) - Transaction ID to update
  - All other fields from create-transaction are optional
- **Output**: Confirmation with updated transaction details

**delete-transaction**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `transactionId` (string) - Transaction ID to delete
- **Output**: Confirmation of deletion with transaction summary

#### Reconciliation Tools

**bulk-update-transaction-status**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `updates` (array) - Array of transaction updates with:
    - `transactionId` (string) - Transaction ID to update
    - `accountId` (optional string) - New account ID
    - `payeeId` (optional string) - New payee ID
    - `payeeName` (optional string) - New payee name
    - `categoryId` (optional string) - New category ID
    - `amount` (optional number) - New amount in dollars
    - `memo` (optional string) - New memo
    - `flagColor` (optional enum: 'red', 'orange', 'yellow', 'green', 'blue', 'purple') - New flag color
    - `cleared` (optional enum: 'cleared', 'uncleared', 'reconciled') - New cleared status
    - `approved` (optional boolean) - New approved status
    - `date` (optional string) - New date (ISO format: YYYY-MM-DD)
    - `importId` (optional string) - New import ID
    - `subtransactions` (optional array) - New subtransactions (replaces existing)
      - `amount` (number) - Subtransaction amount in dollars
      - `payeeId` (optional string) - Subtransaction payee ID
      - `payeeName` (optional string) - Subtransaction payee name
      - `categoryId` (optional string) - Subtransaction category ID
      - `memo` (optional string) - Subtransaction memo
- **Output**: Comprehensive update report with transaction details, field update summary, and next steps

**reconcile-account-transactions**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (string) - Account ID to reconcile
  - `reconciliationDate` (string) - Reconciliation date (ISO format: YYYY-MM-DD)
  - `endingBalance` (optional number) - Expected ending balance in dollars for verification
- **Output**: Comprehensive reconciliation report with balance verification and transaction summary

**find-transactions-for-reconciliation**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (optional string) - Account ID to filter by
  - `cleared` (optional enum: 'cleared', 'uncleared', 'reconciled') - Filter by cleared status
  - `approved` (optional boolean) - Filter by approved status
  - `sinceDate` (optional string) - Only include transactions on or after this date
  - `untilDate` (optional string) - Only include transactions on or before this date
  - `limit` (optional number) - Maximum number of transactions to return (default: 50)
- **Output**: Filtered list of transactions with status breakdown and reconciliation guidance

**mark-transactions-cleared**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `transactionIds` (array of strings) - Transaction IDs to mark as cleared
  - `alsoApprove` (optional boolean) - Also mark transactions as approved (default: true)
- **Output**: Summary of cleared transactions with balance impact and next steps

**reconciliation-status-report**
- **Input**: 
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountIds` (optional array of strings) - Specific account IDs to include
  - `includeReconciledTransactions` (optional boolean) - Include already reconciled transactions
- **Output**: Comprehensive report with account-by-account reconciliation status, recommendations, and workflow guidance

**match-bank-transactions**
- **Input**:
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (string) - Account ID to match transactions for
  - `bankTransactions` (array) - Array of bank transactions with:
    - `date` (string) - Transaction date (ISO format: YYYY-MM-DD)
    - `amount` (number) - Transaction amount in dollars (negative for outflows)
    - `payee` (optional string) - Transaction payee/description
  - `tolerance` (number, default: 3) - Date range tolerance in days for matching
- **Output**: Detailed matching report with:
  - Summary statistics (match rate, counts)
  - Matched transactions grouped by confidence level (exact, high, medium, low)
  - Unmatched bank transactions (missing from YNAB)
  - Unmatched YNAB transactions (missing from bank)
  - Actionable recommendations

**reconcile-account-with-adjustment**
- **Input**:
  - `budgetId` (string) - Budget ID or 'last-used'
  - `accountId` (string) - Account ID to reconcile
  - `targetBalance` (number) - Expected ending balance in dollars
  - `reconciliationDate` (string) - Reconciliation date (ISO format: YYYY-MM-DD)
  - `createAdjustment` (boolean) - Auto-create adjustment if needed
  - `adjustmentMemo` (optional string) - Custom memo for adjustment
- **Output**: Complete reconciliation summary with:
  - Number of transactions reconciled
  - Balance comparison (starting vs target vs actual)
  - Adjustment transaction details (if created)
  - Success/warning status
  - Next steps and tips
- **Special Notes**:
  - Uses YNAB's system payee ID for reconciliation adjustments
  - Adjustments are categorized to "Inflow: Ready to Assign"
  - Only reconciles cleared/uncleared transactions (skips already reconciled)

### Prompts
- **analyze-budget** - Analyze a YNAB budget and provide insights

## Reconciliation Workflows

The reconciliation tools support common workflows for keeping your YNAB data synchronized with your bank statements:

### Daily/Weekly Reconciliation
1. Use `find-transactions-for-reconciliation` with `cleared: "uncleared"` to find new transactions
2. Verify transactions against your bank account or credit card activity
3. Use `mark-transactions-cleared` to mark verified transactions as cleared
4. Use `reconciliation-status-report` to check overall account status

### Monthly Reconciliation (Bank Statement)
1. Use `reconciliation-status-report` to see which accounts need reconciliation
2. Use `find-transactions-for-reconciliation` to review cleared but not reconciled transactions
3. Use `reconcile-account-transactions` with your statement ending date and balance
4. Review any discrepancies and resolve them

#### Bulk Status Update

1. Find transactions needing updates: `find-transactions-for-reconciliation`
2. Update multiple transactions at once: `bulk-update-transaction-status`
3. Verify changes: `reconciliation-status-report`

#### Bank Transaction Matching

1. Export transactions from your bank (CSV/statement)
2. Format bank data as JSON array with date, amount, and optional payee
3. Run `match-bank-transactions` to compare with YNAB
4. Review matches, especially low-confidence ones
5. Import missing transactions using `create-transaction`
6. Update matched transactions using `bulk-update-transaction-status`

#### Complete Reconciliation with Adjustment

1. Get your bank statement ending balance
2. Run `reconcile-account-with-adjustment` with:
   - The account ID
   - Bank statement date
   - Bank statement ending balance
   - `createAdjustment: true`
3. Review the reconciliation summary
4. If adjustment was created, it will appear in "Inflow: Ready to Assign"

### Transaction Status States
- **Uncleared**: New transactions that haven't been verified against bank records
- **Cleared**: Transactions that have been verified but not yet reconciled
- **Reconciled**: Transactions that have been included in a bank statement reconciliation
- **Approved**: Transactions that have been reviewed and confirmed (independent of cleared status)

## Output Format Notes

### General Formatting
- All monetary values are converted from milliunits to dollars (divided by 1000)
- Dates are displayed in human-readable format
- Resources return raw JSON data
- Tools return formatted markdown for easy reading

### Common Input Patterns
- Most tools accept `'last-used'` as a `budgetId` to use the default budget
- Month parameters accept ISO date format (YYYY-MM-DD) or `'current'` for the current month
- All IDs support auto-completion in resources

### Example Tool Outputs

**list-accounts** example output:
```markdown
# YNAB Accounts

## On Budget Accounts

### Checking Account
- Type: Checking
- ID: account-123
- Balance: $1,234.56
- Cleared Balance: $1,200.00
- Uncleared Balance: $34.56

## Off Budget Accounts

### Investment Account
- Type: Other Asset
- ID: account-456
- Balance: $50,000.00
```

**get-month-details** example output:
```markdown
# Month: December 2024

## Overview
- Ready to Assign: $500.00
- Total Income: $5,000.00
- Total Budgeted: $4,500.00
- Total Activity: $4,200.00
- Age of Money: 30 days

## Categories

### Bills
#### Rent
- Budgeted: $1,500.00
- Activity: $1,500.00
- Available: $0.00
```

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-ynab

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Authentication
The server requires a YNAB Personal Access Token. You can obtain one from your YNAB account settings:

1. Log in to YNAB
2. Go to Account Settings
3. Navigate to Developer Settings
4. Create a new Personal Access Token

Set the token as an environment variable:
```bash
export YNAB_ACCESS_TOKEN="your-token-here"
```

## Usage

### With Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ynab": {
      "command": "node",
      "args": ["/path/to/mcp-ynab/dist/index.js"],
      "env": {
        "YNAB_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Standalone Usage

```bash
# Set the access token
export YNAB_ACCESS_TOKEN="your-token-here"

# Run the server
npm start
```

## Development

```bash
# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests (if available)
npm test
```

## Example Usage

### Using Resources
- Access user information: Request resource `ynab://user`
- List all budgets: Request resource `ynab://budgets`
- Get specific budget: Request resource `ynab://budgets/{budget-id}`
- List budget accounts: Request resource `ynab://budgets/{budget-id}/accounts`
- Get specific account: Request resource `ynab://budgets/{budget-id}/accounts/{account-id}`
- List budget categories: Request resource `ynab://budgets/{budget-id}/categories`
- Get specific category: Request resource `ynab://budgets/{budget-id}/categories/{category-id}`
- List budget months: Request resource `ynab://budgets/{budget-id}/months`
- Get specific month: Request resource `ynab://budgets/{budget-id}/months/{month}` (month format: ISO date, e.g., `2016-12-01`)
- Get month category: Request resource `ynab://budgets/{budget-id}/months/{month}/categories/{category-id}` (month format: ISO date, e.g., `2016-12-01`)
- List payees: Request resource `ynab://budgets/{budget-id}/payees`
- Get specific payee: Request resource `ynab://budgets/{budget-id}/payees/{payee-id}`
- List payee locations: Request resource `ynab://budgets/{budget-id}/locations`
- List transactions: Request resource `ynab://budgets/{budget-id}/transactions`
- Get specific transaction: Request resource `ynab://budgets/{budget-id}/transactions/{transaction-id}`

### Using Tools
- List budgets: Call `list-budgets` tool
- Get budget summary: Call `get-budget-summary` with `budgetId` parameter
- List accounts: Call `list-accounts` with `budgetId` parameter
- Get account details: Call `get-account-details` with `budgetId` and `accountId` parameters
- List categories: Call `list-categories` with `budgetId` parameter
- Get category details: Call `get-category-details` with `budgetId` and `categoryId` parameters
- List months: Call `list-months` with `budgetId` parameter
- Get month details: Call `get-month-details` with `budgetId` and `month` parameters (month format: ISO date, e.g., '2016-12-01'; also supports 'current' for current month)
- Get month category: Call `get-month-category` with `budgetId`, `month`, and `categoryId` parameters (month format: ISO date, e.g., '2016-12-01')
- List payees: Call `list-payees` with `budgetId` parameter
- Get payee details: Call `get-payee-details` with `budgetId` and `payeeId` parameters
- List payee locations: Call `list-payee-locations` with `budgetId` parameter
- List transactions: Call `list-transactions` with `budgetId` and optional filters
- Get transaction details: Call `get-transaction-details` with `budgetId` and `transactionId`
- Create transaction: Call `create-transaction` with transaction details
- Update transaction: Call `update-transaction` with `transactionId` and fields to update
- Delete transaction: Call `delete-transaction` with `budgetId` and `transactionId`

### Using Reconciliation Tools
- Get reconciliation status: Call `reconciliation-status-report` with `budgetId`
- Find uncleared transactions: Call `find-transactions-for-reconciliation` with `budgetId` and `cleared: "uncleared"`
- Mark transactions as cleared: Call `mark-transactions-cleared` with `budgetId` and array of `transactionIds`
- Reconcile account: Call `reconcile-account-transactions` with `budgetId`, `accountId`, and `reconciliationDate`
- Bulk update transaction status: Call `bulk-update-transaction-status` with `budgetId` and array of updates

### Using Prompts
- Analyze budget: Use `analyze-budget` prompt to get insights about a budget

## Architecture

The server follows the MCP specification with three main components:

1. **Resources**: Provide read-only access to YNAB data
2. **Tools**: Execute operations and format data
3. **Prompts**: Pre-defined conversation starters for budget analysis

## Security

- The server requires a valid YNAB Personal Access Token
- All API calls are made over HTTPS
- The token is never exposed through the MCP interface
- Error messages do not contain sensitive information

## Error Handling

The server gracefully handles:
- Invalid or expired access tokens
- Network errors
- Invalid budget IDs
- API rate limiting

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [YNAB API v1](https://api.ynab.com) 