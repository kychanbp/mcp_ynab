/**
 * Payee-related resources for YNAB MCP server
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerPayeeResources(server: McpServer) {
  // Resource: Payee List
  server.registerResource(
    "payees",
    new ResourceTemplate("ynab://budgets/{budgetId}/payees", {
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
      title: "YNAB Payee List",
      description: "List all payees for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getPayees(budgetId as string);
        
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

  // Resource: Payee Details
  server.registerResource(
    "payee",
    new ResourceTemplate("ynab://budgets/{budgetId}/payees/{payeeId}", {
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
        payeeId: async (value, args) => {
          try {
            const client = getYNABClient();
            const budgetId = args?.arguments?.budgetId;
            if (!budgetId) return [];
            const response = await client.getPayees(budgetId);
            return response.data.payees
              .filter(p => p.id.startsWith(value))
              .map(p => p.id);
          } catch {
            return [];
          }
        }
      }
    }),
    {
      title: "YNAB Payee Details",
      description: "Get details for a specific payee in a budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId, payeeId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getPayee(budgetId as string, payeeId as string);
        
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

  // Resource: Payee Locations
  server.registerResource(
    "payeeLocations",
    new ResourceTemplate("ynab://budgets/{budgetId}/locations", {
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
      title: "YNAB Payee Locations",
      description: "List all payee locations for a specific budget",
      mimeType: "application/json"
    },
    async (uri, { budgetId }) => {
      try {
        const client = getYNABClient();
        const response = await client.getPayeeLocations(budgetId as string);
        
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