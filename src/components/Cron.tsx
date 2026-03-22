import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Calendar, Clock, Play, Pause, Trash2, Plus, RefreshCw } from "lucide-react";

interface CommandResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface CronJob {
  id: string;
  name: string;
  every?: string;
  enabled?: boolean;
  lastRun?: string;
}

export function Cron() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newJob, setNewJob] = useState({ name: "", schedule: "", command: "" });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<CommandResult<CronJob[]>>("list_crons");
      if (result.success && result.data) {
        setJobs(result.data);
      }
    } catch (error) {
      console.error("Failed to load cron jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddJob = async () => {
    if (!newJob.name || !newJob.schedule) return;
    setIsAdding(true);
    try {
      const result = await invoke<CommandResult<boolean>>("add_cron", {
        name: newJob.name,
        schedule: newJob.schedule,
        command: newJob.command || "echo 'Cron job ran'",
      });
      if (result.success) {
        setShowAddDialog(false);
        setNewJob({ name: "", schedule: "", command: "" });
        loadJobs();
      }
    } catch (error) {
      console.error("Failed to add cron job:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleJob = async (job: CronJob) => {
    const newEnabled = !job.enabled;
    try {
      await invoke<CommandResult<boolean>>("toggle_cron", {
        cronId: job.id,
        enabled: newEnabled,
      });
      setJobs(jobs.map(j => j.id === job.id ? { ...j, enabled: newEnabled } : j));
    } catch (error) {
      console.error("Failed to toggle cron job:", error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const result = await invoke<CommandResult<boolean>>("remove_cron", { cronId: jobId });
      if (result.success) {
        setJobs(jobs.filter(j => j.id !== jobId));
      }
    } catch (error) {
      console.error("Failed to delete cron job:", error);
    }
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Automation</h2>
          <p className="text-muted-foreground">
            Schedule AI tasks to run automatically
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{job.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {job.every || "*/5 * * * *"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {job.enabled ? (
                <Pause className="w-5 h-5 text-green-500" />
              ) : (
                <Play className="w-5 h-5 text-gray-400" />
              )}
              <button
                onClick={() => handleToggleJob(job)}
                className="px-3 py-1 text-sm rounded border hover:bg-muted"
              >
                {job.enabled ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => handleDeleteJob(job.id)}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No scheduled tasks</p>
          <p className="text-sm">Create a task to automate your AI workflows</p>
        </div>
      )}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md border shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Scheduled Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task Name</label>
                <input
                  type="text"
                  value={newJob.name}
                  onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Daily summary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Schedule (cron expression)</label>
                <input
                  type="text"
                  value={newJob.schedule}
                  onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-muted-foreground mt-1">Examples: "0 9 * * *" (daily at 9am), "*/5 * * * *" (every 5 min)</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Command (optional)</label>
                <input
                  type="text"
                  value={newJob.command}
                  onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="echo 'Hello'"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 text-sm hover:bg-muted rounded-lg">Cancel</button>
              <button onClick={handleAddJob} disabled={isAdding || !newJob.name || !newJob.schedule} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {isAdding ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
