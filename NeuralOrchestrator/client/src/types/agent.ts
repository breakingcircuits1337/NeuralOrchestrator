export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  cortex: CortexType;
  llmProvider: string;
  specializations: string[];
  status: AgentStatus;
  workload: number;
  expertise: Record<string, number>;
  performance: AgentPerformance;
  connections: string[];
  memory: AgentMemory;
  createdAt: Date;
  updatedAt: Date;
}

export type AgentRole = 
  | 'architect' | 'planner' | 'researcher' | 'analyzer' | 'coder' | 'tester' 
  | 'optimizer' | 'validator' | 'documenter' | 'deployer' | 'monitor' | 'debugger'
  | 'security' | 'performance' | 'ui_designer' | 'backend_dev' | 'database'
  | 'devops' | 'qa' | 'coordinator' | 'synthesizer';

export type CortexType = 'sensory' | 'language' | 'memory' | 'reasoning' | 'personality';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'communicating' | 'completed' | 'error';

export interface AgentPerformance {
  tasksCompleted: number;
  averageTaskTime: number;
  successRate: number;
  collaborationScore: number;
  innovationScore: number;
  lastActive: Date;
}

export interface AgentMemory {
  shortTerm: Record<string, any>;
  longTerm: Record<string, any>;
  interactions: AgentInteraction[];
  learnings: string[];
}

export interface AgentInteraction {
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'collaboration' | 'feedback' | 'knowledge_share';
  content: string;
  timestamp: Date;
  context: string;
}

export interface CortexInfo {
  name: string;
  totalAgents: number;
  activeAgents: number;
  averageLoad: number;
  health: 'healthy' | 'warning' | 'critical';
}

export interface AgentStatusUpdate {
  id: string;
  status: AgentStatus;
  workload: number;
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
  };
}
