import Editor, { loader, type OnChange } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "monaco-editor/languages/definitions/cpp/register.js";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import type { Language } from "./api";

const monacoEnvironment = self as typeof self & {
  MonacoEnvironment?: { getWorker: () => Worker };
};
monacoEnvironment.MonacoEnvironment = { getWorker: () => new editorWorker() };
loader.config({ monaco });

const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  lineNumbers: "off" as const,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlight: "none" as const,
  renderWhitespace: "none" as const,
  guides: { indentation: false, highlightActiveIndentation: false, bracketPairs: false },
  rulers: [],
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  cursorStyle: "line" as const,
  cursorBlinking: "solid" as const,
  cursorWidth: 1,
  selectionHighlight: false,
  occurrencesHighlight: "off" as const,
  matchBrackets: "never" as const,
  contextmenu: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  wordBasedSuggestions: "off" as const,
  parameterHints: { enabled: false },
  inlineSuggest: { enabled: false },
  hover: { enabled: "off" as const },
  codeLens: false,
  links: false,
  colorDecorators: false,
  renderValidationDecorations: "off" as const,
  stickyScroll: { enabled: false },
  editContext: false,
  smoothScrolling: false,
  fontFamily: "'DM Mono', monospace",
  fontSize: 14,
  lineHeight: 23,
  padding: { top: 24, bottom: 24 },
  scrollBeyondLastLine: false,
  scrollbar: { vertical: "hidden" as const, horizontal: "hidden" as const, alwaysConsumeMouseWheel: false },
};

export default function BlindMonaco({
  language,
  value,
  onChange,
}: {
  language: Language;
  value: string;
  onChange: (value: string) => void;
}) {
  const handleChange: OnChange = (nextValue) => onChange(nextValue ?? "");

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={handleChange}
      theme="blind-black"
      beforeMount={(instance) => {
        instance.editor.defineTheme("blind-black", {
          base: "vs-dark",
          inherit: false,
          rules: [{ token: "", foreground: "000000", background: "000000" }],
          colors: {
            "editor.background": "#000000",
            "editor.foreground": "#000000",
            "editorLineNumber.foreground": "#000000",
            "editorLineNumber.activeForeground": "#000000",
            "editorCursor.foreground": "#000000",
            "editor.selectionBackground": "#000000",
            "editor.inactiveSelectionBackground": "#000000",
            "editor.lineHighlightBackground": "#000000",
            "editor.lineHighlightBorder": "#000000",
            "editorWhitespace.foreground": "#000000",
            "editorIndentGuide.background": "#000000",
            "editorIndentGuide.activeBackground": "#000000",
            "editorGutter.background": "#000000",
            "editorWidget.background": "#000000",
            "editorSuggestWidget.background": "#000000",
          },
        });
      }}
      options={editorOptions}
    />
  );
}
