import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeed } from "../services/feed.service";

export const useFeed = () => {
  return useInfiniteQuery({
    queryKey: ["feed"],

    queryFn: ({ pageParam }) =>
      getFeed(pageParam),

    initialPageParam: undefined as
      | string
      | undefined,

    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) {
        return undefined;
      }

      return lastPage.pagination.nextCursor ?? undefined;
    },
  });
};
