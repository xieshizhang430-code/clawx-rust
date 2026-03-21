import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings as SettingsIcon, Globe, Moon, Sun, Monitor, Power } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore, Settings as AppSettings } from "../stores/appStore";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function Settings() {
  const { settings, setSettings } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleSave = async () => {
    try {
      const result = await invoke<CommandResult<boolean>>("save_settings", {
        settings: {
          language: localSettings.language,
          theme: localSettings.theme,
          auto_start: localSettings.autoStart,
          proxy: localSettings.proxy,
        },
      });
      if (result.success) {
        setSettings(localSettings);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const themes = [
    { id: "light", icon: Sun, label: "Light" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "system", icon: Monitor, label: "System" },
  ];

  const languages = [
    { id: "en", label: "English" },
    { id: "zh-CN", label: "简体中文" },
    { id: "ja-JP", label: "日本語" },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your ClawX-Rust preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Language
          </label>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() =>
                  setLocalSettings({ ...localSettings, language: lang.id })
                }
                className={cn(
                  "px-4 py-2 rounded-lg border transition-colors",
                  localSettings.language === lang.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Theme
          </label>
          <div className="flex gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() =>
                  setLocalSettings({ ...localSettings, theme: theme.id })
                }
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  localSettings.theme === theme.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                )}
              >
                <theme.icon className="w-4 h-4" />
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Power className="w-4 h-4" />
            Launch at startup
          </label>
          <button
            onClick={() =>
              setLocalSettings({
                ...localSettings,
                autoStart: !localSettings.autoStart,
              })
            }
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
              localSettings.autoStart
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            )}
          >
            {localSettings.autoStart ? "Enabled" : "Disabled"}
          </button>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
