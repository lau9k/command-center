#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerContentTools } from "./tools/content.js";
import { registerPipelineTools } from "./tools/pipeline.js";
import { registerDashboardTools } from "./tools/dashboard.js";

const server = new McpServer({
  name: "command-center-supabase",
  version: "0.1.0",
});

registerContactTools(server);
registerTaskTools(server);
registerContentTools(server);
registerPipelineTools(server);
registerDashboardTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exit(1);
});
