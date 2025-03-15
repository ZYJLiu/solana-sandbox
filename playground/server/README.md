# Playground Server

A server that allows you to compile and run both Rust and TypeScript code via an API, with features similar to online code playgrounds.

## Features

- Compile and run Rust and TypeScript code submitted via a POST request
- Return compilation errors and program output
- Simple API with JSON input/output
- Uses pre-configured templates for better performance
- Mutex-based request handling to prevent conflicts
- Docker health checks for better container orchestration
- Configurable via environment variables
- Support for Solana development in both Rust and TypeScript

## Project Structure

- `src/` - Source code for the Axum web service
- `template-rs/` - Pre-configured Rust project template used for code execution
  - `Cargo.toml` - Manifest file for the Rust playground
  - `src/main.rs` - Default main file that gets replaced with user code
- `template-ts/` - Pre-configured TypeScript project template
  - `package.json` - Package configuration for TypeScript playground
  - `src/index.ts` - Default file that gets replaced with user code

## Building and Running

### Using Docker Compose (from parent directory)

```bash
# From the project root directory
cd playground
docker compose up --build
```

### Manual Docker Build (from server directory)

```bash
# From the server directory
docker build -t code-playground .
docker run -p 3000:3000 code-playground
```

### Configuration

The service can be configured using environment variables:

| Variable        | Default                      | Description                                |
| --------------- | ---------------------------- | ------------------------------------------ |
| `HOST`          | 0.0.0.0                      | The host address to bind to                |
| `PORT`          | 3000                         | The port to listen on                      |
| `TEMPLATE_RS`   | /app/template-rs             | Directory path for the Rust template       |
| `TEMPLATE_TS`   | /app/template-ts             | Directory path for the TypeScript template |
| `SOLANA_URL`    | http://solana-validator:8899 | URL for Solana validator                   |
| `SOLANA_WS_URL` | ws://solana-validator:8900   | WebSocket URL for Solana validator         |

Example with custom configuration:

```bash
docker run -p 8080:8080 -e PORT=8080 -e HOST=0.0.0.0 code-playground
```

## API Usage

### Health Check Endpoint

GET request to the health check endpoint for Docker health checks:

```bash
curl http://localhost:3000/health
```

### Hello World Endpoint

GET request to the root endpoint to check if the service is running:

```bash
curl http://localhost:3000/
```

### Compile and Run Code

POST request to the `/compile` endpoint with JSON body containing code and language:

```bash
# For Rust
curl -X POST http://localhost:3000/rust \
  -H "Content-Type: application/json" \
  -d '{"code": "fn main() { println!(\"Hello, world!\"); }", "language": "rust"}'

# For TypeScript
curl -X POST http://localhost:3000/typescript \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"Hello, world!\");", "language": "typescript"}'
```

#### Example Response

```json
{
  "success": true,
  "output": "Hello, world!\n",
  "error": null
}
```

## Test with Example Programs

### Rust Hello World

```rust
fn main() {
    println!("Hello, world!");
}
```

### Rust Fibonacci

```rust
fn main() {
    let n = 10;
    println!("Fibonacci of {} is {}", n, fibonacci(n));
}

fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

### TypeScript Hello World

```typescript
console.log("Hello, world!");
```

### TypeScript with Solana

```typescript
import { Connection } from "@solana/web3.js";

async function main() {
  const connection = new Connection(
    "http://solana-validator:8899",
    "confirmed"
  );
  const version = await connection.getVersion();
  console.log("Solana version:", version);
}

main().catch(console.error);
```

## Architecture

The service uses:

1. Axum web framework for handling HTTP requests
2. Pre-configured templates in `./template-rs/` and `./template-ts/` that get copied to the Docker container
3. Thread-safe mutex to ensure only one compilation runs at a time per language
4. Docker for containerization and isolation
5. Environment variables for configuration
6. Health check endpoints for Docker orchestration

## Customizing the Playground

To add external dependencies or change the default configurations:

1. For Rust: Modify files in the `template-rs/` directory and add dependencies to `template-rs/Cargo.toml`
2. For TypeScript: Modify files in the `template-ts/` directory and add dependencies to `template-ts/package.json`
3. Rebuild the Docker image

## Limitations

- Only one compilation per language can run at a time (requests are serialized)
- Limited execution time
- No persistent storage between requests
