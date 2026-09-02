import { google, gmail_v1 } from "googleapis";
import { OAuthService } from "./oauth_service";
import MailComposer from "nodemailer/lib/mail-composer";
import { logger } from "../utils/logging";
import { standardizeError, AppError } from "../utils/error_handling";
import Bottleneck from "bottleneck";
import type { SendMailOptions } from "nodemailer";

// Global rate limiter for Gmail APIs to prevent 429 errors.
// 5 concurrent requests maximum, at least 200ms apart.
const gmailRateLimiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

export interface Attachment {
  filename: string;
  mimeType: string;
  data: string; // Base64 encoded string
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string;
  bcc?: string;
  attachments?: Attachment[];
}

export class GmailService {
  private oauthService: OAuthService;

  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  /**
   * Helper to get an authenticated Gmail client
   */
  private async getGmailClient(): Promise<gmail_v1.Gmail> {
    const authClient = await this.oauthService.getAuthClient();
    return google.gmail({ version: "v1", auth: authClient });
  }

  /**
   * Helper to construct a base64url encoded MIME message
   */
  private async constructMimeMessage(options: EmailOptions): Promise<string> {
    const mailOptions: SendMailOptions = {
      to: options.to,
      subject: options.subject,
      cc: options.cc,
      bcc: options.bcc,
    };

    if (options.isHtml) {
      mailOptions.html = options.body;
    } else {
      mailOptions.text = options.body;
    }

    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map((att: Attachment) => ({
        filename: att.filename,
        contentType: att.mimeType,
        content: Buffer.from(att.data, "base64"),
      }));
    }

    const mail = new MailComposer(mailOptions);
    const messageBuffer = await mail.compile().build();

    // Gmail API requires base64url encoded string
    return messageBuffer.toString("base64url");
  }

  /**
   * Creates a draft email in the user's Gmail account
   */
  async createDraft(options: EmailOptions): Promise<string> {
    return gmailRateLimiter.schedule(async () => {
      try {
        const gmail = await this.getGmailClient();
        const rawMessage = await this.constructMimeMessage(options);

        logger.info(`Creating draft email to: ${options.to}`);
        const response = await gmail.users.drafts.create({
          userId: "me",
          requestBody: {
            message: {
              raw: rawMessage,
            },
          },
        });

        if (!response.data || !response.data.id) {
          throw new Error(
            "Failed to create draft: No ID returned from Gmail API.",
          );
        }

        logger.info(`Draft created successfully with ID: ${response.data.id}`);
        return response.data.id;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error in createDraft: ${errorMessage}`, { error });
        throw new AppError(standardizeError(error));
      }
    });
  }

  /**
   * Sends an email directly from the user's Gmail account
   */
  async sendEmail(options: EmailOptions): Promise<string> {
    return gmailRateLimiter.schedule(async () => {
      try {
        const gmail = await this.getGmailClient();
        const rawMessage = await this.constructMimeMessage(options);

        logger.info(`Sending email to: ${options.to}`);
        const response = await gmail.users.messages.send({
          userId: "me",
          requestBody: {
            raw: rawMessage,
          },
        });

        if (!response.data || !response.data.id) {
          throw new Error("Failed to send email: No ID returned from Gmail API.");
        }

        logger.info(`Email sent successfully with ID: ${response.data.id}`);
        return response.data.id;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Error in sendEmail: ${errorMessage}`, { error });
        throw new AppError(standardizeError(error));
      }
    });
  }
}
