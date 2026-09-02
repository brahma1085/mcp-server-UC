import { McpGoogleServer } from "./server/mcp_server";
import { OAuthService } from "./services/oauth_service";
import { FileTokenStorage, EnvironmentTokenStorage, TokenStorage } from "./services/token_storage";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env manually to avoid dotenv stdout pollution
try {
  const envPath = path.resolve(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
} catch (e) {
  // Ignore missing .env file
}

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
