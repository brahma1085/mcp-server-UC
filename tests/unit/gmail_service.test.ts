import { GmailService, EmailOptions } from '../../src/services/gmail_service';
import { OAuthService } from '../../src/services/oauth_service';
import { google } from 'googleapis';

jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn().mockReturnValue({
      users: {
        drafts: {
          create: jest.fn().mockResolvedValue({ data: { id: 'draft-123' } })
        },
        messages: {
          send: jest.fn().mockResolvedValue({ data: { id: 'message-123' } })
        }
      }
    })
  }
}));

describe('GmailService', () => {
  let gmailService: GmailService;
  let mockOAuthService: jest.Mocked<OAuthService>;

  beforeEach(() => {
    mockOAuthService = {
      getAuthClient: jest.fn().mockResolvedValue({})
    } as any;
    gmailService = new GmailService(mockOAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a draft', async () => {
    const options: EmailOptions = {
      to: 'test@example.com',
      subject: 'Test Draft',
      body: 'Hello World',
    };

    const draftId = await gmailService.createDraft(options);
    expect(draftId).toBe('draft-123');
    expect(mockOAuthService.getAuthClient).toHaveBeenCalled();
  });

  it('should successfully send an email', async () => {
    const options: EmailOptions = {
      to: 'test@example.com',
      subject: 'Test Send',
      body: '<h1>Hello World</h1>',
      isHtml: true
    };

    const messageId = await gmailService.sendEmail(options);
    expect(messageId).toBe('message-123');
    expect(mockOAuthService.getAuthClient).toHaveBeenCalled();
  });
});
