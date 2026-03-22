import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Radio, Power, PowerOff, Settings, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config?: Record<string, string>;
  status?: "connected" | "disconnected" | "error";
}

const CHANNEL_TYPES = [
  { id: "telegram", name: "Telegram", fields: ["botToken"], desc: "Bot API token from @BotFather" },
  { id: "discord", name: "Discord", fields: ["botToken"], desc: "Discord bot token" },
  { id: "slack", name: "Slack", fields: ["botToken", "appToken"], desc: "Slack bot credentials" },
  { id: "whatsapp", name: "WhatsApp", fields: [], desc: "QR code pairing (run in terminal)" },
  { id: "msteams", name: "Microsoft Teams", fields: ["tenantId", "botId", "botSecret"], desc: "Teams credentials" },
  { id: "matrix", name: "Matrix", fields: ["homeserver", "userId", "password"], desc: "Matrix account" },
  { id: "feishu", name: "Feishu", fields: ["appId", "appSecret"], desc: "Feishu credentials" },
  { id: "line", name: "LINE", fields: ["channelSecret"], desc: "LINE credentials" },
  { id: "webchat", name: "WebChat", fields: [], desc: "Built-in web interface" },
];

export function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("telegram");
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<CommandResult<Channel[]>>("list_channels");
      if (result.success && result.data) {
        setChannels(result.data);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddChannel = () => {
    setEditingChannel(null);
    setChannelName("");
    setChannelType("telegram");
    setChannelConfig({});
    setConnectionStatus("");
    setShowDialog(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setChannelName(channel.name);
    setChannelType(channel.type);
    setChannelConfig(channel.config || {});
    setConnectionStatus("");
    setShowDialog(true);
  };

  const handleFieldChange = (field: string, value: string) => {
    setChannelConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleConnect = async () => {
    if (!channelName.trim()) return;
    setIsConnecting(true);
    setConnectionStatus("Connecting...");

    try {
      const result = await invoke<CommandResult<{ success: boolean; message: string }>>("connect_channel", {
        channelType,
        channelName,
        config: channelConfig,
      });

      if (result.success && result.data) {
        setConnectionStatus(result.data.message);
        if (result.data.success) {
          const newChannel: Channel = {
            id: editingChannel?.id || crypto.randomUUID(),
            name: channelName,
            type: channelType,
            enabled: true,
            config: channelConfig,
            status: "connected",
          };
          
          if (editingChannel) {
            setChannels(channels.map(c => c.id === editingChannel.id ? newChannel : c));
          } else {
            setChannels([...channels, newChannel]);
          }
          setTimeout(() => setShowDialog(false), 1500);
        }
      } else {
        setConnectionStatus(result.error || "Connection failed");
      }
    } catch (error) {
      setConnectionStatus(`Error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const result = await invoke<CommandResult<boolean>>("remove_channel", { channelId });
      if (result.success) {
        setChannels(channels.filter((c) => c.id !== channelId));
      }
    } catch (error) {
      console.error("Failed to remove channel:", error);
    }
  };

  const handleToggleChannel = async (channel: Channel) => {
    const updated = { ...channel, enabled: !channel.enabled };
    setChannels(channels.map(c => c.id === channel.id ? updated : c));
    
    try {
      await invoke<CommandResult<boolean>>("toggle_channel", {
        channelId: channel.id,
        enabled: updated.enabled,
      });
    } catch (error) {
      setChannels(channels.map(c => c.id === channel.id ? channel : c));
      console.error("Failed to toggle channel:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Radio className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Channels</h2>
          <p className="text-muted-foreground">
            Connect messaging platforms to chat with AI
          </p>
        </div>
        <button
          onClick={handleAddChannel}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Channel
        </button>
      </div>

      <div className="grid gap-4">
        {channels.map((channel) => (
          <div key={channel.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", channel.enabled ? "bg-green-100" : "bg-gray-100")}>
                  <Radio className={cn("w-5 h-5", channel.enabled ? "text-green-600" : "text-gray-400")} />
                </div>
                <div>
                  <h3 className="font-medium">{channel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {channel.type.charAt(0).toUpperCase() + channel.type.slice(1)} • {channel.status || "disconnected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleChannel(channel)} className={cn("p-2 rounded-lg", channel.enabled ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50")}>
                  {channel.enabled ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
                </button>
                <button onClick={() => handleEditChannel(channel)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => handleRemoveChannel(channel.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No channels configured</p>
          <p className="text-sm">Add a channel to connect your messaging apps</p>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg border shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editingChannel ? "Edit Channel" : "Add New Channel"}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Channel Name</label>
                <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="My Telegram Bot" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Platform</label>
                <select value={channelType} onChange={(e) => setChannelType(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {CHANNEL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {channelType === "telegram" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bot Token</label>
                  <input type="password" value={channelConfig.botToken || ""} onChange={(e) => handleFieldChange("botToken", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="123456:ABC-DEF..." />
                  <p className="text-xs text-muted-foreground mt-1">Get it from @BotFather in Telegram</p>
                </div>
              )}

              {channelType === "discord" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Bot Token</label>
                  <input type="password" value={channelConfig.botToken || ""} onChange={(e) => handleFieldChange("botToken", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="MTIz... or bot token" />
                </div>
              )}

              {channelType === "slack" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bot Token</label>
                    <input type="password" value={channelConfig.botToken || ""} onChange={(e) => handleFieldChange("botToken", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xoxb-..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">App Token</label>
                    <input type="password" value={channelConfig.appToken || ""} onChange={(e) => handleFieldChange("appToken", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xapp-..." />
                  </div>
                </>
              )}

              {channelType === "msteams" && (
                <>
                  <div><label className="block text-sm font-medium mb-1">Tenant ID</label><input type="text" value={channelConfig.tenantId || ""} onChange={(e) => handleFieldChange("tenantId", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></div>
                  <div><label className="block text-sm font-medium mb-1">Bot ID</label><input type="text" value={channelConfig.botId || ""} onChange={(e) => handleFieldChange("botId", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></div>
                  <div><label className="block text-sm font-medium mb-1">Bot Secret</label><input type="password" value={channelConfig.botSecret || ""} onChange={(e) => handleFieldChange("botSecret", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" /></div>
                </>
              )}

              {channelType === "matrix" && (
                <>
                  <div><label className="block text-sm font-medium mb-1">Homeserver</label><input type="text" value={channelConfig.homeserver || ""} onChange={(e) => handleFieldChange("homeserver", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="https://matrix.org" /></div>
                  <div><label className="block text-sm font-medium mb-1">User ID</label><input type="text" value={channelConfig.userId || ""} onChange={(e) => handleFieldChange("userId", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="@user:matrix.org" /></div>
                  <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={channelConfig.password || ""} onChange={(e) => handleFieldChange("password", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="password" /></div>
                </>
              )}

              {channelType === "feishu" && (
                <>
                  <div><label className="block text-sm font-medium mb-1">App ID</label><input type="text" value={channelConfig.appId || ""} onChange={(e) => handleFieldChange("appId", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="cli_xxxxxxxx" /></div>
                  <div><label className="block text-sm font-medium mb-1">App Secret</label><input type="password" value={channelConfig.appSecret || ""} onChange={(e) => handleFieldChange("appSecret", e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="xxxxxxxxxxxxxxxx" /></div>
                </>
              )}

              {channelType === "whatsapp" && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">WhatsApp requires QR code pairing. Run <code className="bg-yellow-100 px-1 rounded">openclaw channels login whatsapp</code> in terminal to pair.</p>
                </div>
              )}

              {connectionStatus && (
                <div className={cn("p-3 rounded-lg text-sm", connectionStatus.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                  {connectionStatus}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowDialog(false)} className="px-4 py-2 text-sm hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={handleConnect} disabled={isConnecting || !channelName.trim()} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {isConnecting && <RefreshCw className="w-4 h-4 animate-spin" />}
                {channelType === "whatsapp" ? "Save" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
