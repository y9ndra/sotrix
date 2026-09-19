import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-matrix, #0a0a0c)",
            color: "var(--text-primary, #ffffff)",
            padding: "24px",
            fontFamily: "var(--font-mono, monospace)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              padding: "32px",
              borderRadius: "12px",
              backgroundColor: "var(--bg-card, #111116)",
              border: "1px solid var(--border-default, #22222a)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span style={{ fontSize: "32px" }}>⚠️</span>
            <h2 style={{ fontSize: "18px", margin: 0, textTransform: "lowercase" }}>
              system anomaly detected
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary, #888)", margin: 0 }}>
              {this.state.error?.message || "An unexpected error occurred in the neural deck."}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                marginTop: "8px",
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid var(--border-active, #00ff88)",
                backgroundColor: "var(--bg-hover, #1a1a24)",
                color: "var(--text-primary, #ffffff)",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "12px",
                cursor: "pointer",
                textTransform: "lowercase",
              }}
            >
              reload interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
