import { handleGmailTool } from "../../src/tools/gmail_tools";
import { GmailService } from "../../src/services/gmail_service";

jest.mock("../../src/services/gmail_service");

describe("Gmail Tools Edge Cases", () => {
  let mockGmailService: jest.Mocked<GmailService>;

  beforeEach(() => {
    mockGmailService = {
      createDraft: jest.fn().mockResolvedValue("draft-123"),
      sendEmail: jest.fn().mockResolvedValue("message-123"),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Successful execution: valid simple email", async () => {
    const args = {
      to: "test@example.com",
      subject: "Hello",
      body: "Test body",
    };
    const result = await handleGmailTool(
      "gmail_create_draft",
      args,
      mockGmailService
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("draft-123");
    expect(mockGmailService.createDraft).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Hello",
      body: "Test body",
      isHtml: false, // detectHtml auto-detects plain text
      cc: undefined,
      bcc: undefined,
      attachments: undefined,
    });
  });

  test("Invalid Email Validation: to field", async () => {
    const args = {
      to: "invalid-email, valid@example.com",
      subject: "Hello",
      body: "Test",
    };
    const result = await handleGmailTool("gmail_send_email", args, mockGmailService);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid email address format: invalid-email");
    expect(mockGmailService.sendEmail).not.toHaveBeenCalled();
  });

  test("HTML Auto-detection: missing isHtml flag", async () => {
    const args = {
      to: "test@example.com",
      subject: "HTML test",
      body: "<b>Hello</b><br/>World",
    };
    const result = await handleGmailTool("gmail_send_email", args, mockGmailService);
    
    expect(result.isError).toBeUndefined();
    expect(mockGmailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ isHtml: true })
    );
  });

  test("Base64 Validation: Malformed string", async () => {
    const args = {
      to: "test@example.com",
      subject: "Attachment",
      body: "Test",
      attachments: [
        {
          filename: "test.txt",
          mimeType: "text/plain",
          data: "NotABase64String!!!",
        }
      ]
    };
    const result = await handleGmailTool("gmail_send_email", args, mockGmailService);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid Base64 data for attachment");
    expect(mockGmailService.sendEmail).not.toHaveBeenCalled();
  });

  test("Base64 Validation: Size Limit (25MB)", async () => {
    // Generate a string that simulates a huge payload
    // 27MB binary -> ~36MB base64 string (exceeds fast-check limit)
    const largeBuffer = Buffer.alloc(27 * 1024 * 1024, "a"); 
    const largeBase64 = largeBuffer.toString("base64");

    const args = {
      to: "test@example.com",
      subject: "Huge Attachment",
      body: "Test",
      attachments: [
        {
          filename: "huge.pdf",
          mimeType: "application/pdf",
          data: largeBase64,
        }
      ]
    };
    const result = await handleGmailTool("gmail_send_email", args, mockGmailService);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("exceeds the 25MB limit");
    expect(mockGmailService.sendEmail).not.toHaveBeenCalled();
  });
});
