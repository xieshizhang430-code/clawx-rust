import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { MessageCircle, Settings, Puzzle, Calendar, Radio, Bot, Cpu } from "lucide-react";
import { Chat } from "./components/Chat";
import { Channels } from "./components/Channels";
import { Skills } from "./components/Skills";
import { Settings as SettingsPage } from "./components/Settings";
import { Cron } from "./components/Cron";
import { Models } from "./components/Models";

type Page = "chat" | "channels" | "skills" | "cron" | "settings" | "models";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("chat");
  const [gatewayRunning, setGatewayRunning] = useState(false);

  useEffect(() => {
    invoke<CommandResult<boolean>>("check_gateway_status").then((result) => {
      if (result.success) {
        setGatewayRunning(result.data ?? false);
      }
    });
  }, []);

  const navItems = [
    { id: "chat" as Page, icon: MessageCircle, label: "Chat" },
    { id: "channels" as Page, icon: Radio, label: "Channels" },
    { id: "models" as Page, icon: Cpu, label: "Models" },
    { id: "skills" as Page, icon: Puzzle, label: "Skills" },
    { id: "cron" as Page, icon: Calendar, label: "Automation" },
    { id: "settings" as Page, icon: Settings, label: "Settings" },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case "chat":
        return <Chat />;
      case "channels":
        return <Channels />;
      case "models":
        return <Models />;
      case "skills":
        return <Skills />;
      case "cron":
        return <Cron />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-16 border-r bg-card flex flex-col items-center py-4 gap-2">
        <div className="mb-4">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`p-3 rounded-lg transition-colors ${
              currentPage === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold">
              {navItems.find((i) => i.id === currentPage)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                gatewayRunning ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {gatewayRunning ? "Gateway Online" : "Gateway Offline"}
          </div>
        </header>
        <div className="flex-1 overflow-auto">{renderPage()}</div>
      </main>
    </div>
  );
}

export default App;
