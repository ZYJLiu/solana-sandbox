"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { CodeIcon } from "lucide-react";

// Define code snippet data structure
export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  rustCode: string;
  tsCode: string;
  category?: string;
}

// This function will load a snippet from the file system
async function loadSnippet(snippetId: string): Promise<CodeSnippet | null> {
  try {
    // Load both Rust and TypeScript files
    const rustRes = await fetch(`/code/${snippetId}/rust.txt`);
    const tsRes = await fetch(`/code/${snippetId}/typescript.txt`);

    if (!rustRes.ok || !tsRes.ok) {
      console.error(`Failed to load snippet ${snippetId}`);
      return null;
    }

    const rustCode = await rustRes.text();
    const tsCode = await tsRes.text();

    // Map snippet ID to title and description
    const snippetDetails = getSnippetDetails(snippetId);

    return {
      id: snippetId,
      title: snippetDetails.title,
      description: snippetDetails.description,
      rustCode,
      tsCode,
      category: snippetDetails.category,
    };
  } catch (error) {
    console.error(`Error loading snippet ${snippetId}:`, error);
    return null;
  }
}

// Maps snippet IDs to titles and descriptions
function getSnippetDetails(snippetId: string) {
  const details: Record<
    string,
    { title: string; description: string; category?: string }
  > = {
    "create-mint": {
      title: "Create Mint",
      description: "Create a new token mint account",
      category: "Tokens",
    },
    "create-token-account": {
      title: "Create Token Account",
      description: "Create an account to hold tokens",
      category: "Tokens",
    },
    "mint-tokens": {
      title: "Mint Tokens",
      description: "Mint new tokens to a token account",
      category: "Tokens",
    },
    "transfer-tokens": {
      title: "Transfer Tokens",
      description: "Transfer tokens between accounts",
      category: "Tokens",
    },
  };

  return (
    details[snippetId] || {
      title: snippetId,
      description: "Example code",
      category: "Other",
    }
  );
}

// List of all available snippet IDs
export const availableSnippets = [
  "create-mint",
  "create-token-account",
  "mint-tokens",
  "transfer-tokens",
];

// Hook to load all available snippets
export function useCodeSnippets() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllSnippets() {
      setLoading(true);
      try {
        // Load snippets from files
        const promises = availableSnippets.map((id) => loadSnippet(id));
        const loadedSnippets = await Promise.all(promises);
        const validSnippets = loadedSnippets.filter(Boolean) as CodeSnippet[];
        setSnippets(validSnippets);
      } catch (error) {
        console.error("Error loading snippets:", error);
        // If there's an error, show an empty list
        setSnippets([]);
      } finally {
        setLoading(false);
      }
    }

    loadAllSnippets();
  }, []);

  return { snippets, loading };
}

export interface SnippetsDrawerProps {
  language: "rust" | "typescript";
  onSnippetSelect: (code: string, id: string) => void;
}

export function SnippetsDrawer({
  language,
  onSnippetSelect,
}: SnippetsDrawerProps) {
  const [open, setOpen] = useState(false);
  const { snippets, loading } = useCodeSnippets();

  const handleSnippetSelect = (snippetId: string) => {
    const selectedSnippet = snippets.find(
      (snippet) => snippet.id === snippetId
    );
    if (selectedSnippet) {
      onSnippetSelect(
        language === "rust" ? selectedSnippet.rustCode : selectedSnippet.tsCode,
        snippetId
      );
      setOpen(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm px-2 sm:px-3"
        >
          <CodeIcon className="mr-1 h-4 w-4" />
          Examples
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-[400px] sm:w-[540px]">
        <DrawerHeader>
          <DrawerTitle>Code Snippets</DrawerTitle>
          <DrawerDescription>
            Click on a snippet to load it into the editor
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p>Loading snippets...</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {snippets.map((snippet) => (
                <li key={snippet.id}>
                  <button
                    onClick={() => handleSnippetSelect(snippet.id)}
                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex flex-col gap-1 border border-border"
                  >
                    <h3 className="font-medium flex items-center gap-2">
                      {snippet.category && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          {snippet.category}
                        </span>
                      )}
                      {snippet.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {snippet.description}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
