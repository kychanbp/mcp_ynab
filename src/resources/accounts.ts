/**
 * Account-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerAccountResources(server: McpServer) {
  // Resource: Account List
  server.registerResource(
    "accounts",
    new ResourceTemplate("ynab://budgets/{budgetId}/accounts", {
      list: undefined,
      complete: {
        budgetId: async (value) => {
          try {
            const client = getYNABClient();
            const response = await client.getBudgets();
            return response.data.budgets
              .filter(b => b.id.startsWith(value))
              .map(b => b.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Account List",
      description: "List all accounts for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getAccounts(budgetId as string);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(response.data, null, 2),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        return formatJsonErrorResponse(uri.href, error);
      }
    }
  );

  // Resource: Account Details
  server.registerResource(
    "account",
    new ResourceTemplate("ynab://budgets/{budgetId}/accounts/{accountId}", {
      list: undefined,
      complete: {
        budgetId: async (value) => {
          try {
            const client = getYNABClient();
            const response = await client.getBudgets();
            return response.data.budgets
              .filter(b => b.id.startsWith(value))
              .map(b => b.id);
          } catch {
            return [];
          }
        },
        accountId: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getAccounts(budgetId);
            return response.data.accounts
              .filter(a => a.id.startsWith(value))
              .map(a => a.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Account Details",
      description: "Get details for a specific account in a budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId, accountId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getAccount(budgetId as string, accountId as string);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(response.data, null, 2),
            mimeType: "application/json"
          }]
        };
      } catch (error) {
        return formatJsonErrorResponse(uri.href, error);
      }
    }
  );
} 