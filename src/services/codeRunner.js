/**
 * Communicates with the JavaScript Web Worker.
 *
 * Important:
 * This currently tests worker communication only.
 * It does not execute submitted JavaScript.
 * A Web Worker is not, by itself, a secure sandbox.
 */

const WORKER_TIMEOUT_MS = 10000;

export function runJavaScript(code) {
  return new Promise((resolve) => {
    if (typeof code !== "string" || !code.trim()) {
      resolve({
        success: false,
        error: "Please provide JavaScript code.",
      });
      return;
    }

    let worker;
    let settled = false;
    let timeoutId;

    const finish = (result) => {
      if (settled) return;

      settled = true;
      clearTimeout(timeoutId);

      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
      }

      resolve(result);
    };

    try {
      worker = new Worker(
        new URL("./codeRunner.worker.js", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (event) => {
        finish(event.data);
      };

      worker.onerror = (event) => {
        event.preventDefault();

        finish({
          success: false,
          error: event.message || "The worker encountered an error.",
        });
      };

      worker.onmessageerror = () => {
        finish({
          success: false,
          error: "Could not read the response from the worker.",
        });
      };

      timeoutId = setTimeout(() => {
        finish({
          success: false,
          error: "The worker timed out after 10 seconds.",
        });
      }, WORKER_TIMEOUT_MS);

      worker.postMessage({ code });
    } catch (error) {
      finish({
        success: false,
        error: error?.message || "Unable to start the code runner.",
      });
    }
  });
}