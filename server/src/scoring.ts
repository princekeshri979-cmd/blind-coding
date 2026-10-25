const maxComparisonCells = 25_000_000;
const tokenPattern =
  /(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|#[^\r\n]*|(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[fFlLuU]*)|(?:[A-Za-z_$][\w$]*)|(?:===|!==|>>=|<<=|->|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|<<|>>|\*\*|::|=>)|[^\s]/g;

export class SimilarityLimitError extends Error {
  constructor() {
    super("The code is too large to compare safely. Reduce the number of tokens and try again.");
    this.name = "SimilarityLimitError";
  }
}

export function tokenize(code: string, language: string): string[] {
  const tokens: string[] = [];
  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0];
    if (token.startsWith("/*") || token.startsWith("//") || (language === "python" && token.startsWith("#"))) {
      continue;
    }
    tokens.push(token);
  }
  return tokens;
}

export function canCompare(submission: string, reference: string, language: string): boolean {
  return tokenize(submission, language).length * tokenize(reference, language).length <= maxComparisonCells;
}

export function similarityPercent(submission: string, reference: string, language: string): number {
  const left = tokenize(submission, language);
  const right = tokenize(reference, language);
  if (left.length === 0) return 0;
  if (left.length * right.length > maxComparisonCells) throw new SimilarityLimitError();

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  const distance = previous[right.length];
  return Math.max(0, (1 - distance / Math.max(left.length, right.length, 1)) * 100);
}
