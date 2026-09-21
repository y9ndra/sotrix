import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Checks if a query (or any queries matching a prefix key) was marked as invalidated
 * when a view becomes active. If invalidated, it triggers a refetch so the active view
 * gets fresh data without having fired unnecessary background network calls while it was inactive.
 */
export const useRefreshOnActive = (
  isActive: boolean,
  queryKey: QueryKey
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isActive) return;

    const state = queryClient.getQueryState(queryKey);
    if (state?.isInvalidated) {
      queryClient.refetchQueries({ queryKey });
      return;
    }

    // Also check if any matching queries under this key are invalidated
    const matchingQueries = queryClient.getQueryCache().findAll({ queryKey });
    const hasInvalidated = matchingQueries.some((q) => q.state.isInvalidated);
    if (hasInvalidated) {
      queryClient.refetchQueries({ queryKey });
    }
  }, [isActive, queryClient, queryKey]);
};
