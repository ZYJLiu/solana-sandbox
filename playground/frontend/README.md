# Code Playground Frontend

A modern web interface for the Code Playground service, built with Next.js, Monaco Editor, and Shadcn UI components. Supports both Rust and TypeScript code execution.

## Features

- Code editor with syntax highlighting for Rust and TypeScript using Monaco Editor
- Language selector to switch between Rust and TypeScript
- Run button to execute code on the backend
- Terminal output display
- Error highlighting

## Getting Started

First, install the dependencies:

```bash
pnpm install
# or
npm install
# or
yarn install
```

Then, run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Dependencies

- Next.js
- React
- Monaco Editor for code editing
- Shadcn UI components
- Tailwind CSS
- Lucide React for icons

## Project Structure

- `app/` - Next.js app directory with pages and layouts
- `components/` - React components
  - `CodeEditor.tsx` - Main editor and output terminal component with Monaco Editor
  - `ui/` - Shadcn UI components
- `public/` - Static assets
- `lib/` - Utility functions
- `utils/` - Helper functions

## Customization

You can customize the frontend by:

1. Modifying the Monaco Editor settings in `components/CodeEditor.tsx`
2. Changing the UI components in `components/ui/`
3. Updating styles in the global CSS file
4. Adding more features to the editor interface
5. Adding more supported languages
