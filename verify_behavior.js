import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["index.js"],
    });

    const client = new Client(
        {
            name: "verify-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    console.log("Connected to server");

    // Test 1: Default behavior (output to file)
    console.log("\n--- Test 1: Default Output (File) ---");
    const result1 = await client.callTool({
        name: "mergestat_sql",
        arguments: {
            sql: "SELECT * FROM commits LIMIT 1"
        }
    });
    console.log("Result content:", result1.content[0].text);

    // Test 2: Explicit Chat Output
    console.log("\n--- Test 2: Explicit Output (Chat) ---");
    const result2 = await client.callTool({
        name: "mergestat_sql",
        arguments: {
            sql: "SELECT * FROM commits LIMIT 1",
            outputToChat: true
        }
    });
    console.log("Result content:", result2.content[0].text.substring(0, 100) + "...");

    await client.close();
}

main().catch(console.error);
