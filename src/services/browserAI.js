
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { verifyJavaScriptCode } from "./codeVerifier.js";
import { analyzeJavaScript } from "./javascriptAnalyzer.js";

let engine = null;
let loadingPromise = null;

const MODEL = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC";

const GENERATION_CONFIG = {
  temperature: 0.1,
  max_tokens: 256,
};

const SYSTEM_PROMPT = `
You are Laxman Coding AI, a practical programming assistant
and coding mentor.

CORE RULES:
- Answer only what the user asks.
- If the user asks one question, answer only that question.
- If the user asks multiple questions, answer each one.
- Never invent additional questions or tasks.
- Do not repeat explanations, examples, or code.
- Keep simple answers short and complete.
- Use simple English.
- Never claim code was executed unless it actually was.

CODE GENERATION:
- Provide complete code when requested.
- Include necessary imports and example usage.
- Close all brackets, braces, parentheses, and code fences.
- Include expected output when requested.
- Prefer simple, readable, modern JavaScript.
- Avoid unnecessary complexity.
- Finish the requested task before adding optional details.

DEBUGGING:
- Identify the likely cause from the supplied code and error.
- Explain why the issue occurs.
- Provide the smallest appropriate fix.
- Distinguish syntax errors, runtime errors, and logic errors.
- Static analysis does not prove that code works.

RESPONSE FORMAT:
- Answer the user's request directly.
- Use headings only when helpful.
- Do not add unrelated questions or sections.
- Do not repeat the same example.
- Keep the answer concise but complete.
`;


// --------------------------------------------------
// LOAD BROWSER AI MODEL
// --------------------------------------------------

export async function loadBrowserAI(onProgress) {
  if (engine) {
    console.info("[Browser AI] Model already loaded.");
    return engine;
  }

  if (!loadingPromise) {
    const loadStartTime = performance.now();

    console.info(`[Browser AI] Loading model: ${MODEL}`);

    loadingPromise = CreateMLCEngine(MODEL, {
      initProgressCallback: (progress) => {
        onProgress?.(progress);
      },
    })
      .then((loadedEngine) => {
        engine = loadedEngine;

        const loadSeconds = (
          (performance.now() - loadStartTime) /
          1000
        ).toFixed(2);

        console.info(
          `[Browser AI] Model loading completed in ${loadSeconds}s`
        );

        return loadedEngine;
      })
      .catch((error) => {
        loadingPromise = null;

        console.error(
          "[Browser AI] Model loading failed:",
          error
        );

        throw error;
      });
  } else {
    console.info(
      "[Browser AI] Model loading is already in progress."
    );
  }

  return loadingPromise;
}


// --------------------------------------------------
// EXTRACT JAVASCRIPT CODE BLOCKS
// --------------------------------------------------

function extractJavaScriptCode(text) {
  if (typeof text !== "string") {
    return [];
  }

  const codeBlocks = [
    ...text.matchAll(
      /```(?:javascript|js|jsx|mjs|cjs)\s*\n([\s\S]*?)```/gi
    ),
  ];

  return codeBlocks
    .map((match) => match[1].trim())
    .filter(Boolean);
}


// --------------------------------------------------
// CHECK JAVASCRIPT SYNTAX
// --------------------------------------------------

function checkJavaScriptSyntax(text) {
  const blocks = extractJavaScriptCode(text);

  if (blocks.length === 0) {
    return [];
  }

  return blocks.map((code, index) => ({
    block: index + 1,
    ...analyzeJavaScript(code),
  }));
}


// --------------------------------------------------
// BUILD MODEL CONVERSATION
// --------------------------------------------------

function buildConversation(messages) {
  return [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    ...messages.filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant"
    ),
  ];
}


// --------------------------------------------------
// VERIFY AND FINALIZE THE GENERATED ANSWER
// --------------------------------------------------

function finalizeAnswer(answer, messages) {
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error(
      "The model returned an empty response. Please try again."
    );
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const userContent = latestUserMessage?.content ?? "";
  const userCodeBlocks = extractJavaScriptCode(userContent);

  const verification =
    userCodeBlocks.length > 0
      ? verifyJavaScriptCode(userCodeBlocks.join("\n\n"))
      : null;

  let finalAnswer = answer.trim();

  // Check JavaScript code blocks in the generated response.
  const syntaxChecks = checkJavaScriptSyntax(finalAnswer);

  const syntaxErrors = syntaxChecks.filter(
    (check) => !check.valid
  );

  if (syntaxErrors.length > 0) {
    const errorDetails = syntaxErrors
      .map(
        (check) =>
          `- Code block ${check.block}: ${check.error}` +
          (check.line ? ` (line ${check.line})` : "")
      )
      .join("\n");

    finalAnswer +=
      "\n\n### JavaScript Syntax Check\n" +
      "The following code block(s) contain syntax errors:\n" +
      errorDetails +
      "\n\nThis check verifies syntax only, not program logic or output.";
  }

  // Include warnings from independent static checks.
  if (verification?.warnings?.length > 0) {
    const warnings = verification.warnings
      .map((warning) => `- ${warning.message}`)
      .join("\n");

    finalAnswer +=
      "\n\n### Independent Code Checks\n" +
      warnings +
      "\n\nThese are static checks, not proof that the code was executed.";
  }

  // Include verification errors, if any.
  if (verification?.errors?.length > 0) {
    const errors = verification.errors
      .map((error) => `- ${error.message}`)
      .join("\n");

    finalAnswer +=
      "\n\n### Input Code Verification\n" +
      errors +
      "\n\nThese checks analyze the submitted code without executing it.";
  }

  return finalAnswer;
}


// --------------------------------------------------
// NON-STREAMING RESPONSE
// --------------------------------------------------

export async function sendBrowserMessage(messages) {
  if (!engine) {
    throw new Error(
      "The browser AI model is not loaded. Load the model and try again."
    );
  }

  const generationStartTime = performance.now();

  console.info("[Browser AI] Generating response...");

  try {
    const response = await engine.chat.completions.create({
      messages: buildConversation(messages),
      ...GENERATION_CONFIG,
    });

    const answer = response.choices?.[0]?.message?.content;

    return finalizeAnswer(answer, messages);
  } catch (error) {
    console.error(
      "[Browser AI] Response generation failed:",
      error
    );

    throw error;
  } finally {
    const generationSeconds = (
      (performance.now() - generationStartTime) /
      1000
    ).toFixed(2);

    console.info(
      `[Browser AI] Response generation finished in ${generationSeconds}s`
    );
  }
}


// --------------------------------------------------
// STREAMING RESPONSE
// --------------------------------------------------

export async function sendBrowserMessageStream(
  messages,
  onChunk
) {
  if (!engine) {
    throw new Error(
      "The browser AI model is not loaded. Load the model and try again."
    );
  }

  if (typeof onChunk !== "function") {
    throw new Error(
      "A streaming onChunk callback is required."
    );
  }

  const generationStartTime = performance.now();
  let answer = "";

  console.info("[Browser AI] Starting streamed response...");

  try {
    const stream = await engine.chat.completions.create({
      messages: buildConversation(messages),
      ...GENERATION_CONFIG,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;

      if (
        typeof content === "string" &&
        content.length > 0
      ) {
        answer += content;
        onChunk(content);
      }
    }

    // Apply verification after the model finishes generating.
    return finalizeAnswer(answer, messages);
  } catch (error) {
    console.error(
      "[Browser AI] Streamed response failed:",
      error
    );

    throw error;
  } finally {
    const generationSeconds = (
      (performance.now() - generationStartTime) /
      1000
    ).toFixed(2);

    console.info(
      `[Browser AI] Streamed response finished in ${generationSeconds}s`
    );
  }
}
