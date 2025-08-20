import { command, getRequestEvent } from "$app/server";
import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { setSessionUMK } from "$lib/server/auth";
import { CryptoUtils } from "$lib/server/crypto";
import * as z from "zod/mini";

export const restoreUMK = command(
  z.object({
    password: z.string(),
  }),
  async ({ password }) => {
    const {
      locals: { user, session, umk },
    } = getRequestEvent();

    if (!user || !session) {
      return {
        error: "User not authenticated",
      };
    }

    if (!password || !password.trim()) {
      return {
        error: "Password is required",
      };
    }

    if (umk) {
      return {
        data: {
          success: true,
          message: "Access already restored",
        },
      };
    }

    try {
      const [userData] = await db
        .select({
          id: table.user.id,
          passwordHash: table.user.passwordHash,
          encryptedUmk: table.user.encryptedUmk,
          keySalt: table.user.keySalt,
        })
        .from(table.user)
        .where(eq(table.user.id, user.id));

      if (!userData) {
        return {
          error: "User not found",
        };
      }

      const validPassword = await verify(userData.passwordHash, password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });

      if (!validPassword) {
        return {
          error: "Incorrect password",
        };
      }

      let umk: string;

      if (!userData.encryptedUmk || !userData.keySalt) {
        umk = CryptoUtils.generateUMK();
        const salt = CryptoUtils.generateSalt();
        const pdk = await CryptoUtils.derivePDK(password, salt);
        const encryptedUmk = CryptoUtils.encryptUMK(umk, pdk);

        await db
          .update(table.user)
          .set({
            encryptedUmk,
            keySalt: salt,
          })
          .where(eq(table.user.id, user.id));
      } else {
        try {
          const pdk = await CryptoUtils.derivePDK(password, userData.keySalt);
          umk = CryptoUtils.decryptUMK(userData.encryptedUmk, pdk);
        } catch (decryptError) {
          console.error("Failed to decrypt UMK:", decryptError);
          return {
            error: "Failed to restore access - incorrect password",
          };
        }
      }

      setSessionUMK(session.id, umk);

      return {
        data: {
          success: true,
          message: "File access restored successfully",
        },
      };
    } catch (err) {
      console.error("UMK restore error:", err);
      return {
        error: "Internal server error",
      };
    }
  }
);
