
import { analyzeJavaScript } from "./javascriptAnalyzer.js";

const tests = [
  {
    name: "Valid JavaScript",
    code: "function add(a, b) { return a + b; }",
  },
  {
    name: "Invalid JavaScript",
    code: "function add(a, b) { return a + ; }",
  },
];

for (const test of tests) {
  console.log(test.name, analyzeJavaScript(test.code));
}
