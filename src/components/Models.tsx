import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Bot, Check, Plus, Trash2, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface ModelConfig {
  providers: Record<string, {
    baseUrl?: string;
    apiKey?: string;
    api?: string;
    models: Array<{
      id: string;
      name: string;
      reasoning?: boolean;
      input?: string[];
      cost?: { input: number; output: number; cacheRead: number; cacheWrite: number };
      contextWindow?: number;
      maxTokens?: number;
    }>;
  }>;
  defaults?: {
    model?: string;
    models?: Record<string, { alias?: string }>;
  };
}

const COMMON_PROVIDERS = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"] },
  { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com", models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"] },
  { id: "google", name: "Google AI", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"] },
  { id: "ollama", name: "Ollama (Local)", baseUrl: "http://localhost:11434/v1", models: ["llama3.2", "qwen2.5", "codellama"] },
];

export function Models() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ id: "", name: "", baseUrl: "", apiKey: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<CommandResult<ModelConfig>>("get_model_config");
      if (result.success && result.data) {
        setConfig(result.data);
        const providers = Object.keys(result.data.providers || {});
        if (providers.length > 0) {
          setSelectedProvider(providers[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load model config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setIsSaving(true);
    setSaveStatus("Saving...");

    try {
      const result = await invoke<CommandResult<boolean>>("save_model_config", { config });
      if (result.success) {
        setSaveStatus("Saved successfully!");
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

  const handleAddProvider = () => {
    if (!newProvider.id || !newProvider.name) return;
    
    const providerConfig = {
      baseUrl: newProvider.baseUrl || undefined,
      apiKey: newProvider.apiKey || undefined,
      api: "openai-compat",
      models: COMMON_PROVIDERS.find(p => p.id === newProvider.id)?.models.map(m => ({
        id: m,
        name: m,
      })) || [],
    };

    setConfig(prev => prev ? {
      ...prev,
      providers: { ...prev.providers, [newProvider.id]: providerConfig },
    } : null);
    setSelectedProvider(newProvider.id);
    setShowAddProvider(false);
    setNewProvider({ id: "", name: "", baseUrl: "", apiKey: "" });
  };

  const handleRemoveProvider = (providerId: string) => {
    if (!config) return;
    const newProviders = { ...config.providers };
    delete newProviders[providerId];
    setConfig({ ...config, providers: newProviders });
    if (selectedProvider === providerId) {
      setSelectedProvider(Object.keys(newProviders)[0] || "");
    }
  };

  const handleSetDefaultModel = async (modelId: string) => {
    if (!config) return;
    setConfig({
      ...config,
      defaults: { ...config.defaults, model: modelId },
    });
  };

  const handleProviderFieldChange = (field: string, value: string) => {
    if (!config || !selectedProvider) return;
    setConfig({
      ...config,
      providers: {
        ...config.providers,
        [selectedProvider]: {
          ...config.providers[selectedProvider],
          [field]: field === "apiKey" ? value : value || undefined,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Bot className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const providers = config?.providers || {};
  const providerList = Object.entries(providers);
  const currentProvider = providers[selectedProvider];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Models</h2>
          <p className="text-muted-foreground">Configure AI model providers and select default model</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddProvider(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className={cn("mb-4 p-3 rounded-lg text-sm", saveStatus.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
          {saveStatus}
        </div>
      )}

      {providerList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No model providers configured</p>
          <p className="text-sm">Add a provider to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Providers</h3>
            {providerList.map(([id]) => (
              <button
                key={id}
                onClick={() => setSelectedProvider(id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between",
                  selectedProvider === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{id}</span>
                {config?.defaults?.model?.includes(id) && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <div className="col-span-9 space-y-6">
            {selectedProvider && currentProvider && (
              <>
                <div className="p-4 border rounded-lg bg-card">
                  <h3 className="text-lg font-semibold mb-4">{selectedProvider}</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Base URL</label>
                      <input
                        type="text"
                        value={currentProvider.baseUrl || ""}
                        onChange={(e) => handleProviderFieldChange("baseUrl", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">API Key</label>
                      <input
                        type="password"
                        value={currentProvider.apiKey || ""}
                        onChange={(e) => handleProviderFieldChange("apiKey", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="sk-..."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleRemoveProvider(selectedProvider)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Provider
                    </button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-card">
                  <h3 className="text-lg font-semibold mb-4">Available Models</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(currentProvider.models || []).map((model) => (
                      <div
                        key={model.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          config?.defaults?.model === model.id ? "border-green-500 bg-green-50" : "hover:bg-muted"
                        )}
                        onClick={() => handleSetDefaultModel(model.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name || model.id}</span>
                            {model.reasoning && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Reasoning</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{model.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {model.contextWindow && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round((model.contextWindow || 0) / 1000)}K ctx
                            </span>
                          )}
                          {config?.defaults?.model === model.id && (
                            <Check className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Model Provider</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider ID</label>
                <input
                  type="text"
                  value={newProvider.id}
                  onChange={(e) => setNewProvider({ ...newProvider, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="my-provider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Provider Name</label>
                <input
                  type="text"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My AI Provider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Base URL</label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="sk-..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddProvider(false)} className="px-4 py-2 text-sm hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={handleAddProvider} disabled={!newProvider.id || !newProvider.name} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">Add Provider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
