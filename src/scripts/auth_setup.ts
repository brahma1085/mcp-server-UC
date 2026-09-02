import * as readline from "readline";
import { OAuthService } from "../services/oauth_service";
import { FileTokenStorage } from "../services/token_storage";
import { logger } from "../utils/logging";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  logger.info("--- MCP Server OAuth 2.0 Setup ---");

  // For local setup, we always use FileTokenStorage
  const tokenPath = process.env.TOKEN_PATH || "tokens.json";
  const tokenStorage = new FileTokenStorage(tokenPath);

  let oauthService: OAuthService;
  try {
    oauthService = new OAuthService(tokenStorage);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error initializing OAuthService: ${errorMessage}`);
    logger.error(
      "Did you copy .env.example to .env and set your client credentials?",
    );
    process.exit(1);
  }

  const authUrl = oauthService.getAuthUrl();
  logger.info(
    "\n1. Open the following URL in your browser to authorize the application:",
  );
  logger.info(`\n${authUrl}\n`);

  const rl = readline.createInterface({
    input: process.stdin as unknown as NodeJS.ReadableStream,
    output: process.stdout as unknown as NodeJS.WritableStream,
  });

  rl.question(
    "2. Enter the authorization code from the callback URL: ",
    async (code) => {
      rl.close();

      if (!code) {
        logger.error("No code provided. Exiting.");
        process.exit(1);
      }

      try {
        logger.info("Exchanging code for tokens...");
        await oauthService.exchangeCodeForTokens(code.trim());
        logger.info(`Successfully authenticated! Tokens saved to ${tokenPath}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Failed to exchange code for tokens: ${errorMessage}`);
        if (error && typeof error === "object" && "response" in error) {
          logger.error("API Error details:", {
            data: (error as any).response?.data,
          });
        }
        process.exit(1);
      }
    },
  );
}

main().catch((e) => logger.error("Main execution failed", { error: e }));
