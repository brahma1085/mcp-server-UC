import { McpGoogleServer } from "./server/mcp_server";
import { OAuthService } from "./services/oauth_service";
import { FileTokenStorage, EnvironmentTokenStorage, TokenStorage } from "./services/token_storage";
import * as fs from "fs";
import * as path from "path";

import * as dotenv from "dotenv";

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function main() {
  try {
    // Determine the Token Storage strategy
    let tokenStorage: TokenStorage;
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      console.error("Using EnvironmentTokenStorage for OAuth.");
      tokenStorage = new EnvironmentTokenStorage();
    } else {
      const tokenPath = process.env.TOKEN_PATH || 'tokens.json';
      console.error(`Using FileTokenStorage for OAuth at ${tokenPath}`);
      tokenStorage = new FileTokenStorage(tokenPath);
    }

    const oauthService = new OAuthService(tokenStorage);

    const server = new McpGoogleServer(oauthService);
    await server.start();
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
