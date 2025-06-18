import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { llmRegistry } from './llmProviders';
import type { Agent, InsertAgent } from '@shared/schema';

export type AgentRole = 
  | 'architect' | 'planner' | 'researcher' | 'analyzer' | 'coder' | 'tester' 
  | 'optimizer' | 'validator' | 'documenter' | 'deployer' | 'monitor' | 'debugger'
  | 'security' | 'performance' | 'ui_designer' | 'backend_dev' | 'database'
  | 'devops' | 'qa' | 'coordinator' | 'synthesizer';

export type CortexType = 'sensory' | 'language' | 'memory' | 'reasoning' | 'personality';

export interface AgentStatus {
  id: string;
  status: 'idle' | 'thinking' | 'working' | 'communicating' | 'completed' | 'error';
  currentTask?: string;
  workload: number;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface CortexInfo {
  name: string;
  totalAgents: number;
  activeAgents: number;
  averageLoad: number;
  health: 'healthy' | 'warning' | 'critical';
}

export class AgentNetwork extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private cortexDistribution: Map<CortexType, number> = new Map([
    ['sensory', 35],
    ['language', 60], 
    ['memory', 50],
    ['reasoning', 60],
    ['personality', 45]
  ]);

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('Initializing AI Agent Network...');
    
    // Check if agents already exist in database
    const existingAgents = await storage.getAllAgents();
    
    if (existingAgents.length === 0) {
      await this.createAgentNetwork();
    } else {
      console.log(`Loading ${existingAgents.length} existing agents from database...`);
      this.loadExistingAgents(existingAgents);
    }

    this.startHealthMonitoring();
    console.log('Agent Network initialized successfully');
  }

  private async createAgentNetwork(): Promise<void> {
    console.log('Creating 250-agent neural network...');
    
    const llmProviders = ['openai', 'anthropic', 'gemini', 'mistral', 'groq'];
    const roles: AgentRole[] = [
      'architect', 'planner', 'researcher', 'analyzer', 'coder', 'tester',
      'optimizer', 'validator', 'documenter', 'deployer', 'monitor', 'debugger',
      'security', 'performance', 'ui_designer', 'backend_dev', 'database',
      'devops', 'qa', 'coordinator', 'synthesizer'
    ];

    let agentCount = 0;

    for (const [cortex, count] of this.cortexDistribution) {
      for (let i = 0; i < count; i++) {
        const role = roles[agentCount % roles.length];
        const provider = llmProviders[agentCount % llmProviders.length];
        
        const agentData: InsertAgent = {
          id: uuidv4(),
          name: `${cortex}_${role}_${i + 1}`,
          role,
          cortex,
          llmProvider: provider,
          specializations: this.getSpecializations(role),
          status: 'idle',
          workload: 0,
          expertise: this.generateExpertise(role),
          performance: {
            tasksCompleted: 0,
            averageTaskTime: 0,
            successRate: 1.0,
            collaborationScore: 0.5,
            innovationScore: 0.5,
            lastActive: new Date()
          },
          connections: [],
          memory: {
            shortTerm: {},
            longTerm: {},
            interactions: [],
            learnings: []
          }
        };

        const agent = await storage.createAgent(agentData);
        this.agents.set(agent.id, agent);
        
        this.agentStatuses.set(agent.id, {
          id: agent.id,
          status: 'idle',
          workload: 0,
          performance: {
            tasksCompleted: 0,
            successRate: 1.0,
            averageResponseTime: 0
          }
        });

        agentCount++;
      }
    }

    // Create neural network connections
    await this.createNeuralConnections();
    console.log(`Created ${agentCount} agents across 5 cortex lobes`);
  }

  private loadExistingAgents(agents: Agent[]): void {
    for (const agent of agents) {
      this.agents.set(agent.id, agent);
      
      this.agentStatuses.set(agent.id, {
        id: agent.id,
        status: agent.status as any,
        workload: agent.workload || 0,
        performance: {
          tasksCompleted: (agent.performance as any)?.tasksCompleted || 0,
          successRate: (agent.performance as any)?.successRate || 1.0,
          averageResponseTime: (agent.performance as any)?.averageTaskTime || 0
        }
      });
    }
  }

  private async createNeuralConnections(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    
    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId)!;
      const connections: string[] = [];
      
      // Connect to 5-12 other agents based on role compatibility
      const connectionCount = Math.floor(Math.random() * 8) + 5;
      
      for (let i = 0; i < connectionCount; i++) {
        const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)];
        if (randomAgent !== agentId && !connections.includes(randomAgent)) {
          connections.push(randomAgent);
        }
      }
      
      await storage.updateAgent(agentId, { connections });
      agent.connections = connections;
    }
  }

  private getSpecializations(role: AgentRole): string[] {
    const specializationMap: Record<AgentRole, string[]> = {
      'architect': ['system_design', 'scalability', 'patterns'],
      'planner': ['project_management', 'estimation', 'roadmapping'],
      'researcher': ['analysis', 'investigation', 'knowledge_gathering'],
      'analyzer': ['data_analysis', 'pattern_recognition', 'insights'],
      'coder': ['implementation', 'algorithms', 'optimization'],
      'tester': ['quality_assurance', 'automation', 'validation'],
      'optimizer': ['performance', 'efficiency', 'bottlenecks'],
      'validator': ['verification', 'compliance', 'standards'],
      'documenter': ['documentation', 'technical_writing', 'knowledge_base'],
      'deployer': ['deployment', 'infrastructure', 'automation'],
      'monitor': ['observability', 'metrics', 'alerting'],
      'debugger': ['troubleshooting', 'error_analysis', 'root_cause'],
      'security': ['security_analysis', 'vulnerability_assessment', 'hardening'],
      'performance': ['profiling', 'benchmarking', 'optimization'],
      'ui_designer': ['user_interface', 'user_experience', 'design_systems'],
      'backend_dev': ['api_development', 'database_design', 'server_architecture'],
      'database': ['data_modeling', 'query_optimization', 'migrations'],
      'devops': ['ci_cd', 'infrastructure', 'containerization'],
      'qa': ['testing_strategy', 'automation', 'quality_metrics'],
      'coordinator': ['orchestration', 'communication', 'workflow'],
      'synthesizer': ['integration', 'consolidation', 'consensus']
    };

    return specializationMap[role] || ['general'];
  }

  private generateExpertise(role: AgentRole): Record<string, number> {
    const baseExpertise = {
      programming: 0.5,
      architecture: 0.3,
      testing: 0.3,
      deployment: 0.2,
      security: 0.2,
      performance: 0.3,
      documentation: 0.4
    };

    // Boost relevant skills based on role
    const roleBoosts: Partial<Record<AgentRole, Record<string, number>>> = {
      'coder': { programming: 0.4 },
      'architect': { architecture: 0.5 },
      'tester': { testing: 0.5 },
      'security': { security: 0.6 },
      'performance': { performance: 0.6 },
      'documenter': { documentation: 0.5 }
    };

    const expertise = { ...baseExpertise };
    const boosts = roleBoosts[role] || {};
    
    for (const [skill, boost] of Object.entries(boosts)) {
      expertise[skill] = Math.min(1.0, expertise[skill] + boost);
    }

    return expertise;
  }

  async getAgentStatuses(): Promise<Map<string, AgentStatus>> {
    return this.agentStatuses;
  }

  async getCortexInfo(): Promise<Map<CortexType, CortexInfo>> {
    const cortexInfo = new Map<CortexType, CortexInfo>();

    for (const [cortex, totalCount] of this.cortexDistribution) {
      const cortexAgents = Array.from(this.agents.values()).filter(agent => agent.cortex === cortex);
      const activeAgents = cortexAgents.filter(agent => {
        const status = this.agentStatuses.get(agent.id);
        return status && status.status !== 'idle';
      });

      const averageLoad = cortexAgents.reduce((sum, agent) => {
        const status = this.agentStatuses.get(agent.id);
        return sum + (status?.workload || 0);
      }, 0) / cortexAgents.length;

      let health: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (averageLoad > 80) health = 'critical';
      else if (averageLoad > 60) health = 'warning';

      cortexInfo.set(cortex, {
        name: cortex,
        totalAgents: totalCount,
        activeAgents: activeAgents.length,
        averageLoad: Math.round(averageLoad),
        health
      });
    }

    return cortexInfo;
  }

  async assignTask(taskId: string, requiredRole?: AgentRole): Promise<string[]> {
    const availableAgents = Array.from(this.agents.values()).filter(agent => {
      const status = this.agentStatuses.get(agent.id);
      return status && 
             status.workload < 80 && 
             status.status !== 'error' &&
             (!requiredRole || agent.role === requiredRole);
    });

    if (availableAgents.length === 0) {
      throw new Error('No available agents for task assignment');
    }

    // Sort by workload and performance
    availableAgents.sort((a, b) => {
      const statusA = this.agentStatuses.get(a.id)!;
      const statusB = this.agentStatuses.get(b.id)!;
      
      return (statusA.workload + (1 - statusA.performance.successRate)) - 
             (statusB.workload + (1 - statusB.performance.successRate));
    });

    // Assign to top 3 agents
    const assignedAgents = availableAgents.slice(0, 3);
    
    for (const agent of assignedAgents) {
      const status = this.agentStatuses.get(agent.id)!;
      status.currentTask = taskId;
      status.status = 'working';
      status.workload = Math.min(100, status.workload + 25);
      
      await storage.updateAgent(agent.id, { status: 'working' });
    }

    return assignedAgents.map(agent => agent.id);
  }

  async completeTask(agentId: string, success: boolean): Promise<void> {
    const status = this.agentStatuses.get(agentId);
    if (!status) return;

    status.currentTask = undefined;
    status.status = 'idle';
    status.workload = Math.max(0, status.workload - 25);
    status.performance.tasksCompleted++;
    
    if (success) {
      status.performance.successRate = (status.performance.successRate * 0.9) + (1.0 * 0.1);
    } else {
      status.performance.successRate = (status.performance.successRate * 0.9) + (0.0 * 0.1);
    }

    await storage.updateAgent(agentId, { 
      status: 'idle',
      workload: status.workload,
      performance: {
        ...status.performance,
        lastActive: new Date()
      }
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.emit('health_update', {
        totalAgents: this.agents.size,
        activeAgents: Array.from(this.agentStatuses.values()).filter(s => s.status !== 'idle').length,
        averageLoad: Array.from(this.agentStatuses.values()).reduce((sum, s) => sum + s.workload, 0) / this.agentStatuses.size
      });
    }, 5000);
  }
}

export const agentNetwork = new AgentNetwork();
