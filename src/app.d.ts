declare global {
  namespace App {
    interface Locals {
      user: import("$lib/server/auth").SessionValidationResult["user"];
      session: import("$lib/server/auth").SessionValidationResult["session"];
      umk: import("$lib/server/auth").SessionValidationResult["umk"];
    }
    interface PageData {
      user: import("$lib/server/auth").SessionValidationResult["user"];
      session: import("$lib/server/auth").SessionValidationResult["session"];
      umk: import("$lib/server/auth").SessionValidationResult["umk"];
    }
  }
}

export {};
