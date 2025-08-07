import { getStorageStatus } from "$lib/server/storage";

export const load = async ({ locals }) => {
  const { user } = locals;

  if (!user) {
    return {
      user: locals.user,
      session: locals.session,
    };
  }

  return {
    timestamp: Date.now(),
    user: locals.user,
    session: locals.session,
    storageStatus: getStorageStatus(locals.user?.id),
  };
};
