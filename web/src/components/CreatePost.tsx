import { useState, useEffect } from "react";
import { createPost } from "../services/post.service";
import type { Post } from "../types/post";

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(image);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [image]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, etc.)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setError(null);
    setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await createPost(content.trim(), image);

      setContent("");
      setImage(null);
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

        {previewUrl && (
          <div
            style={{
              position: "relative",
              marginTop: "12px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #e5e7eb",
              maxHeight: "300px",
            }}
          >
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: "100%",
                maxHeight: "300px",
                objectFit: "cover",
                display: "block",
              }}
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                lineHeight: 1,
                transition: "background-color 0.2s",
              }}
              title="Remove image"
            >
              &times;
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: "#dc2626", fontSize: "14px", marginTop: "8px" }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "12px",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              backgroundColor: "#f9fafb",
              color: "#374151",
              fontSize: "14px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            <span>📷</span>
            <span>{image ? "Change Image" : "Add Image"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={loading}
              style={{ display: "none" }}
            />
          </label>

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
