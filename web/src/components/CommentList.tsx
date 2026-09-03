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
    <div className="comments-section">
      <div className="comments-header">
        <h4 className="comments-title">
          comments ({comments.length})
        </h4>
      </div>

      <CreateComment onAddComment={handleAddComment} />

      {error && <p className="comments-error">failed to load comments.</p>}

      <div className="comments-list">
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
        <p className="comments-empty">
          no comments yet. be the first to start the thread.
        </p>
      )}

      {isLoading && <p className="comments-loading">loading comments...</p>}
    </div>
  );
};

export default CommentList;
