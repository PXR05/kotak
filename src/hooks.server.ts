import { error, type Handle } from "@sveltejs/kit";
import * as auth from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";

function isContentType(request: Request, ...types: string[]) {
  const type =
    request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  return types.includes(type.toLowerCase());
}

function isFormContentType(request: Request) {
  return isContentType(
    request,
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain"
  );
}

const csrf: Handle = async ({ event, resolve }) => {
  const { request } = event;

  const origin = process.env.ORIGIN || "";
  const allowedOrigins: string[] = [
    `http://${origin.split("://")[1] || ""}`,
    `https://${origin.split("://")[1] || ""}`,
  ];

  const blockedMethods = ["POST", "PUT", "PATCH", "DELETE"];

  const forbidden =
    isFormContentType(request) &&
    blockedMethods.includes(request.method) &&
    !allowedOrigins.includes(request.headers.get("origin") || "");

  if (forbidden) {
    error(403, `Cross-site ${request.method} form submissions are forbidden`);
  }

  return resolve(event);
};

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

export const handle: Handle = sequence(csrf, handleAuth);
