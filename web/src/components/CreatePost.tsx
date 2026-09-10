import { useState, useEffect, useRef } from "react";
import { createPost } from "../services/post.service";
import type { Post } from "../types/post";
import EmojiPicker from "./EmojiPicker";
import { convertEmojiShortcodes, insertEmojiAtCursor } from "../utils/emoji";

interface CreatePostProps {
  onPostCreated: (post: Post) => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    const converted = convertEmojiShortcodes(rawValue);
    setContent(converted);
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + emoji);
      return;
    }

    const { newText, newCursor } = insertEmojiAtCursor(
      content,
      emoji,
      textarea.selectionStart,
      textarea.selectionEnd
    );
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

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
    <div className="create-post-card">
      <h3>Create a Post</h3>

      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="whats happening?"
          rows={3}
          className="create-post-textarea"
          disabled={loading}
        />

        {previewUrl && (
          <div
            style={{
              position: "relative",
              marginTop: "12px",
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid var(--border-default)",
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
              }}
              title="Remove image"
            >
              &times;
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--text-primary)", fontSize: "12px", marginTop: "8px", fontFamily: "var(--font-mono)" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label className="create-post-file-label">
              <span>{image ? "change file" : "add file"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
                style={{ display: "none" }}
              />
            </label>

            <EmojiPicker onSelect={handleEmojiSelect} placement="top-left" />
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="btn"
            style={{ width: "auto", minWidth: "100px" }}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
