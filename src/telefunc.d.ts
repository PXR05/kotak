import "telefunc";

declare module "telefunc" {
  namespace Telefunc {
    interface Context {
      user: import("$lib/server/auth").SessionValidationResult["user"];
      session: import("$lib/server/auth").SessionValidationResult["session"];
    }
  }
}
