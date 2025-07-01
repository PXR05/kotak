import { redirect, type Handle } from "@sveltejs/kit";
import * as auth from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";

const handleAuth: Handle = async ({ event, resolve }) => {
  const sessionToken = event.cookies.get(auth.sessionCookieName);

  if (!sessionToken) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await auth.validateSessionToken(sessionToken);

  if (session) {
    auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
  } else {
    auth.deleteSessionTokenCookie(event);
  }

  event.locals.user = user;
  event.locals.session = session;
  return resolve(event);
};

const authGuard: Handle = async ({ event, resolve }) => {
  if (!event.locals.user && !event.url.pathname.startsWith("/auth")) {
    return redirect(302, "/auth/login");
  }
  return resolve(event);
};

export const handle: Handle = sequence(handleAuth, authGuard);
