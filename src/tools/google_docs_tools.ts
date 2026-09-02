import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  GoogleDocsService,
  ContentBlock,
} from "../services/google_docs_service";
import { logger } from "../utils/logging";

export const GOOGLE_DOCS_APPEND_CONTENT_TOOL: Tool = {
  name: "google_docs_append_content",
  description: "Appends structured, formatted text to a Google Document.",
  inputSchema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "The unique ID of the Google Document (found in its URL).",
      },
      blocks: {
        type: "array",
        description: "An array of content blocks to insert sequentially.",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text content to insert.",
            },
            bold: { type: "boolean", description: "Apply bold formatting." },
            italic: {
              type: "boolean",
              description: "Apply italic formatting.",
            },
            heading: {
              type: "string",
              enum: [
                "NORMAL_TEXT",
                "TITLE",
                "SUBTITLE",
                "HEADING_1",
                "HEADING_2",
                "HEADING_3",
                "HEADING_4",
                "HEADING_5",
                "HEADING_6",
              ],
              description: "Apply paragraph heading style.",
            },
          },
          required: ["text"],
        },
      },
    },
    required: ["documentId", "blocks"],
  },
};

export async function handleGoogleDocsTool(
  toolName: string,
  args: any,
  docsService: GoogleDocsService,
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    if (toolName === "google_docs_append_content") {
      await docsService.appendContent(
        args.documentId,
        args.blocks as ContentBlock[],
      );
      return {
        content: [
          {
            type: "text",
            text: `Successfully appended content to Google Doc: ${args.documentId}`,
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
