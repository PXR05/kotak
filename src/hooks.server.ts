import { error, type Handle, type HandleValidationError } from "@sveltejs/kit";
import * as auth from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";

function isFormContentType(contentType?: string) {
  const types = [
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
  ];
  const type = contentType?.split(";", 1)[0].trim() ?? "";
  return types.includes(type.toLowerCase());
}

function isFormMethod(method: string) {
  const methods = ["POST", "PUT", "PATCH", "DELETE"];
  return methods.includes(method);
}

const csrf: Handle = async ({ event, resolve }) => {
  console.log(event.url);

  if (import.meta.env.DEV) return resolve(event);

  const { request } = event;
  const reqMethod = request.method;
  const reqOrigin = request.headers.get("origin")?.toLowerCase();
  const reqContentType = request.headers.get("content-type")?.toLowerCase();

  let validOrigin = false;
  if (reqOrigin) {
    const allowedOrigins: string[] =
      process.env.ALLOWED_ORIGINS?.split(",") || [];
    for (const origin of allowedOrigins) {
      if (origin.startsWith("/") && origin.endsWith("/")) {
        const matches = reqOrigin?.match(
          origin.substring(1, origin.length - 1)
        );
        validOrigin =
          matches !== null && matches.length > 0 && reqOrigin === matches[0];
      } else {
        validOrigin = reqOrigin === origin.toLowerCase();
      }
      if (validOrigin) break;
    }
  }

  const forbidden =
    isFormContentType(reqContentType) &&
    isFormMethod(reqMethod) &&
    !validOrigin;

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
