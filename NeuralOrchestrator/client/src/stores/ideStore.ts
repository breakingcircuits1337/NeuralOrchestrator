import { create } from 'zustand';
import { Agent, CortexInfo, AgentStatusUpdate } from '@/types/agent';
import { Project, ProjectPhase, Task, OrchestrationUpdate, SystemMetrics } from '@/types/project';

interface IDEState {
  // Project state
  currentProject: Project | null;
  projects: Project[];
  phases: ProjectPhase[];
  tasks: Task[];
  
  // Agent state
  agents: Agent[];
  agentStatuses: Map<string, AgentStatusUpdate>;
  cortexInfo: Map<string, CortexInfo>;
  
  // UI state
  activeFile: string;
  openFiles: string[];
  sidebarTab: 'explorer' | 'agents';
  
  // Orchestration state
  isOrchestrating: boolean;
  orchestrationUpdates: OrchestrationUpdate[];
  
  // System metrics
  systemMetrics: SystemMetrics;
  
  // WebSocket connection
  isConnected: boolean;
  
  // AI Assistant
  chatMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    agentType?: string;
  }>;
}

interface IDEActions {
  // Project actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setPhases: (phases: ProjectPhase[]) => void;
  setTasks: (tasks: Task[]) => void;
  
  // Agent actions
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (agentId: string, status: AgentStatusUpdate) => void;
  setCortexInfo: (cortexInfo: Map<string, CortexInfo>) => void;
  
  // UI actions
  setActiveFile: (file: string) => void;
  addOpenFile: (file: string) => void;
  removeOpenFile: (file: string) => void;
  setSidebarTab: (tab: 'explorer' | 'agents') => void;
  
  // Orchestration actions
  setIsOrchestrating: (isOrchestrating: boolean) => void;
  addOrchestrationUpdate: (update: OrchestrationUpdate) => void;
  clearOrchestrationUpdates: () => void;
  
  // System metrics actions
  setSystemMetrics: (metrics: SystemMetrics) => void;
  
  // WebSocket actions
  setIsConnected: (connected: boolean) => void;
  
  // AI Assistant actions
  addChatMessage: (message: {
    role: 'user' | 'assistant';
    content: string;
    agentType?: string;
  }) => void;
  clearChatMessages: () => void;
}

export const useIDEStore = create<IDEState & IDEActions>((set, get) => ({
  // Initial state
  currentProject: null,
  projects: [],
  phases: [],
  tasks: [],
  agents: [],
  agentStatuses: new Map(),
  cortexInfo: new Map(),
  activeFile: 'agent-network.ts',
  openFiles: ['agent-network.ts', 'orchestrator.ts'],
  sidebarTab: 'explorer',
  isOrchestrating: false,
  orchestrationUpdates: [],
  systemMetrics: {
    totalAgents: 250,
    activeAgents: 0,
    averageLoad: 0,
    networkHealth: 100,
    memoryUsage: 62,
    networkLatency: 12,
    tasksCompleted: 1247,
    successRate: 98.3,
    averageResponseTime: 2.1
  },
  isConnected: false,
  chatMessages: [],

  // Actions
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setPhases: (phases) => set({ phases }),
  setTasks: (tasks) => set({ tasks }),
  
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (agentId, status) => {
    const agentStatuses = new Map(get().agentStatuses);
    agentStatuses.set(agentId, status);
    set({ agentStatuses });
  },
  setCortexInfo: (cortexInfo) => set({ cortexInfo }),
  
  setActiveFile: (file) => set({ activeFile: file }),
  addOpenFile: (file) => {
    const openFiles = get().openFiles;
    if (!openFiles.includes(file)) {
      set({ openFiles: [...openFiles, file] });
    }
  },
  removeOpenFile: (file) => {
    const openFiles = get().openFiles.filter(f => f !== file);
    set({ openFiles });
    
    // If closing active file, switch to another open file
    if (get().activeFile === file && openFiles.length > 0) {
      set({ activeFile: openFiles[0] });
    }
  },
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  
  setIsOrchestrating: (isOrchestrating) => set({ isOrchestrating }),
  addOrchestrationUpdate: (update) => {
    const updates = [...get().orchestrationUpdates, update];
    set({ orchestrationUpdates: updates });
  },
  clearOrchestrationUpdates: () => set({ orchestrationUpdates: [] }),
  
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  
  setIsConnected: (connected) => set({ isConnected: connected }),
  
  addChatMessage: (message) => {
    const chatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      ...message,
      timestamp: new Date()
    };
    set({ chatMessages: [...get().chatMessages, chatMessage] });
  },
  clearChatMessages: () => set({ chatMessages: [] })
}));
