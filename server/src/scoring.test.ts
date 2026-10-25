import assert from "node:assert/strict";
import test from "node:test";
import { canCompare, similarityPercent, SimilarityLimitError, tokenize } from "./scoring.js";

test("identical code has a full-precision score of 100", () => {
  const source = "#include <iostream>\nint main() { return 0; }";
  assert.equal(similarityPercent(source, source, "cpp"), 100);
});

test("comments are ignored without dropping C++ preprocessor tokens", () => {
  const withComment = "#include <iostream>\nint main() { return 0; } // original";
  const withoutComment = "#include <iostream>\nint main() { return 0; }";
  assert.equal(similarityPercent(withComment, withoutComment, "cpp"), 100);
  assert.ok(tokenize(withoutComment, "cpp").some((token) => token.startsWith("#include")));
});

test("Python comments are ignored while hashes inside string literals remain tokens", () => {
  const withComment = 'print("# keep this") # comment';
  const withoutComment = 'print("# keep this")';
  assert.deepEqual(tokenize(withComment, "python"), tokenize(withoutComment, "python"));
  assert.equal(similarityPercent(withComment, withoutComment, "python"), 100);
});

test("insertions reduce the score without rounding away precision", () => {
  const score = similarityPercent("a b", "a b c", "python");
  assert.ok(score > 66.6 && score < 66.7);
});

test("oversized comparisons are rejected before edit-distance work", () => {
  const source = "x ".repeat(5001);
  assert.equal(canCompare(source, source, "python"), false);
  assert.throws(() => similarityPercent(source, source, "python"), SimilarityLimitError);
});
