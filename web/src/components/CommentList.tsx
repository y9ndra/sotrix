import { useQueryClient } from "@tanstack/react-query";
import type { Comment } from "../types/comment";
import { updateComment, deleteComment } from "../services/comment.service";
import { useComments } from "../hooks/useComments";
import { useCreateComment } from "../hooks/useCreateComment";
import { queryKeys } from "../lib/queryKeys";
import { updatePostInAllInfiniteCaches } from "../lib/queryCache";
import type { Post } from "../types/post.types";
import CommentItem from "./CommentItem";
import CreateComment from "./CreateComment";

interface CommentListProps {
  postId: string;
  onCommentCountChange?: (change: number) => void;
}

const CommentList = ({ postId, onCommentCountChange }: CommentListProps) => {
  const queryClient = useQueryClient();
  const { data: commentsResponse, isLoading, error } = useComments(postId);
  const createCommentMutation = useCreateComment();

  const comments: Comment[] = commentsResponse?.data ?? [];

  const handleAddComment = async (content: string) => {
    await createCommentMutation.mutateAsync({ postId, content });
    if (onCommentCountChange) {
      onCommentCountChange(1);
    }
  };

  const handleUpdateComment = async (commentId: string, newContent: string) => {
    await updateComment(commentId, newContent);
    queryClient.invalidateQueries({
      queryKey: queryKeys.comments.byPost(postId),
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    queryClient.invalidateQueries({
      queryKey: queryKeys.comments.byPost(postId),
    });
    updatePostInAllInfiniteCaches(queryClient, postId, (oldPost: Post) => ({
      ...oldPost,
      commentCount: Math.max(0, (oldPost.commentCount ?? 1) - 1),
    }));
    queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
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

      {error && <p style={{ color: "#dc2626", fontSize: "12px", marginTop: "8px" }}>Failed to load comments</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
        {comments.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
        ))}
      </div>

      {comments.length === 0 && !isLoading && (
        <p style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", marginTop: "12px" }}>
          No comments yet. Be the first to comment!
        </p>
      )}

      {isLoading && <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "8px" }}>Loading comments...</p>}
    </div>
  );
};

export default CommentList;
