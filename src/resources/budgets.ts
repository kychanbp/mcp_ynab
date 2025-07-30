/**
 * Budget-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerBudgetResources(server: McpServer) {
  // Resource: Budget List
  server.registerResource(
    "budgets",
    "ynab://budgets",
    {
      title: "YNAB Budget List",
      description: "List all budgets for the authenticated user",
      mimeType: "application/json"
    },
    async (uri) => {
      try {
        const client = getYNABClient();
        const response = await client.getBudgets();
        
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

  // Resource: Budget Details (dynamic)
  server.registerResource(
    "budget",
    new ResourceTemplate("ynab://budgets/{budgetId}", { 
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
      title: "YNAB Budget Details",
      description: "Get details for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getBudget(budgetId as string);
        
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