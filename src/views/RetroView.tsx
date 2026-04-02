import { useState } from "react";
import type { Task, Track } from "@/types";
import { Check, Star } from "lucide-react";
import { getTrackName } from "@/lib/utils";

interface RetroViewProps {
  tasks: Task[];
  tracks: Track[];
}

function RetroView({ tasks, tracks }: RetroViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<"today" | "week" | "month" | "custom">("today");

  const isToday = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp * 1000);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (timestamp: number | null): boolean => {
    if (!timestamp) return false;
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return date >= startOfWeek && date < endOfWeek;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getDayName = (dayIndex: number): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayIndex];
  };

  const todayCompletedTasks = tasks.filter((t) => t.status === "done" && isToday(t.completed_at));

  const newTasks = todayCompletedTasks.filter((t) => isToday(t.created_at));
  const existingTasks = todayCompletedTasks.filter((t) => !isToday(t.created_at));

  const tasksWithTime = todayCompletedTasks.filter((t) => t.completed_at && t.created_at);
  const avgTimeToComplete = tasksWithTime.length > 0
    ? tasksWithTime.reduce((sum, t) => sum + ((t.completed_at || 0) - t.created_at), 0) / tasksWithTime.length
    : 0;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tasksAvailableToday = tasks.filter((t) =>
    t.created_at <= nowSeconds && (t.completed_at === null || isToday(t.completed_at))
  );
  const completionRate = tasksAvailableToday.length > 0
    ? (todayCompletedTasks.length / tasksAvailableToday.length) * 100
    : 0;

  // Week calculations
  const weekCompletedTasks = tasks.filter((t) => t.status === "done" && isThisWeek(t.completed_at));
  const weekNewTasks = weekCompletedTasks.filter((t) => isThisWeek(t.created_at));
  const weekExistingTasks = weekCompletedTasks.filter((t) => !isThisWeek(t.created_at));

  const weekTasksWithTime = weekCompletedTasks.filter((t) => t.completed_at && t.created_at);
  const weekAvgTimeToComplete = weekTasksWithTime.length > 0
    ? weekTasksWithTime.reduce((sum, t) => sum + ((t.completed_at || 0) - t.created_at), 0) / weekTasksWithTime.length
    : 0;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekTasksAvailable = tasks.filter((t) =>
    t.created_at <= nowSeconds && (t.completed_at === null || isThisWeek(t.completed_at))
  );
  const weekCompletionRate = weekTasksAvailable.length > 0
    ? (weekCompletedTasks.length / weekTasksAvailable.length) * 100
    : 0;

  // Velocity data - tasks completed per day this week
  const velocityData = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dayStart = Math.floor(day.getTime() / 1000);
    const dayEnd = dayStart + 86400; // 24 hours

    const count = weekCompletedTasks.filter((t) => {
      const completedAt = t.completed_at || 0;
      return completedAt >= dayStart && completedAt < dayEnd;
    }).length;

    return { day: getDayName(i), count };
  });

  const maxVelocity = Math.max(...velocityData.map((d) => d.count), 1);

  // Time distribution - tasks completed by hour of day
  const timeDistribution = Array.from({ length: 24 }, (_, hour) => {
    const count = weekCompletedTasks.filter((t) => {
      if (!t.completed_at) return false;
      const date = new Date(t.completed_at * 1000);
      return date.getHours() === hour;
    }).length;
    return { hour, count };
  });

  const maxTimeDistribution = Math.max(...timeDistribution.map((d) => d.count), 1);

  const completedTrackIds = new Set(
    tracks
      .filter((track) => {
        const trackTasks = tasks.filter((t) => t.track_id === track.id);
        return trackTasks.length > 0 && trackTasks.every((t) => t.status === "done");
      })
      .map((t) => t.id)
  );

  const filteredCompletedTasks = selectedFilter === "today" ? todayCompletedTasks : weekCompletedTasks;
  const completedByTrack = filteredCompletedTasks.reduce((acc, task) => {
    const trackName = getTrackName(tracks, task.track_id);
    if (!acc[trackName]) {
      acc[trackName] = [];
    }
    acc[trackName].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const maxTasksInTrack = Math.max(...Object.values(completedByTrack).map((tasks) => tasks.length), 1);

  const formatTimeOfDay = (timestamp: number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-2 mb-6 pb-4 border-b border-sidebar">
        <button
          onClick={() => setSelectedFilter("today")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "today"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setSelectedFilter("week")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "week"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => setSelectedFilter("month")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "month"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          This Month
        </button>
        <button
          onClick={() => setSelectedFilter("custom")}
          className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
            selectedFilter === "custom"
              ? "bg-accent text-white"
              : "bg-button-secondary text-secondary hover:bg-button-secondary-hover"
          }`}
        >
          Custom
        </button>
      </div>

      {selectedFilter === "today" && todayCompletedTasks.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No tasks completed today</p>
          <p className="text-sm">Complete some tasks to see your retro.</p>
        </div>
      ) : selectedFilter === "week" && weekCompletedTasks.length === 0 ? (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">No tasks completed this week</p>
          <p className="text-sm">Complete some tasks to see your retro.</p>
        </div>
      ) : selectedFilter === "today" ? (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{todayCompletedTasks.length}</div>
              <div className="text-xs text-tertiary">Total Completed</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{newTasks.length}</div>
              <div className="text-xs text-tertiary"># New</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{existingTasks.length}</div>
              <div className="text-xs text-tertiary"># Existing</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{Math.round(completionRate)}%</div>
              <div className="text-xs text-tertiary">Completion Rate</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{formatTime(avgTimeToComplete)}</div>
              <div className="text-xs text-tertiary">Avg Time to Complete</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{completedTrackIds.size}</div>
              <div className="text-xs text-tertiary">Tracks Completed</div>
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Track Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(completedByTrack)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([trackName, trackTasks]) => {
                  const percentage = (trackTasks.length / todayCompletedTasks.length) * 100;
                  const barWidth = (trackTasks.length / maxTasksInTrack) * 100;
                  return (
                    <div key={trackName}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-primary">{trackName}</span>
                        <span className="text-sm text-tertiary">{trackTasks.length} tasks ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-accent rounded-full h-2 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Completed Tasks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {todayCompletedTasks
                .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0))
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-secondary rounded hover:bg-button-secondary transition-colors"
                  >
                    <Check size={20} className="text-accent mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary">{task.title}</div>
                      <div className="text-xs text-tertiary mt-1">
                        {getTrackName(tracks, task.track_id)} • {formatTimeOfDay(task.completed_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {completedTrackIds.size > 0 && (
            <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
              <h2 className="text-lg font-bold mb-4 text-primary">Completed Tracks</h2>
              <div className="space-y-2">
                {tracks
                  .filter((track) => completedTrackIds.has(track.id))
                  .map((track) => {
                    const trackTasks = tasks.filter((t) => t.track_id === track.id);
                    return (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 bg-secondary rounded"
                      >
                        <div className="flex items-center gap-2">
                          {track.type === "main" && <Star size={16} className="text-star fill-star" />}
                          <span className="font-medium text-primary">{track.name}</span>
                        </div>
                        <span className="text-sm text-tertiary">{trackTasks.length} tasks</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : selectedFilter === "week" ? (
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekCompletedTasks.length}</div>
              <div className="text-xs text-tertiary">Total Completed</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekNewTasks.length}</div>
              <div className="text-xs text-tertiary"># New</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{weekExistingTasks.length}</div>
              <div className="text-xs text-tertiary"># Existing</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{Math.round(weekCompletionRate)}%</div>
              <div className="text-xs text-tertiary">Completion Rate</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{formatTime(weekAvgTimeToComplete)}</div>
              <div className="text-xs text-tertiary">Avg Time to Complete</div>
            </div>
            <div className="bg-tertiary rounded-lg p-4 border border-border-primary">
              <div className="text-3xl font-bold text-accent mb-1">{completedTrackIds.size}</div>
              <div className="text-xs text-tertiary">Tracks Completed</div>
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Velocity - Daily Completions</h2>
            <div className="space-y-3">
              {velocityData.map((data) => (
                <div key={data.day}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-primary">{data.day}</span>
                    <span className="text-sm text-tertiary">{data.count} tasks</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-accent rounded-full h-3 transition-all"
                      style={{ width: `${(data.count / maxVelocity) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Time Distribution - Completions by Hour</h2>
            <div className="flex items-end gap-1 h-32">
              {timeDistribution.map((data) => {
                const height = (data.count / maxTimeDistribution) * 100;
                return (
                  <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="flex-1 flex items-end w-full">
                      {data.count > 0 && (
                        <div
                          className="bg-accent rounded-t w-full transition-all relative group"
                          style={{ height: `${height}%` }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-tertiary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {data.count}
                          </span>
                        </div>
                      )}
                    </div>
                    {data.hour % 3 === 0 && (
                      <span className="text-xs text-tertiary">{data.hour}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-tertiary text-center mt-2">Hour of Day</div>
          </div>

          <div className="bg-tertiary rounded-lg p-6 border border-border-primary">
            <h2 className="text-lg font-bold mb-4 text-primary">Completed Tasks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {weekCompletedTasks
                .sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0))
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-secondary rounded hover:bg-button-secondary transition-colors"
                  >
                    <Check size={20} className="text-accent mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-primary">{task.title}</div>
                      <div className="text-xs text-tertiary mt-1">
                        {getTrackName(tracks, task.track_id)} • {formatTimeOfDay(task.completed_at)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-tertiary">
          <p className="text-lg mb-2">Coming soon</p>
          <p className="text-sm">This view is not yet implemented.</p>
        </div>
      )}

    </div>
  );
}

export default RetroView;
