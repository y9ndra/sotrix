import React, { useEffect } from "react";
import { useLoadingStore } from "../store/loadingStore";
import RubiksLoader from "./RubiksLoader";

export const GlobalLoader: React.FC = () => {
  const isLoading = useLoadingStore((state) => state.isLoading);
  const message = useLoadingStore((state) => state.message);
  const hide = useLoadingStore((state) => state.hide);

  useEffect(() => {
    if (!isLoading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, hide]);

  if (!isLoading) return null;

  return (
    <div onClick={() => hide()} style={{ cursor: "pointer" }} title="Click or press ESC to close loader">
      <RubiksLoader fullscreen text={message || "LOADING..."} size="md" />
    </div>
  );
};

export default GlobalLoader;
