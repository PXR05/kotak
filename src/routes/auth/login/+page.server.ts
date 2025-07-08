import { hash, verify } from "@node-rs/argon2";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import * as auth from "$lib/server/auth";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { loginSchema } from "$lib/validation";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/");
  }
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email");
    const password = formData.get("password");

    const validation = loginSchema.safeParse({
      email,
      password,
    });

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return fail(400, {
        message: errors.email?.[0] || errors.password?.[0] || "Invalid input",
        errors: errors,
      });
    }

    const { email: validEmail, password: validPassword } = validation.data;

    const results = await db
      .select()
      .from(table.user)
      .where(eq(table.user.email, validEmail));

    const existingUser = results.at(0);
    if (!existingUser) {
      return fail(400, { message: "Incorrect email or password" });
    }

    const validPasswordHash = await verify(
      existingUser.passwordHash,
      validPassword,
      {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      }
    );
    if (!validPasswordHash) {
      return fail(400, { message: "Incorrect email or password" });
    }

    const sessionToken = auth.generateSessionToken();
    const session = await auth.createSession(sessionToken, existingUser.id);
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

    return redirect(302, "/");
  },
};
