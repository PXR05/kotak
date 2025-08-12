import { type Handle, type HandleValidationError } from "@sveltejs/kit";
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

export const handle: Handle = sequence(handleAuth);

export const handleValidationError: HandleValidationError = ({
  event,
  issues,
}) => {
  console.error(Date.now());
  console.error("Validation error:", event);
  console.error("Validation error:", issues);
  return {
    message: "Invalid request data",
  };
};

export const handleError = ({ event, error }) => {
  console.error(Date.now());
  console.error("Error:", event);
  console.error("Error:", error);
  return {
    message: "Internal server error",
  };
};
