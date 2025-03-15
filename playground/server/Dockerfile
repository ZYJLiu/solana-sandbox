# Use the official Rust slim image
FROM rust:slim

# Set noninteractive installation
ENV DEBIAN_FRONTEND=noninteractive

# Install only the additional dependencies needed for Solana
RUN apt-get update && apt-get install -y \
    pkg-config \
    libudev-dev \
    libssl-dev \
    protobuf-compiler \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_23.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Set up the app directory
WORKDIR /app

# Copy the playground template
COPY template-rs /app/template-rs
COPY template-ts /app/template-ts

# Precompile the template-rs dependencies
RUN cd /app/template-rs && \
    cargo build

# Precompile the template-ts dependencies using pnpm
RUN cd /app/template-ts && \
    pnpm install

# Copy the API server source code
COPY src /app/server/src
COPY Cargo.toml /app/server/
COPY Cargo.lock /app/server/

# Build the API server
RUN cd /app/server && \
    cargo build --release

# Set up environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV IN_DOCKER_CONTAINER=true
ENV SOLANA_URL=http://solana-validator:8899
ENV SOLANA_WS_URL=ws://solana-validator:8900

# Health check for the server
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose the API port
EXPOSE ${PORT}

# Start the server directly
CMD ["/app/server/target/release/rust-playground"] 