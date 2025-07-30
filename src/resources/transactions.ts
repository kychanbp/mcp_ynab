/**
 * Transaction-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerTransactionResources(server: McpServer) {
  // Resource: Transaction List
  server.registerResource(
    "transactions",
    new ResourceTemplate("ynab://budgets/{budgetId}/transactions", {
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
      title: "YNAB Transaction List",
      description: "List all transactions for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getTransactions(budgetId as string);
        
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

  // Resource: Transaction Details
  server.registerResource(
    "transaction",
    new ResourceTemplate("ynab://budgets/{budgetId}/transactions/{transactionId}", {
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
        transactionId: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getTransactions(budgetId);
            return response.data.transactions
              .filter(t => t.id.startsWith(value))
              .map(t => t.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Transaction Details",
      description: "Get details for a specific transaction",
      mimeType: "application/json"
    },
    async (uri, { budgetId, transactionId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getTransaction(budgetId as string, transactionId as string);
        
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