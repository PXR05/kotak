import Valkey from "iovalkey";

let valkey: Valkey | null = null;

export function getValkeyClient(): Valkey | null {
  if (!valkey) {
    try {
      valkey = new Valkey(
        import.meta.env.DEV
          ? `redis://localhost:6379`
          : `redis://valkey:6379`,
        {
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        }
      );

      valkey.on("error", (err) => {
        console.error("[Valkey] Connection error:", err);
      });

      valkey.on("connect", () => {
        console.log("[Valkey] Connected to Valkey");
      });
    } catch (error) {
      console.error("[Valkey] Failed to create client:", error);
      valkey = null;
    }
  }

  return valkey;
}
