/**
 * User-related resources for YNAB MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getYNABClient, formatJsonErrorResponse } from "../utils/helpers.js";

export function registerUserResources(server: McpServer) {
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
        return formatJsonErrorResponse(uri.href, error);
      }
    }
  );
} 