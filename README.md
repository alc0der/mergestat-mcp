# mergestat-mcp

An [MCP](https://modelcontextprotocol.io/) server that allows you to query git repositories using SQL via [MergeStat](https://github.com/mergestat/mergestat).

## Features

- **`mergestat_sql`**: Execute SQL queries against a git repository (e.g. `SELECT * FROM commits LIMIT 10`).

## Prerequisites

1. **Node.js**: Ensure Node.js is installed.
2. **MergeStat CLI**: This server wraps the `mergestat` CLI tool.
   
   **macOS (Homebrew):**
   ```bash
   brew install mergestat
   ```

   For other platforms, please refer to the [MergeStat installation guide](https://github.com/mergestat/mergestat?tab=readme-ov-file#installation).

## Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make the entry script executable (optional):
   ```bash
   chmod +x index.js
   ```

## Configuration

### Claude Desktop

To use this server with Claude Desktop, add the following configuration to your `claude_desktop_config.json` file.

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**

Replace `/absolute/path/to/mergestat-mcp` with the actual path to this directory.

```json
{
  "mcpServers": {
    "mergestat": {
      "command": "node",
      "args": [
        "/absolute/path/to/mergestat-mcp/index.js"
      ]
    }
  }
}
```

### Cursor

To use this server with Cursor:

1. Open **Cursor Settings**.
2. Navigate to **Features** -> **MCP**.
3. Click **+ Add New MCP Server**.
4. Enter the following details:
   - **Name**: `mergestat` (or any name you prefer)
   - **Type**: `command` (stdio)
   - **Command**: `node /absolute/path/to/mergestat-mcp/index.js`

   *(Ensure you replace `/absolute/path/to/mergestat-mcp` with the actual absolute path)*

## Usage

Once connected, you can ask Claude or Cursor to query your git repository.

**Example Prompts:**
- "Show me the last 5 commits in this repo along with their authors."
- "Count how many commits were made by 'Jane Doe'."
- "List all files modified in the latest commit."

**Note**: By default, the server queries the repository in the current working directory of the process. You can optionally specify a `repoPath` in the tool call if the LLM determines it's necessary, but for most "chat with codebase" scenarios, passing the path to the currently open project is recommended.
