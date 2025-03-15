import { useState, useEffect } from "react";

export interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  rustCode: string;
  tsCode: string;
  category?: string;
}

// This function will load a snippet from the file system
export async function loadSnippet(
  snippetId: string
): Promise<CodeSnippet | null> {
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
    "hello-world": {
      title: "Hello World",
      description: "A simple Hello World example",
      category: "Basic",
    },
    fibonacci: {
      title: "Fibonacci",
      description: "Calculate Fibonacci numbers",
      category: "Algorithms",
    },
    "solana-demo": {
      title: "Solana Demo",
      description: "Check Solana wallet balance",
      category: "Blockchain",
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
export const availableSnippets = ["hello-world", "fibonacci", "solana-demo"];

// Hook to load all available snippets
export function useCodeSnippets() {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllSnippets() {
      setLoading(true);
      try {
        const loadedSnippets = await Promise.all(
          availableSnippets.map((id) => loadSnippet(id))
        );
        // Filter out any null results from failed loads
        setSnippets(loadedSnippets.filter(Boolean) as CodeSnippet[]);
      } catch (error) {
        console.error("Error loading snippets:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAllSnippets();
  }, []);

  return { snippets, loading };
}

// To add a new snippet, simply:
// 1. Create a new directory in /public/code/{snippet-id}
// 2. Add rust.txt and typescript.txt files
// 3. Add the snippet-id to the availableSnippets array above
// 4. Add snippet details to the getSnippetDetails function
