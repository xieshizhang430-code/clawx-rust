import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2, Radio, Power, PowerOff } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore, Channel } from "../stores/appStore";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function Channels() {
  const { channels, setChannels, currentChannelId, setCurrentChannelId } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAddChannel = async () => {
    const newChannel: Channel = {
      id: crypto.randomUUID(),
      name: "New Channel",
      provider: "openai",
      enabled: true,
    };

    try {
      const result = await invoke<CommandResult<Channel>>("add_channel", {
        channel: newChannel,
      });
      if (result.success && result.data) {
        setChannels([...channels, result.data]);
      }
    } catch (error) {
      console.error("Failed to add channel:", error);
    }
  };

  const handleRemoveChannel = async (channelId: string) => {
    try {
      const result = await invoke<CommandResult<boolean>>("remove_channel", {
        channelId,
      });
      if (result.success) {
        setChannels(channels.filter((c) => c.id !== channelId));
      }
    } catch (error) {
      console.error("Failed to remove channel:", error);
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
            Manage your AI communication channels
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
          <div
            key={channel.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
              currentChannelId === channel.id && "ring-2 ring-primary"
            )}
            onClick={() => setCurrentChannelId(channel.id)}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  channel.enabled ? "bg-green-100" : "bg-gray-100"
                )}
              >
                <Radio
                  className={cn(
                    "w-5 h-5",
                    channel.enabled ? "text-green-600" : "text-gray-400"
                  )}
                />
              </div>
              <div>
                <h3 className="font-medium">{channel.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Provider: {channel.provider}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {channel.enabled ? (
                <Power className="w-5 h-5 text-green-500" />
              ) : (
                <PowerOff className="w-5 h-5 text-gray-400" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveChannel(channel.id);
                }}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No channels configured</p>
          <p className="text-sm">Add a channel to get started</p>
        </div>
      )}
    </div>
  );
}
