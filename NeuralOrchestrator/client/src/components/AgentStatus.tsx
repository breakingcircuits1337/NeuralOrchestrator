import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';
import { AgentStatusUpdate } from '@/types/agent';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Brain, Zap, AlertCircle } from 'lucide-react';

interface AgentStatusProps {
  agentStatuses: Map<string, AgentStatusUpdate>;
}

export function AgentStatus({ agentStatuses }: AgentStatusProps) {
  const { cortexInfo, totalAgents, activeAgents, networkHealth } = useAgentOrchestrator();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'ibm-blue';
      case 'thinking': return 'ibm-purple';
      case 'communicating': return 'ibm-green';
      case 'error': return 'ibm-red';
      default: return 'carbon-text-40';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'ibm-green';
      case 'warning': return 'ibm-yellow';
      case 'critical': return 'ibm-red';
      default: return 'carbon-text-40';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return Activity;
      case 'warning': return AlertCircle;
      case 'critical': return AlertCircle;
      default: return Brain;
    }
  };

  return (
    <div className="flex-1 p-3 overflow-y-auto">
      {/* Network Overview */}
      <div className="mb-4">
        <h3 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-2">
          Network Overview
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span>Total Agents</span>
            <Badge variant="outline" className="ibm-blue">
              {totalAgents}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Active</span>
            <Badge variant="outline" className="ibm-green">
              {activeAgents}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Network Health</span>
            <Badge variant="outline" className={getHealthColor(networkHealth > 80 ? 'healthy' : networkHealth > 60 ? 'warning' : 'critical')}>
              {networkHealth}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Cortex Status */}
      <div className="mb-4">
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-3">
          Cortex Status
        </h4>
        <div className="space-y-2">
          {Array.from(cortexInfo.entries()).map(([cortexName, info]) => {
            const HealthIcon = getHealthIcon(info.health);
            return (
              <div key={cortexName} className="flex items-center justify-between p-2 carbon-bg-80 rounded">
                <div className="flex items-center space-x-2">
                  <HealthIcon className={`w-3 h-3 ${getHealthColor(info.health)}`} />
                  <span className="text-xs capitalize">{cortexName} Cortex</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs carbon-text-40">
                    {info.activeAgents}/{info.totalAgents}
                  </span>
                  <div className="w-12">
                    <Progress 
                      value={info.averageLoad} 
                      className="h-1"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Agents */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-3">
          Active Agents
        </h4>
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {Array.from(agentStatuses.entries())
              .filter(([_, status]) => status.status !== 'idle')
              .slice(0, 10) // Show top 10 active agents
              .map(([agentId, status]) => (
                <div key={agentId} className="flex items-center justify-between p-2 carbon-bg-80 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(status.status)}-bg`}></div>
                    <span className="font-mono text-xs">
                      {agentId.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="carbon-text-40">{status.workload}%</span>
                    <Badge variant="outline" className={getStatusColor(status.status)}>
                      {status.status}
                    </Badge>
                  </div>
                </div>
              ))}
            
            {Array.from(agentStatuses.values()).filter(s => s.status !== 'idle').length === 0 && (
              <div className="text-center py-4 carbon-text-40 text-xs">
                No active agents
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Performance Metrics */}
      <div className="mt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-3">
          Performance
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Avg Response Time</span>
            <span className="ibm-blue">
              {Array.from(agentStatuses.values())
                .reduce((sum, s) => sum + (s.performance?.averageResponseTime || 0), 0) / 
                (agentStatuses.size || 1)
              }ms
            </span>
          </div>
          <div className="flex justify-between">
            <span>Success Rate</span>
            <span className="ibm-green">
              {(Array.from(agentStatuses.values())
                .reduce((sum, s) => sum + (s.performance?.successRate || 0), 0) / 
                (agentStatuses.size || 1) * 100
              ).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tasks Completed</span>
            <span className="carbon-text-40">
              {Array.from(agentStatuses.values())
                .reduce((sum, s) => sum + (s.performance?.tasksCompleted || 0), 0)
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
