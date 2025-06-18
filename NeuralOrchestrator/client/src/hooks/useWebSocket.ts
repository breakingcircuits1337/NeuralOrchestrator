import { useEffect, useRef, useState } from 'react';
import { useIDEStore } from '@/stores/ideStore';
import { AgentStatusUpdate } from '@/types/agent';
import { OrchestrationUpdate } from '@/types/project';

interface WebSocketMessage {
  type: string;
  data?: any;
  projectId?: number;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const {
    setIsConnected: setStoreConnected,
    updateAgentStatus,
    addOrchestrationUpdate,
    setSystemMetrics
  } = useIDEStore();

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setStoreConnected(true);
        
        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setStoreConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setStoreConnected(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      setStoreConnected(false);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'agent_status_update':
        if (message.data) {
          // Update multiple agent statuses
          Object.entries(message.data).forEach(([agentId, status]) => {
            updateAgentStatus(agentId, status as AgentStatusUpdate);
          });
        }
        break;
        
      case 'orchestration_update':
        if (message.data) {
          addOrchestrationUpdate(message.data as OrchestrationUpdate);
        }
        break;
        
      case 'orchestration_complete':
        if (message.data) {
          addOrchestrationUpdate({
            type: 'progress_update',
            message: 'Project orchestration completed successfully!',
            progress: 100
          });
        }
        break;
        
      case 'orchestration_error':
        if (message.data) {
          addOrchestrationUpdate({
            type: 'progress_update',
            message: `Orchestration error: ${message.data.error}`,
            progress: 0
          });
        }
        break;
        
      case 'system_metrics':
        if (message.data) {
          setSystemMetrics(message.data);
        }
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.data);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  };

  const requestAgentStatus = () => {
    sendMessage({ type: 'agent_status_request' });
  };

  const startProjectOrchestration = (goal: string, projectId: number) => {
    sendMessage({
      type: 'project_orchestration_request',
      data: { goal, projectId }
    });
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    sendMessage,
    requestAgentStatus,
    startProjectOrchestration
  };
}
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  startProjectOrchestration: (goal: string, projectId: number) => void;
  joinProject: (projectId: number) => void;
}

export function useWebSocket(): WebSocketHook {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('orchestration_update', (update) => {
      console.log('Orchestration update:', update);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const startProjectOrchestration = useCallback((goal: string, projectId: number) => {
    if (socket) {
      socket.emit('start_orchestration', { goal, projectId });
    }
  }, [socket]);

  const joinProject = useCallback((projectId: number) => {
    if (socket) {
      socket.emit('join-project', projectId);
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    startProjectOrchestration,
    joinProject
  };
}
