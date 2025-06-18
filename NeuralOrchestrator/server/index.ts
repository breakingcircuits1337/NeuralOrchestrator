import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { registerRoutes } from './routes';
import { agentNetwork } from './services/agentNetwork';
import { projectOrchestrator } from './services/projectOrchestrator';
import { storage } from './storage';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('../client/dist'));

// Setup routes
await registerRoutes(app);

// WebSocket setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally for other services
declare global {
  var io: SocketIOServer;
}
global.io = io;

// Initialize services
async function initializeServices() {
  console.log('Initializing Neural Orchestrator services...');

  try {
    // Initialize database
    await storage.initialize();
    console.log('Database initialized');

    // Initialize agent network
    await agentNetwork.initialize();
    console.log('Agent network initialized');

    // Initialize project orchestrator
    await projectOrchestrator.initialize();
    console.log('Project orchestrator initialized');

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

initializeServices().catch(console.error);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Neural Orchestrator server running on port ${PORT}`);
});