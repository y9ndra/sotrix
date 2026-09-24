import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import UserCard from "../components/UserCard";
import { getSuggestedUsers } from "../services/explore.service";
import { searchUsers } from "../services/user.service";
import { queryKeys } from "../lib/queryKeys";
import { updateUserInAllUserCaches } from "../lib/queryCache";
import { useRefreshOnActive } from "../hooks/useRefreshOnActive";
import RubiksLoader from "../components/RubiksLoader";

const Search = () => {
  const queryClient = useQueryClient();
  const location = useLocation();

  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const lastScrollTop = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const isSearched = activeSearchQuery.trim().length > 0;

  const isSearchActive = location.pathname.startsWith("/search");
  useRefreshOnActive(isSearchActive, queryKeys.users.suggested);
  useRefreshOnActive(isSearchActive && isSearched, queryKeys.users.search(activeSearchQuery));

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

  // Infinite query for suggested users
  const {
    data: suggestedData,
    isLoading: suggestedLoading,
    error: suggestedErrorObj,
    fetchNextPage: loadMoreSuggestedUsers,
    hasNextPage: suggestedHasMore,
    isFetchingNextPage: isFetchingNextSuggestedPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.users.suggested,
    queryFn: ({ pageParam }) => getSuggestedUsers(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return lastPage.pagination?.nextCursor ?? undefined;
    },
    enabled: !isSearched,
  });

  const users = suggestedData?.pages.flatMap((page) => page.data) ?? [];
  const usersLoading = suggestedLoading;
  const usersError = suggestedErrorObj ? "Failed to load suggested users" : null;
  const usersHasMore = Boolean(suggestedHasMore);

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
    if (!element || !usersHasMore || isFetchingNextSuggestedPage || isSearched) return;

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
  }, [usersHasMore, isFetchingNextSuggestedPage, isSearched, loadMoreSuggestedUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveSearchQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
  };

  const handleUserFollowChange = (userId: string, isFollowing: boolean, followersCount?: number) => {
    updateUserInAllUserCaches(queryClient, userId, Boolean(isFollowing), followersCount);
  };

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
            {searchResults.map((user, idx) => {
              const userId = user._id || (user as any)?.id || `search-user-${idx}`;
              const isUserFollowing = Boolean(user?.isFollowing);
              const prevUserFollowing = idx > 0 ? Boolean(searchResults[idx - 1]?.isFollowing) : false;
              const showDivider = idx > 0 && isUserFollowing && !prevUserFollowing;

              return (
                <div key={userId} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {showDivider && (
                    <div className="search-following-divider">
                      <span>Already Following</span>
                    </div>
                  )}
                  <UserCard
                    user={user}
                    onFollowStateChange={handleUserFollowChange}
                  />
                </div>
              );
            })}
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

          {usersLoading && users.length === 0 && (
            <div style={{ padding: "64px 0", display: "flex", justifyContent: "center" }}>
              <RubiksLoader text="SEARCHING AGENTS" size="md" />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {users.map((user, idx) => {
              const userId = user._id || (user as any)?.id || `suggested-user-${idx}`;
              const isUserFollowing = Boolean(user?.isFollowing);
              const prevUserFollowing = idx > 0 ? Boolean(users[idx - 1]?.isFollowing) : false;
              const showDivider = idx > 0 && isUserFollowing && !prevUserFollowing;

              return (
                <div key={userId} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {showDivider && (
                    <div className="search-following-divider">
                      <span>Already Following</span>
                    </div>
                  )}
                  <UserCard
                    user={user}
                    onFollowStateChange={handleUserFollowChange}
                  />
                </div>
              );
            })}
          </div>

          {users.length === 0 && !usersLoading && !usersError && (
            <p className="explore-empty-msg">
              no users available to display
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
