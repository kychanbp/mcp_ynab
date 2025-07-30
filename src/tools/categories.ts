/**
 * Category-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatBalance, getGoalTypeDisplay } from "../utils/formatters.js";

export function registerCategoryTools(server: McpServer) {
  // Tool: List Categories
  server.registerTool(
    "list-categories",
    {
      title: "List YNAB Categories",
      description: "List all categories for a specific budget with formatted output",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        includeBudgeted: z.boolean().optional().describe("Include budgeted amounts in the output")
      }
    },
    async ({ budgetId, includeBudgeted = true }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getCategories(actualBudgetId);
        const categoryGroups = response.data.category_groups;
        
        let content = "# YNAB Categories\n\n";
        
        for (const group of categoryGroups.filter(g => !g.hidden && !g.deleted)) {
          content += `## ${group.name}\n\n`;
          
          const activeCategories = group.categories.filter(c => !c.hidden && !c.deleted);
          
          for (const category of activeCategories) {
            content += `### ${category.name}\n`;
            content += `- ID: ${category.id}\n`;
            content += `- Category Group: ${category.category_group_name || group.name}\n`;
            
            if (includeBudgeted) {
              content += `- Budgeted: $${formatBalance(category.budgeted)}\n`;
              content += `- Activity: $${formatBalance(category.activity)}\n`;
              content += `- Balance: $${formatBalance(category.balance)}\n`;
            }
            
            if (category.goal_type) {
              const goalDisplay = getGoalTypeDisplay(category.goal_type);
              content += `- Goal: ${goalDisplay}\n`;
              if (category.goal_target) {
                content += `- Goal Target: $${formatBalance(category.goal_target)}\n`;
              }
              if (category.goal_percentage_complete !== null) {
                content += `- Goal Progress: ${category.goal_percentage_complete}%\n`;
              }
            }
            
            if (category.note) {
              content += `- Note: ${category.note}\n`;
            }
            content += "\n";
          }
        }
        
        // Show hidden/deleted categories if they exist
        const hiddenCategories = categoryGroups.flatMap(g => g.categories.filter(c => c.hidden || c.deleted));
        if (hiddenCategories.length > 0) {
          content += "## Hidden/Deleted Categories\n\n";
          for (const category of hiddenCategories) {
            content += `### ${category.name} ${category.hidden ? '(Hidden)' : ''} ${category.deleted ? '(Deleted)' : ''}\n`;
            content += `- ID: ${category.id}\n`;
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

  // Tool: Get Category Details
  server.registerTool(
    "get-category-details",
    {
      title: "Get YNAB Category Details",
      description: "Get detailed information about a specific category",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        categoryId: z.string().describe("Category ID")
      }
    },
    async ({ budgetId, categoryId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getCategory(actualBudgetId, categoryId);
        const category = response.data.category;
        
        let content = `# Category: ${category.name}\n\n`;
        content += `## Overview\n`;
        content += `- ID: ${category.id}\n`;
        content += `- Category Group ID: ${category.category_group_id}\n`;
        if (category.category_group_name) {
          content += `- Category Group: ${category.category_group_name}\n`;
        }
        content += `- Status: ${category.hidden ? 'Hidden' : 'Active'}${category.deleted ? ' (Deleted)' : ''}\n`;
        
        content += `\n## Budget Information\n`;
        content += `- Budgeted: $${formatBalance(category.budgeted)}\n`;
        content += `- Activity: $${formatBalance(category.activity)}\n`;
        content += `- Balance: $${formatBalance(category.balance)}\n`;
        
        if (category.goal_type) {
          const goalDisplay = getGoalTypeDisplay(category.goal_type);
          content += `\n## Goal Information\n`;
          content += `- Goal Type: ${goalDisplay}\n`;
          
          if (category.goal_target) {
            content += `- Goal Target: $${formatBalance(category.goal_target)}\n`;
          }
          if (category.goal_target_month) {
            content += `- Target Month: ${category.goal_target_month}\n`;
          }
          if (category.goal_percentage_complete !== null) {
            content += `- Progress: ${category.goal_percentage_complete}%\n`;
          }
          if (category.goal_months_to_budget) {
            content += `- Months to Budget: ${category.goal_months_to_budget}\n`;
          }
          if (category.goal_under_funded) {
            content += `- Under Funded: $${formatBalance(category.goal_under_funded)}\n`;
          }
        }
        
        if (category.note) {
          content += `\n## Note\n${category.note}\n`;
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