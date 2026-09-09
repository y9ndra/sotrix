import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuthStore } from "../store/authStore";
import { useFeed } from "../hooks/useFeed";
import { queryKeys } from "../lib/queryKeys";
import type { Post } from "../types/post.types";

function Homepage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        rootMargin: "500px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePostCreated = (_newPost: Post) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
  };

  if (!user) return null;

  const posts =
    data?.pages.flatMap(
      (page) => page.data
    ) ?? [];

  return (
    <div>
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="home-welcome">
          <h2>Yo <span className="welcome-highlight">{user.name?.trim() || user.username}</span>, what's on your mind?</h2>
        </div>

        {/* Create Post composer */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* Timeline feed */}
        <h3 className="section-title">home feed</h3>

        {isError && (
          <p style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            Failed to load feed timeline
          </p>
        )}

        <div className="posts-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} style={{ height: "20px", margin: "10px 0" }} />

        {isFetchingNextPage && (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", textAlign: "center", margin: "16px 0" }}>
            loading more posts...
          </p>
        )}

        {posts.length === 0 && !isLoading && !isError && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "20px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            [ no posts in your feed yet ]
          </p>
        )}

        {isLoading && (
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "12px" }}>
            loading feed...
          </p>
        )}
      </div>
    </div>
  );
}

export default Homepage;
