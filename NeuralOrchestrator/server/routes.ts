import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { aiOrchestrator } from "./services/aiOrchestrator";
import { agentNetwork } from "./services/agentNetwork";
import { projectOrchestrator } from "./services/projectOrchestrator";
import { insertProjectSchema, insertTaskSchema, insertAgentSessionSchema } from "@shared/schema";
import { z } from "zod";
import { knowledgeGraphRoutes } from './routes/knowledgeGraph';
import { Request, Response } from 'express';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);

    console.log(`Client ${clientId} connected`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'agent_status_request':
            const agentStatuses = await agentNetwork.getAgentStatuses();
            ws.send(JSON.stringify({
              type: 'agent_status_update',
              data: agentStatuses
            }));
            break;

          case 'project_orchestration_request':
            const orchestrationResult = await projectOrchestrator.orchestrateProject(
              message.data.goal,
              message.data.projectId,
              (update) => {
                ws.send(JSON.stringify({
                  type: 'orchestration_update',
                  data: update
                }));
              }
            );

            ws.send(JSON.stringify({
              type: 'orchestration_complete',
              data: orchestrationResult
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: error.message }
        }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    });
  });

  // Broadcast function for server-side events
  const broadcast = (message: any) => {
    clients.forEach((client, clientId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      } else {
        clients.delete(clientId);
      }
    });
  };

  // REST API Routes

  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      // For now, get projects for user ID 1 (would normally come from auth)
      const projects = await storage.getProjectsByUser(1);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse({
        ...req.body,
        userId: 1 // Would normally come from auth
      });

      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Agents
  app.get("/api/agents", async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agents/cortex/:cortex", async (req, res) => {
    try {
      const agents = await storage.getAgentsByCortex(req.params.cortex);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agents/status", async (req, res) => {
    try {
      const statuses = await agentNetwork.getAgentStatuses();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Project Phases and Tasks
  app.get("/api/projects/:id/phases", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const phases = await storage.getProjectPhases(projectId);
      res.json(phases);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get project tasks
  app.get('/api/projects/:id/tasks', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Knowledge Graph endpoints
  app.get('/api/projects/:projectId/knowledge', knowledgeGraphRoutes.getProjectKnowledge);
  app.post('/api/projects/:projectId/knowledge/similarity', knowledgeGraphRoutes.analyzeSemanticSimilarity);
  app.get('/api/projects/:projectId/knowledge/clusters', knowledgeGraphRoutes.findSemanticClusters);
  app.get('/api/projects/:projectId/knowledge/suggestions', knowledgeGraphRoutes.suggestConnections);
  app.get('/api/projects/:projectId/knowledge/metrics', knowledgeGraphRoutes.calculateGraphMetrics);
  app.post('/api/projects/:projectId/knowledge/evolve', knowledgeGraphRoutes.evolveKnowledgeGraph);
  app.get('/api/projects/:projectId/knowledge/related', knowledgeGraphRoutes.findRelatedNodes);

  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({ 
      status: "online", 
      timestamp: new Date().toISOString(),
      agents: agentNetwork ? await agentNetwork.getAgentStatuses().then(statuses => statuses.size) : 0
    });
  });

  // AI Orchestration
  app.post("/api/projects/:id/orchestrate", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { goal } = req.body;

      if (!goal) {
        return res.status(400).json({ error: "Goal is required" });
      }

      // Start orchestration asynchronously
      projectOrchestrator.orchestrateProject(goal, projectId, (update) => {
        broadcast({
          type: 'orchestration_update',
          projectId,
          data: update
        });
      }).then((result) => {
        broadcast({
          type: 'orchestration_complete',
          projectId,
          data: result
        });
      }).catch((error) => {
        broadcast({
          type: 'orchestration_error',
          projectId,
          data: { error: error.message }
        });
      });

      res.json({ message: "Orchestration started", projectId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Code Generation
  app.post("/api/projects/:id/generate-code", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { prompt, language = "typescript" } = req.body;

      const result = await aiOrchestrator.generateCode(prompt, projectId, language);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Agent Sessions
  app.get("/api/projects/:id/sessions", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const sessions = await storage.getAgentSessions(projectId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/sessions", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const validatedData = insertAgentSessionSchema.parse({
        ...req.body,
        projectId
      });

      const session = await storage.createAgentSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Knowledge Graph
  app.get("/api/projects/:id/knowledge-graph", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const knowledgeGraph = await storage.getKnowledgeGraph(projectId);
      res.json(knowledgeGraph);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize agent network on startup
  agentNetwork.initialize().catch(console.error);

  return httpServer;
}