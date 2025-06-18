export interface Project {
  id: number;
  userId: number;
  name: string;
  description?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPhase {
  id: number;
  projectId: number;
  phaseNumber: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  estimatedHours?: number;
  actualHours?: number;
  assignedAgents?: string[];
  dependencies?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: number;
  phaseId?: number;
  projectId: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  estimatedTime?: number;
  assignedAgents?: string[];
  dependencies?: number[];
  outputs?: TaskOutput[];
  metadata?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskOutput {
  type: 'code' | 'documentation' | 'analysis' | 'design' | 'test' | 'deployment';
  content: string;
  metadata: Record<string, any>;
  quality: number;
  reviewedBy: string[];
}

export interface OrchestrationUpdate {
  type: 'phase_start' | 'phase_complete' | 'task_start' | 'task_complete' | 'agent_assignment' | 'progress_update';
  phase?: number;
  task?: string;
  message: string;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  averageLoad: number;
  networkHealth: number;
  memoryUsage: number;
  networkLatency: number;
  tasksCompleted: number;
  successRate: number;
  averageResponseTime: number;
}
