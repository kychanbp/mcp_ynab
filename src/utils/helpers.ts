/**
 * Helper utilities for YNAB MCP server
 */

import { YNABClient } from "../ynab-client.js";

/**
 * Get YNAB client instance with access token from environment
 */
export function getYNABClient(): YNABClient {
  const accessToken = process.env.YNAB_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("YNAB_ACCESS_TOKEN environment variable is required");
  }
  return new YNABClient(accessToken);
}

/**
 * Resolve actual budget ID when "last-used" is provided
 */
export async function resolveActualBudgetId(budgetId: string, client: YNABClient): Promise<string> {
  if (budgetId === "last-used") {
    const budgets = await client.getBudgets();
    const defaultBudget = budgets.data.default_budget;
    if (!defaultBudget) {
      throw new Error("No default budget found");
    }
    return defaultBudget.id;
  }
  return budgetId;
}

/**
 * Format error response for tools and resources
 */
export function formatErrorResponse(error: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ 
      type: "text", 
      text: `Error: ${error instanceof Error ? error.message : String(error)}` 
    }]
  };
}

/**
 * Format JSON error response for resources
 */
export function formatJsonErrorResponse(uri: string, error: unknown) {
  return {
    contents: [{
      uri: uri,
      text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      mimeType: "application/json"
    }]
  };
} 