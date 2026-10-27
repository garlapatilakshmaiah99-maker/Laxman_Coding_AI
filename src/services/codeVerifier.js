
import { analyzeJavaScript } from "./javascriptAnalyzer.js";

/**
 * Performs static JavaScript checks without executing code.
 */
export function verifyJavaScriptCode(code) {
  if (typeof code !== "string" || !code.trim()) {
    return {
      success: false,
      valid: false,
      errors: [
        {
          type: "input",
          message: "Please enter JavaScript code to verify.",
        },
      ],
      warnings: [],
    };
  }

  const errors = [];
  const warnings = [];

  // Check JavaScript syntax.
  const analysis = analyzeJavaScript(code);

  if (!analysis.valid) {
    errors.push({
      type: "syntax",
      message: analysis.error || "Invalid JavaScript syntax.",
      line: analysis.line,
      column: analysis.column,
    });
  }

  // Check for common coding issues.
  const checks = [
    {
      pattern: /(^|[^=!])==(?!=)/,
      message: "Consider using === instead of == for strict equality.",
    },
    {
      pattern: /\bdebugger\s*;?/,
      message: "Remove debugger statements before production.",
    },
    {
      pattern: /\bconsole\.log\s*\(/,
      message: "Review console.log statements before production.",
    },
  ];

  for (const check of checks) {
    if (check.pattern.test(code)) {
      warnings.push({
        type: "style",
        message: check.message,
      });
    }
  }

  // Warn about dynamic code execution.
  if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(code)) {
    warnings.push({
      type: "security",
      message: "Dynamic code execution detected. Review this code carefully.",
    });
  }

  return {
    success: errors.length === 0,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Backward-compatible alias for existing imports.
 */
export function verifyCode(code) {
  return verifyJavaScriptCode(code);
}
