import RustEditor from "@/components/RustEditor";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-primary-foreground py-2 px-4 shadow-md">
        <div className="container-fluid mx-auto flex flex-wrap items-center justify-between">
          <h1 className="text-xl font-bold">Solana Sandbox</h1>
          <p className="text-xs">
            Write, compile, and run Solana code in your browser
          </p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-full mx-auto py-1 px-1">
        <RustEditor />
      </main>

      <footer className="bg-muted py-2 text-center text-xs text-muted-foreground">
        <div className="container-fluid mx-auto">
          <p>
            Rust Playground © {new Date().getFullYear()} | Running on{" "}
            <a
              href="https://github.com/rust-lang/rust"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Rust
            </a>{" "}
            with{" "}
            <a
              href="https://github.com/tokio-rs/axum"
              className="underline hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Axum
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
