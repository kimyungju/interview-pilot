"use client";

import { AlertTriangle } from "lucide-react";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ marginBottom: "24px" }}>
              <AlertTriangle style={{ width: 48, height: 48, color: "#dc2626" }} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
              Application Error
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "24px" }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{ padding: "8px 20px", borderRadius: "8px", background: "#18181b", color: "#fff", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{ padding: "8px 20px", borderRadius: "8px", background: "transparent", color: "#18181b", border: "1px solid #e5e7eb", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
