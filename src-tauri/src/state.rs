use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Settings {
    pub language: String,
    pub theme: String,
    pub auto_start: bool,
    pub proxy: Option<ProxySettings>,
    pub providers: HashMap<String, ProviderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxySettings {
    pub server: Option<String>,
    pub bypass: Option<String>,
    pub http_proxy: Option<String>,
    pub https_proxy: Option<String>,
    pub all_proxy: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub api_key: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
}

pub struct AppState {
    pub channels: Mutex<Vec<Channel>>,
    pub skills: Mutex<Vec<Skill>>,
    pub settings: Mutex<Settings>,
    pub messages: Mutex<HashMap<String, Vec<Message>>>,
    pub gateway_running: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            channels: Mutex::new(vec![
                Channel {
                    id: "default".to_string(),
                    name: "Default".to_string(),
                    provider: "openai".to_string(),
                    enabled: true,
                },
            ]),
            skills: Mutex::new(vec![
                Skill {
                    name: "xlsx".to_string(),
                    description: "Spreadsheet operations".to_string(),
                    enabled: true,
                    installed: true,
                },
                Skill {
                    name: "pdf".to_string(),
                    description: "PDF manipulation".to_string(),
                    enabled: true,
                    installed: true,
                },
                Skill {
                    name: "docx".to_string(),
                    description: "Word document operations".to_string(),
                    enabled: true,
                    installed: true,
                },
            ]),
            settings: Mutex::new(Settings {
                language: "en".to_string(),
                theme: "system".to_string(),
                auto_start: false,
                proxy: None,
                providers: HashMap::new(),
            }),
            messages: Mutex::new(HashMap::new()),
            gateway_running: Mutex::new(false),
        }
    }
}
