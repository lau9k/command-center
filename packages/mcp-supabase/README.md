# @command-center/mcp-supabase

MCP (Model Context Protocol) server that wraps the Command Center Supabase database, enabling Claude Desktop and Claude Code to read/write dashboard data directly.

## Setup

### 1. Install dependencies

```bash
cd packages/mcp-supabase
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Environment variables

Create a `.env` file or set these environment variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (found in Supabase dashboard → Settings → API) |

> **Warning:** The service role key bypasses Row Level Security. Keep it secret.

### 4. Run

```bash
node dist/index.js
```

## Claude Desktop configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "command-center": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Claude Code configuration

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "command-center": {
      "command": "node",
      "args": ["./packages/mcp-supabase/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available tools

| Tool | Description |
|---|---|
| `query_contacts` | Search/filter contacts with pagination |
| `create_contact` | Insert a new contact |
| `update_contact` | Update contact by ID |
| `delete_contact` | Soft-delete contact by ID (sets status to inactive) |
| `query_tasks` | Search/filter tasks with priority sorting |
| `create_task` | Insert a new task |
| `update_task` | Update task by ID (including status changes) |
| `query_content_posts` | Search/filter content posts |
| `create_content_post` | Insert a new content post |
| `query_pipeline_items` | Search/filter pipeline deals |
| `get_dashboard_kpis` | Aggregated metrics (contacts, tasks, pipeline, content) |
