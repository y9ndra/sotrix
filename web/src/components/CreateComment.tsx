import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "./EmojiPicker";
import { convertEmojiShortcodes, insertEmojiAtCursor } from "../utils/emoji";
import { useAuthStore } from "../store/authStore";
import { isDemoUser } from "../utils/demo";
import { useDemoModalStore } from "../store/demoModalStore";

interface CreateCommentProps {
  onAddComment: (content: string) => Promise<void>;
}

const CreateComment = ({ onAddComment }: CreateCommentProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const isDemo = isDemoUser(currentUser);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  // Auto-resize comment textarea from 36px up to 120px
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const computedHeight = Math.min(Math.max(textarea.scrollHeight, 36), 120);
    textarea.style.height = `${computedHeight}px`;
  }, [content]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDemo) {
      useDemoModalStore.getState().openDemoModal("commenting");
      return;
    }
    if (!content.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      await onAddComment(content.trim());
      setContent("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: Allow natural newline in textarea
        return;
      }

      // Check if on touch-only mobile screen
      const isTouchOnly =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;

      if (isTouchOnly) {
        // On touch-only mobile screens, soft keyboard Return key inserts newline,
        // and user can tap the dedicated comment submit button.
        return;
      }

      // Desktop: Enter submits the comment
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-create-form">
      {error && <p className="comments-error">{error}</p>}
      <div className="comment-input-row">
        <EmojiPicker onSelect={handleEmojiSelect} placement="top-left" />
        <textarea
          ref={inputRef}
          rows={1}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="write a comment..."
          disabled={loading}
          className="comment-input"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="comment-submit-btn"
          title={loading ? "Posting..." : "Comment (Enter)"}
          aria-label={loading ? "Posting comment" : "Submit comment"}
        >
          <span className="comment-submit-text">
            {loading ? "posting..." : "comment"}
          </span>
        </button>
      </div>
    </form>
  );
};

export default CreateComment;
