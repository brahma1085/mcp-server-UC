import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { OAuthService } from "../services/oauth_service";
import { GmailService } from "../services/gmail_service";
import { GoogleDocsService } from "../services/google_docs_service";
import { GMAIL_CREATE_DRAFT_TOOL, GMAIL_SEND_EMAIL_TOOL, handleGmailTool } from "../tools/gmail_tools";
import { GOOGLE_DOCS_APPEND_CONTENT_TOOL, handleGoogleDocsTool } from "../tools/google_docs_tools";

/**
 * The main MCP server class handling initialization and tool execution.
 */
export class McpGoogleServer {
  private server: Server;
  private gmailService: GmailService;
  private docsService: GoogleDocsService;
  
  constructor(private oauthService: OAuthService) {
    this.server = new Server(
      {
        name: "mcp-google-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.gmailService = new GmailService(this.oauthService);
    this.docsService = new GoogleDocsService(this.oauthService);
    this.setupHandlers();
  }

  /**
   * Register MCP handlers for tools.
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          GMAIL_CREATE_DRAFT_TOOL,
          GMAIL_SEND_EMAIL_TOOL,
          GOOGLE_DOCS_APPEND_CONTENT_TOOL
        ],
      };
    });

    // Execute tool call
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      
      if (toolName === 'gmail_create_draft' || toolName === 'gmail_send_email') {
        return await handleGmailTool(toolName, request.params.arguments, this.gmailService);
      }
      
      if (toolName === 'google_docs_append_content') {
        return await handleGoogleDocsTool(toolName, request.params.arguments, this.docsService);
      }
      
      throw new Error(`Tool not found or implemented: ${toolName}`);
    });
  }

  /**
   * Start the MCP server on SSE transport using Express.
   */
  public async start(): Promise<void> {
    const app = express();
    let transport: SSEServerTransport;
    
    // Endpoint to establish the SSE connection
    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/message", res);
      await this.server.connect(transport);
    });
    
    // Endpoint to receive messages from the client
    app.post("/message", async (req, res) => {
      if (transport) {
        try {
          await transport.handlePostMessage(req, res);
        } catch (error) {
          console.error("Error handling POST message:", error);
          res.status(500).send("Internal Server Error");
        }
      } else {
        res.status(400).send("No active transport");
      }
    });
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`MCP Server listening for SSE connections on port ${PORT}`);
    });
  }
}
