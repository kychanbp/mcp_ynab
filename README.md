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

### Prompts
- **analyze-budget** - Analyze a YNAB budget and provide insights

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