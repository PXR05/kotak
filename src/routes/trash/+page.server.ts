import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, fetch }) => {
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  try {
    const response = await fetch("/api/trash");
    if (!response.ok) {
      throw new Error("Failed to fetch trashed items");
    }
    const trashedItems = await response.json();

    return {
      user: locals.user,
      trashedItems,
    };
  } catch (error) {
    console.error("Error loading trash:", error);
    return {
      user: locals.user,
      trashedItems: [],
    };
  }
};
