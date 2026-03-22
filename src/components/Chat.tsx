import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useAppStore, Message } from "../stores/appStore";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export function Chat() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, currentChannelId, addMessage } = useAppStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const result = await invoke<CommandResult<Message>>("send_message", {
        request: {
          channel_id: currentChannelId,
          content: input.trim(),
        },
      });

      if (result.success && result.data) {
        addMessage(result.data);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bot className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">Welcome to ClawX-Rust</p>
            <p className="text-sm">Start a conversation with your AI agent</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role !== "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 min-h-[44px] max-h-[200px] resize-none rounded-lg border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
