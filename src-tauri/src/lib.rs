use tauri::Manager;

mod commands;
mod state;

pub use commands::*;
pub use state::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("ClawX-Rust").unwrap();
            
            #[cfg(debug_assertions)]
            {
                window.open_devtools();
            }
            
            Ok(())
        })
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::check_gateway_status,
            commands::send_message,
            commands::list_channels,
            commands::add_channel,
            commands::remove_channel,
            commands::connect_channel,
            commands::toggle_channel,
            commands::list_skills,
            commands::install_skill,
            commands::get_settings,
            commands::save_settings,
            commands::restart_gateway,
            commands::list_crons,
            commands::add_cron,
            commands::remove_cron,
            commands::toggle_cron,
            commands::get_model_config,
            commands::save_model_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
