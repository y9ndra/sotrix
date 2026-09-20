import type { User } from "../types/user.types";

/**
 * Checks whether a given user is the view-only demo account.
 */
export const isDemoUser = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return Boolean(
    user.isDemo ||
    user.email === "demo@sotrix.dev" ||
    user.username === "demo"
  );
};
