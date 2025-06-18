import { useState, useEffect } from "react";
import { FileExplorer } from "./FileExplorer";
import { CodeEditor } from "./CodeEditor";
import { AIAssistant } from "./AIAssistant";
import { NeuralNetwork } from "./NeuralNetwork";
import { AgentStatus } from "./AgentStatus";
import { ProjectOrchestration } from "./ProjectOrchestration";
import { SystemMetrics } from "./SystemMetrics";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAgentOrchestrator } from "@/hooks/useAgentOrchestrator";
import { Cpu, Wifi, Brain } from "lucide-react";

export function IDELayout() {
  const [activeTab, setActiveTab] = useState("agent-network.ts");
  const [sidebarTab, setSidebarTab] = useState("explorer");
  const { isConnected } = useWebSocket();
  const { agentStatuses, networkHealth } = useAgentOrchestrator();

  const [tabs] = useState([
    { id: "agent-network.ts", name: "agent-network.ts", icon: "typescript", modified: true },
    { id: "orchestrator.ts", name: "orchestrator.ts", icon: "typescript", modified: false }
  ]);

  return (
    <div className="ide-layout carbon-bg-100 carbon-text-10">
      {/* Top Menu Bar */}
      <div className="ide-menu-bar carbon-bg-90 carbon-border-80">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 ibm-blue" />
            <span className="text-sm font-medium">Just Built IDE</span>
          </div>
          <div className="flex items-center space-x-1 text-xs">
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
              250 Agents Active
            </span>
            <span className="px-2 py-0.5 bg-blue-500/20 ibm-blue rounded">
              Neural Net: {networkHealth || 'Healthy'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <Wifi className={`w-3 h-3 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
        </div>
      </div>

      {/* Main Container */}
      <div className="ide-main-container">
        {/* Left Sidebar */}
        <div className="ide-sidebar carbon-bg-90 carbon-border-80">
          {/* Tab Headers */}
          <div className="flex carbon-border-80 border-b">
            <button
              className={`flex-1 py-2 px-3 text-xs font-medium border-r carbon-border-70 ${
                sidebarTab === "explorer" 
                  ? "carbon-bg-80 carbon-text-10" 
                  : "carbon-text-40 hover:carbon-bg-80"
              }`}
              onClick={() => setSidebarTab("explorer")}
            >
              <Cpu className="w-3 h-3 mr-2 inline" />
              Explorer
            </button>
            <button
              className={`flex-1 py-2 px-3 text-xs font-medium ${
                sidebarTab === "agents" 
                  ? "carbon-bg-80 carbon-text-10" 
                  : "carbon-text-40 hover:carbon-bg-80"
              }`}
              onClick={() => setSidebarTab("agents")}
            >
              <Brain className="w-3 h-3 mr-2 inline" />
              Agents
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            {sidebarTab === "explorer" ? (
              <FileExplorer />
            ) : (
              <AgentStatus agentStatuses={agentStatuses} />
            )}
          </div>
        </div>

        {/* Center Area - Code Editor */}
        <div className="ide-editor-container">
          {/* Tab Bar */}
          <div className="ide-tab-bar carbon-bg-90 carbon-border-80">
            <div className="flex">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center px-4 py-2 border-r carbon-border-80 text-sm cursor-pointer ${
                    activeTab === tab.id 
                      ? "carbon-bg-100 carbon-text-10" 
                      : "carbon-text-40 hover:carbon-bg-80"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Cpu className="w-3 h-3 mr-2 ibm-green" />
                  <span>{tab.name}</span>
                  {tab.modified && <span className="ml-2 text-xs carbon-text-40">•</span>}
                  <button className="ml-3 carbon-text-40 hover:carbon-text-10">×</button>
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center space-x-2 px-4">
              <button className="p-1 carbon-text-40 hover:carbon-text-10">
                <span className="text-sm">▶</span>
              </button>
              <button className="p-1 carbon-text-40 hover:carbon-text-10">
                <span className="text-sm">🐛</span>
              </button>
              <button className="p-1 carbon-text-40 hover:carbon-text-10">
                <span className="text-sm">⚙</span>
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="ide-editor-area">
            <CodeEditor activeFile={activeTab} />
            <AIAssistant />
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="ide-bottom-panel carbon-bg-90 carbon-border-80">
        <NeuralNetwork />
        <ProjectOrchestration />
        <SystemMetrics />
      </div>
    </div>
  );
}
