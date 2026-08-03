import { useState, useEffect } from "react";
import type { Comment } from "../types/comment";
import { getCommentsForPost, createComment, updateComment, deleteComment } from "../services/comment.service";
import CommentItem from "./CommentItem";
import CreateComment from "./CreateComment";

interface CommentListProps {
  postId: string;
  currentUserId: string | null;
  onCommentCountChange?: (change: number) => void;
}

const CommentList = ({ postId, currentUserId, onCommentCountChange }: CommentListProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCommentsForPost(postId);
      setComments(response.data);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleLoadMore = async () => {
    if (!nextCursor || !hasMore || loading) return;
    try {
      setLoading(true);
      const response = await getCommentsForPost(postId, nextCursor);
      setComments((prev) => [...prev, ...response.data]);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err: any) {
      setError("Failed to load more comments");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    const response = await createComment(postId, content);
    setComments((prev) => [response.data, ...prev]);
    if (onCommentCountChange) {
      onCommentCountChange(1);
    }
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    const response = await updateComment(commentId, newContent);
    setComments((prev) =>
      prev.map((c) => (c._id === commentId ? response.data : c))
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    if (onCommentCountChange) {
      onCommentCountChange(-1);
    }
  };

  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
      <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#374151" }}>
        Comments ({comments.length})
      </h4>

      <CreateComment onAddComment={handleAddComment} />

      {error && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "8px" }}>{error}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
        {comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            currentUserId={currentUserId}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
        ))}
      </div>

      {comments.length === 0 && !loading && (
        <p style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", marginTop: "12px" }}>
          No comments yet. Be the first to comment!
        </p>
      )}

      {loading && <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Loading comments...</p>}

      {hasMore && !loading && (
        <button
          onClick={handleLoadMore}
          style={{
            marginTop: "8px",
            background: "none",
            border: "none",
            color: "#4f46e5",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Load more comments
        </button>
      )}
    </div>
  );
};

export default CommentList;
