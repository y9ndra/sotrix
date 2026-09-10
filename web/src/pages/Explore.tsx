import { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import PostCard from "../components/PostCard";
import { getExplorePosts } from "../services/explore.service";
import type { Post, PostsResponse } from "../types/post";
import { searchPosts } from "../services/post.service";
import { queryKeys } from "../lib/queryKeys";

const Explore = () => {
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

  // Query for Explore Posts
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage: loadMoreExplorePosts,
    hasNextPage: postsHasMore,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.explore,
    queryFn: ({ pageParam }) => getExplorePosts(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !postsHasMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreExplorePosts();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [postsHasMore, isFetchingNextPage, loadMoreExplorePosts]);

  const posts = postsData?.pages.flatMap((page) => page.data) ?? [];

  // State for Searching Posts
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [postSearchResults, setPostSearchResults] = useState<Post[]>([]);
  const [postSearchLoading, setPostSearchLoading] = useState(false);
  const [postSearchError, setPostSearchError] = useState<string | null>(null);
  const [isPostSearched, setIsPostSearched] = useState(false);

  const handlePostSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postSearchQuery.trim()) return;

    try {
      setPostSearchLoading(true);
      setPostSearchError(null);
      setIsPostSearched(true);
      const response = await searchPosts(postSearchQuery);
      setPostSearchResults(response.data);
    } catch (err) {
      setPostSearchError("Failed to search posts. Please try again.");
    } finally {
      setPostSearchLoading(false);
    }
  };

  const handleClearPostSearch = () => {
    setPostSearchQuery("");
    setPostSearchResults([]);
    setPostSearchError(null);
    setIsPostSearched(false);
  };

  const handleFollowToggleInCache = (authorId: string, isFollowing: boolean) => {
    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKeys.posts.explore, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((p) => {
            const currentAuthorId = p.author?._id || (p.author as any)?.id;
            if (currentAuthorId === authorId && p.author) {
              return {
                ...p,
                author: {
                  ...p.author,
                  isFollowing,
                },
              };
            }
            return p;
          }),
        })),
      };
    });
  };

  return (
    <div className="explore-container" ref={containerRef}>
      {/* Search Input Form for Posts (slides up when scrolling down) */}
      <form
        onSubmit={handlePostSearch}
        className={`explore-search-form ${isSearchVisible ? "" : "hidden"}`}
      >
        <div className="explore-search-input-wrapper">
          <span className="explore-search-icon">&gt;</span>
          <input
            type="text"
            placeholder="search posts by content..."
            value={postSearchQuery}
            onChange={(e) => setPostSearchQuery(e.target.value)}
            className="explore-search-input"
          />
          {postSearchQuery && (
            <button
              type="button"
              onClick={handleClearPostSearch}
              className="explore-search-clear"
            >
              x
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={postSearchLoading}
          className="explore-search-btn"
        >
          {postSearchLoading ? "searching..." : "search"}
        </button>
      </form>

      {isPostSearched ? (
        <div>
          <div className="explore-results-header">
            <h3 className="explore-results-title">search results</h3>
            <button
              onClick={handleClearPostSearch}
              className="explore-results-clear"
            >
              clear search
            </button>
          </div>

          {postSearchError && <p className="error-text">{postSearchError}</p>}
          {postSearchLoading && <p className="explore-loading">searching posts...</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {postSearchResults.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                showFollowToggle={true}
                onFollowToggle={(authorId, isFollowing) => {
                  setPostSearchResults((prev) =>
                    prev.map((p) => {
                      const currentAuthorId = p.author?._id || (p.author as any)?.id;
                      if (currentAuthorId === authorId && p.author) {
                        return {
                          ...p,
                          author: {
                            ...p.author,
                            isFollowing,
                          },
                        };
                      }
                      return p;
                    })
                  );
                  handleFollowToggleInCache(authorId, isFollowing);
                }}
              />
            ))}
          </div>

          {postSearchResults.length === 0 && !postSearchLoading && !postSearchError && (
            <p className="explore-empty-msg">
              no posts found matching "{postSearchQuery}"
            </p>
          )}
        </div>
      ) : (
        <div>
          {postsError && <p className="error-text">{postsError.message}</p>}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                showFollowToggle={true}
                onFollowToggle={(authorId, isFollowing) => {
                  handleFollowToggleInCache(authorId, isFollowing);
                }}
              />
            ))}
          </div>

          {posts.length === 0 && !postsLoading && !postsError && (
            <p className="explore-empty-msg">
              no new posts to discover right now. check back soon!
            </p>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={loadMoreRef} style={{ height: "20px", margin: "10px 0" }} />

          {isFetchingNextPage && (
            <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", textAlign: "center", margin: "16px 0" }}>
              loading more posts...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;
