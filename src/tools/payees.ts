/**
 * Payee-related tools for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getYNABClient, resolveActualBudgetId, formatErrorResponse } from "../utils/helpers.js";

export function registerPayeeTools(server: McpServer) {
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
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
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
        return formatErrorResponse(error);
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
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
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
        return formatErrorResponse(error);
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
        
        // Resolve actual budget ID
        const actualBudgetId = await resolveActualBudgetId(budgetId, client);
        
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
        return formatErrorResponse(error);
      }
    }
  );
} 