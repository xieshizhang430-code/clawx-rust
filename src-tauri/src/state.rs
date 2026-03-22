use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub channel_type: String,
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
    #[serde(default)]
    pub auto_start: bool,
    pub proxy: Option<ProxySettings>,
    #[serde(default)]
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

struct CacheEntry<T> {
    value: T,
    timestamp: Instant,
}

const CACHE_TTL: Duration = Duration::from_secs(30);

pub struct AppState {
    pub channels: Mutex<Vec<Channel>>,
    pub skills: Mutex<Vec<Skill>>,
    pub settings: Mutex<Settings>,
    pub messages: Mutex<HashMap<String, Vec<Message>>>,
    pub gateway_running: Mutex<bool>,
    pub cache: Mutex<HashMap<String, CacheEntry<serde_json::Value>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            channels: Mutex::new(vec![Channel {
                id: "default".to_string(),
                name: "Default".to_string(),
                channel_type: "openai".to_string(),
                enabled: true,
            }]),
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
            cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn get_cached(&self, key: &str) -> Option<serde_json::Value> {
        let cache = self.cache.lock().unwrap();
        cache.get(key).and_then(|entry| {
            if entry.timestamp.elapsed() < CACHE_TTL {
                Some(entry.value.clone())
            } else {
                None
            }
        })
    }

    pub fn set_cached(&self, key: &str, value: serde_json::Value) {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(
            key.to_string(),
            CacheEntry {
                value,
                timestamp: Instant::now(),
            },
        );
    }

    pub fn invalidate_cache(&self, key: &str) {
        let mut cache = self.cache.lock().unwrap();
        cache.remove(key);
    }
}
