/**
 * Month-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerMonthResources(server: McpServer) {
  // Resource: Month List
  server.registerResource(
    "months",
    new ResourceTemplate("ynab://budgets/{budgetId}/months", {
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
      title: "YNAB Month List",
      description: "List all months for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getMonths(budgetId as string);
        
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

  // Resource: Month Details
  server.registerResource(
    "month",
    new ResourceTemplate("ynab://budgets/{budgetId}/months/{month}", {
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
        month: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getMonths(budgetId);
            return response.data.months
              .filter(m => m.month.startsWith(value))
              .map(m => m.month);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Month Details",
      description: "Get details for a specific month in a budget (month format: ISO date, e.g., 2016-12-01)",
      mimeType: "application/json"
    },
    async (uri, { budgetId, month }) => {
      try {
        const client = getYNABClient();
        const response = await client.getMonth(budgetId as string, month as string);
        
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

  // Resource: Month Category
  server.registerResource(
    "monthCategory",
    new ResourceTemplate("ynab://budgets/{budgetId}/months/{month}/categories/{categoryId}", {
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
        month: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getMonths(budgetId);
            return response.data.months
              .filter(m => m.month.startsWith(value))
              .map(m => m.month);
          } catch {
            return [];
          }
        },
        categoryId: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            const month = args?.arguments?.month;
            if (!budgetId || !month) return [];
            // Get the month details to access categories
            const response = await client.getMonth(budgetId, month);
            return response.data.month.categories
              .filter(c => c.id.startsWith(value))
              .map(c => c.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Month Category",
      description: "Get category details for a specific month in a budget (month format: ISO date, e.g., 2016-12-01)",
      mimeType: "application/json"
    },
    async (uri, { budgetId, month, categoryId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getMonthCategory(budgetId as string, month as string, categoryId as string);
        
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