import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { TokenStorage } from './token_storage';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logging';

dotenv.config();

export class OAuthService {
  private oauth2Client: OAuth2Client;
  private tokenStorage: TokenStorage;

  // Define the required scopes for Gmail and Google Docs
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/documents'
  ];

  constructor(tokenStorage: TokenStorage) {
    this.tokenStorage = tokenStorage;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be defined in the environment.');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Automatically save tokens when they are refreshed by the google-auth-library
    this.oauth2Client.on('tokens', (tokens) => {
      this.tokenStorage.save(tokens).catch(err => {
        logger.error('Failed to save refreshed tokens:', { error: err.message });
      });
    });
  }

  /**
   * Generates the URL that the user needs to visit to authorize the application.
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required to receive a refresh token
      scope: OAuthService.SCOPES,
      prompt: 'consent' // Forces consent screen to ensure refresh token is returned
    });
  }

  /**
   * Exchanges an authorization code for an access/refresh token pair.
   * @param code The authorization code from the OAuth callback.
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await this.tokenStorage.save(tokens);
  }

  /**
   * Returns a fully authenticated OAuth2Client, loading credentials from storage if necessary.
   * Throws an error if no credentials are found (user needs to authenticate).
   */
  async getAuthClient(): Promise<OAuth2Client> {
    // If we already have credentials loaded in memory, return the client
    if (this.oauth2Client.credentials && this.oauth2Client.credentials.access_token) {
        return this.oauth2Client;
    }

    // Try to load tokens from storage
    const tokens = await this.tokenStorage.load();
    if (tokens) {
      this.oauth2Client.setCredentials(tokens);
      return this.oauth2Client;
    }

    throw new Error('No OAuth tokens found. Please authenticate the application first.');
  }
}
