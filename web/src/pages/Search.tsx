import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import UserCard from "../components/UserCard";
import { getSuggestedUsers } from "../services/explore.service";
import type { SuggestedUser } from "../services/explore.service";
import { searchUsers } from "../services/user.service";
import type { SearchUsersResponse } from "../services/user.service";
import { queryKeys } from "../lib/queryKeys";

const Search = () => {
  const queryClient = useQueryClient();
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smart scroll reveal logic listening to parent slot container scroll events
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const handleScroll = () => {
      const scrollTop = parent.scrollTop;
      if (scrollTop > lastScrollTop.current && scrollTop > 80) {
        setIsSearchVisible(false);
      } else if (scrollTop < lastScrollTop.current) {
        setIsSearchVisible(true);
      }
      lastScrollTop.current = scrollTop;
    };

    parent.addEventListener("scroll", handleScroll, { passive: true });
    return () => parent.removeEventListener("scroll", handleScroll);
  }, []);

  // State for Suggested Users
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersNextCursor, setUsersNextCursor] = useState<string | null>(null);
  const [usersHasMore, setUsersHasMore] = useState(true);

  // State for Searching Users
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const fetchSuggestedUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const response = await getSuggestedUsers();
      setUsers(response.data);
      setUsersNextCursor(response.pagination.nextCursor);
      setUsersHasMore(response.pagination.hasMore);
    } catch (err) {
      setUsersError("Failed to load suggested users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadMoreSuggestedUsers = async () => {
    if (!usersNextCursor || !usersHasMore || usersLoading) return;
    try {
      setUsersLoading(true);
      setUsersError(null);
      const response = await getSuggestedUsers(usersNextCursor);
      setUsers((prev) => [...prev, ...response.data]);
      setUsersNextCursor(response.pagination.nextCursor);
      setUsersHasMore(response.pagination.hasMore);
    } catch (err) {
      setUsersError("Failed to load more users");
    } finally {
      setUsersLoading(false);
    }
  };

  // Infinite query for searching users
  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchErrorObj,
    fetchNextPage: loadMoreSearchUsers,
    hasNextPage: searchHasMore,
    isFetchingNextPage: isFetchingNextSearchPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.users.search(activeSearchQuery),
    queryFn: ({ pageParam }) => searchUsers(activeSearchQuery, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return lastPage.pagination?.nextCursor ?? undefined;
    },
    enabled: !!activeSearchQuery,
  });

  const searchResults = searchData?.pages.flatMap((page) => page.data) ?? [];
  const isSearched = !!activeSearchQuery;
  const searchError = searchErrorObj ? "Failed to search users. Please try again." : null;

  // IntersectionObserver for searching users
  const searchLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = searchLoadMoreRef.current;
    if (!element || !searchHasMore || isFetchingNextSearchPage || !isSearched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSearchUsers();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [searchHasMore, isFetchingNextSearchPage, loadMoreSearchUsers, isSearched]);

  // IntersectionObserver for suggested users
  const suggestedLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = suggestedLoadMoreRef.current;
    if (!element || !usersHasMore || usersLoading || isSearched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSuggestedUsers();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [usersHasMore, usersLoading, isSearched, usersNextCursor]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
  };

  const handleUserFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    }
    if (activeSearchQuery) {
      queryClient.setQueryData<InfiniteData<SearchUsersResponse>>(
        queryKeys.users.search(activeSearchQuery),
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: isFollowing
                ? page.data.filter((u) => u._id !== userId)
                : page.data.map((u) => (u._id === userId ? { ...u, isFollowing } : u)),
            })),
          };
        }
      );
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  return (
    <div className="explore-container" ref={containerRef}>
      {/* Search Input Form for Users (slides up when scrolling down) */}
      <form
        onSubmit={handleSearch}
        className={`explore-search-form ${isSearchVisible ? "" : "hidden"}`}
      >
        <div className="explore-search-input-wrapper">
          <span className="explore-search-icon">&gt;</span>
          <input
            type="text"
            placeholder="search users by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="explore-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="explore-search-clear"
            >
              x
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={searchLoading}
          className="explore-search-btn"
        >
          {searchLoading ? "searching..." : "search"}
        </button>
      </form>

      {isSearched ? (
        <div>
          <div className="explore-results-header">
            <h3 className="explore-results-title">search results</h3>
            <button
              onClick={handleClearSearch}
              className="explore-results-clear"
            >
              clear search
            </button>
          </div>

          {searchError && <p className="error-text">{searchError}</p>}
          {searchLoading && !isFetchingNextSearchPage && <p className="explore-loading">searching users...</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {searchResults.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onFollowStateChange={handleUserFollowChange}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel for user search */}
          <div ref={searchLoadMoreRef} style={{ height: "20px", margin: "10px 0" }} />

          {isFetchingNextSearchPage && (
            <p className="explore-loading" style={{ margin: "16px 0", textAlign: "center" }}>
              loading more users...
            </p>
          )}

          {searchResults.length === 0 && !searchLoading && !searchError && (
            <p className="explore-empty-msg">
              no users found matching "{activeSearchQuery}"
            </p>
          )}
        </div>
      ) : (
        <div>
          {usersError && <p className="error-text">{usersError}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {users.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onFollowStateChange={handleUserFollowChange}
              />
            ))}
          </div>

          {users.length === 0 && !usersLoading && !usersError && (
            <p className="explore-empty-msg">
              you're already following everyone available or no suggested users match!
            </p>
          )}

          {/* Infinite scroll sentinel for suggested users */}
          <div ref={suggestedLoadMoreRef} style={{ height: "20px", margin: "10px 0" }} />

          {usersLoading && (
            <p className="explore-loading" style={{ margin: "16px 0", textAlign: "center" }}>
              loading users...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
