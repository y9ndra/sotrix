import type { Post } from "../types/post";

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  return (
    <article className="post-card">
      <div className="post-header">
        <h3>{post.author?.name || post.author?.username || "Unknown"}</h3>
        <p>@{post.author?.username || "unknown"}</p>
      </div>

      <p className="post-content">{post.content}</p>

      <small className="post-date">
        {new Date(post.createdAt).toLocaleString()}
      </small>
    </article>
  );
};

export default PostCard;
