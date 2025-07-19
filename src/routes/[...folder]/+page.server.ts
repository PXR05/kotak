import { redirect } from "@sveltejs/kit";

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
