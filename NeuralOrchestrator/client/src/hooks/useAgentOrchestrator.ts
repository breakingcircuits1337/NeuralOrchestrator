import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIDEStore } from '@/stores/ideStore';
import { useWebSocket } from './useWebSocket';
import { Agent, CortexInfo, AgentStatusUpdate } from '@/types/agent';
import { Project } from '@/types/project';

export function useAgentOrchestrator() {
  const {
    agents,
    agentStatuses,
    cortexInfo,
    currentProject,
    isConnected
  } = useIDEStore();

  const { requestAgentStatus } = useWebSocket();

  // Fetch agents
  const { data: agentsData } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    enabled: true,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Fetch agent statuses
  const { data: statusData } = useQuery<Record<string, AgentStatusUpdate>>({
    queryKey: ['/api/agents/status'],
    enabled: true,
    refetchInterval: 5000 // Refetch every 5 seconds
  });

  // Fetch projects
  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: true
  });

  // Update store with fetched data
  useEffect(() => {
    if (agentsData) {
      useIDEStore.getState().setAgents(agentsData);
    }
  }, [agentsData]);

  useEffect(() => {
    if (statusData) {
      Object.entries(statusData).forEach(([agentId, status]) => {
        useIDEStore.getState().updateAgentStatus(agentId, status);
      });
    }
  }, [statusData]);

  useEffect(() => {
    if (projectsData && projectsData.length > 0 && !currentProject) {
      useIDEStore.getState().setCurrentProject(projectsData[0]);
    }
  }, [projectsData, currentProject]);

  // Request agent status when connected
  useEffect(() => {
    if (isConnected) {
      requestAgentStatus();

      // Set up periodic status requests
      const interval = setInterval(() => {
        requestAgentStatus();
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isConnected, requestAgentStatus]);

  // Calculate cortex information
  const calculatedCortexInfo = new Map<string, CortexInfo>();

  if (agents.length > 0) {
    const cortexGroups = {
      sensory: agents.filter(a => a.cortex === 'sensory'),
      language: agents.filter(a => a.cortex === 'language'),
      memory: agents.filter(a => a.cortex === 'memory'),
      reasoning: agents.filter(a => a.cortex === 'reasoning'),
      personality: agents.filter(a => a.cortex === 'personality')
    };

    Object.entries(cortexGroups).forEach(([cortexName, cortexAgents]) => {
      const activeAgents = cortexAgents.filter(agent => {
        const status = agentStatuses.get(agent.id);
        return status && status.status !== 'idle';
      });

      const averageLoad = cortexAgents.reduce((sum, agent) => {
        const status = agentStatuses.get(agent.id);
        return sum + (status?.workload || 0);
      }, 0) / (cortexAgents.length || 1);

      let health: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (averageLoad > 80) health = 'critical';
      else if (averageLoad > 60) health = 'warning';

      calculatedCortexInfo.set(cortexName, {
        name: cortexName,
        totalAgents: cortexAgents.length,
        activeAgents: activeAgents.length,
        averageLoad: Math.round(averageLoad),
        health
      });
    });
  }

  // Calculate network health
  const networkHealth = Array.from(calculatedCortexInfo.values())
    .reduce((sum, cortex) => {
      let healthScore = 100;
      if (cortex.health === 'warning') healthScore = 75;
      if (cortex.health === 'critical') healthScore = 50;
      return sum + healthScore;
    }, 0) / (calculatedCortexInfo.size || 1);

  return {
    agents,
    agentStatuses,
    cortexInfo: calculatedCortexInfo,
    networkHealth: Math.round(networkHealth),
    totalAgents: agents.length,
    activeAgents: Array.from(agentStatuses.values()).filter(s => s.status !== 'idle').length,
    averageLoad: Array.from(agentStatuses.values()).reduce((sum, s) => sum + s.workload, 0) / (agentStatuses.size || 1)
  };
}