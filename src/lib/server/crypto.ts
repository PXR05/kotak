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
    const saltBuffer = Buffer.from(salt, "base64");
    const key = (await scryptAsync(
      password,
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
    const keyBuffer = Buffer.from(key, "base64");
    const iv = Buffer.from(params.iv, "base64");
    const tag = Buffer.from(params.tag, "base64");

    const decipher = createDecipheriv(this.ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(params.encrypted, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  static encryptBuffer(data: Buffer, key: string): EncryptionResult {
    const keyBuffer = Buffer.from(key, "base64");
    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, keyBuffer, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  }

  static decryptBuffer(params: DecryptionParams, key: string): Buffer {
    const keyBuffer = Buffer.from(key, "base64");
    const iv = Buffer.from(params.iv, "base64");
    const tag = Buffer.from(params.tag, "base64");
    const encryptedData = Buffer.from(params.encrypted, "base64");

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
    const params = JSON.parse(encryptedUmk) as DecryptionParams;
    return this.decryptWithKey(params, pdk);
  }

  static encryptDEK(dek: string, umk: string): string {
    const result = this.encryptWithKey(dek, umk);
    return JSON.stringify(result);
  }

  static decryptDEK(encryptedDek: string, umk: string): string {
    const params = JSON.parse(encryptedDek) as DecryptionParams;
    return this.decryptWithKey(params, umk);
  }
}
