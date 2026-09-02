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
  // Helpers for edge cases
  const validateEmails = (emails?: string) => {
    if (!emails) return;
    const list = emails.split(",").map((e) => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of list) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address format: ${email}`);
      }
    }
  };

  const validateAttachments = (attachments?: any[]) => {
    if (!attachments) return;
    const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    for (const att of attachments) {
      // Fast check on raw length to prevent Regex DoS on massive strings.
      // 25MB binary = exactly 34,952,536 base64 chars.
      if (att.data.length > 35000000) {
        throw new Error(`Attachment ${att.filename} exceeds the 25MB limit.`);
      }

      if (!base64Regex.test(att.data.replace(/\s/g, ""))) {
        throw new Error(`Invalid Base64 data for attachment: ${att.filename}`);
      }
      
      const cleanBase64 = att.data.replace(/=/g, "");
      const sizeBytes = Math.floor(cleanBase64.length * 0.75);
      
      if (sizeBytes > MAX_SIZE_BYTES) {
        throw new Error(`Attachment ${att.filename} exceeds the 25MB limit.`);
      }
    }
  };

  const detectHtml = (body: string, isHtml?: boolean): boolean => {
    if (isHtml === true) return true;
    const htmlRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlRegex.test(body);
  };
  try {
    validateEmails(args.to);
    validateEmails(args.cc);
    validateEmails(args.bcc);
    validateAttachments(args.attachments);

    const isHtmlDetected = detectHtml(args.body, args.isHtml);

    const options: EmailOptions = {
      to: args.to,
      subject: args.subject,
      body: args.body,
      isHtml: isHtmlDetected,
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
