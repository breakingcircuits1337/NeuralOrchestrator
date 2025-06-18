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
    
    const llmProviders = ['gemini', 'mistral', 'groq'];
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
      this.performNeuralOptimization();
      this.updateCollaborationWeights();
      this.predictiveLoadBalancing();
      
      this.emit('health_update', {
        totalAgents: this.agents.size,
        activeAgents: Array.from(this.agentStatuses.values()).filter(s => s.status !== 'idle').length,
        averageLoad: Array.from(this.agentStatuses.values()).reduce((sum, s) => sum + s.workload, 0) / this.agentStatuses.size
      });
    }, 5000);
  }

  // Advanced Neural Network Features

  private performNeuralOptimization(): void {
    // Dynamic connection strength adjustment based on collaboration success
    for (const [agentId, agent] of this.agents) {
      const status = this.agentStatuses.get(agentId);
      if (!status) continue;

      // Strengthen connections with high-performing collaborators
      for (const connectionId of agent.connections) {
        const connectionStatus = this.agentStatuses.get(connectionId);
        if (connectionStatus && connectionStatus.performance.successRate > 0.8) {
          this.strengthenConnection(agentId, connectionId);
        } else if (connectionStatus && connectionStatus.performance.successRate < 0.5) {
          this.weakenConnection(agentId, connectionId);
        }
      }
    }
  }

  private strengthenConnection(agentId: string, targetId: string): void {
    const agent = this.agents.get(agentId);
    const target = this.agents.get(targetId);
    if (!agent || !target) return;

    // Increase collaboration weights in memory
    if (!agent.memory.collaborationWeights) {
      agent.memory.collaborationWeights = {};
    }
    agent.memory.collaborationWeights[targetId] = 
      Math.min(1.0, (agent.memory.collaborationWeights[targetId] || 0.5) + 0.1);
  }

  private weakenConnection(agentId: string, targetId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.memory.collaborationWeights) return;

    agent.memory.collaborationWeights[targetId] = 
      Math.max(0.1, (agent.memory.collaborationWeights[targetId] || 0.5) - 0.05);
  }

  private updateCollaborationWeights(): void {
    // Update global collaboration patterns based on success rates
    for (const [agentId, agent] of this.agents) {
      const status = this.agentStatuses.get(agentId);
      if (!status) continue;

      // Learn from successful collaborations
      if (status.performance.successRate > 0.8) {
        this.propagateSuccessPattern(agentId, agent.role, agent.cortex);
      }
    }
  }

  private propagateSuccessPattern(agentId: string, role: AgentRole, cortex: CortexType): void {
    // Find similar agents and strengthen their patterns
    const similarAgents = Array.from(this.agents.values()).filter(agent => 
      agent.role === role || agent.cortex === cortex
    );

    for (const similarAgent of similarAgents) {
      if (similarAgent.id === agentId) continue;
      
      const status = this.agentStatuses.get(similarAgent.id);
      if (status) {
        // Boost performance slightly through pattern transfer
        status.performance.successRate = Math.min(1.0, 
          status.performance.successRate + 0.01
        );
      }
    }
  }

  private predictiveLoadBalancing(): void {
    // Analyze workload patterns and predict future needs
    const cortexLoads = new Map<CortexType, number>();
    const roleLoads = new Map<AgentRole, number>();

    for (const [agentId, agent] of this.agents) {
      const status = this.agentStatuses.get(agentId);
      if (!status) continue;

      // Track cortex loads
      const currentCortexLoad = cortexLoads.get(agent.cortex) || 0;
      cortexLoads.set(agent.cortex, currentCortexLoad + status.workload);

      // Track role loads
      const currentRoleLoad = roleLoads.get(agent.role) || 0;
      roleLoads.set(agent.role, currentRoleLoad + status.workload);
    }

    // Pre-warm underutilized agents in high-demand cortex areas
    for (const [cortex, load] of cortexLoads) {
      if (load > 60) { // High load threshold
        this.preWarmCortexAgents(cortex);
      }
    }
  }

  private preWarmCortexAgents(cortex: CortexType): void {
    const cortexAgents = Array.from(this.agents.values()).filter(agent => 
      agent.cortex === cortex
    );

    const idleAgents = cortexAgents.filter(agent => {
      const status = this.agentStatuses.get(agent.id);
      return status && status.status === 'idle' && status.workload < 20;
    });

    // Pre-warm up to 3 idle agents
    for (let i = 0; i < Math.min(3, idleAgents.length); i++) {
      const agent = idleAgents[i];
      const status = this.agentStatuses.get(agent.id);
      if (status) {
        status.status = 'thinking'; // Pre-warm state
        // Small workload increase to indicate readiness
        status.workload = Math.min(100, status.workload + 5);
      }
    }
  }

  async getOptimalAgentCluster(
    taskComplexity: 'low' | 'medium' | 'high',
    requiredRoles: AgentRole[],
    preferredCortex?: CortexType
  ): Promise<string[]> {
    const clusterSize = taskComplexity === 'low' ? 2 : taskComplexity === 'medium' ? 4 : 6;
    
    const candidateAgents = Array.from(this.agents.values()).filter(agent => {
      const status = this.agentStatuses.get(agent.id);
      return status && 
             status.workload < 70 && 
             status.status !== 'error' &&
             (!preferredCortex || agent.cortex === preferredCortex) &&
             (requiredRoles.length === 0 || requiredRoles.includes(agent.role));
    });

    // Score agents based on performance, availability, and collaboration history
    const scoredAgents = candidateAgents.map(agent => {
      const status = this.agentStatuses.get(agent.id)!;
      const collaborationScore = this.calculateCollaborationScore(agent.id, candidateAgents);
      
      const score = (
        status.performance.successRate * 0.4 +
        (1 - status.workload / 100) * 0.3 +
        collaborationScore * 0.3
      );
      
      return { agent, score };
    });

    // Sort by score and select top agents
    scoredAgents.sort((a, b) => b.score - a.score);
    const selectedAgents = scoredAgents.slice(0, clusterSize);

    // Assign cluster task
    const taskId = `cluster_${Date.now()}`;
    for (const { agent } of selectedAgents) {
      const status = this.agentStatuses.get(agent.id)!;
      status.currentTask = taskId;
      status.status = 'working';
      status.workload = Math.min(100, status.workload + 20);
      
      await storage.updateAgent(agent.id, { status: 'working' });
    }

    return selectedAgents.map(({ agent }) => agent.id);
  }

  private calculateCollaborationScore(agentId: string, candidateAgents: any[]): number {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.memory.collaborationWeights) return 0.5;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const candidate of candidateAgents) {
      if (candidate.id === agentId) continue;
      
      const weight = agent.memory.collaborationWeights[candidate.id] || 0.5;
      totalWeight += 1;
      weightedSum += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  async getNetworkInsights(): Promise<{
    cortexSynergy: Map<CortexType, number>;
    roleEfficiency: Map<AgentRole, number>;
    networkCohesion: number;
    adaptabilityScore: number;
  }> {
    const cortexSynergy = new Map<CortexType, number>();
    const roleEfficiency = new Map<AgentRole, number>();

    // Calculate cortex synergy scores
    for (const cortex of this.cortexDistribution.keys()) {
      const cortexAgents = Array.from(this.agents.values()).filter(agent => agent.cortex === cortex);
      const avgSuccessRate = cortexAgents.reduce((sum, agent) => {
        const status = this.agentStatuses.get(agent.id);
        return sum + (status?.performance.successRate || 0);
      }, 0) / cortexAgents.length;
      
      cortexSynergy.set(cortex, avgSuccessRate);
    }

    // Calculate role efficiency
    const roleMap = new Map<AgentRole, number[]>();
    for (const agent of this.agents.values()) {
      const status = this.agentStatuses.get(agent.id);
      if (status) {
        if (!roleMap.has(agent.role)) {
          roleMap.set(agent.role, []);
        }
        roleMap.get(agent.role)!.push(status.performance.successRate);
      }
    }

    for (const [role, successRates] of roleMap) {
      const avgEfficiency = successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length;
      roleEfficiency.set(role, avgEfficiency);
    }

    // Calculate network cohesion (average collaboration strength)
    let totalConnections = 0;
    let totalWeight = 0;
    
    for (const agent of this.agents.values()) {
      if (agent.memory.collaborationWeights) {
        for (const weight of Object.values(agent.memory.collaborationWeights)) {
          totalConnections++;
          totalWeight += weight;
        }
      }
    }

    const networkCohesion = totalConnections > 0 ? totalWeight / totalConnections : 0.5;

    // Calculate adaptability score based on performance variance
    const allSuccessRates = Array.from(this.agentStatuses.values())
      .map(status => status.performance.successRate);
    const avgSuccessRate = allSuccessRates.reduce((sum, rate) => sum + rate, 0) / allSuccessRates.length;
    const variance = allSuccessRates.reduce((sum, rate) => sum + Math.pow(rate - avgSuccessRate, 2), 0) / allSuccessRates.length;
    const adaptabilityScore = Math.max(0, 1 - variance); // Lower variance = higher adaptability

    return {
      cortexSynergy,
      roleEfficiency,
      networkCohesion,
      adaptabilityScore
    };
  }
}

export const agentNetwork = new AgentNetwork();
