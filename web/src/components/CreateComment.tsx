import React, { useState, useRef } from "react";
import EmojiPicker from "./EmojiPicker";
import { convertEmojiShortcodes, insertEmojiAtCursor } from "../utils/emoji";

interface CreateCommentProps {
  onAddComment: (content: string) => Promise<void>;
}

const CreateComment = ({ onAddComment }: CreateCommentProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const converted = convertEmojiShortcodes(rawValue);
    setContent(converted);
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setContent((prev) => prev + emoji);
      return;
    }

    const { newText, newCursor } = insertEmojiAtCursor(
      content,
      emoji,
      input.selectionStart,
      input.selectionEnd
    );
    setContent(newText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      await onAddComment(content.trim());
      setContent("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-create-form">
      {error && <p className="comments-error">{error}</p>}
      <div className="comment-input-row">
        <EmojiPicker onSelect={handleEmojiSelect} placement="top-left" />
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={handleContentChange}
          placeholder="write a comment..."
          disabled={loading}
          className="comment-input"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="comment-submit-btn"
        >
          {loading ? "posting..." : "comment"}
        </button>
      </div>
    </form>
  );
};

export default CreateComment;
