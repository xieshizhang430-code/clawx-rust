import { useState } from "react";
import { Calendar, Clock, Play, Pause, Trash2, Plus } from "lucide-react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
}

export function Cron() {
  const [jobs, setJobs] = useState<CronJob[]>([]);

  const handleAddJob = () => {
    const newJob: CronJob = {
      id: crypto.randomUUID(),
      name: "New Task",
      schedule: "0 * * * *",
      enabled: false,
    };
    setJobs([...jobs, newJob]);
  };

  const handleToggleJob = (id: string) => {
    setJobs(
      jobs.map((job) =>
        job.id === id ? { ...job, enabled: !job.enabled } : job
      )
    );
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter((job) => job.id !== id));
  };

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
          onClick={handleAddJob}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{job.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {job.schedule}
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
                onClick={() => handleToggleJob(job.id)}
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
    </div>
  );
}
