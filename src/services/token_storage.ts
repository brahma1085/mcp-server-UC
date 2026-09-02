import * as fs from "fs/promises";
import { Credentials } from "google-auth-library";
import { logger } from "../utils/logging";

export interface TokenStorage {
  save(tokens: Credentials): Promise<void>;
  load(): Promise<Credentials | null>;
}

export class FileTokenStorage implements TokenStorage {
  constructor(private tokenPath: string) {}

  async save(tokens: Credentials): Promise<void> {
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
  }

  async load(): Promise<Credentials | null> {
    try {
      const data = await fs.readFile(this.tokenPath, "utf-8");
      return JSON.parse(data) as Credentials;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as any).code === "ENOENT"
      ) {
        return null; // Token file doesn't exist
      }
      throw error;
    }
  }
}

export class EnvironmentTokenStorage implements TokenStorage {
  constructor(private refreshTokenKey: string = "GOOGLE_REFRESH_TOKEN") {}

  async save(tokens: Credentials): Promise<void> {
    // EnvironmentTokenStorage is effectively read-only in the context of the container
    logger.warn("EnvironmentTokenStorage: save() is a no-op.");
  }

  async load(): Promise<Credentials | null> {
    const refreshToken = process.env[this.refreshTokenKey];
    if (refreshToken) {
      return { refresh_token: refreshToken } as Credentials;
    }
    return null;
  }
}
