use crate::state::{AppState, Channel, Message, Settings, Skill};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

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
        gateway_version: None,
    })
}

#[tauri::command]
pub fn check_gateway_status(state: State<AppState>) -> CommandResult<bool> {
    let running = state.gateway_running.lock().unwrap().clone();
    CommandResult::ok(running)
}

#[tauri::command]
pub fn send_message(
    state: State<AppState>,
    request: SendMessageRequest,
) -> CommandResult<Message> {
    let msg = Message {
        id: Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: request.content,
        timestamp: chrono::Utc::now().timestamp(),
    };

    let mut messages = state.messages.lock().unwrap();
    let channel_messages = messages.entry(request.channel_id.clone()).or_insert_with(Vec::new);
    channel_messages.push(msg.clone());

    CommandResult::ok(msg)
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
pub fn list_skills(state: State<AppState>) -> CommandResult<Vec<Skill>> {
    let skills = state.skills.lock().unwrap().clone();
    CommandResult::ok(skills)
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
pub fn get_settings(state: State<AppState>) -> CommandResult<Settings> {
    let settings = state.settings.lock().unwrap().clone();
    CommandResult::ok(settings)
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: Settings) -> CommandResult<bool> {
    let mut current = state.settings.lock().unwrap();
    *current = settings;
    CommandResult::ok(true)
}
