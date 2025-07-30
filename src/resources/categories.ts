/**
 * Category-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerCategoryResources(server: McpServer) {
  // Resource: Category List
  server.registerResource(
    "categories",
    new ResourceTemplate("ynab://budgets/{budgetId}/categories", {
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
      title: "YNAB Category List",
      description: "List all categories for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getCategories(budgetId as string);
        
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

  // Resource: Category Details
  server.registerResource(
    "category",
    new ResourceTemplate("ynab://budgets/{budgetId}/categories/{categoryId}", {
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
        categoryId: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getCategories(budgetId);
            // Flatten categories from all category groups
            const allCategories = response.data.category_groups.flatMap(group => group.categories);
            return allCategories
              .filter(c => c.id.startsWith(value))
              .map(c => c.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Category Details",
      description: "Get details for a specific category in a budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId, categoryId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getCategory(budgetId as string, categoryId as string);
        
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