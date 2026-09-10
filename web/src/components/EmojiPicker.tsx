import React, { useState, useRef, useEffect, useMemo } from "react";
import { EMOJI_CATEGORIES, EMOJI_LIST, type EmojiItem } from "../utils/emoji";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  buttonClassName?: string;
  buttonTitle?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onSelect,
  placement = "top-left",
  buttonClassName = "",
  buttonTitle = "Insert emoji",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<EmojiItem["category"]>("smileys");
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    // Auto-focus search input when opened
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Filtered emoji list
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return EMOJI_LIST.filter((e) => e.category === activeCategory);
    }
    return EMOJI_LIST.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery, activeCategory]);

  const handleSelectEmoji = (emojiChar: string) => {
    onSelect(emojiChar);
    // Keep popover open for quick multiple emoji picking, or close on escape/click outside
  };

  return (
    <div className="emoji-picker-container" ref={containerRef}>
      <button
        type="button"
        className={`emoji-trigger-btn ${isOpen ? "active" : ""} ${buttonClassName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <span className="emoji-trigger-icon">😊</span>
      </button>

      {isOpen && (
        <div className={`emoji-popover emoji-popover-${placement}`}>
          {/* Header & Search */}
          <div className="emoji-popover-header">
            <div className="emoji-search-wrap">
              <span className="emoji-search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emojis..."
                className="emoji-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="emoji-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs (hidden during active search) */}
          {!searchQuery && (
            <div className="emoji-category-tabs">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`emoji-category-tab ${
                    activeCategory === cat.id ? "active" : ""
                  }`}
                  title={cat.label}
                >
                  <span className="emoji-cat-icon">{cat.icon}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <div className="emoji-grid-container">
            {filteredEmojis.length > 0 ? (
              <div className="emoji-grid">
                {filteredEmojis.map((e) => (
                  <button
                    key={`${e.name}-${e.char}`}
                    type="button"
                    className="emoji-grid-item"
                    onClick={() => handleSelectEmoji(e.char)}
                    title={`:${e.name}:`}
                  >
                    {e.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="emoji-empty-search">
                <span>no matching emojis</span>
              </div>
            )}
          </div>

          {/* Footer Quick Hint */}
          <div className="emoji-popover-footer">
            <span className="emoji-hint-text">
              Tip: type <code>:)</code>, <code>&lt;3</code> or <code>:fire:</code> directly!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;
