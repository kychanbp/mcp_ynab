import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { YNABClient } from "./ynab-client.js";

// Initialize server
const server = new McpServer({
  name: "ynab-mcp-server",
  version: "1.0.0"
});

// Get YNAB client - access token will be provided via environment variable
function getYNABClient(): YNABClient {
  const accessToken = process.env.YNAB_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("YNAB_ACCESS_TOKEN environment variable is required");
  }
  return new YNABClient(accessToken);
}

// Resource: User Information
server.registerResource(
  "user",
  "ynab://user",
  {
    title: "YNAB User Information",
    description: "Get authenticated user information",
    mimeType: "application/json"
  },
  async (uri) => {
    try {
      const client = getYNABClient();
      const response = await client.getUser();
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(response.data.user, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

// Tool: List Accounts
server.registerTool(
  "list-accounts",
  {
    title: "List YNAB Accounts",
    description: "List all accounts for a specific budget with formatted output",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      includeBalance: z.boolean().optional().describe("Include account balances in the output")
    }
  },
  async ({ budgetId, includeBalance = true }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getAccounts(actualBudgetId);
      const accounts = response.data.accounts;
      
      let content = "# YNAB Accounts\n\n";
      
      // Group accounts by on_budget status
      const onBudgetAccounts = accounts.filter(a => a.on_budget && !a.closed);
      const offBudgetAccounts = accounts.filter(a => !a.on_budget && !a.closed);
      const closedAccounts = accounts.filter(a => a.closed);
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
      // Helper function to get account type display name
      const getAccountTypeDisplay = (type: string) => {
        const typeMap: { [key: string]: string } = {
          'checking': 'Checking',
          'savings': 'Savings',
          'cash': 'Cash',
          'creditCard': 'Credit Card',
          'lineOfCredit': 'Line of Credit',
          'otherAsset': 'Other Asset',
          'otherLiability': 'Other Liability',
          'mortgage': 'Mortgage',
          'autoLoan': 'Auto Loan',
          'studentLoan': 'Student Loan',
          'personalLoan': 'Personal Loan',
          'medicalDebt': 'Medical Debt',
          'otherDebt': 'Other Debt'
        };
        return typeMap[type] || type;
      };
      
      if (onBudgetAccounts.length > 0) {
        content += "## On Budget Accounts\n\n";
        for (const account of onBudgetAccounts) {
          content += `### ${account.name}\n`;
          content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
          content += `- ID: ${account.id}\n`;
          if (includeBalance) {
            content += `- Balance: $${formatBalance(account.balance)}\n`;
            content += `- Cleared Balance: $${formatBalance(account.cleared_balance)}\n`;
            content += `- Uncleared Balance: $${formatBalance(account.uncleared_balance)}\n`;
          }
          if (account.note) {
            content += `- Note: ${account.note}\n`;
          }
          content += "\n";
        }
      }
      
      if (offBudgetAccounts.length > 0) {
        content += "## Off Budget Accounts\n\n";
        for (const account of offBudgetAccounts) {
          content += `### ${account.name}\n`;
          content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
          content += `- ID: ${account.id}\n`;
          if (includeBalance) {
            content += `- Balance: $${formatBalance(account.balance)}\n`;
          }
          if (account.note) {
            content += `- Note: ${account.note}\n`;
          }
          content += "\n";
        }
      }
      
      if (closedAccounts.length > 0) {
        content += "## Closed Accounts\n\n";
        for (const account of closedAccounts) {
          content += `### ${account.name} (Closed)\n`;
          content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
          content += `- ID: ${account.id}\n`;
          content += "\n";
        }
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Get Account Details
server.registerTool(
  "get-account-details",
  {
    title: "Get YNAB Account Details",
    description: "Get detailed information about a specific account",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      accountId: z.string().describe("Account ID")
    }
  },
  async ({ budgetId, accountId }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getAccount(actualBudgetId, accountId);
      const account = response.data.account;
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
      // Helper function to get account type display name
      const getAccountTypeDisplay = (type: string) => {
        const typeMap: { [key: string]: string } = {
          'checking': 'Checking',
          'savings': 'Savings',
          'cash': 'Cash',
          'creditCard': 'Credit Card',
          'lineOfCredit': 'Line of Credit',
          'otherAsset': 'Other Asset',
          'otherLiability': 'Other Liability',
          'mortgage': 'Mortgage',
          'autoLoan': 'Auto Loan',
          'studentLoan': 'Student Loan',
          'personalLoan': 'Personal Loan',
          'medicalDebt': 'Medical Debt',
          'otherDebt': 'Other Debt'
        };
        return typeMap[type] || type;
      };
      
      let content = `# Account: ${account.name}\n\n`;
      content += `## Overview\n`;
      content += `- Type: ${getAccountTypeDisplay(account.type)}\n`;
      content += `- ID: ${account.id}\n`;
      content += `- Budget Status: ${account.on_budget ? 'On Budget' : 'Off Budget'}\n`;
      content += `- Status: ${account.closed ? 'Closed' : 'Active'}\n`;
      
      content += `\n## Balances\n`;
      content += `- Current Balance: $${formatBalance(account.balance)}\n`;
      content += `- Cleared Balance: $${formatBalance(account.cleared_balance)}\n`;
      content += `- Uncleared Balance: $${formatBalance(account.uncleared_balance)}\n`;
      
      if (account.note) {
        content += `\n## Note\n${account.note}\n`;
      }
      
      if (account.direct_import_linked !== undefined) {
        content += `\n## Direct Import\n`;
        content += `- Linked: ${account.direct_import_linked ? 'Yes' : 'No'}\n`;
        if (account.direct_import_in_error !== undefined) {
          content += `- Status: ${account.direct_import_in_error ? 'Error' : 'Working'}\n`;
        }
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
             const response = await client.getCategories(actualBudgetId);
       const categoryGroups = response.data.category_groups;
       
       let content = "# YNAB Categories\n\n";
       
       // Helper function to format balance
       const formatBalance = (balance: number) => {
         return (balance / 1000).toFixed(2);
       };
       
       // Helper function to get goal type display name
       const getGoalTypeDisplay = (goalType: string | null) => {
         if (!goalType) return null;
         const goalMap: { [key: string]: string } = {
           'TB': 'Target Balance',
           'TBD': 'Target Balance by Date',
           'MF': 'Monthly Funding',
           'NEED': 'Needed for Spending',
           'DEBT': 'Pay off Debt'
         };
         return goalMap[goalType] || goalType;
       };
       
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getCategory(actualBudgetId, categoryId);
      const category = response.data.category;
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
             // Helper function to get goal type display name
       const getGoalTypeDisplay = (goalType: string | null) => {
         if (!goalType) return null;
         const goalMap: { [key: string]: string } = {
           'TB': 'Target Balance',
           'TBD': 'Target Balance by Date',
           'MF': 'Monthly Funding',
           'NEED': 'Needed for Spending',
           'DEBT': 'Pay off Debt'
         };
         return goalMap[goalType] || goalType;
       };
       
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getMonths(actualBudgetId);
      const months = response.data.months;
      
      let content = "# YNAB Budget Months\n\n";
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
      // Helper function to format month display
      const formatMonthDisplay = (monthStr: string) => {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      };
      
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Handle "current" month (ISO format with first day)
      let actualMonth = month;
      if (month === "current") {
        actualMonth = new Date().toISOString().slice(0, 7) + '-01';
      }
      
      const response = await client.getMonth(actualBudgetId, actualMonth);
      const monthDetail = response.data.month;
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
      // Helper function to format month display
      const formatMonthDisplay = (monthStr: string) => {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      };
      
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Handle "current" month (ISO format with first day)
      let actualMonth = month;
      if (month === "current") {
        actualMonth = new Date().toISOString().slice(0, 7) + '-01';
      }
      
      const response = await client.getMonthCategory(actualBudgetId, actualMonth, categoryId);
      const category = response.data.category;
      
      // Helper function to format balance
      const formatBalance = (balance: number) => {
        return (balance / 1000).toFixed(2);
      };
      
      // Helper function to format month display
      const formatMonthDisplay = (monthStr: string) => {
        const date = new Date(monthStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      };
      
      // Helper function to get goal type display name
      const getGoalTypeDisplay = (goalType: string | null) => {
        if (!goalType) return null;
        const goalMap: { [key: string]: string } = {
          'TB': 'Target Balance',
          'TBD': 'Target Balance by Date',
          'MF': 'Monthly Funding',
          'NEED': 'Needed for Spending',
          'DEBT': 'Pay off Debt'
        };
        return goalMap[goalType] || goalType;
      };
      
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
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

// Tool: List Payees
server.registerTool(
  "list-payees",
  {
    title: "List YNAB Payees",
    description: "List all payees for a specific budget with formatted output",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      includeTransferPayees: z.boolean().optional().describe("Include transfer payees in the output")
    }
  },
  async ({ budgetId, includeTransferPayees = true }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const [payeesResponse, accountsResponse] = await Promise.all([
        client.getPayees(actualBudgetId),
        client.getAccounts(actualBudgetId)
      ]);
      
      const payees = payeesResponse.data.payees;
      const accounts = accountsResponse.data.accounts;
      
      // Create a map of account IDs to names for transfer payees
      const accountMap = new Map(accounts.map(a => [a.id, a.name]));
      
      let content = "# YNAB Payees\n\n";
      
      // Separate regular payees from transfer payees
      const regularPayees = payees.filter(p => !p.transfer_account_id && !p.deleted);
      const transferPayees = payees.filter(p => p.transfer_account_id && !p.deleted);
      const deletedPayees = payees.filter(p => p.deleted);
      
      // Sort payees alphabetically
      regularPayees.sort((a, b) => a.name.localeCompare(b.name));
      transferPayees.sort((a, b) => a.name.localeCompare(b.name));
      
      if (regularPayees.length > 0) {
        content += "## Regular Payees\n\n";
        for (const payee of regularPayees) {
          content += `### ${payee.name}\n`;
          content += `- ID: ${payee.id}\n`;
          content += "\n";
        }
      }
      
      if (includeTransferPayees && transferPayees.length > 0) {
        content += "## Transfer Payees\n\n";
        for (const payee of transferPayees) {
          const accountName = accountMap.get(payee.transfer_account_id!) || 'Unknown Account';
          content += `### ${payee.name}\n`;
          content += `- ID: ${payee.id}\n`;
          content += `- Transfer Account: ${accountName}\n`;
          content += `- Transfer Account ID: ${payee.transfer_account_id}\n`;
          content += "\n";
        }
      }
      
      if (deletedPayees.length > 0) {
        content += "## Deleted Payees\n\n";
        content += `*${deletedPayees.length} payees have been deleted*\n`;
      }
      
      // Summary
      content += "\n## Summary\n";
      content += `- Total Active Payees: ${regularPayees.length + transferPayees.length}\n`;
      content += `- Regular Payees: ${regularPayees.length}\n`;
      content += `- Transfer Payees: ${transferPayees.length}\n`;
      if (deletedPayees.length > 0) {
        content += `- Deleted Payees: ${deletedPayees.length}\n`;
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Get Payee Details
server.registerTool(
  "get-payee-details",
  {
    title: "Get YNAB Payee Details",
    description: "Get detailed information about a specific payee",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      payeeId: z.string().describe("Payee ID")
    }
  },
  async ({ budgetId, payeeId }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getPayee(actualBudgetId, payeeId);
      const payee = response.data.payee;
      
      let content = `# Payee: ${payee.name}\n\n`;
      content += `## Overview\n`;
      content += `- ID: ${payee.id}\n`;
      content += `- Status: ${payee.deleted ? 'Deleted' : 'Active'}\n`;
      
      if (payee.transfer_account_id) {
        content += `\n## Transfer Information\n`;
        content += `- Type: Transfer Payee\n`;
        content += `- Transfer Account ID: ${payee.transfer_account_id}\n`;
        
        // Try to get account name
        try {
          const accountsResponse = await client.getAccounts(actualBudgetId);
          const account = accountsResponse.data.accounts.find(a => a.id === payee.transfer_account_id);
          if (account) {
            content += `- Transfer Account Name: ${account.name}\n`;
            content += `- Account Type: ${account.type}\n`;
          }
        } catch {
          // Ignore errors when fetching account details
        }
      } else {
        content += `\n## Type\n`;
        content += `Regular Payee (not a transfer)\n`;
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: List Payee Locations
server.registerTool(
  "list-payee-locations",
  {
    title: "List YNAB Payee Locations",
    description: "List all payee locations for a specific budget",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      groupByPayee: z.boolean().optional().describe("Group locations by payee")
    }
  },
  async ({ budgetId, groupByPayee = true }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const [locationsResponse, payeesResponse] = await Promise.all([
        client.getPayeeLocations(actualBudgetId),
        client.getPayees(actualBudgetId)
      ]);
      
      const locations = locationsResponse.data.payee_locations;
      const payees = payeesResponse.data.payees;
      
      // Create a map of payee IDs to names
      const payeeMap = new Map(payees.map(p => [p.id, p.name]));
      
      let content = "# YNAB Payee Locations\n\n";
      
      if (locations.length === 0) {
        content += "*No payee locations found*\n";
        return {
          content: [{ type: "text", text: content }]
        };
      }
      
      const activeLocations = locations.filter(l => !l.deleted);
      const deletedLocations = locations.filter(l => l.deleted);
      
      if (groupByPayee) {
        // Group locations by payee
        const locationsByPayee = new Map<string, typeof locations>();
        
        for (const location of activeLocations) {
          if (!locationsByPayee.has(location.payee_id)) {
            locationsByPayee.set(location.payee_id, []);
          }
          locationsByPayee.get(location.payee_id)!.push(location);
        }
        
        content += "## Locations by Payee\n\n";
        
        for (const [payeeId, payeeLocations] of locationsByPayee) {
          const payeeName = payeeMap.get(payeeId) || 'Unknown Payee';
          content += `### ${payeeName}\n`;
          
          for (const location of payeeLocations) {
            content += `- Location ID: ${location.id}\n`;
            content += `  - Coordinates: ${location.latitude}, ${location.longitude}\n`;
            content += `  - [View on Google Maps](https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude})\n`;
            content += "\n";
          }
        }
      } else {
        // List all locations
        content += "## All Locations\n\n";
        
        for (const location of activeLocations) {
          const payeeName = payeeMap.get(location.payee_id) || 'Unknown Payee';
          content += `### Location: ${location.id}\n`;
          content += `- Payee: ${payeeName}\n`;
          content += `- Payee ID: ${location.payee_id}\n`;
          content += `- Coordinates: ${location.latitude}, ${location.longitude}\n`;
          content += `- [View on Google Maps](https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude})\n`;
          content += "\n";
        }
      }
      
      if (deletedLocations.length > 0) {
        content += "## Deleted Locations\n\n";
        content += `*${deletedLocations.length} locations have been deleted*\n`;
      }
      
      // Summary
      content += "\n## Summary\n";
      content += `- Total Active Locations: ${activeLocations.length}\n`;
      content += `- Unique Payees with Locations: ${new Set(activeLocations.map(l => l.payee_id)).size}\n`;
      if (deletedLocations.length > 0) {
        content += `- Deleted Locations: ${deletedLocations.length}\n`;
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
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
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
          mimeType: "application/json"
        }]
      };
    }
  }
);

// Tool: List Transactions
server.registerTool(
  "list-transactions",
  {
    title: "List YNAB Transactions",
    description: "List transactions for a specific budget with formatted output",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      sinceDate: z.string().optional().describe("Only return transactions on or after this date (ISO format: YYYY-MM-DD)"),
      type: z.enum(['uncategorized', 'unapproved']).optional().describe("Filter by transaction type"),
      accountId: z.string().optional().describe("Filter by account ID"),
      categoryId: z.string().optional().describe("Filter by category ID"),
      payeeId: z.string().optional().describe("Filter by payee ID"),
      limit: z.number().optional().describe("Maximum number of transactions to return (default: 50)")
    }
  },
  async ({ budgetId, sinceDate, type, accountId, categoryId, payeeId, limit = 50 }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Get transactions based on filters
      let response;
      if (accountId) {
        response = await client.getAccountTransactions(actualBudgetId, accountId, { since_date: sinceDate, type });
      } else if (categoryId) {
        response = await client.getCategoryTransactions(actualBudgetId, categoryId, { since_date: sinceDate, type });
      } else if (payeeId) {
        response = await client.getPayeeTransactions(actualBudgetId, payeeId, { since_date: sinceDate, type });
      } else {
        response = await client.getTransactions(actualBudgetId, { since_date: sinceDate, type });
      }
      
      const transactions = response.data.transactions
        .filter(t => !t.deleted)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);
      
      // Helper function to format amount
      const formatAmount = (amount: number) => {
        const value = amount / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      // Helper function to format date
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };
      
      // Helper function to get flag emoji
      const getFlagEmoji = (color: string | null) => {
        const flags: { [key: string]: string } = {
          'red': '🔴',
          'orange': '🟠',
          'yellow': '🟡',
          'green': '🟢',
          'blue': '🔵',
          'purple': '🟣'
        };
        return color ? flags[color] || '' : '';
      };
      
      let content = "# YNAB Transactions\n\n";
      
      if (transactions.length === 0) {
        content += "*No transactions found matching the criteria*\n";
        return {
          content: [{ type: "text", text: content }]
        };
      }
      
      // Group transactions by month for better readability
      const transactionsByMonth = new Map<string, typeof transactions>();
      
      for (const transaction of transactions) {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM
        if (!transactionsByMonth.has(monthKey)) {
          transactionsByMonth.set(monthKey, []);
        }
        transactionsByMonth.get(monthKey)!.push(transaction);
      }
      
      for (const [month, monthTransactions] of transactionsByMonth) {
        const monthDate = new Date(month + '-01');
        content += `## ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
        
        for (const t of monthTransactions) {
          const flag = getFlagEmoji(t.flag_color || null);
          const approvalStatus = t.approved ? '' : ' ⚠️';
          
          content += `### ${formatDate(t.date)} - ${t.payee_name || 'No Payee'}${flag}${approvalStatus}\n`;
          content += `- **Amount**: ${formatAmount(t.amount)}\n`;
          content += `- **Account**: ${t.account_name}\n`;
          content += `- **Category**: ${t.category_name || 'Uncategorized'}\n`;
          content += `- **Status**: ${t.cleared} ${t.approved ? '✓' : '(Unapproved)'}\n`;
          
          if (t.memo) {
            content += `- **Memo**: ${t.memo}\n`;
          }
          
          if (t.subtransactions && t.subtransactions.length > 0) {
            content += `- **Split Transaction**:\n`;
            for (const sub of t.subtransactions) {
              content += `  - ${sub.category_name || 'Uncategorized'}: ${formatAmount(sub.amount)}`;
              if (sub.memo) content += ` (${sub.memo})`;
              content += `\n`;
            }
          }
          
          content += `- **ID**: ${t.id}\n`;
          content += "\n";
        }
      }
      
      // Summary
      content += "## Summary\n";
      content += `- **Total Transactions**: ${transactions.length}\n`;
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      content += `- **Net Amount**: ${formatAmount(totalAmount)}\n`;
      
      const inflows = transactions.filter(t => t.amount > 0);
      const outflows = transactions.filter(t => t.amount < 0);
      
      if (inflows.length > 0) {
        const inflowTotal = inflows.reduce((sum, t) => sum + t.amount, 0);
        content += `- **Total Inflows**: ${formatAmount(inflowTotal)} (${inflows.length} transactions)\n`;
      }
      
      if (outflows.length > 0) {
        const outflowTotal = outflows.reduce((sum, t) => sum + t.amount, 0);
        content += `- **Total Outflows**: ${formatAmount(outflowTotal)} (${outflows.length} transactions)\n`;
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Get Transaction Details
server.registerTool(
  "get-transaction-details",
  {
    title: "Get YNAB Transaction Details",
    description: "Get detailed information about a specific transaction",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      transactionId: z.string().describe("Transaction ID")
    }
  },
  async ({ budgetId, transactionId }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.getTransaction(actualBudgetId, transactionId);
      const t = response.data.transaction;
      
      // Helper functions
      const formatAmount = (amount: number) => {
        const value = amount / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      };
      
      const getFlagEmoji = (color: string | null) => {
        const flags: { [key: string]: string } = {
          'red': '🔴',
          'orange': '🟠',
          'yellow': '🟡',
          'green': '🟢',
          'blue': '🔵',
          'purple': '🟣'
        };
        return color ? flags[color] || '' : '';
      };
      
      let content = `# Transaction Details\n\n`;
      
      const flag = getFlagEmoji(t.flag_color || null);
      content += `## ${t.payee_name || 'No Payee'} ${flag}\n\n`;
      
      content += `### Basic Information\n`;
      content += `- **Date**: ${formatDate(t.date)}\n`;
      content += `- **Amount**: ${formatAmount(t.amount)}\n`;
      content += `- **Account**: ${t.account_name}\n`;
      content += `- **Category**: ${t.category_name || 'Uncategorized'}\n`;
      content += `- **Transaction ID**: ${t.id}\n`;
      
      content += `\n### Status\n`;
      content += `- **Cleared**: ${t.cleared}\n`;
      content += `- **Approved**: ${t.approved ? 'Yes ✓' : 'No ⚠️'}\n`;
      content += `- **Deleted**: ${t.deleted ? 'Yes' : 'No'}\n`;
      
      if (t.memo) {
        content += `\n### Memo\n${t.memo}\n`;
      }
      
      if (t.import_id) {
        content += `\n### Import Information\n`;
        content += `- **Import ID**: ${t.import_id}\n`;
        if (t.import_payee_name) {
          content += `- **Import Payee**: ${t.import_payee_name}\n`;
        }
        if (t.import_payee_name_original) {
          content += `- **Original Payee**: ${t.import_payee_name_original}\n`;
        }
      }
      
      if (t.transfer_account_id) {
        content += `\n### Transfer Information\n`;
        content += `- **Transfer Account ID**: ${t.transfer_account_id}\n`;
        if (t.transfer_transaction_id) {
          content += `- **Transfer Transaction ID**: ${t.transfer_transaction_id}\n`;
        }
      }
      
      if (t.matched_transaction_id) {
        content += `\n### Matching\n`;
        content += `- **Matched Transaction ID**: ${t.matched_transaction_id}\n`;
      }
      
      if (t.debt_transaction_type) {
        content += `\n### Debt Information\n`;
        content += `- **Debt Transaction Type**: ${t.debt_transaction_type}\n`;
      }
      
      if (t.subtransactions && t.subtransactions.length > 0) {
        content += `\n### Split Transaction Details\n`;
        for (const sub of t.subtransactions) {
          content += `\n#### ${sub.category_name || 'Uncategorized'}\n`;
          content += `- **Amount**: ${formatAmount(sub.amount)}\n`;
          if (sub.payee_name) {
            content += `- **Payee**: ${sub.payee_name}\n`;
          }
          if (sub.memo) {
            content += `- **Memo**: ${sub.memo}\n`;
          }
          content += `- **ID**: ${sub.id}\n`;
        }
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Create Transaction
server.registerTool(
  "create-transaction",
  {
    title: "Create YNAB Transaction",
    description: "Create a new transaction in YNAB",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      accountId: z.string().describe("Account ID for the transaction"),
      date: z.string().describe("Transaction date (ISO format: YYYY-MM-DD)"),
      amount: z.number().describe("Transaction amount in dollars (negative for outflows, positive for inflows)"),
      payeeId: z.string().optional().describe("Payee ID (optional, can use payeeName instead)"),
      payeeName: z.string().optional().describe("Payee name (optional, will create new payee if doesn't exist)"),
      categoryId: z.string().optional().describe("Category ID (optional)"),
      memo: z.string().optional().describe("Transaction memo"),
      cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("Cleared status (default: uncleared)"),
      approved: z.boolean().optional().describe("Whether transaction is approved (default: false)"),
      flagColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).optional().describe("Flag color"),
      importId: z.string().optional().describe("Import ID to prevent duplicate imports")
    }
  },
  async ({ budgetId, accountId, date, amount, payeeId, payeeName, categoryId, memo, cleared, approved, flagColor, importId }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Convert amount to milliunits
      const amountInMilliunits = Math.round(amount * 1000);
      
      const transaction = {
        account_id: accountId,
        date,
        amount: amountInMilliunits,
        payee_id: payeeId,
        payee_name: payeeName,
        category_id: categoryId,
        memo,
        cleared,
        approved,
        flag_color: flagColor,
        import_id: importId
      };
      
      const response = await client.createTransaction(actualBudgetId, { transaction });
      const created = response.data.transaction;
      
      // Format the response
      const formatAmount = (amt: number) => {
        const value = amt / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      let content = `# Transaction Created Successfully\n\n`;
      content += `## Transaction Details\n`;
      content += `- **Date**: ${created.date}\n`;
      content += `- **Amount**: ${formatAmount(created.amount)}\n`;
      content += `- **Account**: ${created.account_name}\n`;
      content += `- **Payee**: ${created.payee_name || 'No Payee'}\n`;
      content += `- **Category**: ${created.category_name || 'Uncategorized'}\n`;
      content += `- **Status**: ${created.cleared}\n`;
      content += `- **Approved**: ${created.approved ? 'Yes' : 'No'}\n`;
      if (memo) {
        content += `- **Memo**: ${memo}\n`;
      }
      content += `\n### Transaction ID\n${created.id}\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Update Transaction
server.registerTool(
  "update-transaction",
  {
    title: "Update YNAB Transaction",
    description: "Update an existing transaction in YNAB",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      transactionId: z.string().describe("Transaction ID to update"),
      accountId: z.string().optional().describe("New account ID"),
      date: z.string().optional().describe("New date (ISO format: YYYY-MM-DD)"),
      amount: z.number().optional().describe("New amount in dollars"),
      payeeId: z.string().optional().describe("New payee ID"),
      payeeName: z.string().optional().describe("New payee name"),
      categoryId: z.string().optional().describe("New category ID"),
      memo: z.string().optional().describe("New memo"),
      cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("New cleared status"),
      approved: z.boolean().optional().describe("New approved status"),
      flagColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple']).optional().describe("New flag color")
    }
  },
  async ({ budgetId, transactionId, accountId, date, amount, payeeId, payeeName, categoryId, memo, cleared, approved, flagColor }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const transaction: any = {};
      
      // Only include fields that are being updated
      if (accountId !== undefined) transaction.account_id = accountId;
      if (date !== undefined) transaction.date = date;
      if (amount !== undefined) transaction.amount = Math.round(amount * 1000);
      if (payeeId !== undefined) transaction.payee_id = payeeId;
      if (payeeName !== undefined) transaction.payee_name = payeeName;
      if (categoryId !== undefined) transaction.category_id = categoryId;
      if (memo !== undefined) transaction.memo = memo;
      if (cleared !== undefined) transaction.cleared = cleared;
      if (approved !== undefined) transaction.approved = approved;
      if (flagColor !== undefined) transaction.flag_color = flagColor;
      
      const response = await client.updateTransaction(actualBudgetId, transactionId, { transaction });
      const updated = response.data.transaction;
      
      // Format the response
      const formatAmount = (amt: number) => {
        const value = amt / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      let content = `# Transaction Updated Successfully\n\n`;
      content += `## Updated Transaction Details\n`;
      content += `- **Date**: ${updated.date}\n`;
      content += `- **Amount**: ${formatAmount(updated.amount)}\n`;
      content += `- **Account**: ${updated.account_name}\n`;
      content += `- **Payee**: ${updated.payee_name || 'No Payee'}\n`;
      content += `- **Category**: ${updated.category_name || 'Uncategorized'}\n`;
      content += `- **Status**: ${updated.cleared}\n`;
      content += `- **Approved**: ${updated.approved ? 'Yes' : 'No'}\n`;
      if (updated.memo) {
        content += `- **Memo**: ${updated.memo}\n`;
      }
      content += `\n### Transaction ID\n${updated.id}\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Delete Transaction
server.registerTool(
  "delete-transaction",
  {
    title: "Delete YNAB Transaction",
    description: "Delete a transaction from YNAB",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      transactionId: z.string().describe("Transaction ID to delete")
    }
  },
  async ({ budgetId, transactionId }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      const response = await client.deleteTransaction(actualBudgetId, transactionId);
      const deleted = response.data.transaction;
      
      let content = `# Transaction Deleted Successfully\n\n`;
      content += `## Deleted Transaction Summary\n`;
      content += `- **Transaction ID**: ${deleted.id}\n`;
      content += `- **Date**: ${deleted.date}\n`;
      content += `- **Payee**: ${deleted.payee_name || 'No Payee'}\n`;
      content += `- **Amount**: ${deleted.amount / 1000} (now deleted)\n`;
      content += `\nThe transaction has been permanently deleted from your budget.\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Bulk Update Transaction Status
server.registerTool(
  "bulk-update-transaction-status",
  {
    title: "Bulk Update Transaction Status",
    description: "Update the cleared and approved status of multiple transactions for reconciliation",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      updates: z.array(z.object({
        transactionId: z.string().describe("Transaction ID to update"),
        cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("New cleared status"),
        approved: z.boolean().optional().describe("New approved status")
      })).describe("Array of transaction updates")
    }
  },
  async ({ budgetId, updates }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Prepare updates for bulk operation
      const bulkUpdates = updates.map(update => ({
        transactionId: update.transactionId,
        cleared: update.cleared,
        approved: update.approved
      }));
      
      // Perform bulk update
      const results = await client.bulkUpdateTransactionStatus(actualBudgetId, bulkUpdates);
      
      // Helper function to format status
      const formatStatus = (cleared: string, approved: boolean) => {
        const clearedText = cleared.charAt(0).toUpperCase() + cleared.slice(1);
        const approvedText = approved ? '✓ Approved' : '⚠️ Unapproved';
        return `${clearedText}, ${approvedText}`;
      };
      
      let content = `# Bulk Transaction Status Update Complete\n\n`;
      content += `## Summary\n`;
      content += `- **Total Updates Requested**: ${updates.length}\n`;
      content += `- **Successful Updates**: ${results.length}\n`;
      content += `- **Failed Updates**: ${updates.length - results.length}\n\n`;
      
      if (results.length > 0) {
        content += `## Updated Transactions\n\n`;
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const update = updates[i];
          const transaction = result.data.transaction;
          
          content += `### ${transaction.payee_name || 'No Payee'} - ${transaction.date}\n`;
          content += `- **Amount**: $${(transaction.amount / 1000).toFixed(2)}\n`;
          content += `- **Status**: ${formatStatus(transaction.cleared, transaction.approved)}\n`;
          content += `- **Account**: ${transaction.account_name}\n`;
          content += `- **Transaction ID**: ${transaction.id}\n`;
          
          // Show what was updated
          if (update.cleared) {
            content += `- **Updated Cleared Status**: ${update.cleared}\n`;
          }
          if (update.approved !== undefined) {
            content += `- **Updated Approved Status**: ${update.approved ? 'Approved' : 'Unapproved'}\n`;
          }
          content += `\n`;
        }
      }
      
      if (updates.length - results.length > 0) {
        content += `## Failed Updates\n`;
        content += `${updates.length - results.length} transaction(s) could not be updated. This may be due to invalid transaction IDs or network issues.\n`;
      }
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Reconcile Account Transactions
server.registerTool(
  "reconcile-account-transactions",
  {
    title: "Reconcile Account Transactions",
    description: "Mark all transactions in an account as reconciled up to a specific date",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      accountId: z.string().describe("Account ID to reconcile"),
      reconciliationDate: z.string().describe("Reconciliation date (ISO format: YYYY-MM-DD) - transactions on or before this date will be reconciled"),
      endingBalance: z.number().optional().describe("Expected ending balance in dollars for verification")
    }
  },
  async ({ budgetId, accountId, reconciliationDate, endingBalance }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Get account details
      const accountResponse = await client.getAccount(actualBudgetId, accountId);
      const account = accountResponse.data.account;
      
      // Get all transactions for the account
      const transactionsResponse = await client.getAccountTransactions(actualBudgetId, accountId);
      
      // Filter transactions that should be reconciled (on or before reconciliation date and not already reconciled)
      const transactionsToReconcile = transactionsResponse.data.transactions.filter(t => 
        !t.deleted && 
        t.date <= reconciliationDate && 
        t.cleared !== 'reconciled'
      );
      
      if (transactionsToReconcile.length === 0) {
        let content = `# Account Reconciliation - No Transactions to Reconcile\n\n`;
        content += `## Account: ${account.name}\n`;
        content += `- **Reconciliation Date**: ${reconciliationDate}\n`;
        content += `- **Current Balance**: $${(account.balance / 1000).toFixed(2)}\n`;
        content += `\nAll transactions on or before ${reconciliationDate} are already reconciled.\n`;
        
        return {
          content: [{ type: "text", text: content }]
        };
      }
      
      // Prepare bulk updates - mark as reconciled and approved
      const bulkUpdates = transactionsToReconcile.map(t => ({
        transactionId: t.id,
        cleared: 'reconciled' as const,
        approved: true
      }));
      
      // Perform bulk reconciliation
      const results = await client.bulkUpdateTransactionStatus(actualBudgetId, bulkUpdates);
      
      // Calculate reconciliation summary
      const totalReconciledAmount = transactionsToReconcile.reduce((sum, t) => sum + t.amount, 0);
      const reconciliationDateObj = new Date(reconciliationDate);
      
      // Helper functions
      const formatAmount = (amount: number) => {
        const value = amount / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };
      
      let content = `# Account Reconciliation Complete\n\n`;
      content += `## Account: ${account.name}\n`;
      content += `- **Reconciliation Date**: ${formatDate(reconciliationDate)}\n`;
      content += `- **Transactions Reconciled**: ${results.length}\n`;
      content += `- **Total Amount Reconciled**: ${formatAmount(totalReconciledAmount)}\n`;
      content += `- **Current Account Balance**: $${(account.balance / 1000).toFixed(2)}\n`;
      
      if (endingBalance !== undefined) {
        const balanceDifference = (account.balance / 1000) - endingBalance;
        content += `- **Expected Ending Balance**: $${endingBalance.toFixed(2)}\n`;
        content += `- **Balance Difference**: ${balanceDifference >= 0 ? '+' : ''}$${balanceDifference.toFixed(2)}\n`;
        
        if (Math.abs(balanceDifference) > 0.01) {
          content += `\n⚠️ **Warning**: There is a difference between the expected and actual balance. This may indicate missing transactions or data entry errors.\n`;
        } else {
          content += `\n✅ **Success**: Account balance matches expected ending balance!\n`;
        }
      }
      
      content += `\n## Reconciled Transactions\n\n`;
      
      // Group transactions by month for better readability
      const transactionsByMonth = new Map<string, typeof transactionsToReconcile>();
      
      for (const transaction of transactionsToReconcile) {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM
        if (!transactionsByMonth.has(monthKey)) {
          transactionsByMonth.set(monthKey, []);
        }
        transactionsByMonth.get(monthKey)!.push(transaction);
      }
      
      // Sort months in descending order
      const sortedMonths = Array.from(transactionsByMonth.keys()).sort().reverse();
      
      for (const month of sortedMonths) {
        const monthTransactions = transactionsByMonth.get(month)!;
        const monthDate = new Date(month + '-01');
        content += `### ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
        
        for (const t of monthTransactions.sort((a, b) => b.date.localeCompare(a.date))) {
          content += `- **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'} - ${formatAmount(t.amount)}\n`;
        }
        content += `\n`;
      }
      
      content += `## Next Steps\n`;
      content += `- All transactions through ${formatDate(reconciliationDate)} have been marked as reconciled\n`;
      content += `- Review any balance discrepancies if present\n`;
      content += `- Consider reconciling again after your next bank statement\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Find Transactions for Reconciliation
server.registerTool(
  "find-transactions-for-reconciliation",
  {
    title: "Find Transactions for Reconciliation",
    description: "Find transactions that need reconciliation based on their cleared and approved status",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      accountId: z.string().optional().describe("Account ID to filter by (optional - if not provided, searches all accounts)"),
      cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional().describe("Filter by cleared status"),
      approved: z.boolean().optional().describe("Filter by approved status"),
      sinceDate: z.string().optional().describe("Only include transactions on or after this date (ISO format: YYYY-MM-DD)"),
      untilDate: z.string().optional().describe("Only include transactions on or before this date (ISO format: YYYY-MM-DD)"),
      limit: z.number().optional().describe("Maximum number of transactions to return (default: 50)")
    }
  },
  async ({ budgetId, accountId, cleared, approved, sinceDate, untilDate, limit = 50 }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Get transactions using the client method
      const transactionsResponse = await client.getTransactionsByStatus(
        actualBudgetId, 
        accountId, 
        cleared, 
        approved, 
        { since_date: sinceDate }
      );
      
      let transactions = transactionsResponse.data.transactions
        .filter(t => !t.deleted)
        .sort((a, b) => b.date.localeCompare(a.date));
      
      // Apply additional date filtering if untilDate is provided
      if (untilDate) {
        transactions = transactions.filter(t => t.date <= untilDate);
      }
      
      // Apply limit
      transactions = transactions.slice(0, limit);
      
      // Helper functions
      const formatAmount = (amount: number) => {
        const value = amount / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };
      
      const formatStatus = (clearedStatus: string, approvedStatus: boolean) => {
        const clearedText = clearedStatus.charAt(0).toUpperCase() + clearedStatus.slice(1);
        const approvedText = approvedStatus ? '✓ Approved' : '⚠️ Unapproved';
        return `${clearedText}, ${approvedText}`;
      };
      
      const getStatusEmoji = (clearedStatus: string, approvedStatus: boolean) => {
        if (clearedStatus === 'reconciled') return '✅';
        if (clearedStatus === 'cleared' && approvedStatus) return '🟢';
        if (clearedStatus === 'cleared' && !approvedStatus) return '🟡';
        if (clearedStatus === 'uncleared' && approvedStatus) return '🔵';
        return '🔴'; // uncleared and unapproved
      };
      
      let content = `# Transactions for Reconciliation\n\n`;
      
      // Build filter description
      const filters = [];
      if (accountId) {
        // Get account name for display
        try {
          const accountResponse = await client.getAccount(actualBudgetId, accountId);
          filters.push(`Account: ${accountResponse.data.account.name}`);
        } catch {
          filters.push(`Account ID: ${accountId}`);
        }
      }
      if (cleared) filters.push(`Cleared Status: ${cleared}`);
      if (approved !== undefined) filters.push(`Approved: ${approved ? 'Yes' : 'No'}`);
      if (sinceDate) filters.push(`From: ${formatDate(sinceDate)}`);
      if (untilDate) filters.push(`Until: ${formatDate(untilDate)}`);
      
      content += `## Search Criteria\n`;
      if (filters.length > 0) {
        content += filters.map(f => `- ${f}`).join('\n') + '\n';
      } else {
        content += `- All transactions\n`;
      }
      content += `- Limit: ${limit} transactions\n\n`;
      
      content += `## Summary\n`;
      content += `- **Total Transactions Found**: ${transactions.length}\n`;
      
      if (transactions.length === 0) {
        content += `\nNo transactions found matching the specified criteria.\n`;
        return {
          content: [{ type: "text", text: content }]
        };
      }
      
      // Calculate summary statistics
      const statusCounts = {
        uncleared_unapproved: 0,
        uncleared_approved: 0,
        cleared_unapproved: 0,
        cleared_approved: 0,
        reconciled: 0
      };
      
      let totalAmount = 0;
      
      for (const t of transactions) {
        totalAmount += t.amount;
        
        if (t.cleared === 'reconciled') {
          statusCounts.reconciled++;
        } else if (t.cleared === 'cleared') {
          if (t.approved) statusCounts.cleared_approved++;
          else statusCounts.cleared_unapproved++;
        } else { // uncleared
          if (t.approved) statusCounts.uncleared_approved++;
          else statusCounts.uncleared_unapproved++;
        }
      }
      
      content += `- **Net Amount**: ${formatAmount(totalAmount)}\n\n`;
      
      content += `### Status Breakdown\n`;
      if (statusCounts.uncleared_unapproved > 0) content += `- 🔴 **Uncleared & Unapproved**: ${statusCounts.uncleared_unapproved}\n`;
      if (statusCounts.uncleared_approved > 0) content += `- 🔵 **Uncleared & Approved**: ${statusCounts.uncleared_approved}\n`;
      if (statusCounts.cleared_unapproved > 0) content += `- 🟡 **Cleared & Unapproved**: ${statusCounts.cleared_unapproved}\n`;
      if (statusCounts.cleared_approved > 0) content += `- 🟢 **Cleared & Approved**: ${statusCounts.cleared_approved}\n`;
      if (statusCounts.reconciled > 0) content += `- ✅ **Reconciled**: ${statusCounts.reconciled}\n`;
      
      content += `\n## Transactions\n\n`;
      
      // Group transactions by month for better readability
      const transactionsByMonth = new Map<string, typeof transactions>();
      
      for (const transaction of transactions) {
        const monthKey = transaction.date.substring(0, 7); // YYYY-MM
        if (!transactionsByMonth.has(monthKey)) {
          transactionsByMonth.set(monthKey, []);
        }
        transactionsByMonth.get(monthKey)!.push(transaction);
      }
      
      // Sort months in descending order
      const sortedMonths = Array.from(transactionsByMonth.keys()).sort().reverse();
      
      for (const month of sortedMonths) {
        const monthTransactions = transactionsByMonth.get(month)!;
        const monthDate = new Date(month + '-01');
        content += `### ${monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}\n\n`;
        
        for (const t of monthTransactions) {
          const statusEmoji = getStatusEmoji(t.cleared, t.approved);
          content += `${statusEmoji} **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'}\n`;
          content += `   - **Amount**: ${formatAmount(t.amount)}\n`;
          content += `   - **Account**: ${t.account_name}\n`;
          content += `   - **Status**: ${formatStatus(t.cleared, t.approved)}\n`;
          content += `   - **Category**: ${t.category_name || 'Uncategorized'}\n`;
          content += `   - **ID**: ${t.id}\n`;
          if (t.memo) {
            content += `   - **Memo**: ${t.memo}\n`;
          }
          content += `\n`;
        }
      }
      
      content += `## Reconciliation Actions\n`;
      content += `- Use \`bulk-update-transaction-status\` to update multiple transactions at once\n`;
      content += `- Use \`reconcile-account-transactions\` to reconcile an entire account through a specific date\n`;
      content += `- Use \`mark-transactions-cleared\` to mark specific transactions as cleared\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Mark Transactions as Cleared
server.registerTool(
  "mark-transactions-cleared",
  {
    title: "Mark Transactions as Cleared",
    description: "Update transactions from uncleared to cleared status for reconciliation",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      transactionIds: z.array(z.string()).describe("Array of transaction IDs to mark as cleared"),
      alsoApprove: z.boolean().optional().describe("Also mark transactions as approved (default: true)")
    }
  },
  async ({ budgetId, transactionIds, alsoApprove = true }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Prepare bulk updates to mark as cleared (and optionally approved)
      const bulkUpdates = transactionIds.map(id => ({
        transactionId: id,
        cleared: 'cleared' as const,
        approved: alsoApprove
      }));
      
      // Perform bulk update
      const results = await client.bulkUpdateTransactionStatus(actualBudgetId, bulkUpdates);
      
      // Helper functions
      const formatAmount = (amount: number) => {
        const value = amount / 1000;
        return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
      };
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };
      
      let content = `# Mark Transactions as Cleared - Complete\n\n`;
      content += `## Summary\n`;
      content += `- **Total Transactions Requested**: ${transactionIds.length}\n`;
      content += `- **Successfully Updated**: ${results.length}\n`;
      content += `- **Failed Updates**: ${transactionIds.length - results.length}\n`;
      content += `- **New Status**: Cleared${alsoApprove ? ' & Approved' : ''}\n\n`;
      
      if (results.length > 0) {
        content += `## Updated Transactions\n\n`;
        
        // Calculate total amount cleared
        const totalAmountCleared = results.reduce((sum, result) => sum + result.data.transaction.amount, 0);
        content += `**Total Amount Cleared**: ${formatAmount(totalAmountCleared)}\n\n`;
        
        // Group transactions by account for better organization
        const transactionsByAccount = new Map<string, typeof results>();
        
        for (const result of results) {
          const accountName = result.data.transaction.account_name || 'Unknown Account';
          if (!transactionsByAccount.has(accountName)) {
            transactionsByAccount.set(accountName, []);
          }
          transactionsByAccount.get(accountName)!.push(result);
        }
        
        // Sort accounts alphabetically
        const sortedAccounts = Array.from(transactionsByAccount.keys()).sort();
        
        for (const accountName of sortedAccounts) {
          const accountTransactions = transactionsByAccount.get(accountName)!;
          content += `### ${accountName}\n\n`;
          
          // Sort transactions by date (newest first)
          accountTransactions.sort((a, b) => b.data.transaction.date.localeCompare(a.data.transaction.date));
          
          for (const result of accountTransactions) {
            const t = result.data.transaction;
            content += `- **${formatDate(t.date)}** - ${t.payee_name || 'No Payee'}\n`;
            content += `  - Amount: ${formatAmount(t.amount)}\n`;
            content += `  - Category: ${t.category_name || 'Uncategorized'}\n`;
            content += `  - Status: ✅ Cleared${t.approved ? ', ✓ Approved' : ''}\n`;
            content += `  - ID: ${t.id}\n`;
            if (t.memo) {
              content += `  - Memo: ${t.memo}\n`;
            }
            content += `\n`;
          }
        }
      }
      
      if (transactionIds.length - results.length > 0) {
        content += `## Failed Updates\n`;
        content += `${transactionIds.length - results.length} transaction(s) could not be updated.\n`;
        content += `This may be due to:\n`;
        content += `- Invalid transaction IDs\n`;
        content += `- Network connectivity issues\n`;
        content += `- Transactions that are already deleted\n`;
        content += `- API rate limiting\n\n`;
      }
      
      content += `## Balance Impact\n`;
      if (results.length > 0) {
        const totalAmount = results.reduce((sum, result) => sum + result.data.transaction.amount, 0);
        content += `These cleared transactions represent ${formatAmount(totalAmount)} in activity.\n`;
        content += `Your account's cleared balance will reflect these transactions.\n\n`;
      }
      
      content += `## Next Steps\n`;
      content += `- Review your account balances to ensure they match your bank statements\n`;
      content += `- Use \`reconcile-account-transactions\` to mark these as reconciled when ready\n`;
      content += `- Use \`find-transactions-for-reconciliation\` to find remaining uncleared transactions\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Tool: Reconciliation Status Report
server.registerTool(
  "reconciliation-status-report",
  {
    title: "Generate Reconciliation Status Report",
    description: "Generate a comprehensive report showing the current reconciliation state of accounts",
    inputSchema: {
      budgetId: z.string().describe("Budget ID (use 'last-used' for last used budget)"),
      accountIds: z.array(z.string()).optional().describe("Array of account IDs to include (optional - if not provided, includes all accounts)"),
      includeReconciledTransactions: z.boolean().optional().describe("Include details of already reconciled transactions (default: false)")
    }
  },
  async ({ budgetId, accountIds, includeReconciledTransactions = false }) => {
    try {
      const client = getYNABClient();
      
      // If budgetId is "last-used", get the default budget
      let actualBudgetId = budgetId;
      if (budgetId === "last-used") {
        const budgets = await client.getBudgets();
        if (budgets.data.default_budget) {
          actualBudgetId = budgets.data.default_budget.id;
        } else {
          throw new Error("No default budget found");
        }
      }
      
      // Get all accounts
      const accountsResponse = await client.getAccounts(actualBudgetId);
      let accounts = accountsResponse.data.accounts.filter(a => !a.closed && !a.deleted);
      
      // Filter by specified account IDs if provided
      if (accountIds && accountIds.length > 0) {
        accounts = accounts.filter(a => accountIds.includes(a.id));
      }
      
      if (accounts.length === 0) {
        return {
          content: [{ type: "text", text: "No accounts found matching the specified criteria." }]
        };
      }
      
      // Helper functions
      const formatAmount = (amount: number) => {
        return (amount / 1000).toFixed(2);
      };
      
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      };
      
      let content = `# Reconciliation Status Report\n\n`;
      content += `## Overview\n`;
      content += `- **Report Date**: ${formatDate(new Date().toISOString().split('T')[0])}\n`;
      content += `- **Accounts Included**: ${accounts.length}\n`;
      content += `- **Budget**: ${actualBudgetId === budgetId ? budgetId : `${budgetId} (${actualBudgetId})`}\n\n`;
      
      // Collect summary statistics
      let totalAccounts = 0;
      let totalUncleared = 0;
      let totalCleared = 0;
      let totalReconciled = 0;
      let totalUnapproved = 0;
      let totalUnprocessedBalance = 0;
      
      const accountReports: Array<{
        account: any;
        transactions: any[];
        summary: any;
      }> = [];
      
      // Process each account
      for (const account of accounts) {
        try {
          const transactionsResponse = await client.getAccountTransactions(actualBudgetId, account.id);
          const transactions = transactionsResponse.data.transactions.filter(t => !t.deleted);
          
          // Calculate statistics for this account
          const statusCounts = {
            uncleared: 0,
            cleared: 0,
            reconciled: 0,
            unapproved: 0
          };
          
          const statusBalances = {
            uncleared: 0,
            cleared: 0,
            reconciled: 0
          };
          
          let lastReconciledDate: string | null = null;
          
          for (const t of transactions) {
            // Count by status
            statusCounts[t.cleared]++;
            statusBalances[t.cleared] += t.amount;
            
            if (!t.approved) {
              statusCounts.unapproved++;
            }
            
            // Track last reconciled date
            if (t.cleared === 'reconciled') {
              if (!lastReconciledDate || t.date > lastReconciledDate) {
                lastReconciledDate = t.date;
              }
            }
          }
          
          const accountSummary = {
            account_id: account.id,
            account_name: account.name,
            uncleared_count: statusCounts.uncleared,
            cleared_count: statusCounts.cleared,
            reconciled_count: statusCounts.reconciled,
            unapproved_count: statusCounts.unapproved,
            uncleared_balance: statusBalances.uncleared,
            cleared_balance: statusBalances.cleared,
            reconciled_balance: statusBalances.reconciled,
            total_balance: account.balance,
            last_reconciled_date: lastReconciledDate
          };
          
          accountReports.push({
            account,
            transactions,
            summary: accountSummary
          });
          
          // Add to totals
          totalAccounts++;
          totalUncleared += statusCounts.uncleared;
          totalCleared += statusCounts.cleared;
          totalReconciled += statusCounts.reconciled;
          totalUnapproved += statusCounts.unapproved;
          totalUnprocessedBalance += statusBalances.uncleared;
          
        } catch (error) {
          console.error(`Error processing account ${account.name}:`, error);
        }
      }
      
      // Overall summary
      content += `## Summary Statistics\n`;
      content += `- **Total Transactions Needing Attention**: ${totalUncleared + totalUnapproved}\n`;
      content += `- **Uncleared Transactions**: ${totalUncleared}\n`;
      content += `- **Cleared Transactions**: ${totalCleared}\n`;
      content += `- **Reconciled Transactions**: ${totalReconciled}\n`;
      content += `- **Unapproved Transactions**: ${totalUnapproved}\n`;
      content += `- **Unprocessed Balance**: $${formatAmount(totalUnprocessedBalance)}\n\n`;
      
      // Account-by-account breakdown
      content += `## Account Details\n\n`;
      
      // Sort accounts by the number of uncleared transactions (most needing attention first)
      accountReports.sort((a, b) => b.summary.uncleared_count - a.summary.uncleared_count);
      
      for (const report of accountReports) {
        const { account, transactions, summary } = report;
        
        // Get urgency level
        const getUrgencyEmoji = () => {
          if (summary.uncleared_count > 10) return '🔴';
          if (summary.uncleared_count > 5) return '🟡';
          if (summary.uncleared_count > 0) return '🔵';
          return '✅';
        };
        
        content += `### ${getUrgencyEmoji()} ${account.name}\n\n`;
        content += `**Account Balance**: $${formatAmount(account.balance)}\n`;
        content += `**Account Type**: ${account.type}\n\n`;
        
        content += `**Transaction Status:**\n`;
        content += `- 🔴 Uncleared: ${summary.uncleared_count} ($${formatAmount(summary.uncleared_balance)})\n`;
        content += `- 🟡 Cleared: ${summary.cleared_count} ($${formatAmount(summary.cleared_balance)})\n`;
        content += `- ✅ Reconciled: ${summary.reconciled_count} ($${formatAmount(summary.reconciled_balance)})\n`;
        content += `- ⚠️ Unapproved: ${summary.unapproved_count}\n`;
        
        if (summary.last_reconciled_date) {
          content += `- **Last Reconciled**: ${formatDate(summary.last_reconciled_date)}\n`;
        } else {
          content += `- **Last Reconciled**: Never\n`;
        }
        
        // Recommendations
        content += `\n**Recommendations:**\n`;
        if (summary.uncleared_count > 0) {
          content += `- Use \`find-transactions-for-reconciliation\` to review ${summary.uncleared_count} uncleared transactions\n`;
          content += `- Use \`mark-transactions-cleared\` to mark verified transactions as cleared\n`;
        }
        if (summary.cleared_count > 0) {
          content += `- Consider using \`reconcile-account-transactions\` to reconcile ${summary.cleared_count} cleared transactions\n`;
        }
        if (summary.unapproved_count > 0) {
          content += `- Review and approve ${summary.unapproved_count} unapproved transactions\n`;
        }
        if (summary.uncleared_count === 0 && summary.cleared_count === 0) {
          content += `- ✅ Account is fully reconciled!\n`;
        }
        
        content += `\n`;
        
        // Show recent uncleared transactions if requested
        if (summary.uncleared_count > 0 && summary.uncleared_count <= 5) {
          const unclearedTransactions = transactions
            .filter(t => t.cleared === 'uncleared')
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);
          
          content += `**Recent Uncleared Transactions:**\n`;
          for (const t of unclearedTransactions) {
            content += `- ${formatDate(t.date)} - ${t.payee_name || 'No Payee'} - $${formatAmount(t.amount)}\n`;
          }
          content += `\n`;
        }
      }
      
      // Reconciliation workflow guidance
      content += `## Recommended Reconciliation Workflow\n\n`;
      content += `1. **Review Uncleared Transactions**: Use \`find-transactions-for-reconciliation\` with \`cleared: "uncleared"\`\n`;
      content += `2. **Mark Verified Transactions**: Use \`mark-transactions-cleared\` for transactions that appear on your bank statement\n`;
      content += `3. **Reconcile Account**: Use \`reconcile-account-transactions\` when you have a complete bank statement\n`;
      content += `4. **Approve Transactions**: Ensure all transactions are approved for accurate reporting\n`;
      content += `5. **Regular Schedule**: Reconcile at least monthly, ideally weekly for active accounts\n\n`;
      
      content += `## Quick Actions\n`;
      content += `- **Find all uncleared**: \`find-transactions-for-reconciliation\` with \`cleared: "uncleared"\`\n`;
      content += `- **Find unapproved**: \`find-transactions-for-reconciliation\` with \`approved: false\`\n`;
      content += `- **Bulk clear transactions**: \`mark-transactions-cleared\` with transaction IDs\n`;
      content += `- **Full account reconciliation**: \`reconcile-account-transactions\` with account ID and date\n`;
      
      return {
        content: [{ type: "text", text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

// Prompt: Budget Analysis
server.registerPrompt(
  "analyze-budget",
  {
    title: "Analyze YNAB Budget",
    description: "Analyze a YNAB budget and provide insights",
    argsSchema: {
      budgetId: z.string().optional().describe("Budget ID to analyze (defaults to last-used)")
    }
  },
  ({ budgetId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the YNAB budget${budgetId ? ` with ID: ${budgetId}` : ' (last-used budget)'}. 

Provide insights on:
1. The budget's date range and how long it has been active
2. The currency used and any formatting considerations
3. When it was last modified
4. Any recommendations for budget management

Use the available tools to gather the necessary information.`
      }
    }]
  })
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("YNAB MCP Server running on stdio");
  console.error("Available resources:");
  console.error("  - ynab://user");
  console.error("  - ynab://budgets");
  console.error("  - ynab://budgets/{budgetId}");
  console.error("  - ynab://budgets/{budgetId}/accounts");
  console.error("  - ynab://budgets/{budgetId}/accounts/{accountId}");
  console.error("  - ynab://budgets/{budgetId}/categories");
  console.error("  - ynab://budgets/{budgetId}/categories/{categoryId}");
  console.error("  - ynab://budgets/{budgetId}/months");
  console.error("  - ynab://budgets/{budgetId}/months/{month}");
  console.error("  - ynab://budgets/{budgetId}/months/{month}/categories/{categoryId}");
  console.error("  - ynab://budgets/{budgetId}/payees");
  console.error("  - ynab://budgets/{budgetId}/payees/{payeeId}");
  console.error("  - ynab://budgets/{budgetId}/locations");
  console.error("  - ynab://budgets/{budgetId}/transactions");
  console.error("  - ynab://budgets/{budgetId}/transactions/{transactionId}");
  console.error("\nAvailable tools:");
  console.error("  - list-budgets");
  console.error("  - get-budget-summary");
  console.error("  - list-accounts");
  console.error("  - get-account-details");
  console.error("  - list-categories");
  console.error("  - get-category-details");
  console.error("  - list-months");
  console.error("  - get-month-details");
  console.error("  - get-month-category");
  console.error("  - list-payees");
  console.error("  - get-payee-details");
  console.error("  - list-payee-locations");
  console.error("  - list-transactions");
  console.error("  - get-transaction-details");
  console.error("  - create-transaction");
  console.error("  - update-transaction");
  console.error("  - delete-transaction");
  console.error("  - bulk-update-transaction-status");
  console.error("  - reconcile-account-transactions");
  console.error("  - find-transactions-for-reconciliation");
  console.error("  - mark-transactions-cleared");
  console.error("  - reconciliation-status-report");
  console.error("\nAvailable prompts:");
  console.error("  - analyze-budget");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 