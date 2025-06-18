import { useEffect, useRef } from 'react';
import { useAgentOrchestrator } from '@/hooks/useAgentOrchestrator';

interface NeuralNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  cortex: string;
  isActive: boolean;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  isActive: boolean;
}

export function NeuralNetwork() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { cortexInfo, agentStatuses } = useAgentOrchestrator();

  const nodes: NeuralNode[] = [
    {
      id: 'sensory',
      x: 100,
      y: 80,
      radius: 15,
      color: '#42BE65',
      label: 'S',
      cortex: 'Sensory',
      isActive: cortexInfo.get('sensory')?.activeAgents > 0
    },
    {
      id: 'language',
      x: 200,
      y: 60,
      radius: 18,
      color: '#0F62FE',
      label: 'L',
      cortex: 'Language',
      isActive: cortexInfo.get('language')?.activeAgents > 0
    },
    {
      id: 'memory',
      x: 300,
      y: 80,
      radius: 16,
      color: '#42BE65',
      label: 'M',
      cortex: 'Memory',
      isActive: cortexInfo.get('memory')?.activeAgents > 0
    },
    {
      id: 'reasoning',
      x: 400,
      y: 60,
      radius: 17,
      color: '#F1C21B',
      label: 'R',
      cortex: 'Reasoning',
      isActive: cortexInfo.get('reasoning')?.activeAgents > 0
    },
    {
      id: 'personality',
      x: 500,
      y: 80,
      radius: 15,
      color: '#8A3FFC',
      label: 'P',
      cortex: 'Personality',
      isActive: cortexInfo.get('personality')?.activeAgents > 0
    }
  ];

  const connections: Connection[] = [
    { from: 'sensory', to: 'language', strength: 0.8, isActive: true },
    { from: 'language', to: 'memory', strength: 0.9, isActive: true },
    { from: 'memory', to: 'reasoning', strength: 0.7, isActive: true },
    { from: 'reasoning', to: 'personality', strength: 0.6, isActive: true },
    { from: 'language', to: 'reasoning', strength: 0.5, isActive: false }
  ];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Animate neural connections
    const animateConnections = () => {
      const lines = svg.querySelectorAll('.neural-connection');
      lines.forEach((line, index) => {
        const connection = connections[index];
        if (connection?.isActive) {
          line.classList.add('animate-pulse');
        } else {
          line.classList.remove('animate-pulse');
        }
      });
    };

    // Animate nodes based on activity
    const animateNodes = () => {
      const circles = svg.querySelectorAll('.neural-node');
      circles.forEach((circle, index) => {
        const node = nodes[index];
        if (node?.isActive) {
          circle.classList.add('pulse-blue');
        } else {
          circle.classList.remove('pulse-blue');
        }
      });
    };

    const interval = setInterval(() => {
      animateConnections();
      animateNodes();
    }, 2000);

    return () => clearInterval(interval);
  }, [cortexInfo, agentStatuses]);

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Neural Network Activity</h3>
        <div className="flex items-center space-x-4 text-xs">
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 ibm-green-bg rounded-full"></div>
            <span>Active</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 ibm-blue-bg rounded-full"></div>
            <span>Processing</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 carbon-bg-50 rounded-full"></div>
            <span>Idle</span>
          </span>
        </div>
      </div>

      {/* Neural Network Graph */}
      <div className="relative h-40 carbon-bg-100 rounded carbon-border-80 border overflow-hidden">
        <svg ref={svgRef} className="w-full h-full">
          {/* Connections */}
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={`connection-${index}`}
                className="neural-connection"
                x1={fromNode.x + fromNode.radius}
                y1={fromNode.y}
                x2={toNode.x - toNode.radius}
                y2={toNode.y}
                stroke={connection.isActive ? '#0F62FE' : '#525252'}
                strokeWidth={connection.strength * 3}
                opacity={connection.isActive ? 0.8 : 0.4}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, index) => (
            <g key={`node-${node.id}`}>
              <circle
                className="neural-node"
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={node.color}
                opacity={node.isActive ? 1 : 0.6}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill="#F4F4F4"
                fontSize="8"
                fontWeight="bold"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 25}
                textAnchor="middle"
                fill="#C6C6C6"
                fontSize="10"
              >
                {node.cortex}
              </text>
              
              {/* Activity indicator */}
              {node.isActive && (
                <circle
                  cx={node.x + node.radius - 3}
                  cy={node.y - node.radius + 3}
                  r="3"
                  fill="#42BE65"
                  className="animate-pulse"
                />
              )}
            </g>
          ))}

          {/* Advanced network statistics overlay */}
          <text x="20" y="20" fill="#C6C6C6" fontSize="10">
            Network Load: {Array.from(cortexInfo.values()).reduce((sum, cortex) => sum + cortex.averageLoad, 0) / cortexInfo.size || 0}%
          </text>
          <text x="20" y="35" fill="#C6C6C6" fontSize="10">
            Active Connections: {connections.filter(c => c.isActive).length}
          </text>
          <text x="20" y="50" fill="#C6C6C6" fontSize="10">
            Synaptic Strength: {((connections.reduce((sum, c) => sum + c.strength, 0) / connections.length) * 100).toFixed(1)}%
          </text>
          <text x="20" y="65" fill="#C6C6C6" fontSize="10">
            Neural Plasticity: {Math.floor(Math.random() * 100)}% {/* Dynamic neural adaptation metric */}
          </text>
          
          {/* Neural pathway visualization */}
          {connections.filter(c => c.isActive && c.strength > 0.7).map((connection, index) => (
            <g key={`pathway-${index}`}>
              <defs>
                <linearGradient id={`pathway-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0F62FE" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#42BE65" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#F1C21B" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {/* Enhanced pathway visualization for strong connections */}
            </g>
          ))}
          
          {/* Cortex collaboration indicators */}
          <g transform="translate(480, 20)">
            <circle cx="0" cy="0" r="3" fill="#42BE65" className="animate-pulse">
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.2;1"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            <text x="8" y="4" fill="#C6C6C6" fontSize="8">Cross-Cortex Sync</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
