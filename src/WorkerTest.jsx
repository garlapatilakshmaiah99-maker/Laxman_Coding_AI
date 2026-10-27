import { useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { runJavaScript } from "./services/codeRunner.js";

export default function WorkerTest() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function testWorker() {
    setLoading(true);
    setResult(null);

    try {
      const response = await runJavaScript("console.log(1 + 1)");
      setResult(response);
    } catch (error) {
      setResult({
        success: false,
        error: error?.message || "Worker test failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <button
          type="button"
          onClick={() => {
            window.location.href = window.location.pathname;
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={16} />
          Back to Laxman Coding AI
        </button>

        <h1>Worker Communication Test</h1>

        <p style={styles.description}>
          This page tests worker communication and input validation.
          It does not execute arbitrary JavaScript.
        </p>

        <button
          type="button"
          onClick={testWorker}
          disabled={loading}
          style={styles.testButton}
        >
          {loading ? (
            <LoaderCircle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {loading ? "Testing worker..." : "Test Worker"}
        </button>

        {result && (
          <section style={styles.result}>
            <h2>
              {result.success ? (
                <CheckCircle2 size={19} />
              ) : (
                <XCircle size={19} />
              )}
              {result.success ? "Test passed" : "Test response"}
            </h2>

            <pre style={styles.output}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px",
    background: "#0b1020",
    color: "#e5e7eb",
    fontFamily: "system-ui, sans-serif",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 15px",
    border: "1px solid #374151",
    borderRadius: 8,
    background: "#1f2937",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  description: {
    color: "#a5b4fc",
    lineHeight: 1.7,
  },
  testButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: "11px 15px",
    border: 0,
    borderRadius: 8,
    background: "#4f46e5",
    color: "#ffffff",
    cursor: "pointer",
  },
  result: {
    marginTop: 24,
    padding: 20,
    border: "1px solid #374151",
    borderRadius: 12,
    background: "#111827",
  },
  output: {
    marginTop: 16,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    color: "#d1d5db",
    fontSize: 13,
    lineHeight: 1.7,
  },
};
