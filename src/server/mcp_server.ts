import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
   * Start the MCP server on stdio transport.
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Server for Gmail & Google Docs started successfully");
  }
}
