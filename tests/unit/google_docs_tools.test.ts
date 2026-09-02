import { handleGoogleDocsTool } from "../../src/tools/google_docs_tools";
import { GoogleDocsService } from "../../src/services/google_docs_service";

jest.mock("../../src/services/google_docs_service");

describe("Google Docs Tools Edge Cases", () => {
  let mockDocsService: jest.Mocked<GoogleDocsService>;

  beforeEach(() => {
    mockDocsService = {
      appendContent: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Successful Execution: Append blocks", async () => {
    const args = {
      documentId: "doc-123",
      blocks: [
        { type: "paragraph", text: "Hello" }
      ]
    };
    
    const result = await handleGoogleDocsTool("google_docs_append_content", args, mockDocsService);
    
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Successfully appended content");
    expect(mockDocsService.appendContent).toHaveBeenCalledWith("doc-123", args.blocks);
  });

  test("Empty Blocks Short-circuit", async () => {
    const args = {
      documentId: "doc-123",
      blocks: []
    };
    
    const result = await handleGoogleDocsTool("google_docs_append_content", args, mockDocsService);
    
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Success: No content blocks provided, document unchanged.");
    expect(mockDocsService.appendContent).not.toHaveBeenCalled();
  });

  test("Error Handling: 403 Access Denied", async () => {
    const args = {
      documentId: "forbidden-doc",
      blocks: [{ type: "paragraph", text: "Hello" }]
    };
    
    const mockError = new Error("API Error");
    (mockError as any).code = 403;
    mockDocsService.appendContent.mockRejectedValue(mockError);
    
    const result = await handleGoogleDocsTool("google_docs_append_content", args, mockDocsService);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access Denied (403)");
  });

  test("Error Handling: 404 Not Found", async () => {
    const args = {
      documentId: "missing-doc",
      blocks: [{ type: "paragraph", text: "Hello" }]
    };
    
    const mockError = new Error("API Error");
    (mockError as any).code = 404;
    mockDocsService.appendContent.mockRejectedValue(mockError);
    
    const result = await handleGoogleDocsTool("google_docs_append_content", args, mockDocsService);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Not Found (404)");
  });
});
