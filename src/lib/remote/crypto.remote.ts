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

      if (!userData.encryptedUmk || !userData.keySalt) {
        return {
          data: {
            success: true,
            message: "No encrypted files to restore access for",
          },
        };
      }

      try {
        const pdk = await CryptoUtils.derivePDK(password, userData.keySalt);
        const decryptedUmk = CryptoUtils.decryptUMK(userData.encryptedUmk, pdk);

        setSessionUMK(session.id, decryptedUmk);

        return {
          data: {
            success: true,
            message: "File access restored successfully",
          },
        };
      } catch (decryptError) {
        console.error("Failed to decrypt UMK:", decryptError);
        return {
          error: "Failed to restore access - incorrect password",
        };
      }
    } catch (err) {
      console.error("UMK restore error:", err);
      return {
        error: "Internal server error",
      };
    }
  }
);
