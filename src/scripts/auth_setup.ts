import * as readline from 'readline';
import { OAuthService } from '../services/oauth_service';
import { FileTokenStorage } from '../services/token_storage';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('--- MCP Server OAuth 2.0 Setup ---');
  
  // For local setup, we always use FileTokenStorage
  const tokenPath = process.env.TOKEN_PATH || 'tokens.json';
  const tokenStorage = new FileTokenStorage(tokenPath);
  
  let oauthService: OAuthService;
  try {
    oauthService = new OAuthService(tokenStorage);
  } catch (error: any) {
    console.error('Error initializing OAuthService:', error.message);
    console.error('Did you copy .env.example to .env and set your client credentials?');
    process.exit(1);
  }

  const authUrl = oauthService.getAuthUrl();
  console.log('\n1. Open the following URL in your browser to authorize the application:');
  console.log('\n', authUrl, '\n');

  const rl = readline.createInterface({
    input: process.stdin as any,
    output: process.stdout as any,
  });

  rl.question('2. Enter the authorization code from the callback URL: ', async (code) => {
    rl.close();
    
    if (!code) {
        console.error('No code provided. Exiting.');
        process.exit(1);
    }

    try {
      console.log('Exchanging code for tokens...');
      await oauthService.exchangeCodeForTokens(code.trim());
      console.log(`Successfully authenticated! Tokens saved to ${tokenPath}`);
    } catch (error: any) {
      console.error('Failed to exchange code for tokens:', error.message);
      if (error.response?.data) {
          console.error('API Error details:', error.response.data);
      }
      process.exit(1);
    }
  });
}

main().catch(console.error);
