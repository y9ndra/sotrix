import { useState } from "react";
import { createPost } from "../services/post.service";
import type { Post } from "../types/post";

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await createPost(content.trim());

      setContent("");
      onPostCreated(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="create-post-card"
      style={{
        padding: "20px",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        marginBottom: "24px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#111827" }}>
        Create a Post
      </h3>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            resize: "vertical",
            fontSize: "14px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          disabled={loading}
        />

        {error && (
          <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "8px" }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "12px",
          }}
        >
          <button
            type="submit"
            disabled={loading || !content.trim()}
            style={{
              padding: "8px 20px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              cursor: loading || !content.trim() ? "not-allowed" : "pointer",
              opacity: loading || !content.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
