import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings as SettingsIcon, Globe, Moon, Sun, Monitor, Power, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface AppSettings {
  language: string;
  theme: string;
  autoStart: boolean;
  proxy?: {
    server?: string;
    bypass?: string;
  };
}

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    language: "en",
    theme: "system",
    autoStart: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    loadSettings();
    checkGateway();
  }, []);

  const checkGateway = async () => {
    try {
      const result = await invoke<CommandResult<boolean>>("check_gateway_status");
      setGatewayOnline(result.success && (result.data ?? false));
    } catch {
      setGatewayOnline(false);
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<CommandResult<AppSettings>>("get_settings");
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("");
    try {
      const backendSettings = {
        language: settings.language,
        theme: settings.theme,
        auto_start: settings.autoStart,
        providers: {},
      };
      const result = await invoke<CommandResult<boolean>>("save_settings", {
        settings: backendSettings,
      });
      if (result.success) {
        setSaveStatus("Settings saved!");
        setTimeout(() => setSaveStatus(""), 2000);
      } else {
        setSaveStatus(result.error || "Save failed");
      }
    } catch (error) {
      setSaveStatus(`Error: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartGateway = async () => {
    setIsRestarting(true);
    try {
      const result = await invoke<CommandResult<boolean>>("restart_gateway");
      if (result.success) {
        setSaveStatus("Gateway restarting...");
        setTimeout(() => {
          checkGateway();
          setSaveStatus("");
        }, 3000);
      }
    } catch (error) {
      setSaveStatus(`Error restarting gateway: ${error}`);
    } finally {
      setIsRestarting(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your ClawX-Rust preferences
        </p>
      </div>

      {saveStatus && (
        <div className={cn("mb-4 p-3 rounded-lg text-sm", saveStatus.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
          {saveStatus}
        </div>
      )}

      <div className="space-y-6">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", gatewayOnline ? "bg-green-500" : "bg-red-500")} />
              <div>
                <p className="font-medium">Gateway Status</p>
                <p className="text-sm text-muted-foreground">
                  {gatewayOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRestartGateway}
              disabled={isRestarting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors"
            >
              <RotateCcw className={cn("w-4 h-4", isRestarting && "animate-spin")} />
              Restart
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Language
          </label>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSettings({ ...settings, language: lang.id })}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-colors",
                  settings.language === lang.id
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
                onClick={() => setSettings({ ...settings, theme: theme.id })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                  settings.theme === theme.id
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
            onClick={() => setSettings({ ...settings, autoStart: !settings.autoStart })}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
              settings.autoStart
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            )}
          >
            {settings.autoStart ? "Enabled" : "Disabled"}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
