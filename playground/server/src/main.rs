use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{env, fs::File, io::Write, process::{Command, Stdio}, time::Duration};
use thiserror::Error;
use tower_http::cors::{Any, CorsLayer};
use tokio::time::timeout;

// App state containing both templates' directories
#[derive(Clone)]
struct AppState {
    template_rs: String,
    template_ts: String,
}

#[tokio::main]
async fn main() {
    // Get configuration from environment variables
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let template_rs =
        env::var("TEMPLATE_RS").unwrap_or_else(|_| "/app/template-rs".to_string());
    let template_ts =
        env::var("TEMPLATE_TS").unwrap_or_else(|_| "/app/template-ts".to_string());
    
    println!("Starting Solana Playground service");
    println!("Configuration:");
    println!("  Host: {}", host);
    println!("  Port: {}", port);
    println!("  Template RS path: {}", template_rs);
    println!("  Template TS path: {}", template_ts);
    println!("  Solana URL: {}", env::var("SOLANA_URL").unwrap_or_else(|_| "http://solana-validator:8899".to_string()));
    println!("  Solana WS URL: {}", env::var("SOLANA_WS_URL").unwrap_or_else(|_| "ws://solana-validator:8900".to_string()));

    // Verify template directories exist
    if !std::path::Path::new(&template_rs).exists() {
        println!("WARNING: Rust template directory does not exist: {}", template_rs);
    }
    if !std::path::Path::new(&template_ts).exists() {
        println!("WARNING: TypeScript template directory does not exist: {}", template_ts);
    }

    // Create a CORS middleware
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Simple app state
    let app_state = AppState {
        template_rs,
        template_ts,
    };

    // Build our application with a route
    let app = Router::new()
        .route("/", get(hello))
        .route("/health", get(health_check))
        .route("/rust", post(compile_rust))
        .route("/typescript", post(compile_typescript))
        .layer(cors)
        .with_state(app_state);

    // Run the server
    let listener = tokio::net::TcpListener::bind(format!("{}:{}", host, port))
        .await
        .unwrap();
    println!("Listening on http://{}:{}", host, port);
    axum::serve(listener, app).await.unwrap();
}

// Basic hello world handler to test the service is running
async fn hello() -> &'static str {
    println!("Received request to /");
    "Hello, World! Welcome to the Solana Playground Service (Rust + TypeScript)"
}

// Health check endpoint for Docker integration
async fn health_check() -> StatusCode {
    println!("Health check request received");
    // Verify critical components are working
    let rust_working = std::process::Command::new("cargo")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);
    
    let ts_working = std::process::Command::new("pnpm")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false);
    
    if rust_working && ts_working {
        println!("Health check succeeded - Rust and TypeScript tools available");
        StatusCode::OK
    } else {
        println!("Health check failed - Rust available: {}, TypeScript tools available: {}", 
                 rust_working, ts_working);
        StatusCode::SERVICE_UNAVAILABLE
    }
}

// Request model for the compile endpoints
#[derive(Deserialize)]
struct CompileRequest {
    code: String,
}

// Response model for the compile endpoints
#[derive(Serialize)]
struct CompileResponse {
    success: bool,
    output: String,
    error: Option<String>,
}

// Custom error type for compile operations
#[derive(Error, Debug)]
enum CompileError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Failed to compile: {0}")]
    Compile(String),
    #[error("Failed to run: {0}")]
    Run(String),
}

impl IntoResponse for CompileError {
    fn into_response(self) -> axum::response::Response {
        let (status, error_message) = match self {
            CompileError::Io(err) => (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()),
            CompileError::Compile(err) => (StatusCode::BAD_REQUEST, err),
            CompileError::Run(err) => (StatusCode::BAD_REQUEST, err),
        };

        let body = Json(CompileResponse {
            success: false,
            output: String::new(),
            error: Some(error_message),
        });

        (status, body).into_response()
    }
}

/// Compile and run Rust code
///
/// Handler that takes Rust code, writes it to main.rs, 
/// compiles and runs it, then returns the output.
async fn compile_rust(
    State(app_state): State<AppState>,
    Json(request): Json<CompileRequest>,
) -> Result<Json<CompileResponse>, CompileError> {
    println!("Received Rust compilation request");
    // Get configuration and clone needed values for the blocking task
    let template_rs = app_state.template_rs.clone();
    let code = request.code.clone();
    
    // Replace localhost/127.0.0.1:8899 with solana-validator URL
    let solana_validator_url = std::env::var("SOLANA_URL")
        .unwrap_or_else(|_| "http://solana-validator:8899".to_string());
    
    // Get WebSocket URL from environment variable
    let solana_ws_url = std::env::var("SOLANA_WS_URL")
        .unwrap_or_else(|_| "ws://solana-validator:8900".to_string());
    
    // Set a timeout for the blocking task (30 seconds max)
    let task_timeout = Duration::from_secs(30);
    
    // Move the blocking operations to a separate thread with timeout
    let timed_task = timeout(task_timeout, tokio::task::spawn_blocking(move || {
        // Path to the main.rs file in the playground
        let main_rs_path = format!("{}/src/main.rs", template_rs);
        
        // Replace URLs in the code
        let code_with_replaced_url = code
            .replace("http://127.0.0.1:8899", &solana_validator_url)
            .replace("ws://127.0.0.1:8900", &solana_ws_url);

        // Update the main.rs file with the provided code
        let mut main_file = File::create(main_rs_path)?;
        write!(main_file, "{}", code_with_replaced_url)?;

        // Run the code
        let run_output = Command::new("cargo")
            .current_dir(&template_rs)
            .args(["run", "--verbose"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()?;
        
        let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();

        if !run_output.status.success() {
            // Check if this is a compilation error
            if stderr.contains("error[E") || 
               stderr.contains("could not compile") ||
               stderr.contains("error: aborting due to") {
                return Err(CompileError::Compile(stderr));
            }
            
            // For runtime errors
            Err(CompileError::Run(stderr))
        } else {
            // Success - return the program output
            Ok(CompileResponse {
                success: true,
                output: stdout,
                error: None,
            })
        }
    }));
    
    // Handle timeout and task result
    match timed_task.await {
        Ok(task_result) => {
            // Task completed within timeout
            match task_result {
                Ok(result) => match result {
                    Ok(response) => Ok(Json(response)),
                    Err(error) => Err(error),
                },
                Err(e) => Err(CompileError::Run(format!("Task panic: {}", e))),
            }
        },
        Err(_) => {
            // Task timed out
            Err(CompileError::Run("Execution timed out after 30 seconds. Your code took too long to run.".to_string()))
        }
    }
}

/// Run TypeScript code
///
/// Handler that takes TypeScript code, writes it to index.ts, 
/// runs it with esrun (from @digitak/esrun), then returns the output.
async fn compile_typescript(
    State(app_state): State<AppState>,
    Json(request): Json<CompileRequest>,
) -> Result<Json<CompileResponse>, CompileError> {
    println!("Received TypeScript compilation request");
    // Get configuration and clone needed values for the blocking task
    let template_ts = app_state.template_ts.clone();
    let code = request.code.clone();
    
    // Replace localhost/127.0.0.1:8899 with solana-validator URL
    let solana_validator_url = std::env::var("SOLANA_URL")
        .unwrap_or_else(|_| "http://solana-validator:8899".to_string());
    
    // Get WebSocket URL from environment variable
    let solana_ws_url = std::env::var("SOLANA_WS_URL")
        .unwrap_or_else(|_| "ws://solana-validator:8900".to_string());
    
    // Set a timeout for the blocking task (30 seconds max)
    let task_timeout = Duration::from_secs(30);
    
    // Move the blocking operations to a separate thread with timeout
    let timed_task = timeout(task_timeout, tokio::task::spawn_blocking(move || {
        // Path to the index.ts file in the TypeScript template
        let index_ts_path = format!("{}/src/index.ts", template_ts);
        
        // Replace URLs in the code
        let code_with_replaced_url = code
            .replace("http://127.0.0.1:8899", &solana_validator_url)
            .replace("ws://127.0.0.1:8900", &solana_ws_url);

        // Update the index.ts file with the provided code
        let mut index_file = File::create(index_ts_path)?;
        write!(index_file, "{}", code_with_replaced_url)?;

        // Run the TypeScript code using esrun with pnpm
        let run_output = Command::new("pnpm")
            .current_dir(&template_ts)
            .args(["run", "start"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()?;
        
        let stdout = String::from_utf8_lossy(&run_output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&run_output.stderr).to_string();

        if !run_output.status.success() {
            // For TypeScript, compilation and runtime errors are both handled by esrun
            if stderr.contains("TypeScript error") || 
               stderr.contains("TypeError") ||
               stderr.contains("SyntaxError") {
                return Err(CompileError::Compile(stderr));
            }
            
            // For other runtime errors
            Err(CompileError::Run(stderr))
        } else {
            // Success - return the program output
            Ok(CompileResponse {
                success: true,
                output: stdout,
                error: None,
            })
        }
    }));
    
    // Handle timeout and task result
    match timed_task.await {
        Ok(task_result) => {
            // Task completed within timeout
            match task_result {
                Ok(result) => match result {
                    Ok(response) => Ok(Json(response)),
                    Err(error) => Err(error),
                },
                Err(e) => Err(CompileError::Run(format!("Task panic: {}", e))),
            }
        },
        Err(_) => {
            // Task timed out
            Err(CompileError::Run("Execution timed out after 30 seconds. Your code took too long to run.".to_string()))
        }
    }
}
