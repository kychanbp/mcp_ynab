/**
 * Account-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatBalance, getAccountTypeDisplay } from "../utils/formatters.js";

export function registerAccountTools(server: McpServer) {
  // Tool: List Accounts
  server.registerTool(
    "list-accounts",
    {
      title: "List YNAB Accounts",
      description: "List all accounts for a specific budget with formatted output",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        includeBalance: z.boolean().optional().describe("Include account balances in the output")
      }
    },
    async ({ budgetId, includeBalance = true }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getAccounts(actualBudgetId);
        const accounts = response.data.accounts;
        
        let content = "# YNAB Accounts\n\n";
        
        // Group accounts by on_budget status
        const onBudgetAccounts = accounts.filter(a => a.on_budget && !a.closed);
        const offBudgetAccounts = accounts.filter(a => !a.on_budget && !a.closed);
        const closedAccounts = accounts.filter(a => a.closed);
        
        if (onBudgetAccounts.length > 0) {
          content += "## On Budget Accounts\n\n";
          for (const account of onBudgetAccounts) {
            content += `### ${account.name}\n`;
            content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
            content += `- ID: ${account.id}\n`;
            if (includeBalance) {
              content += `- Balance: $${formatBalance(account.balance)}\n`;
              content += `- Cleared Balance: $${formatBalance(account.cleared_balance)}\n`;
              content += `- Uncleared Balance: $${formatBalance(account.uncleared_balance)}\n`;
            }
            if (account.note) {
              content += `- Note: ${account.note}\n`;
            }
            content += "\n";
          }
        }
        
        if (offBudgetAccounts.length > 0) {
          content += "## Off Budget Accounts\n\n";
          for (const account of offBudgetAccounts) {
            content += `### ${account.name}\n`;
            content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
            content += `- ID: ${account.id}\n`;
            if (includeBalance) {
              content += `- Balance: $${formatBalance(account.balance)}\n`;
            }
            if (account.note) {
              content += `- Note: ${account.note}\n`;
            }
            content += "\n";
          }
        }
        
        if (closedAccounts.length > 0) {
          content += "## Closed Accounts\n\n";
          for (const account of closedAccounts) {
            content += `### ${account.name} (Closed)\n`;
            content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
            content += `- ID: ${account.id}\n`;
            content += "\n";
          }
        }
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Get Account Details
  server.registerTool(
    "get-account-details",
    {
      title: "Get YNAB Account Details",
      description: "Get detailed information about a specific account",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        accountId: z.string().describe("Account ID")
      }
    },
    async ({ budgetId, accountId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getAccount(actualBudgetId, accountId);
        const account = response.data.account;
        
        let content = `# Account: ${account.name}\n\n`;
        content += `## Details\n`;
        content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
        content += `- ID: ${account.id}\n`;
        content += `- On Budget: ${account.on_budget ? 'Yes' : 'No'}\n`;
        content += `- Closed: ${account.closed ? 'Yes' : 'No'}\n`;
        
        content += `\n## Balances\n`;
        content += `- Current Balance: $${formatBalance(account.balance)}\n`;
        content += `- Cleared Balance: $${formatBalance(account.cleared_balance)}\n`;
        content += `- Uncleared Balance: $${formatBalance(account.uncleared_balance)}\n`;
        
        if (account.note) {
          content += `\n## Notes\n`;
          content += account.note + "\n";
        }
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );
} 