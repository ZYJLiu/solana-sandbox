"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import Editor, { Monaco } from "@monaco-editor/react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
  ImperativePanelHandle,
} from "react-resizable-panels";
import { SnippetsDrawer, CodeSnippet, useCodeSnippets } from "./SnippetsDrawer";

interface CompileResponse {
  success: boolean;
  output: string;
  error: string | null;
}

const IP_ADDRESS = "98.82.36.212";
const SERVER_URL = `http://${IP_ADDRESS}:3000`;

// Language code examples
const EXAMPLE_CODE = `fn main() {
    println!("Hello, world!");
}`;

const TS_EXAMPLE_CODE = `console.log("Hello, World!");`;

// Panel resize handle component
function ResizeHandle({
  className = "",
  isVertical = false,
}: {
  className?: string;
  isVertical?: boolean;
}) {
  return (
    <PanelResizeHandle
      className={`group relative z-10
        ${
          isVertical
            ? "h-2 my-1 hover:bg-primary/10 active:bg-primary/30 cursor-row-resize"
            : "w-2 mx-1 hover:bg-primary/10 active:bg-primary/30 cursor-col-resize"
        } 
        ${className}`}
    >
      <div
        className={`absolute bg-muted-foreground/20 rounded group-hover:bg-primary/40 group-active:bg-primary/60
          ${
            isVertical
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1 w-16"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-12"
          }`}
      />
    </PanelResizeHandle>
  );
}

export default function RustEditor() {
  const [rustCode, setRustCode] = useState(EXAMPLE_CODE);
  const [tsCode, setTsCode] = useState(TS_EXAMPLE_CODE);
  const [code, setCode] = useState(EXAMPLE_CODE); // Used for current displayed code
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [editorHeight, setEditorHeight] = useState("85vh");
  const [language, setLanguage] = useState<"rust" | "typescript">("rust");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [selectedSnippetId, setSelectedSnippetId] =
    useState<string>("hello-world"); // Track selected snippet

  // Get snippets from our hook
  const { snippets } = useCodeSnippets();

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const firstPanelRef = useRef<ImperativePanelHandle>(null);
  const secondPanelRef = useRef<ImperativePanelHandle>(null);

  // Editor reference to manually trigger layout updates
  const codeEditorRef = useRef<any>(null);
  const outputEditorRef = useRef<any>(null);

  // Handle code snippet selection from the drawer
  const handleSnippetSelect = (selectedCode: string, snippetId: string) => {
    if (language === "rust") {
      setRustCode(selectedCode);
    } else {
      setTsCode(selectedCode);
    }
    setCode(selectedCode);
    setSelectedSnippetId(snippetId);
  };

  // Effect to handle screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      const isSmall = window.innerWidth < 1280; // xl breakpoint in Tailwind
      setIsSmallScreen(isSmall);
    };

    // Initial check
    checkScreenSize();

    // Add listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Effect to calculate and set editor height based on available space
  useEffect(() => {
    const calculateEditorHeight = () => {
      if (containerRef.current) {
        const windowHeight = window.innerHeight;

        // Dynamically get header and footer heights
        const header = document.querySelector("header");
        const footer = document.querySelector("footer");
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const footerHeight = footer ? footer.getBoundingClientRect().height : 0;

        // Get card header/footer heights if they exist
        const cardHeaders = document.querySelectorAll(".card-header");
        const cardFooters = document.querySelectorAll(".card-footer");
        const cardHeaderHeight =
          cardHeaders.length > 0
            ? cardHeaders[0].getBoundingClientRect().height
            : 32;
        const cardFooterHeight =
          cardFooters.length > 0
            ? cardFooters[0].getBoundingClientRect().height
            : 40;

        // Account for card padding and safety margin
        const containerPadding = 16; // p-2 = 0.5rem * 4 = 8px * 2 sides
        const safetyMargin = isSmallScreen ? 80 : 5; // Further reduced safety margins

        // Calculate total space used by non-editor elements
        const usedSpace =
          headerHeight +
          footerHeight +
          cardHeaderHeight +
          cardFooterHeight +
          containerPadding +
          safetyMargin;

        // Calculate available height
        const availableHeight = windowHeight - usedSpace;

        // For vertical layout, we need plenty of height for the whole container
        if (isSmallScreen) {
          // Update container height for vertical layout, but don't set editor height
          if (containerRef.current) {
            containerRef.current.style.minHeight = `${Math.max(
              windowHeight * 0.9, // Increased from 0.85 to 0.92 for mobile
              500 // Reduced from 800 to 500 for mobile screens
            )}px`;
          }
        } else {
          // For horizontal layout, use calculated height for editor
          // Instead of just using availableHeight, use a percentage of window height
          const preferredHeight = windowHeight * 0.85; // Increased from 0.75 to 0.85
          setEditorHeight(`${Math.max(preferredHeight, 500)}px`);

          // Reset container height in horizontal layout
          if (containerRef.current) {
            containerRef.current.style.minHeight = "";
          }
        }
      }
    };

    // Define the load event handler
    const handleLoad = () => {
      setTimeout(calculateEditorHeight, 300);
    };

    // Calculate after a small delay to ensure DOM is fully rendered
    const initialTimer = setTimeout(() => {
      calculateEditorHeight();

      // Run a second calculation after a slight delay to ensure accuracy
      setTimeout(() => {
        calculateEditorHeight();
      }, 300);
    }, 100);

    // Also calculate when window finishes loading
    window.addEventListener("load", handleLoad);

    // Add resize listener
    window.addEventListener("resize", calculateEditorHeight);

    // Clean up
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("resize", calculateEditorHeight);
      window.removeEventListener("load", handleLoad);
    };
  }, [isSmallScreen]);

  // Add resize observer to update editors when panels change size
  useEffect(() => {
    // Setup resize observers for panel content
    const resizeObserver = new ResizeObserver(() => {
      // Trigger a resize event to force Monaco editor to update its layout
      window.dispatchEvent(new Event("resize"));
    });

    // Observe the CardContent elements which contain the editors
    const editorContainers = document.querySelectorAll(".editor-container");

    editorContainers.forEach((container) => {
      resizeObserver.observe(container);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Define themes for success and error output
  const beforeMount = (monaco: Monaco) => {
    // Disable TypeScript validation
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false, // Keep syntax validation for basic errors
    });

    // Also disable JavaScript validation to prevent TypeScript annotation errors
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    // Allow TypeScript syntax in JavaScript files
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: false,
      allowNonTsExtensions: true,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
    });

    // Add extra configuration to handle TypeScript in JavaScript mode
    monaco.languages.typescript.typescriptDefaults.setModeConfiguration({
      completionItems: true,
      hovers: true,
      documentSymbols: true,
      references: true,
      diagnostics: false, // Disable additional diagnostics
      documentHighlights: true,
      definitions: true,
      codeActions: false,
    });

    // Configure TypeScript compiler options to be more permissive
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      allowSyntheticDefaultImports: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
      noImplicitAny: false,
      strictNullChecks: false,
      noEmit: true,
      lib: ["es2020", "dom"],
      esModuleInterop: true,
      skipLibCheck: true,
      experimentalDecorators: true,
      strict: false,
      noImplicitThis: false,
      noImplicitReturns: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: false,
      strictFunctionTypes: false,
      strictPropertyInitialization: false,
      alwaysStrict: false,
      checkJs: false,
    });

    // Add type definitions for @solana packages
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module '@solana/*' {
        const content: any;
        export = content;
        export default content;
      }
      
      declare module '@project-serum/*' {
        const content: any;
        export = content;
        export default content;
      }
      
      declare module '@metaplex/*' {
        const content: any;
        export = content;
        export default content;
      }
      `,
      "solana-types.d.ts"
    );

    // Create a simple rust-output language for highlighting
    monaco.languages.register({ id: "rust-output" });
    monaco.languages.setMonarchTokensProvider("rust-output", {
      tokenizer: {
        root: [
          [/error:.*/, "error"],
          [/warning:.*/, "warning"],
          [/   Compiling.*/, "compile-info"],
          [/    Finished.*/, "success-info"],
          [/    Running.*/, "running-info"],
          [/^\s*\d+\s*\|.*/, "code-line"],
          [/^\s*\|.*/, "code-context"],
          [/^\s*\^.*/, "error-pointer"],
        ],
      },
    });

    monaco.editor.defineTheme("success-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "text", foreground: "FFFFFF" },
        { token: "error", foreground: "FF6666", fontStyle: "bold" },
        { token: "warning", foreground: "FFCC00", fontStyle: "bold" },
        { token: "compile-info", foreground: "88AAFF" },
        { token: "success-info", foreground: "88FF88" },
        { token: "running-info", foreground: "88CCFF" },
        { token: "code-line", foreground: "AAAAAA" },
        { token: "code-context", foreground: "888888" },
        { token: "error-pointer", foreground: "FF6666", fontStyle: "bold" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
      },
    });

    monaco.editor.defineTheme("error-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "text", foreground: "FFA07A" },
        { token: "error", foreground: "FF6666", fontStyle: "bold" },
        { token: "warning", foreground: "FFCC00", fontStyle: "bold" },
        { token: "compile-info", foreground: "88AAFF" },
        { token: "success-info", foreground: "88FF88" },
        { token: "running-info", foreground: "88CCFF" },
        { token: "code-line", foreground: "FFFFFF" },
        { token: "code-context", foreground: "AAAAAA" },
        { token: "error-pointer", foreground: "FF6666", fontStyle: "bold" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
      },
    });
  };

  // Handle language change
  const handleLanguageChange = (value: string) => {
    if (value === "typescript" || value === "rust") {
      // Save current code to appropriate language state
      if (language === "rust" && value === "typescript") {
        setRustCode(code);
        setCode(tsCode);
      } else if (language === "typescript" && value === "rust") {
        setTsCode(code);
        setCode(rustCode);
      }

      setLanguage(value as "typescript" | "rust");
    }

    // Clear output when changing languages
    setOutput("");
    setIsError(false);
  };

  const runCode = async () => {
    try {
      setIsLoading(true);
      setOutput(`Running ${language} code...`);
      setIsError(false);

      // For TypeScript, use a dummy implementation
      if (language === "typescript") {
        // Original Rust implementation
        const response = await fetch(`${SERVER_URL}/typescript`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data: CompileResponse = await response.json();

        if (data.success) {
          setOutput(data.output);
          setIsError(false);
        } else {
          setOutput(
            data.error || "An error occurred during compilation or execution."
          );
          setIsError(true);
        }
      } else {
        // Original Rust implementation
        const response = await fetch(`${SERVER_URL}/rust`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data: CompileResponse = await response.json();

        if (data.success) {
          setOutput(data.output);
          setIsError(false);
        } else {
          setOutput(
            data.error || "An error occurred during compilation or execution."
          );
          setIsError(true);
        }
      }
    } catch (error) {
      console.error(`Error running ${language} code:`, error);

      if (language === "typescript") {
        setOutput(
          "Error: TypeScript execution failed.\nAn unexpected error occurred."
        );
      } else {
        setOutput(
          "Failed to connect to the server. Please make sure the Rust Playground server is running."
        );
      }

      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  function handleEditorChange(value: string | undefined) {
    if (value !== undefined) {
      setCode(value);
      // Also update the language-specific code state
      if (language === "rust") {
        setRustCode(value);
      } else {
        setTsCode(value);
      }
    }
  }

  // Function to reset code to default example or selected snippet
  function handleReset() {
    if (selectedSnippetId) {
      const selectedSnippet = snippets.find(
        (snippet) => snippet.id === selectedSnippetId
      );
      if (selectedSnippet) {
        const newCode =
          language === "typescript"
            ? selectedSnippet.tsCode
            : selectedSnippet.rustCode;

        setCode(newCode);
        if (language === "rust") {
          setRustCode(newCode);
        } else {
          setTsCode(newCode);
        }
        return;
      }
    }

    // Fallback to default examples if no snippet is selected or found
    const defaultCode =
      language === "typescript" ? TS_EXAMPLE_CODE : EXAMPLE_CODE;
    setCode(defaultCode);
    if (language === "rust") {
      setRustCode(defaultCode);
    } else {
      setTsCode(defaultCode);
    }
  }

  // Function to handle editor mounting
  const handleCodeEditorDidMount = (editor: any) => {
    codeEditorRef.current = editor;
  };

  const handleOutputEditorDidMount = (editor: any) => {
    outputEditorRef.current = editor;
  };

  // Enhanced panel resize handler
  const handlePanelResize = useCallback(() => {
    // For vertical layout, use 100% height
    if (isSmallScreen) {
      setEditorHeight("100%");
    }

    // Trigger resize to make Monaco update properly
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));

      // Force editors to update their layout
      if (codeEditorRef.current) {
        codeEditorRef.current.layout();
      }

      if (outputEditorRef.current) {
        outputEditorRef.current.layout();
      }
    }, 100);
  }, [isSmallScreen]);

  return (
    <div
      className={`w-full h-[90vh] bg-card rounded-lg shadow-sm border flex flex-col overflow-hidden`}
      ref={containerRef}
    >
      <PanelGroup
        direction={isSmallScreen ? "vertical" : "horizontal"}
        className={isSmallScreen ? "flex-grow h-full" : "h-full"}
        onLayout={handlePanelResize}
        autoSaveId="rust-playground-layout"
      >
        <Panel
          defaultSize={isSmallScreen ? 55 : 50}
          minSize={isSmallScreen ? 25 : 20}
          ref={firstPanelRef}
        >
          <Card className="w-full h-full flex flex-col overflow-hidden">
            <div className="card-header flex-shrink-0 border-b min-h-[40px] flex items-center px-3 py-1">
              <div className="flex justify-between items-center w-full">
                <h3 className="font-semibold">Code Editor</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <ToggleGroup
                    type="single"
                    value={language}
                    onValueChange={(value) => {
                      if (value) handleLanguageChange(value);
                    }}
                    className="flex justify-start"
                  >
                    <ToggleGroupItem
                      value="rust"
                      aria-label="Rust"
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Rust
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="typescript"
                      aria-label="TypeScript"
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      TypeScript
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={runCode}
                    disabled={isLoading}
                    className="text-xs sm:text-sm px-2 sm:px-3 min-w-[80px] flex items-center justify-center"
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
                      "Run"
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <CardContent className="p-0 flex-grow overflow-hidden editor-container h-full">
              <div className="h-full w-full">
                <Editor
                  height="100%"
                  language={language}
                  defaultLanguage={language}
                  defaultValue={
                    language === "typescript" ? TS_EXAMPLE_CODE : EXAMPLE_CODE
                  }
                  value={code}
                  theme="vs-dark"
                  onChange={handleEditorChange}
                  onMount={handleCodeEditorDidMount}
                  beforeMount={(monaco) => {
                    // Make sure to initialize TypeScript properly
                    if (language === "typescript") {
                      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
                        {
                          noSemanticValidation: true,
                          noSyntaxValidation: false,
                        }
                      );
                    }
                    beforeMount(monaco);
                  }}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: "on",
                    padding: { top: 0, bottom: 12 },
                    showUnused: false,
                    suggestOnTriggerCharacters: false,
                    snippetSuggestions: "none",
                    linkedEditing: false,
                    acceptSuggestionOnEnter: "off",
                    parameterHints: { enabled: false },
                    quickSuggestions: {
                      other: false,
                      comments: false,
                      strings: false,
                    },
                    inlayHints: { enabled: "off" },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </Panel>

        <ResizeHandle isVertical={isSmallScreen} />

        <Panel
          defaultSize={isSmallScreen ? 45 : 50}
          minSize={isSmallScreen ? 25 : 20}
          ref={secondPanelRef}
        >
          <Card className="w-full h-full flex flex-col overflow-hidden">
            <div className="card-header flex-shrink-0 border-b min-h-[40px] flex items-center px-3 py-1">
              <div className="flex justify-between items-center w-full">
                <h3 className="font-semibold">Output Terminal</h3>
                <div className="flex items-center gap-2">
                  <SnippetsDrawer
                    language={language}
                    onSnippetSelect={handleSnippetSelect}
                  />
                </div>
              </div>
            </div>
            <CardContent className="p-0 flex-grow overflow-hidden editor-container h-full">
              <div className="h-full w-full">
                <Editor
                  height="100%"
                  language="rust-output"
                  value={output || "Output will appear here..."}
                  theme={isError ? "error-theme" : "success-theme"}
                  beforeMount={beforeMount}
                  onMount={handleOutputEditorDidMount}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    automaticLayout: true,
                    wordWrap: "on",
                    padding: { top: 0, bottom: 12 },
                    renderControlCharacters: true,
                    lineNumbers: "off",
                    folding: false,
                    guides: { indentation: false },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </Panel>
      </PanelGroup>
    </div>
  );
}
