import { useIDEStore } from '@/stores/ideStore';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity, Zap, Clock } from 'lucide-react';

export function SystemMetrics() {
  const { systemMetrics } = useIDEStore();
  const { totalAgents, activeAgents, averageLoad } = useAgentOrchestrator();

  const getHealthColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'ibm-green';
    if (value >= thresholds.warning) return 'ibm-yellow';
    return 'ibm-red';
  };

  const getLatencyColor = (latency: number) => {
    if (latency <= 20) return 'ibm-green';
    if (latency <= 50) return 'ibm-yellow';
    return 'ibm-red';
  };

  const getTrendIcon = (value: number, baseline: number) => {
    if (value > baseline * 1.05) return <TrendingUp className="w-3 h-3 ibm-green" />;
    if (value < baseline * 0.95) return <TrendingDown className="w-3 h-3 ibm-red" />;
    return <Minus className="w-3 h-3 carbon-text-40" />;
  };

  const agentUtilization = Math.round((activeAgents / totalAgents) * 100);
  const memoryUsage = systemMetrics.memoryUsage;
  const networkLatency = systemMetrics.networkLatency;

  return (
    <div className="w-64 p-4 carbon-border-80 border-l">
      <h3 className="text-sm font-medium mb-3">System Metrics</h3>
      
      {/* Performance Gauges */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>Agent Utilization</span>
            </span>
            <div className="flex items-center space-x-1">
              <span>{agentUtilization}%</span>
              {getTrendIcon(agentUtilization, 80)}
            </div>
          </div>
          <Progress 
            value={agentUtilization} 
            className="h-2"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Memory Usage</span>
            </span>
            <div className="flex items-center space-x-1">
              <span>{memoryUsage}%</span>
              {getTrendIcon(memoryUsage, 60)}
            </div>
          </div>
          <Progress 
            value={memoryUsage} 
            className="h-2"
          />
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Network Latency</span>
            </span>
            <div className="flex items-center space-x-1">
              <span className={getLatencyColor(networkLatency)}>{networkLatency}ms</span>
              {getTrendIcon(networkLatency, 15)}
            </div>
          </div>
          <div className="w-full carbon-bg-80 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${getLatencyColor(networkLatency)}-bg`}
              style={{ width: `${Math.min((networkLatency / 100) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span>Tasks Completed</span>
          <Badge variant="outline" className="ibm-green">
            {systemMetrics.tasksCompleted.toLocaleString()}
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span>Success Rate</span>
          <Badge 
            variant="outline" 
            className={getHealthColor(systemMetrics.successRate, { good: 95, warning: 90 })}
          >
            {systemMetrics.successRate}%
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span>Avg Response Time</span>
          <Badge 
            variant="outline" 
            className={getHealthColor(5 - systemMetrics.averageResponseTime, { good: 3, warning: 2 })}
          >
            {systemMetrics.averageResponseTime}s
          </Badge>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="mt-4 pt-3 carbon-border-80 border-t">
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-2">
          Live Status
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Active Agents</span>
            <span className="ibm-blue">{activeAgents}/{totalAgents}</span>
          </div>
          <div className="flex justify-between">
            <span>Network Health</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 ibm-green-bg rounded-full animate-pulse"></div>
              <span className="ibm-green">Healthy</span>
            </div>
          </div>
          <div className="flex justify-between">
            <span>Load Balance</span>
            <span className="carbon-text-40">{Math.round(averageLoad)}%</span>
          </div>
        </div>
      </div>

      {/* System Health Indicator */}
      <div className="mt-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 ibm-green-bg rounded-full animate-pulse"></div>
          <span className="text-xs ibm-green font-medium">System Optimal</span>
        </div>
      </div>
    </div>
  );
}
