import { GoogleDocsService, ContentBlock } from '../../src/services/google_docs_service';
import { OAuthService } from '../../src/services/oauth_service';

jest.mock('googleapis', () => ({
  google: {
    docs: jest.fn().mockReturnValue({
      documents: {
        get: jest.fn().mockResolvedValue({
          data: {
            body: {
              content: [
                { endIndex: 1 },
                { endIndex: 10 } // Mock EOF
              ]
            }
          }
        }),
        batchUpdate: jest.fn().mockResolvedValue({})
      }
    })
  }
}));

describe('GoogleDocsService', () => {
  let docsService: GoogleDocsService;
  let mockOAuthService: jest.Mocked<OAuthService>;

  beforeEach(() => {
    mockOAuthService = {
      getAuthClient: jest.fn().mockResolvedValue({})
    } as any;
    docsService = new GoogleDocsService(mockOAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully append content to a document', async () => {
    const blocks: ContentBlock[] = [
      { text: 'Hello World', bold: true },
      { text: 'Heading', heading: 'HEADING_1' }
    ];

    await expect(docsService.appendContent('doc-123', blocks)).resolves.toBeUndefined();
    expect(mockOAuthService.getAuthClient).toHaveBeenCalled();
  });

  it('should skip empty blocks', async () => {
    const blocks: ContentBlock[] = [
      { text: '' } // Should be skipped
    ];

    await expect(docsService.appendContent('doc-123', blocks)).resolves.toBeUndefined();
  });
});
