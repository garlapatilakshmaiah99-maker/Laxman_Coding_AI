
import { parse } from "acorn";

/**
 * Analyzes JavaScript syntax without executing submitted code.
 */
export function analyzeJavaScript(code) {
  if (typeof code !== "string" || !code.trim()) {
    return {
      valid: false,
      error: "Please provide JavaScript code to analyze.",
      line: null,
      column: null,
    };
  }

  try {
    parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    });

    return {
      valid: true,
      error: null,
      message: "JavaScript syntax is valid.",
      line: null,
      column: null,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      line: error.loc?.line ?? null,
      column: error.loc?.column ?? null,
    };
  }
}

/**
 * Compatibility alias for files that use parseJavaScript().
 */
export function parseJavaScript(code) {
  return analyzeJavaScript(code);
}
