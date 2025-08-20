import { getStorageStatus } from "$lib/server/storage";

export const load = async ({ locals }) => {
  const { user } = locals;

  if (!user) {
    return {
      user: locals.user,
      session: locals.session,
      umk: locals.umk,
    };
  }

  return {
    timestamp: Date.now(),
    user: locals.user,
    session: locals.session,
    umk: locals.umk,
    storageStatus: getStorageStatus(locals.user?.id),
  };
};
