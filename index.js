#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { promisify } from "util";
import { mkdir, writeFile } from "fs/promises";


const execFileAsync = promisify(execFile);

// Change this to the path where mergestat is installed, or rely on PATH
const MERGESTAT_BIN = "mergestat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMA_PATH = join(__dirname, "schema.sql");

async function getSchema() {
  try {
    return await readFile(SCHEMA_PATH, "utf-8");
  } catch (error) {
    console.error("Failed to read schema file:", error);
    return "Error loading schema.";
  }
}

const server = new Server(
  {
    name: "mergestat-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "mergestat_sql",
        description: "Execute a SQL query against a git repository using MergeStat. Returns the result as a file by default (in /tmp/mergestat-mcp/). Outputting to chat is NOT recommended for large datasets as it can flood your context window.",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "The MergeStat SQL query to execute (e.g. \"SELECT * FROM commits LIMIT 5\")",
            },
            repoPath: {
              type: "string",
              description: "Absolute path to the git repository to query. Defaults to current working directory if not provided.",
            },
            outputToChat: {
              type: "boolean",
              description: "If true, output the result directly to chat. WARNING: This is NOT recommended for large results as it may flood the model's context.",
              default: false,
            }
          },
          required: ["sql"],
        },
      },
      {
        name: "describe_schema",
        description: "Returns the SQL schema (DDL) for the available MergeStat tables.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "mergestat://schema",
        name: "MergeStat SQL Schema",
        mimeType: "application/sql",
        description: "DDL for MergeStat tables",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "mergestat://schema") {
    const schema = await getSchema();
    return {
      contents: [
        {
          uri: "mergestat://schema",
          mimeType: "application/sql",
          text: schema,
        },
      ],
    };
  }
  throw new Error(`Resource not found: ${request.params.uri}`);
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "mergestat-default",
        description: "Default prompt for MergeStat that provides schema context",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "mergestat-default") {
    const schema = await getSchema();
    return {
      description: "Default prompt for MergeStat that provides schema context",
      messages: [
        {
          role: "user",
          content: {
            type: "resource",
            resource: {
              uri: "mergestat://schema",
              mimeType: "application/sql",
              text: schema,
            }
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            text: "I want to query the git repository. Use the provided schema to help write correct SQL queries."
          }
        }
      ],
    };
  }
  throw new Error(`Prompt not found: ${request.params.name}`);
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "describe_schema") {
    const schema = await getSchema();
    return {
      content: [
        {
          type: "text",
          text: schema,
        },
      ],
    };
  }

  if (request.params.name === "mergestat_sql") {
    try {
      const sql = request.params.arguments.sql;
      const repoPath = request.params.arguments.repoPath || process.cwd();

      const { stdout, stderr } = await execFileAsync(MERGESTAT_BIN, [sql, "-f", "json", "-r", repoPath], {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        // mergestat often writes logs to stderr even on success, but valid JSON output should be on stdout
        // We'll log it but not fail unless stdout is empty or invalid
        console.error("MergeStat stderr:", stderr);
      }

      let result;
      try {
        result = JSON.parse(stdout);
      } catch (e) {
        // If it's not valid JSON, return raw text or error
        return {
          content: [
            {
              type: "text",
              text: `Failed to parse JSON output. Raw output: ${stdout}\nError: ${e.message}`,
            }
          ],
          isError: true,
        }
      }

      const outputToChat = !!request.params.arguments.outputToChat;

      if (outputToChat) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        const outputDir = "/tmp/mergestat-mcp";
        await mkdir(outputDir, { recursive: true });

        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 7);
        const fileName = `query_result_${timestamp}_${rand}.json`;
        const filePath = join(outputDir, fileName);

        await writeFile(filePath, JSON.stringify(result, null, 2));

        return {
          content: [
            {
              type: "text",
              text: `Query result written to: ${filePath}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing mergestat: ${error.message}\nOutput: ${error.stderr || ""}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MergeStat MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
