import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoModalStore } from "../store/demoModalStore";
import { useAuthStore } from "../store/authStore";
import { removeToken } from "../services/token.service";

export const DemoRestrictedModal: React.FC = () => {
  const { isOpen, actionName, closeDemoModal } = useDemoModalStore();
  const clearUser = useAuthStore((state) => state.clearUser);
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDemoModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDemoModal]);

  if (!isOpen) return null;

  const handleCreateAccount = () => {
    removeToken();
    clearUser();
    closeDemoModal();
    navigate("/signup");
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeDemoModal();
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="settings-modal-card"
        style={{ maxWidth: "420px", overflow: "hidden" }}
      >
        {/* Header matching Sotrix settings-modal-header */}
        <div className="settings-modal-header">
          <h3 className="settings-modal-title">
            <span style={{ color: "var(--accent-matrix)" }}>✦</span> demo account
          </h3>
          <button
            type="button"
            className="settings-close-btn"
            onClick={closeDemoModal}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body matching Sotrix settings-modal-body */}
        <div
          className="settings-modal-body"
          style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
            You are browsing as a <strong>view-only demo user</strong>.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Interactions like {actionName} require your own ID. Create a free account in seconds to post, like, comment, and message!
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="demo-signup-btn"
              onClick={handleCreateAccount}
            >
              create an account →
            </button>
            <button
              type="button"
              className="demo-cancel-btn"
              onClick={closeDemoModal}
            >
              continue exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoRestrictedModal;
