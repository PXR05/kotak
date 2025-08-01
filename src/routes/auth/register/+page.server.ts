import { hash } from "@node-rs/argon2";
import { encodeBase32LowerCase } from "@oslojs/encoding";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as auth from "$lib/server/auth";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { ensureRootFolder, ensureTrashFolder } from "$lib/server/folderUtils";
import { registerSchema } from "$lib/validation";
import { RateLimiter } from "sveltekit-rate-limiter/server";

const limiter = new RateLimiter({
  IP: [15, "h"],
  IPUA: [8, "h"],
  cookie: {
    name: "register-limiter",
    secret: process.env.LIMITER_SECRET || "defaultsecret",
    rate: [5, "h"],
    preflight: true,
  },
});

export const load = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/");
  }
  if (event.url.protocol === "https:") {
    await limiter.cookieLimiter?.preflight(event);
  }
  return {};
};

export const actions = {
  default: async (event) => {
    if (event.url.protocol === "https:") {
      const status = await limiter.check(event);
      if (status.limited) {
        return fail(429, {
          message: "Too many requests, please try again later",
        });
      }
    }

    const formData = await event.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm-password");

    const validation = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return fail(400, {
        message:
          errors.email?.[0] ||
          errors.password?.[0] ||
          errors.confirmPassword?.[0] ||
          "Invalid input",
        errors: errors,
      });
    }

    const { email: validEmail, password: validPassword } = validation.data;

    const existingUsers = await db
      .select()
      .from(table.user)
      .where(eq(table.user.email, validEmail));

    if (existingUsers.length > 0) {
      return fail(400, { message: "Email already registered" });
    }

    const userId = generateUserId();
    const passwordHash = await hash(validPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    try {
      await db
        .insert(table.user)
        .values({ id: userId, email: validEmail, passwordHash });

      const sessionToken = auth.generateSessionToken();
      const session = await auth.createSession(sessionToken, userId);
      auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

      await ensureRootFolder(userId);
      await ensureTrashFolder(userId);
    } catch {
      return fail(500, { message: "An error has occurred" });
    }

    return redirect(302, "/");
  },
};

function generateUserId() {
  const bytes = crypto.getRandomValues(new Uint8Array(15));
  const id = encodeBase32LowerCase(bytes);
  return id;
}
