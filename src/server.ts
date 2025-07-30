/**
 * Server configuration and initialization for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SERVER_NAME, SERVER_VERSION } from "./utils/constants.js";

// Import resource registrations
import { registerUserResources } from "./resources/user.js";
import { registerBudgetResources } from "./resources/budgets.js";
import { registerAccountResources } from "./resources/accounts.js";
import { registerCategoryResources } from "./resources/categories.js";
import { registerTransactionResources } from "./resources/transactions.js";
import { registerMonthResources } from "./resources/months.js";
import { registerPayeeResources } from "./resources/payees.js";

// Import tool registrations
import { registerBudgetTools } from "./tools/budgets.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerReconciliationTools } from "./tools/reconciliation.js";
import { registerMonthTools } from "./tools/months.js";
import { registerPayeeTools } from "./tools/payees.js";
// TODO: Import more tool modules as they are created
// import { registerAnalysisTools } from "./tools/analysis.js";

// Import prompts
import { registerPrompts } from "./prompts/index.js";

export async function createAndStartServer() {
  // Initialize server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  // Register all resources
  registerUserResources(server);
  registerBudgetResources(server);
  registerAccountResources(server);
  registerCategoryResources(server);
  registerTransactionResources(server);
  registerMonthResources(server);
  registerPayeeResources(server);

  // Register all tools
  registerBudgetTools(server);
  registerAccountTools(server);
  registerCategoryTools(server);
  registerTransactionTools(server);
  registerReconciliationTools(server);
  registerMonthTools(server);
  registerPayeeTools(server);
  // TODO: Register more tools as modules are created
  // registerAnalysisTools(server);

  // Register prompts
  registerPrompts(server);

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log server information
  console.error(`${SERVER_NAME} running on stdio`);
  console.error("Available resources:");
  console.error("  - ynab://user");
  console.error("  - ynab://budgets");
  console.error("  - ynab://budgets/{budgetId}");
  console.error("  - ynab://budgets/{budgetId}/accounts");
  console.error("  - ynab://budgets/{budgetId}/accounts/{accountId}");
  console.error("  - ynab://budgets/{budgetId}/categories");
  console.error("  - ynab://budgets/{budgetId}/categories/{categoryId}");
  console.error("  - ynab://budgets/{budgetId}/months");
  console.error("  - ynab://budgets/{budgetId}/months/{month}");
  console.error("  - ynab://budgets/{budgetId}/months/{month}/categories/{categoryId}");
  console.error("  - ynab://budgets/{budgetId}/payees");
  console.error("  - ynab://budgets/{budgetId}/payees/{payeeId}");
  console.error("  - ynab://budgets/{budgetId}/locations");
  console.error("  - ynab://budgets/{budgetId}/transactions");
  console.error("  - ynab://budgets/{budgetId}/transactions/{transactionId}");
  
  console.error("\nAvailable tools:");
  console.error("  - list-budgets");
  console.error("  - get-budget-summary");
  console.error("  - list-accounts");
  console.error("  - get-account-details");
  console.error("  - list-categories");
  console.error("  - get-category-details");
  console.error("  - list-months");
  console.error("  - get-month-details");
  console.error("  - get-month-category");
  console.error("  - list-payees");
  console.error("  - get-payee-details");
  console.error("  - list-payee-locations");
  console.error("  - list-transactions");
  console.error("  - get-transaction-details");
  console.error("  - create-transaction");
  console.error("  - update-transaction");
  console.error("  - delete-transaction");
  console.error("  - bulk-update-transaction-status");
  console.error("  - reconcile-account-with-adjustment");
  console.error("  - reconcile-account-transactions");
  console.error("  - find-transactions-for-reconciliation");
  console.error("  - mark-transactions-cleared");
  console.error("  - reconciliation-status-report");
  console.error("  - match-bank-transactions");
  // TODO: Add more tool logs as they are added
  
  console.error("\nPrompts:");
  console.error("  - reconciliation-workflow");
} 