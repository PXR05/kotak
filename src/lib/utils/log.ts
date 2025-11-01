import type { HandleValidationError, RequestEvent } from "@sveltejs/kit";

export const serverError = (...args: any[]) => error("SERVER", ...args);
export const serverLog = (...args: any[]) => log("SERVER", ...args);
export const dbError = (...args: any[]) => error("DATABASE", ...args);
export const dbLog = (...args: any[]) => log("DATABASE", ...args);
export const validationError = (...args: any[]) => error("VALIDATION", ...args);

const RED = "\x1b[0;31m";
const BLUE = "\x1b[0;34m";
const NC = "\x1b[0m";

function log(tag: string, ...args: any[]) {
  console.log(`${BLUE}[${tag}]${NC}\t${new Date().toISOString()}\t| `, ...args);
}

function error(tag: string, ...args: any[]) {
  console.error(
    `${RED}[${tag}]${NC}\t${new Date().toISOString()}\t| `,
    ...args
  );
}

type ServerErrorMeta = {
  status?: number;
  message?: string;
  method?: string;
  url?: string;
  routeId?: string | null;
  userId?: string | null;
};

function toError(input: unknown): Error {
  if (input instanceof Error) return input;
  try {
    if (typeof input === "string") return new Error(input);
    return new Error(JSON.stringify(input));
  } catch {
    return new Error(String(input));
  }
}

export function logServerError(
  errorInput: unknown,
  meta: ServerErrorMeta = {}
) {
  const err = toError(errorInput);
  const payload: Record<string, unknown> = {
    status: meta.status,
    message: meta.message ?? err.message,
    errorName: err.name,
    errorMessage: err.message,
    method: meta.method,
    url: meta.url,
    routeId: meta.routeId,
    userId: meta.userId,
    stack: err.stack,
  };

  serverError(payload);
}

export function logServerMinimal(meta: ServerErrorMeta = {}) {
  const parts: string[] = [];
  if (meta.status !== undefined) parts.push(`status=${meta.status}`);
  if (meta.method) parts.push(`method=${meta.method}`);
  if (meta.url) parts.push(`url=${meta.url}`);
  if (meta.routeId !== undefined) parts.push(`routeId=${meta.routeId}`);
  if (meta.userId !== undefined) parts.push(`userId=${meta.userId}`);
  if (meta.message) parts.push(`message=${meta.message}`);
  serverLog(parts.join(" "));
}

export function serverErrorFromEvent(params: {
  error: unknown;
  status?: number;
  message?: string;
  event: RequestEvent;
}) {
  const { error: errorInput, status, message, event } = params;
  const userId = (event.locals as any)?.user?.id ?? null;
  const commonMeta: ServerErrorMeta = {
    status,
    message,
    method: event.request.method,
    url: event.url.href,
    routeId: event.route.id,
    userId,
  };

  if (typeof status === "number" && status < 500) {
    logServerMinimal(commonMeta);
    return;
  }

  logServerError(errorInput, commonMeta);
}

export function validationErrorFromEvent(params: {
  event: RequestEvent;
  issues: Parameters<HandleValidationError>[0]["issues"];
}) {
  const { event, issues } = params;
  const userId = (event.locals as any)?.user?.id ?? null;
  const meta: ServerErrorMeta = {
    method: event.request.method,
    url: event.url.href,
    routeId: event.route.id,
    userId,
  };

  validationError(issues, meta);
}
