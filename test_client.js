import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["index.js"],
    });

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    console.log("Connected to server");

    // 1. List Resources
    console.log("\n--- Resources ---");
    const resources = await client.listResources();
    resources.resources.forEach(r => console.log(`- ${r.name} (${r.uri})`));

    // 2. Read Resource
    console.log("\n--- Reading Schema Resource ---");
    const schemaResource = await client.readResource({ uri: "mergestat://schema" });
    console.log(schemaResource.contents[0].text.substring(0, 50) + "..."); // Print snippet

    // 3. List Prompts
    console.log("\n--- Prompts ---");
    const prompts = await client.listPrompts();
    prompts.prompts.forEach(p => console.log(`- ${p.name}: ${p.description}`));

    // 4. Get Prompt
    console.log("\n--- Getting Default Prompt ---");
    const prompt = await client.getPrompt({ name: "mergestat-default" });
    console.log("Prompt messages:", prompt.messages.length);

    // 5. Call Tool: describe_schema
    console.log("\n--- Calling Tool: describe_schema ---");
    const schemaResult = await client.callTool({
        name: "describe_schema",
        arguments: {}
    });
    console.log(schemaResult.content[0].text.substring(0, 50) + "...");

    await client.close();
}

main().catch(console.error);
