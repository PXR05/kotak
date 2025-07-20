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

  const allowedOrigins: string[] = [];
  const originPatterns = (process.env.ALLOWED_ORIGINS || "")
    .split(/,(?![^\[]*\])/)
    .filter(Boolean);

  for (const pattern of originPatterns) {
    const trimmed = pattern.trim();
    const match = trimmed.match(/^(.+?):\[([^\]]+)\]$/);
    if (match) {
      const [, baseUrl, portsList] = match;
      const ports = portsList.split(",");

      for (const port of ports) {
        allowedOrigins.push(`${baseUrl}:${port.trim()}`);
      }
    } else {
      allowedOrigins.push(trimmed);
    }
  }

  const blockedMethods = ["POST", "PUT", "PATCH", "DELETE"];

  const forbidden =
    isFormContentType(request) &&
    blockedMethods.includes(request.method) &&
    !allowedOrigins.includes(request.headers.get("origin") || "");

  if (forbidden) {
    console.log(
      `CSRF check failed for ${
        request.method
      } request from origin: ${request.headers.get("origin")}`
    );
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
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
