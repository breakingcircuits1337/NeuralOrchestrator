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
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Cpu, Memory, Network, Activity } from 'lucide-react';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkActivity: number;
  agentLoad: number;
  totalRequests: number;
  activeConnections: number;
}

export function SystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    networkActivity: 0,
    agentLoad: 0,
    totalRequests: 0,
    activeConnections: 0
  });

  useEffect(() => {
    // Simulate real metrics
    const interval = setInterval(() => {
      setMetrics({
        cpuUsage: Math.floor(Math.random() * 40) + 20,
        memoryUsage: Math.floor(Math.random() * 30) + 50,
        networkActivity: Math.floor(Math.random() * 60) + 10,
        agentLoad: Math.floor(Math.random() * 50) + 30,
        totalRequests: Math.floor(Math.random() * 1000) + 5000,
        activeConnections: Math.floor(Math.random() * 50) + 100
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getUsageColor = (usage: number) => {
    if (usage < 30) return 'text-green-500';
    if (usage < 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">System Metrics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-carbon-90 border-carbon-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-carbon-text-02 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-lg font-bold ${getUsageColor(metrics.cpuUsage)}`}>
                  {metrics.cpuUsage}%
                </span>
              </div>
              <Progress value={metrics.cpuUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-carbon-90 border-carbon-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-carbon-text-02 flex items-center gap-2">
              <Memory className="w-4 h-4" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-lg font-bold ${getUsageColor(metrics.memoryUsage)}`}>
                  {metrics.memoryUsage}%
                </span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-carbon-90 border-carbon-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-carbon-text-02 flex items-center gap-2">
              <Network className="w-4 h-4" />
              Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-lg font-bold ${getUsageColor(metrics.networkActivity)}`}>
                  {metrics.networkActivity}%
                </span>
              </div>
              <Progress value={metrics.networkActivity} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-carbon-90 border-carbon-60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-carbon-text-02 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Agent Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-lg font-bold ${getUsageColor(metrics.agentLoad)}`}>
                  {metrics.agentLoad}%
                </span>
              </div>
              <Progress value={metrics.agentLoad} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Badge variant="outline" className="text-carbon-text-02">
          Requests: {metrics.totalRequests.toLocaleString()}
        </Badge>
        <Badge variant="outline" className="text-carbon-text-02">
          Connections: {metrics.activeConnections}
        </Badge>
      </div>
    </div>
  );
}
