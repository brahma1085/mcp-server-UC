import { google, docs_v1 } from "googleapis";
import { OAuthService } from "./oauth_service";
import { logger } from "../utils/logging";
import { standardizeError, AppError } from "../utils/error_handling";

export interface ContentBlock {
  text: string;
  bold?: boolean;
  italic?: boolean;
  heading?:
    | "NORMAL_TEXT"
    | "TITLE"
    | "SUBTITLE"
    | "HEADING_1"
    | "HEADING_2"
    | "HEADING_3"
    | "HEADING_4"
    | "HEADING_5"
    | "HEADING_6";
}

export class GoogleDocsService {
  private oauthService: OAuthService;
  private documentLocks = new Map<string, Promise<void>>();

  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  /**
   * Helper to get an authenticated Google Docs client
   */
  private async getDocsClient(): Promise<docs_v1.Docs> {
    const authClient = await this.oauthService.getAuthClient();
    return google.docs({ version: "v1", auth: authClient });
  }

  /**
   * Appends formatted content blocks to a Google Doc.
   */
  async appendContent(
    documentId: string,
    blocks: ContentBlock[],
  ): Promise<void> {
    const previousLock = this.documentLocks.get(documentId) || Promise.resolve();
    
    const nextLock = previousLock.then(async () => {
      try {
        logger.info(`Appending content to document: ${documentId}`);
      const docs = await this.getDocsClient();

      // 1. Fetch document to determine the End Of File (EOF) index
      const doc = await docs.documents.get({ documentId });
      const content = doc.data.body?.content;

      if (!content || content.length === 0) {
        throw new Error("Could not parse document structure.");
      }

      // The EOF index is the endIndex of the very last structural element, minus 1
      // (Google Docs always reserves the final index for a terminating newline).
      const lastElement = content[content.length - 1];
      if (lastElement.endIndex == null) {
        throw new Error("Document last element has no endIndex.");
      }
      let currentIndex = lastElement.endIndex - 1;

      // 2. Construct the batchUpdate requests
      const requests: docs_v1.Schema$Request[] = [];

      for (const block of blocks) {
        if (!block.text) continue;

        // Ensure block text has a newline if it's a heading to prevent style bleeding
        let textToInsert = block.text;
        if (
          block.heading &&
          block.heading !== "NORMAL_TEXT" &&
          !textToInsert.endsWith("\n")
        ) {
          textToInsert += "\n";
        }

        const startIndex = currentIndex;
        const endIndex = currentIndex + textToInsert.length;

        // Request to insert the text
        requests.push({
          insertText: {
            location: { index: startIndex },
            text: textToInsert,
          },
        });

        // Request to apply text style (bold, italic)
        if (block.bold || block.italic) {
          requests.push({
            updateTextStyle: {
              range: { startIndex, endIndex },
              textStyle: {
                bold: block.bold || false,
                italic: block.italic || false,
              },
              fields: "bold,italic",
            },
          });
        }

        // Request to apply paragraph style (headings)
        if (block.heading) {
          requests.push({
            updateParagraphStyle: {
              range: { startIndex, endIndex },
              paragraphStyle: {
                namedStyleType: block.heading,
              },
              fields: "namedStyleType",
            },
          });
        }

        // Advance the index for the next block
        currentIndex = endIndex;
      }

      if (requests.length === 0) {
        return; // Nothing to do
      }

      // 3. Execute the batchUpdate
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
      logger.info(`Successfully appended content to document: ${documentId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Error in appendContent: ${errorMessage}`, { error });
      throw new AppError(standardizeError(error));
    }
  });

    // Replace the current lock with the new one
    this.documentLocks.set(documentId, nextLock.catch(() => {}));
    
    // Wait for this specific operation to complete and return its result
    return nextLock;
  }
}
