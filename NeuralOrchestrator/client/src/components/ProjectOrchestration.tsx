import { useIDEStore } from '@/stores/ideStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, Loader2, AlertCircle, Play } from 'lucide-react';
import { useState } from 'react';

const mockPhases = [
  { id: 1, name: 'Project Analysis', status: 'completed', progress: 100 },
  { id: 2, name: 'Neural Architecture', status: 'in_progress', progress: 75 },
  { id: 3, name: 'Agent Training', status: 'pending', progress: 0 },
  { id: 4, name: 'Integration Testing', status: 'pending', progress: 0 },
  { id: 5, name: 'Optimization', status: 'pending', progress: 0 },
  { id: 6, name: 'Deployment', status: 'pending', progress: 0 }
];

const mockActiveTasks = [
  { name: 'Optimize connection weights', progress: 75 },
  { name: 'Implement load balancing', progress: 45 },
  { name: 'Neural network analysis', progress: 90 },
  { name: 'Performance benchmarking', progress: 30 }
];

export function ProjectOrchestration() {
  const [goalInput, setGoalInput] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  
  const { 
    currentProject, 
    isOrchestrating, 
    orchestrationUpdates,
    setIsOrchestrating 
  } = useIDEStore();
  
  const { startProjectOrchestration } = useWebSocket();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 ibm-green" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 ibm-blue animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 ibm-red" />;
      default:
        return <Clock className="w-4 h-4 carbon-text-40" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'ibm-green';
      case 'in_progress': return 'ibm-blue';
      case 'error': return 'ibm-red';
      default: return 'carbon-text-40';
    }
  };

  const handleStartOrchestration = () => {
    if (!goalInput.trim() || !currentProject) return;
    
    setIsOrchestrating(true);
    startProjectOrchestration(goalInput, currentProject.id);
    setGoalInput('');
    setIsInputVisible(false);
  };

  const getCurrentPhaseProgress = () => {
    const inProgressPhase = mockPhases.find(p => p.status === 'in_progress');
    return inProgressPhase?.progress || 0;
  };

  const getOverallProgress = () => {
    const totalProgress = mockPhases.reduce((sum, phase) => sum + phase.progress, 0);
    return Math.round(totalProgress / mockPhases.length);
  };

  return (
    <div className="w-96 p-4 carbon-border-80 border-l">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Project Orchestration</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsInputVisible(!isInputVisible)}
          disabled={isOrchestrating}
          className="text-xs"
        >
          <Play className="w-3 h-3 mr-1" />
          Start
        </Button>
      </div>

      {/* Goal Input */}
      {isInputVisible && (
        <div className="mb-4 space-y-2">
          <Input
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Enter project goal..."
            className="text-xs carbon-bg-80"
          />
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              onClick={handleStartOrchestration}
              disabled={!goalInput.trim()}
              className="text-xs"
            >
              Execute
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsInputVisible(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Overall Progress */}
      {isOrchestrating && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium">Overall Progress</span>
            <span className="text-xs carbon-text-40">{getOverallProgress()}%</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
        </div>
      )}

      {/* Project Phases */}
      <div className="space-y-2 mb-4">
        {mockPhases.map((phase) => (
          <div
            key={phase.id}
            className={`flex items-center justify-between p-2 rounded border ${
              phase.status === 'completed' 
                ? 'bg-green-500/10 border-green-500/30' 
                : phase.status === 'in_progress'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'carbon-bg-80 carbon-border-70'
            }`}
          >
            <div className="flex items-center space-x-2">
              {getStatusIcon(phase.status)}
              <span className="text-sm">Phase {phase.id}: {phase.name}</span>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs ${getStatusColor(phase.status)}`}
            >
              {phase.status === 'completed' ? 'Completed' :
               phase.status === 'in_progress' ? 'In Progress' :
               'Pending'}
            </Badge>
          </div>
        ))}
      </div>

      {/* Active Tasks */}
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-2">
          Active Tasks
        </h4>
        <ScrollArea className="h-32">
          <div className="space-y-2">
            {mockActiveTasks.map((task, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{task.name}</span>
                  <span className={task.progress > 70 ? 'ibm-green' : task.progress > 40 ? 'ibm-blue' : 'ibm-yellow'}>
                    {task.progress}%
                  </span>
                </div>
                <Progress value={task.progress} className="h-1" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Recent Updates */}
      {orchestrationUpdates.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide carbon-text-40 mb-2">
            Recent Updates
          </h4>
          <ScrollArea className="h-24">
            <div className="space-y-1">
              {orchestrationUpdates.slice(-5).map((update, index) => (
                <div key={index} className="text-xs carbon-text-40 p-1">
                  {update.message}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
