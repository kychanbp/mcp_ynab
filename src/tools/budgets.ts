/**
 * Budget-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatDate } from "../utils/formatters.js";

export function registerBudgetTools(server: McpServer) {
  // Tool: List Budgets
  server.registerTool(
    "list-budgets",
    {
      title: "List YNAB Budgets",
      description: "List all budgets for the authenticated user",
      inputSchema: {
        includeDetails: z.boolean().optional().describe("Include full budget details")
      }
    },
    async ({ includeDetails }) => {
      try {
        const client = getYNABClient();
        const response = await client.getBudgets();
        
        let content = "# YNAB Budgets\n\n";
        
        if (response.data.default_budget) {
          content += `## Default Budget: ${response.data.default_budget.name}\n\n`;
        }
        
        content += "## All Budgets:\n\n";
        
        for (const budget of response.data.budgets) {
          content += `### ${budget.name}\n`;
          content += `- ID: ${budget.id}\n`;
          content += `- Last Modified: ${budget.last_modified_on}\n`;
          content += `- Date Range: ${budget.first_month} to ${budget.last_month}\n`;
          
          if (budget.currency_format) {
            content += `- Currency: ${budget.currency_format.currency_symbol} (${budget.currency_format.iso_code})\n`;
          }
          
          content += "\n";
        }
        
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return formatErrorResponse(error);
      }
    }
  );

  // Tool: Get Budget Summary
  server.registerTool(
    "get-budget-summary",
    {
      title: "Get YNAB Budget Summary",
      description: "Get a summary of a specific budget",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)")
      }
    },
    async ({ budgetId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getBudget(actualBudgetId);
        const budget = response.data.budget;
        
        let content = `# Budget: ${budget.name}\n\n`;
        content += `## Overview\n`;
        content += `- ID: ${budget.id}\n`;
        content += `- Last Modified: ${budget.last_modified_on}\n`;
        content += `- Date Range: ${budget.first_month} to ${budget.last_month}\n`;
        
        if (budget.currency_format) {
          content += `\n## Currency Settings\n`;
          content += `- Symbol: ${budget.currency_format.currency_symbol}\n`;
          content += `- ISO Code: ${budget.currency_format.iso_code}\n`;
          content += `- Format: ${budget.currency_format.example_format}\n`;
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