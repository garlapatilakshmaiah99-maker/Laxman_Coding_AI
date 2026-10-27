
import { runJavaScript } from "./codeRunner.js";

/**
 * Tests worker communication and input validation.
 * These tests do not execute arbitrary JavaScript.
 */
export async function testCodeRunner() {
  const testCases = [
    {
      name: "Valid input",
      code: "console.log(1 + 1)",
      expectedSuccess: true,
    },
    {
      name: "Empty input",
      code: "",
      expectedSuccess: false,
    },
    {
      name: "Whitespace-only input",
      code: "   ",
      expectedSuccess: false,
    },
    {
      name: "Unsupported fetch API",
      code: "fetch('https://example.com')",
      expectedSuccess: false,
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      const response = await runJavaScript(testCase.code);

      results.push({
        name: testCase.name,
        passed: response.success === testCase.expectedSuccess,
        expected: testCase.expectedSuccess,
        actual: response.success,
        message: response.message || response.error || "",
      });
    } catch (error) {
      results.push({
        name: testCase.name,
        passed: false,
        expected: testCase.expectedSuccess,
        actual: false,
        message: error?.message || "Unexpected test error.",
      });
    }
  }

  return {
    total: results.length,
    passed: results.filter((test) => test.passed).length,
    failed: results.filter((test) => !test.passed).length,
    results,
  };
}
