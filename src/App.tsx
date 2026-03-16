import { useEffect, useState } from "react";

interface AgentInfo {
  id: string;
  name: string;
  domain: string;
  enabled: boolean;
  status: "idle" | "running" | "error";
  lastRun: string | null;
}

export default function App() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:3847/agents")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Bridge</h1>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-4 mb-6">
          <p>Failed to connect to server: {error}</p>
          <p className="text-sm text-neutral-400 mt-1">Make sure the server is running on port 3847</p>
        </div>
      )}

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{agent.name}</h2>
                <p className="text-sm text-neutral-400">{agent.domain}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    agent.status === "running"
                      ? "bg-blue-400"
                      : agent.status === "error"
                        ? "bg-red-400"
                        : "bg-green-400"
                  }`}
                />
                <span className="text-sm text-neutral-400">{agent.status}</span>
              </div>
            </div>
            {agent.lastRun && (
              <p className="text-xs text-neutral-500 mt-2">Last run: {new Date(agent.lastRun).toLocaleString()}</p>
            )}
          </div>
        ))}

        {agents.length === 0 && !error && <p className="text-neutral-500">Loading agents...</p>}
      </div>
    </div>
  );
}
