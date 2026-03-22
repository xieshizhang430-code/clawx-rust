import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Puzzle, Download, Check, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface Skill {
  name: string;
  description: string;
  enabled: boolean;
  installed: boolean;
}

export function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<CommandResult<Skill[]>>("list_skills");
      if (result.success && result.data) {
        setSkills(result.data);
      }
    } catch (error) {
      console.error("Failed to load skills:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallSkill = async (skillName: string) => {
    setIsInstalling(skillName);
    try {
      const result = await invoke<CommandResult<Skill>>("install_skill", { skillName });
      if (result.success && result.data) {
        setSkills(prev => {
          const existing = prev.find(s => s.name === skillName);
          if (existing) {
            return prev.map(s => s.name === skillName ? result.data! : s);
          }
          return [...prev, result.data!];
        });
      }
    } catch (error) {
      console.error("Failed to install skill:", error);
    } finally {
      setIsInstalling(null);
    }
  };

  const handleToggleSkill = async (skillName: string) => {
    setSkills(prev => prev.map(s => 
      s.name === skillName ? { ...s, enabled: !s.enabled } : s
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Skills</h2>
        <p className="text-muted-foreground">
          Extend your AI agents with pre-built skills
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-primary" />
              </div>
              {skill.installed ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <button
                  onClick={() => handleInstallSkill(skill.name)}
                  disabled={isInstalling === skill.name}
                  className="p-1 hover:bg-muted rounded"
                >
                  {isInstalling === skill.name ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <h3 className="font-medium mb-1">{skill.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {skill.description}
            </p>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded",
                  skill.installed
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {skill.installed ? "Installed" : "Not installed"}
              </span>
              <button 
                onClick={() => handleToggleSkill(skill.name)}
                className="text-muted-foreground hover:text-foreground"
              >
                {skill.enabled ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {skills.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Puzzle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No skills available</p>
          <p className="text-sm">Skills will appear here once installed</p>
        </div>
      )}
    </div>
  );
}
