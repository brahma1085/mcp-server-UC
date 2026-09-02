import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OAuthService } from "../services/oauth_service";
import { GmailService } from "../services/gmail_service";
import { GoogleDocsService } from "../services/google_docs_service";
import {
  GMAIL_CREATE_DRAFT_TOOL,
  GMAIL_SEND_EMAIL_TOOL,
  handleGmailTool,
} from "../tools/gmail_tools";
import {
  GOOGLE_DOCS_APPEND_CONTENT_TOOL,
  handleGoogleDocsTool,
} from "../tools/google_docs_tools";
import { logger } from "../utils/logging";

/**
 * The main MCP server class handling initialization and tool execution.
 */
export class McpGoogleServer {
  private gmailService: GmailService;
  private docsService: GoogleDocsService;

  constructor(private oauthService: OAuthService) {
    this.gmailService = new GmailService(this.oauthService);
    this.docsService = new GoogleDocsService(this.oauthService);
  }

  /**
   * Creates a new MCP Server instance with registered handlers.
   * A new instance should be created per client connection.
   */
  private createServerInstance(): Server {
    const server = new Server(
      { name: "mcp-google-server", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          GMAIL_CREATE_DRAFT_TOOL,
          GMAIL_SEND_EMAIL_TOOL,
          GOOGLE_DOCS_APPEND_CONTENT_TOOL,
        ],
      };
    });

    // Execute tool call
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;

      if (
        toolName === "gmail_create_draft" ||
        toolName === "gmail_send_email"
      ) {
        return await handleGmailTool(
          toolName,
          request.params.arguments,
          this.gmailService,
        );
      }

      if (toolName === "google_docs_append_content") {
        return await handleGoogleDocsTool(
          toolName,
          request.params.arguments,
          this.docsService,
        );
      }

      throw new Error(`Tool not found or implemented: ${toolName}`);
    });

    return server;
  }

  /**
   * Start the MCP server on SSE transport using Express.
   */
  public async start(): Promise<void> {
    const app = express();
    
    interface TransportSession {
      transport: SSEServerTransport;
      lastActiveAt: number;
      pingInterval: NodeJS.Timeout;
    }
    
    const transports = new Map<string, TransportSession>();

    // Ghost connection GC: runs every 5 minutes
    const gcInterval = setInterval(() => {
      const now = Date.now();
      const timeoutMs = 15 * 60 * 1000; // 15 minutes
      for (const [sessionId, session] of transports.entries()) {
        if (now - session.lastActiveAt > timeoutMs) {
          logger.warn(`Session ${sessionId} timed out due to inactivity, sweeping ghost connection.`);
          clearInterval(session.pingInterval);
          session.transport.close().catch((e) => {
            logger.error(`Error closing timed out transport ${sessionId}:`, { error: e });
          });
          transports.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000);

    // Endpoint to establish the SSE connection
    app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport("/message", res);
      const server = this.createServerInstance();

      // Set up SSE Keep-Alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(": ping\n\n");
        }
      }, 30000);

      // Store the transport for incoming POST messages
      transports.set(transport.sessionId, {
        transport,
        lastActiveAt: Date.now(),
        pingInterval: keepAliveInterval,
      });

      // Cleanup on client disconnect
      req.on("close", () => {
        clearInterval(keepAliveInterval);
        transports.delete(transport.sessionId);
        server
          .close()
          .catch((e) => logger.error("Error closing server:", { error: e }));
      });

      try {
        await server.connect(transport);
      } catch (e) {
        clearInterval(keepAliveInterval);
        logger.error("Failed to connect server to transport:", { error: e });
      }
    });

    // Endpoint to receive messages from the client, with 50mb payload limit
    app.post("/message", express.json({ limit: "50mb" }), async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const session = transports.get(sessionId);

      if (!session) {
        res.status(404).send("Transport not found for this sessionId");
        return;
      }

      // Update activity timestamp
      session.lastActiveAt = Date.now();

      try {
        await session.transport.handlePostMessage(req, res);
      } catch (error) {
        logger.error("Error handling POST message:", { error });
        res.status(500).send("Internal Server Error");
      }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`MCP Server listening for SSE connections on port ${PORT}`);
    });
  }
}
