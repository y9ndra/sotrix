import { useState, useEffect, useRef } from "react";
import UserCard from "../components/UserCard";
import { getSuggestedUsers } from "../services/explore.service";
import type { SuggestedUser } from "../services/explore.service";
import { searchUsers } from "../services/user.service";

const Search = () => {
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
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearched, setIsSearched] = useState(false);

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
    if (!usersNextCursor || !usersHasMore) return;
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      setSearchError(null);
      setIsSearched(true);
      const response = await searchUsers(searchQuery);
      setSearchResults(response.data);
    } catch (err) {
      setSearchError("Failed to search users. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setIsSearched(false);
  };

  const handleUserFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      // Filter out user from suggested users list once followed
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setSearchResults((prev) => prev.filter((u) => u._id !== userId));
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
          {searchLoading && <p className="explore-loading">searching users...</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {searchResults.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                onFollowStateChange={handleUserFollowChange}
              />
            ))}
          </div>

          {searchResults.length === 0 && !searchLoading && !searchError && (
            <p className="explore-empty-msg">
              no users found matching "{searchQuery}"
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

          {usersLoading && <p className="explore-loading">loading users...</p>}

          {users.length > 0 && usersHasMore && (
            <button
              onClick={loadMoreSuggestedUsers}
              disabled={usersLoading}
              className="explore-loadmore-btn"
            >
              {usersLoading ? "loading..." : "load more users"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
