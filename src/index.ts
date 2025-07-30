/**
 * Main entry point for YNAB MCP server
 */

import { createAndStartServer } from "./server.js";

async function main() {
  try {
    await createAndStartServer();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main(); 