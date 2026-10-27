
/**
 * JavaScript Worker — Validation and Communication
 *
 * This worker checks the submitted input and sends a response.
 * It does NOT execute arbitrary JavaScript code.
 */

self.onmessage = (event) => {
  try {
    const message = event.data;
    const code = message?.code;

    // 1. Validate the incoming message
    if (typeof code !== "string" || !code.trim()) {
      self.postMessage({
        success: false,
        error: "Please provide valid, non-empty JavaScript code.",
      });
      return;
    }

    // 2. Set a reasonable input-size limit
    const MAX_CODE_LENGTH = 50000;

    if (code.length > MAX_CODE_LENGTH) {
      self.postMessage({
        success: false,
        error: "Code is too large. Maximum allowed size is 50,000 characters.",
      });
      return;
    }

    // 3. Check for APIs not supported by this initial runner
    const blockedPatterns = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\b/,
      /\bimportScripts\s*\(/,
      /\bglobalThis\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /\bimport\s*\(/,
    ];

    const blockedPattern = blockedPatterns.find((pattern) =>
      pattern.test(code)
    );

    if (blockedPattern) {
      self.postMessage({
        success: false,
        error:
          "This code uses an API that is not supported by the initial runner.",
      });
      return;
    }

    // 4. Confirm that the worker received the code
    self.postMessage({
      success: true,
      status: "validated",
      message: "Worker communication successful.",
      codeLength: code.length,
      output:
        "Input received successfully. JavaScript execution is not enabled yet.",
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error?.message || "An unexpected worker error occurred.",
    });
  }
};
