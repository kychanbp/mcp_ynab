/**
 * Month-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";
import { formatBalance, formatMonthDisplay, getGoalTypeDisplay } from "../utils/formatters.js";

export function registerMonthTools(server: McpServer) {
  // Tool: List Months
  server.registerTool(
    "list-months",
    {
      title: "List YNAB Months",
      description: "List all months for a specific budget with formatted output",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        includeDetails: z.boolean().optional().describe("Include detailed financial information")
      }
    },
    async ({ budgetId, includeDetails = true }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        const response = await client.getMonths(actualBudgetId);
        const months = response.data.months;
        
        let content = "# YNAB Budget Months\n\n";
        
        // Sort months by date (newest first)
        const sortedMonths = months.sort((a, b) => b.month.localeCompare(a.month));
        
        // Get current month for highlighting (ISO format with first day)
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        
        for (const month of sortedMonths.filter(m => !m.deleted)) {
          const isCurrentMonth = month.month.startsWith(currentMonth);
          content += `## ${formatMonthDisplay(month.month)}${isCurrentMonth ? ' (Current)' : ''}\n\n`;
          
          if (includeDetails) {
            content += `### Financial Summary\n`;
            content += `- Ready to Assign: $${formatBalance(month.to_be_budgeted)}\n`;
            content += `- Total Budgeted: $${formatBalance(month.budgeted)}\n`;
            content += `- Total Activity: $${formatBalance(month.activity)}\n`;
            content += `- Total Income: $${formatBalance(month.income)}\n`;
            
            if (month.age_of_money) {
              content += `- Age of Money: ${month.age_of_money} days\n`;
            }
          }
          
          if (month.note) {
            content += `\n### Note\n${month.note}\n`;
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

  // Tool: Get Month Details
  server.registerTool(
    "get-month-details",
    {
      title: "Get YNAB Month Details",
      description: "Get detailed information about a specific month including all categories. Month should be in ISO format (e.g., '2016-12-01')",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        month: z.string().describe("Month in ISO format (e.g., '2016-12-01' or 'current' for current month)")
      }
    },
    async ({ budgetId, month }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Handle "current" month (ISO format with first day)
        let actualMonth = month;
        if (month === "current") {
          actualMonth = new Date().toISOString().slice(0, 7) + '-01';
        }
        
        const response = await client.getMonth(actualBudgetId, actualMonth);
        const monthDetail = response.data.month;
        
        let content = `# Month: ${formatMonthDisplay(monthDetail.month)}\n\n`;
        
        content += `## Overview\n`;
        content += `- Ready to Assign: $${formatBalance(monthDetail.to_be_budgeted)}\n`;
        content += `- Total Income: $${formatBalance(monthDetail.income)}\n`;
        content += `- Total Budgeted: $${formatBalance(monthDetail.budgeted)}\n`;
        content += `- Total Activity: $${formatBalance(monthDetail.activity)}\n`;
        if (monthDetail.age_of_money) {
          content += `- Age of Money: ${monthDetail.age_of_money} days\n`;
        }
        
        if (monthDetail.note) {
          content += `\n## Note\n${monthDetail.note}\n`;
        }
        
        // Group categories by category group
        const categoriesByGroup: { [key: string]: typeof monthDetail.categories } = {};
        for (const category of monthDetail.categories) {
          const groupName = category.category_group_name || 'Uncategorized';
          if (!categoriesByGroup[groupName]) {
            categoriesByGroup[groupName] = [];
          }
          categoriesByGroup[groupName].push(category);
        }
        
        content += `\n## Categories\n\n`;
        
        for (const [groupName, categories] of Object.entries(categoriesByGroup)) {
          const activeCategories = categories.filter(c => !c.hidden && !c.deleted);
          if (activeCategories.length === 0) continue;
          
          content += `### ${groupName}\n\n`;
          
          for (const category of activeCategories) {
            content += `#### ${category.name}\n`;
            content += `- Budgeted: $${formatBalance(category.budgeted)}\n`;
            content += `- Activity: $${formatBalance(category.activity)}\n`;
            content += `- Available: $${formatBalance(category.balance)}\n`;
            
            if (category.goal_type && category.goal_percentage_complete !== null) {
              content += `- Goal Progress: ${category.goal_percentage_complete}%\n`;
            }
            
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

  // Tool: Get Month Category
  server.registerTool(
    "get-month-category",
    {
      title: "Get YNAB Month Category",
      description: "Get category information for a specific month, including budgeted amounts and activity. Month should be in ISO format (e.g., '2016-12-01')",
      inputSchema: {
        budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
        month: z.string().describe("Month in ISO format (e.g., '2016-12-01' or 'current' for current month)"),
        categoryId: z.string().describe("Category ID")
      }
    },
    async ({ budgetId, month, categoryId }) => {
      try {
        const client = getYNABClient();
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
        // Handle "current" month (ISO format with first day)
        let actualMonth = month;
        if (month === "current") {
          actualMonth = new Date().toISOString().slice(0, 7) + '-01';
        }
        
        const response = await client.getMonthCategory(actualBudgetId, actualMonth, categoryId);
        const category = response.data.category;
        
        let content = `# Category: ${category.name}\n`;
        content += `## Month: ${formatMonthDisplay(actualMonth)}\n\n`;
        
        content += `### Overview\n`;
        content += `- Category ID: ${category.id}\n`;
        if (category.category_group_name) {
          content += `- Category Group: ${category.category_group_name}\n`;
        }
        content += `- Status: ${category.hidden ? 'Hidden' : 'Active'}${category.deleted ? ' (Deleted)' : ''}\n`;
        
        content += `\n### Budget Information (${formatMonthDisplay(actualMonth)})\n`;
        content += `- Budgeted: $${formatBalance(category.budgeted)}\n`;
        content += `- Activity: $${formatBalance(category.activity)}\n`;
        content += `- Available: $${formatBalance(category.balance)}\n`;
        
        // Calculate overspending/underfunding
        if (category.balance < 0) {
          content += `- **Overspent**: $${formatBalance(Math.abs(category.balance))}\n`;
        }
        
        if (category.goal_type) {
          const goalDisplay = getGoalTypeDisplay(category.goal_type);
          content += `\n### Goal Information\n`;
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
          if (category.goal_under_funded) {
            content += `- Under Funded: $${formatBalance(category.goal_under_funded)}\n`;
          }
          if (category.goal_overall_funded !== null && category.goal_overall_funded !== undefined) {
            content += `- Overall Funded: $${formatBalance(category.goal_overall_funded)}\n`;
          }
          if (category.goal_overall_left !== null && category.goal_overall_left !== undefined) {
            content += `- Overall Left: $${formatBalance(category.goal_overall_left)}\n`;
          }
        }
        
        if (category.note) {
          content += `\n### Note\n${category.note}\n`;
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