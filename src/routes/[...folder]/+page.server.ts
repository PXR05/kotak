import { redirect } from "@sveltejs/kit";
import * as auth from "$lib/server/auth";

export const load = async ({ locals: { user }, params: { folder } }) => {
  if (!user) {
    redirect(302, "/auth/login");
  }

  let currentFolderId: string | null = null;

  if (folder && folder.trim() !== "") {
    const folderParts = folder.split("/").filter((part) => part.trim() !== "");
    if (folderParts.length > 0) {
      currentFolderId = folderParts[folderParts.length - 1];
    }
  }

  return {
    currentFolderId,
  };
};

export const actions = {
  logout: async (event) => {
    const sessionToken = event.cookies.get(auth.sessionCookieName);
    if (sessionToken) {
      const { session } = await auth.validateSessionToken(sessionToken);
      if (session) {
        await auth.invalidateSession(session.id);
      }
    }
    auth.deleteSessionTokenCookie(event);
    redirect(303, "/auth/signin");
  },
};
