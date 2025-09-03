import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
}

export interface DecryptionParams {
  encrypted: string;
  iv: string;
  tag: string;
}

export class CryptoUtils {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;

  static generateUMK(): string {
    const key = randomBytes(this.KEY_LENGTH);
    return key.toString("base64");
  }

  static generateDEK(): string {
    const key = randomBytes(this.KEY_LENGTH);
    return key.toString("base64");
  }

  static generateSalt(): string {
    const salt = randomBytes(this.SALT_LENGTH);
    return salt.toString("base64");
  }

  static async derivePDK(password: string, salt: string): Promise<string> {
    const normalizedPassword = password.trim();
    const saltBuffer = Buffer.from(salt, "base64");
    const key = (await scryptAsync(
      normalizedPassword,
      saltBuffer,
      this.KEY_LENGTH
    )) as Buffer;
    return key.toString("base64");
  }

  static encryptWithKey(data: string, key: string): EncryptionResult {
    const keyBuffer = Buffer.from(key, "base64");
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  }

  static decryptWithKey(params: DecryptionParams, key: string): string {
    try {
      if (!params.encrypted || !params.iv || !params.tag) {
        throw new Error("Missing encryption parameters");
      }

      const keyBuffer = Buffer.from(key, "base64");
      const iv = Buffer.from(params.iv, "base64");
      const tag = Buffer.from(params.tag, "base64");

      if (keyBuffer.length !== this.KEY_LENGTH) {
        throw new Error(
          `Invalid key length: expected ${this.KEY_LENGTH}, got ${keyBuffer.length}`
        );
      }
      if (iv.length !== this.IV_LENGTH) {
        throw new Error(
          `Invalid IV length: expected ${this.IV_LENGTH}, got ${iv.length}`
        );
      }
      if (tag.length !== this.TAG_LENGTH) {
        throw new Error(
          `Invalid tag length: expected ${this.TAG_LENGTH}, got ${tag.length}`
        );
      }

      const decipher = createDecipheriv(this.ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(params.encrypted, "base64", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Decryption error details:", {
        message: errorMessage,
        keyLength: Buffer.from(key, "base64").length,
        ivLength: params.iv
          ? Buffer.from(params.iv, "base64").length
          : "undefined",
        tagLength: params.tag
          ? Buffer.from(params.tag, "base64").length
          : "undefined",
        encryptedLength: params.encrypted
          ? params.encrypted.length
          : "undefined",
      });
      throw new Error(errorMessage);
    }
  }

  static encryptBuffer(
    data: Buffer,
    key: string
  ): {
    encrypted: Buffer;
    iv: Buffer;
    tag: Buffer;
  } {
    const keyBuffer = Buffer.from(key, "base64");
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, keyBuffer, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv,
      tag,
    };
  }

  static decryptBuffer(
    encryptedData: Buffer,
    iv: Buffer,
    tag: Buffer,
    key: string
  ): Buffer {
    const keyBuffer = Buffer.from(key, "base64");

    const decipher = createDecipheriv(this.ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted;
  }

  static encryptUMK(umk: string, pdk: string): string {
    const result = this.encryptWithKey(umk, pdk);
    return JSON.stringify(result);
  }

  static decryptUMK(encryptedUmk: string, pdk: string): string {
    try {
      if (!encryptedUmk || typeof encryptedUmk !== "string") {
        throw new Error("Invalid encrypted UMK data");
      }

      let params: DecryptionParams;
      try {
        params = JSON.parse(encryptedUmk) as DecryptionParams;
      } catch (parseError) {
        const parseErrorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
          `Failed to parse encrypted UMK JSON: ${parseErrorMessage}`
        );
      }

      return this.decryptWithKey(params, pdk);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("UMK decryption error:", errorMessage);
      throw new Error(`Failed to decrypt UMK: ${errorMessage}`);
    }
  }

  static encryptDEK(dek: string, umk: string): string {
    const result = this.encryptWithKey(dek, umk);
    return JSON.stringify(result);
  }

  static decryptDEK(encryptedDek: string, umk: string): string {
    try {
      if (!encryptedDek || typeof encryptedDek !== "string") {
        throw new Error("Invalid encrypted DEK data");
      }

      let params: DecryptionParams;
      try {
        params = JSON.parse(encryptedDek) as DecryptionParams;
      } catch (parseError) {
        const parseErrorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
          `Failed to parse encrypted DEK JSON: ${parseErrorMessage}`
        );
      }

      return this.decryptWithKey(params, umk);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("DEK decryption error:", errorMessage);
      throw new Error(`Failed to decrypt DEK: ${errorMessage}`);
    }
  }
}
