import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { GmailService, EmailOptions } from "../services/gmail_service";
import { logger } from "../utils/logging";

export const GMAIL_CREATE_DRAFT_TOOL: Tool = {
  name: "gmail_create_draft",
  description: "Creates a draft email in the user's Gmail account.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "The recipient email address(es), comma-separated.",
      },
      subject: { type: "string", description: "The subject of the email." },
      body: { type: "string", description: "The body content of the email." },
      isHtml: {
        type: "boolean",
        description: "Set to true if the body contains HTML.",
      },
      cc: {
        type: "string",
        description: "CC recipient email address(es), comma-separated.",
      },
      bcc: {
        type: "string",
        description: "BCC recipient email address(es), comma-separated.",
      },
      attachments: {
        type: "array",
        description: "Optional array of attachments.",
        items: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file." },
            mimeType: {
              type: "string",
              description: "MIME type of the file (e.g., application/pdf).",
            },
            data: {
              type: "string",
              description: "Base64 encoded content of the file.",
            },
          },
          required: ["filename", "mimeType", "data"],
        },
      },
    },
    required: ["to", "subject", "body"],
  },
};

export const GMAIL_SEND_EMAIL_TOOL: Tool = {
  name: "gmail_send_email",
  description: "Sends an email directly from the user's Gmail account.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "The recipient email address(es), comma-separated.",
      },
      subject: { type: "string", description: "The subject of the email." },
      body: { type: "string", description: "The body content of the email." },
      isHtml: {
        type: "boolean",
        description: "Set to true if the body contains HTML.",
      },
      cc: {
        type: "string",
        description: "CC recipient email address(es), comma-separated.",
      },
      bcc: {
        type: "string",
        description: "BCC recipient email address(es), comma-separated.",
      },
      attachments: {
        type: "array",
        description: "Optional array of attachments.",
        items: {
          type: "object",
          properties: {
            filename: { type: "string", description: "Name of the file." },
            mimeType: {
              type: "string",
              description: "MIME type of the file (e.g., application/pdf).",
            },
            data: {
              type: "string",
              description: "Base64 encoded content of the file.",
            },
          },
          required: ["filename", "mimeType", "data"],
        },
      },
    },
    required: ["to", "subject", "body"],
  },
};

export async function handleGmailTool(
  toolName: string,
  args: any,
  gmailService: GmailService,
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    const options: EmailOptions = {
      to: args.to,
      subject: args.subject,
      body: args.body,
      isHtml: args.isHtml,
      cc: args.cc,
      bcc: args.bcc,
      attachments: args.attachments,
    };

    if (toolName === "gmail_create_draft") {
      const draftId = await gmailService.createDraft(options);
      return {
        content: [
          {
            type: "text",
            text: `Successfully created draft with ID: ${draftId}`,
          },
        ],
      };
    } else if (toolName === "gmail_send_email") {
      const messageId = await gmailService.sendEmail(options);
      return {
        content: [
          {
            type: "text",
            text: `Successfully sent email with Message ID: ${messageId}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${toolName}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Tool execution failed for ${toolName}: ${errorMessage}`, {
      error,
    });
    return {
      content: [
        { type: "text", text: `Error executing ${toolName}: ${errorMessage}` },
      ],
      isError: true,
    };
  }
}
