# Solana Lambda & Rust Playground

This repository contains a Rust and TypeScript Playground server that allows compiling and running code via an API, along with a web frontend for easy interaction. It's designed to support Solana development with both Rust and TypeScript environments.

## Project Structure

- `playground/` - A containerized code compilation and execution service
  - `server/` - The Axum-based web service for the code playground
  - `frontend/` - Next.js web frontend with Monaco Editor and Shadcn UI components
  - `docker-compose.yml` - Docker configuration for running the server
- `aws_fargate_fixlog.md` - Documentation for AWS Fargate deployment issues and solutions
- `multi-container-task-definition.json` - AWS ECS task definition for deployment

## Running the Playground

### Backend Server

The easiest way to run the Playground server is using Docker Compose:

```bash
# From the root directory
cd playground
docker compose up --build
```

### Frontend Application

To run the frontend application:

```bash
# From the root directory
cd playground/frontend
pnpm install  # or npm install or yarn install
pnpm dev      # or npm run dev or yarn dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing the API

Once the server is running, you can test it with curl:

```bash
# Health check
curl http://localhost:3000/health

# Hello world example in Rust
curl -X POST http://localhost:3000/rust \
  -H "Content-Type: application/json" \
  -d '{"code": "fn main() { println!(\"Hello, world!\"); }", "language": "rust"}'

# Hello world example in TypeScript
curl -X POST http://localhost:3000/typescript \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"Hello, world!\");", "language": "typescript"}'
```

## Features

- **Backend**:

  - Compile and run both Rust and TypeScript code via a simple REST API
  - Return compilation errors and program output
  - Docker containerized for easy deployment
  - Health check endpoints for monitoring
  - AWS Fargate deployment ready

- **Frontend**:
  - Clean, modern UI using Shadcn components
  - Advanced code editing with Monaco Editor
  - Syntax highlighting for Rust and TypeScript
  - Output terminal display
  - Error highlighting

## Future Enhancements

- Additional Monaco Editor features (code completion, error checking)
- Support for additional crates and npm packages in the playground environment
- Code execution time limits and resource constraints
- User sessions for saving and sharing code snippets
- Examples library of code snippets

## Detailed Documentation

For more detailed information about each component, please refer to the following README files:

- [Playground Server Documentation](playground/server/README.md)
- [Playground Frontend Documentation](playground/frontend/README.md)
