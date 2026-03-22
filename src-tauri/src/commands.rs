use crate::state::{AppState, Channel, Message, Settings, Skill};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::os::windows::process::CommandExt;
use tauri::State;
use tokio::task;
use uuid::Uuid;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub gateway_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub channel_id: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct CommandResult<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(error: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error),
        }
    }
}

#[tauri::command]
pub fn get_app_info() -> CommandResult<AppInfo> {
    CommandResult::ok(AppInfo {
        name: "ClawX-Rust".to_string(),
        version: "0.1.0".to_string(),
        gateway_version: Some("2026.3.13".to_string()),
    })
}

fn run_openclaw_command(args: &[&str]) -> Result<std::process::Output, std::io::Error> {
    let openclaw_path = "C:\\Users\\me\\.npm-global\\openclaw.cmd";
    let command = format!("& '{}' {}", openclaw_path, args.join(" "));
    
    Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &command])
        .output()
}

fn run_openclaw_gateway_command(method: &str, params: &str, token: &str) -> Result<std::process::Output, std::io::Error> {
    let openclaw_path = "C:\\Users\\me\\.npm-global\\openclaw.cmd";
    let command = format!(
        "& '{}' gateway call {} --params '{}' --token '{}'",
        openclaw_path, method, params, token
    );
    
    Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", &command])
        .output()
}

#[tauri::command]
pub async fn check_gateway_status() -> CommandResult<bool> {
    let output = task::spawn_blocking(|| {
        run_openclaw_command(&["gateway", "call", "health"])
    }).await.unwrap_or_else(|_| Err(std::io::Error::new(std::io::ErrorKind::Other, "task panicked")));
    
    CommandResult::ok(output.is_ok())
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    request: SendMessageRequest,
) -> Result<CommandResult<Message>, String> {
    let user_msg = Message {
        id: Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: request.content.clone(),
        timestamp: chrono::Utc::now().timestamp(),
    };

    {
        let mut messages = state.messages.lock().unwrap();
        let channel_messages = messages
            .entry(request.channel_id.clone())
            .or_insert_with(Vec::new);
        channel_messages.push(user_msg.clone());
    }

    let session_id = "1aca39a2-9bd4-4cf4-b5bd-9850255a812b";
    
    let openclaw_path = "C:\\Users\\me\\.npm-global\\openclaw.cmd";
    let command = format!(
        "& '{}' agent --message \"{}\" --session-id {} --json",
        openclaw_path,
        request.content.replace("\"", "\\\""),
        session_id
    );

    let output = task::spawn_blocking(move || {
        std::process::Command::new("powershell")
            .creation_flags(CREATE_NO_WINDOW)
            .args(["-NoProfile", "-Command", &command])
            .output()
    }).await.unwrap_or_else(|_| Err(std::io::Error::new(std::io::ErrorKind::Other, "task panicked")));

    let response_content = match output {
        Ok(out) => {
            if !out.status.success() {
                let stderr = String::from_utf8_lossy(&out.stderr);
                format!("Error: {}", stderr.trim())
            } else {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    if let Some(result_obj) = value.get("result") {
                        if let Some(payloads) = result_obj.get("payloads").and_then(|p| p.as_array()) {
                            if let Some(first_payload) = payloads.first() {
                                if let Some(text) = first_payload.get("text").and_then(|t| t.as_str()) {
                                    text.trim().to_string()
                                } else {
                                    stdout.to_string()
                                }
                            } else {
                                stdout.to_string()
                            }
                        } else {
                            stdout.to_string()
                        }
                    } else {
                        stdout.to_string()
                    }
                } else {
                    stdout.to_string()
                }
            }
        }
        Err(e) => format!("Failed to execute openclaw: {}", e),
    };

    let assistant_msg = Message {
        id: Uuid::new_v4().to_string(),
        role: "assistant".to_string(),
        content: response_content,
        timestamp: chrono::Utc::now().timestamp(),
    };

    {
        let mut messages = state.messages.lock().unwrap();
        let channel_messages = messages
            .entry(request.channel_id.clone())
            .or_insert_with(Vec::new);
        channel_messages.push(assistant_msg.clone());
    }

    Ok(CommandResult::ok(assistant_msg))
}

#[tauri::command]
pub fn list_channels(state: State<AppState>) -> CommandResult<Vec<Channel>> {
    let channels = state.channels.lock().unwrap().clone();
    CommandResult::ok(channels)
}

#[tauri::command]
pub fn add_channel(state: State<AppState>, channel: Channel) -> CommandResult<Channel> {
    let mut channels = state.channels.lock().unwrap();
    channels.push(channel.clone());
    CommandResult::ok(channel)
}

#[tauri::command]
pub fn remove_channel(state: State<AppState>, channel_id: String) -> CommandResult<bool> {
    let mut channels = state.channels.lock().unwrap();
    channels.retain(|c| c.id != channel_id);
    CommandResult::ok(true)
}

#[tauri::command]
pub fn install_skill(state: State<AppState>, skill_name: String) -> CommandResult<Skill> {
    let mut skills = state.skills.lock().unwrap();

    if let Some(skill) = skills.iter_mut().find(|s| s.name == skill_name) {
        skill.installed = true;
        skill.enabled = true;
        return CommandResult::ok(skill.clone());
    }

    let new_skill = Skill {
        name: skill_name.clone(),
        description: format!("Skill: {}", skill_name),
        enabled: true,
        installed: true,
    };
    skills.push(new_skill.clone());
    CommandResult::ok(new_skill)
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: Settings) -> CommandResult<bool> {
    let mut current = state.settings.lock().unwrap();
    *current = settings.clone();
    
    let settings_json = serde_json::json!({
        "language": settings.language,
        "theme": settings.theme,
        "autoStart": settings.auto_start,
    });
    
    if let Err(e) = ensure_settings_dir() {
        return CommandResult::err(format!("Failed to create settings directory: {}", e));
    }
    
    let path = get_local_settings_path();
    match std::fs::write(&path, settings_json.to_string()) {
        Ok(_) => CommandResult::ok(true),
        Err(e) => CommandResult::err(format!("Failed to write settings: {}", e)),
    }
}

#[tauri::command]
pub fn restart_gateway() -> CommandResult<bool> {
    let output = std::process::Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-Command", "Stop-Process -Name 'openclaw' -Force -ErrorAction SilentlyContinue; Start-Process 'openclaw' -ArgumentList 'gateway' -WindowStyle Hidden"])
        .spawn();
    
    match output {
        Ok(_) => CommandResult::ok(true),
        Err(_) => CommandResult::ok(false),
    }
}

fn get_local_settings_path() -> String {
    let base = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\me\\.openclaw".to_string());
    format!("{}\\ClawX\\settings.json", base)
}

fn ensure_settings_dir() -> std::io::Result<()> {
    let path = get_local_settings_path();
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings() -> CommandResult<serde_json::Value> {
    let path = get_local_settings_path();
    
    if std::path::Path::new(&path).exists() {
        match std::fs::read_to_string(&path) {
            Ok(content) => {
                if let Ok(settings) = serde_json::from_str::<serde_json::Value>(&content) {
                    return CommandResult::ok(settings);
                }
            }
            Err(_) => {}
        }
    }
    
    CommandResult::ok(serde_json::json!({
        "language": "en",
        "theme": "system",
        "autoStart": false,
    }))
}

#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<CommandResult<Vec<Skill>>, String> {
    if let Some(cached) = state.get_cached("skills") {
        if let Ok(skills) = serde_json::from_value(cached.clone()) {
            return Ok(CommandResult::ok(skills));
        }
    }

    let result = task::spawn_blocking(|| {
        let output = run_openclaw_command(&["skills", "list", "--json"]);

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    if let Some(skills_array) = value.get("skills").and_then(|s| s.as_array()) {
                        let skills: Vec<Skill> = skills_array.iter().filter_map(|item| {
                            let name = item.get("name")?.as_str()?.to_string();
                            let eligible = item.get("eligible").and_then(|e| e.as_bool()).unwrap_or(false);
                            let bundled = item.get("bundled").and_then(|b| b.as_bool()).unwrap_or(false);
                            let disabled = item.get("disabled").and_then(|d| d.as_bool()).unwrap_or(false);
                            Some(Skill {
                                name,
                                description: item.get("description").and_then(|d| d.as_str()).unwrap_or("").to_string(),
                                enabled: !disabled,
                                installed: bundled || eligible,
                            })
                        }).collect();
                        return CommandResult::ok(skills);
                    }
                }
                CommandResult::ok(vec![])
            }
            Err(_) => CommandResult::ok(vec![])
        }
    }).await.unwrap_or_else(|_| CommandResult::ok(vec![
        Skill { name: "web-search".to_string(), description: "Search the web".to_string(), enabled: true, installed: true },
    ]));

    if result.success {
        if let Some(data) = &result.data {
            state.set_cached("skills", serde_json::to_value(data).unwrap_or_default());
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn list_crons(state: State<'_, AppState>) -> Result<CommandResult<Vec<serde_json::Value>>, String> {
    if let Some(cached) = state.get_cached("crons") {
        if let Ok(crons) = serde_json::from_value(cached.clone()) {
            return Ok(CommandResult::ok(crons));
        }
    }

    let result = task::spawn_blocking(|| {
        let output = run_openclaw_command(&["cron", "list", "--json"]);

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Ok(crons) = serde_json::from_str(&stdout) {
                    return CommandResult::ok(crons);
                } else if let Ok(value) = serde_json::from_str::<serde_json::Value>(&stdout) {
                    if let Some(arr) = value.as_array() {
                        return CommandResult::ok(arr.clone());
                    }
                }
                CommandResult::ok(vec![])
            }
            Err(_) => CommandResult::ok(vec![])
        }
    }).await.unwrap_or_else(|_| CommandResult::ok(vec![]));

    if result.success {
        if let Some(data) = &result.data {
            state.set_cached("crons", serde_json::to_value(data).unwrap_or_default());
        }
    }
    Ok(result)
}

#[tauri::command]
pub fn add_cron(name: String, schedule: String, command: String) -> CommandResult<bool> {
    let output = run_openclaw_command(&["cron", "add", "--name", &name, "--every", &schedule, "--", &command]);
    CommandResult::ok(output.is_ok())
}

#[tauri::command]
pub fn remove_cron(cron_id: String) -> CommandResult<bool> {
    let output = run_openclaw_command(&["cron", "rm", &cron_id]);
    CommandResult::ok(output.is_ok())
}

#[tauri::command]
pub fn toggle_cron(cron_id: String, enabled: bool) -> CommandResult<bool> {
    let output = if enabled {
        run_openclaw_command(&["cron", "enable", &cron_id])
    } else {
        run_openclaw_command(&["cron", "disable", &cron_id])
    };
    CommandResult::ok(output.is_ok())
}

#[tauri::command]
pub fn get_model_config() -> CommandResult<serde_json::Value> {
    let output = run_openclaw_command(&["config", "get", "models", "--json"]);

    match output {
        Ok(out) => {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                if let Ok(config) = serde_json::from_str(&stdout) {
                    CommandResult::ok(config)
                } else {
                    let defaults = serde_json::json!({
                        "providers": {},
                        "defaults": { "model": "minimax-portal/MiniMax-M2.7" }
                    });
                    CommandResult::ok(defaults)
                }
            } else {
                let defaults = serde_json::json!({
                    "providers": {},
                    "defaults": { "model": "minimax-portal/MiniMax-M2.7" }
                });
                CommandResult::ok(defaults)
            }
        }
        Err(_) => {
            let defaults = serde_json::json!({
                "providers": {},
                "defaults": { "model": "minimax-portal/MiniMax-M2.7" }
            });
            CommandResult::ok(defaults)
        }
    }
}

#[tauri::command]
pub fn save_model_config(config: serde_json::Value) -> CommandResult<bool> {
    let patch = serde_json::json!({
        "models": config
    });

    let output = run_openclaw_command(&["config", "patch", "--json", &patch.to_string()]);

    match output {
        Ok(out) => CommandResult::ok(out.status.success()),
        Err(_) => CommandResult::ok(false),
    }
}

#[derive(Debug, Deserialize)]
pub struct ConnectChannelRequest {
    pub channel_type: String,
    pub channel_name: String,
    pub config: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct ConnectChannelResponse {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub fn connect_channel(
    channel_type: String,
    _channel_name: String,
    config: std::collections::HashMap<String, String>,
) -> CommandResult<ConnectChannelResponse> {
    match channel_type.as_str() {
        "telegram" => {
            if let Some(bot_token) = config.get("botToken") {
                let config_patch = serde_json::json!({
                    "channels": {
                        "telegram": {
                            "enabled": true,
                            "botToken": bot_token,
                            "dmPolicy": "pairing"
                        }
                    }
                });
                
                let output = run_openclaw_command(&["config", "patch", "--json", &config_patch.to_string()]);

                match output {
                    Ok(out) => {
                        if out.status.success() {
                            CommandResult::ok(ConnectChannelResponse {
                                success: true,
                                message: "Telegram bot connected! DM the bot and approve pairing.".to_string(),
                            })
                        } else {
                            CommandResult::ok(ConnectChannelResponse {
                                success: false,
                                message: format!("Config failed: {}", String::from_utf8_lossy(&out.stderr)),
                            })
                        }
                    }
                    Err(e) => CommandResult::ok(ConnectChannelResponse {
                        success: false,
                        message: format!("Failed to run openclaw: {}", e),
                    }),
                }
            } else {
                CommandResult::ok(ConnectChannelResponse {
                    success: false,
                    message: "Bot token required".to_string(),
                })
            }
        }
        "discord" => {
            if let Some(bot_token) = config.get("botToken") {
                let config_patch = serde_json::json!({
                    "channels": {
                        "discord": {
                            "enabled": true,
                            "token": bot_token
                        }
                    }
                });
                
                let output = run_openclaw_command(&["config", "patch", "--json", &config_patch.to_string()]);

                match output {
                    Ok(out) => {
                        if out.status.success() {
                            CommandResult::ok(ConnectChannelResponse {
                                success: true,
                                message: "Discord bot connected!".to_string(),
                            })
                        } else {
                            CommandResult::ok(ConnectChannelResponse {
                                success: false,
                                message: format!("Config failed: {}", String::from_utf8_lossy(&out.stderr)),
                            })
                        }
                    }
                    Err(e) => CommandResult::ok(ConnectChannelResponse {
                        success: false,
                        message: format!("Failed to run openclaw: {}", e),
                    }),
                }
            } else {
                CommandResult::ok(ConnectChannelResponse {
                    success: false,
                    message: "Bot token required".to_string(),
                })
            }
        }
        "whatsapp" => {
            let output = std::process::Command::new("powershell")
                .creation_flags(CREATE_NO_WINDOW)
                .args(["-NoProfile", "-Command", "& 'C:\\Users\\me\\.npm-global\\openclaw.cmd' channels login whatsapp"])
                .spawn();

            match output {
                Ok(_child) => CommandResult::ok(ConnectChannelResponse {
                    success: true,
                    message: "WhatsApp QR code should appear in terminal. Scan with your phone.".to_string(),
                }),
                Err(e) => CommandResult::ok(ConnectChannelResponse {
                    success: false,
                    message: format!("Failed to start WhatsApp pairing: {}", e),
                }),
            }
        }
        _ => CommandResult::ok(ConnectChannelResponse {
            success: false,
            message: format!("Channel type '{}' not yet supported. Configure manually in openclaw.json", channel_type),
        }),
    }
}

#[tauri::command]
pub fn toggle_channel(channel_id: String, enabled: bool) -> CommandResult<bool> {
    let patch = serde_json::json!({
        "channels": {
            channel_id: {
                "enabled": enabled
            }
        }
    });
    let output = run_openclaw_command(&["config", "patch", "--json", &patch.to_string()]);
    CommandResult::ok(output.is_ok())
}
