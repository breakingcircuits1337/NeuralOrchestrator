import { 
  users, projects, agents, projectPhases, tasks, agentSessions, 
  codeExecutions, knowledgeGraph,
  type User, type InsertUser, type Project, type InsertProject,
  type Agent, type InsertAgent, type ProjectPhase, type InsertProjectPhase,
  type Task, type InsertTask, type AgentSession, type InsertAgentSession,
  type CodeExecution, type InsertCodeExecution, type KnowledgeGraphNode,
  type InsertKnowledgeGraphNode
} from "@shared/schema";
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '@shared/schema';

const sqlite = new Database('./database.db');
export const db = drizzle(sqlite, { schema });

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project>;

  // Agents
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentsByCortex(cortex: string): Promise<Agent[]>;
  getAgentsByRole(role: string): Promise<Agent[]>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, updates: Partial<Agent>): Promise<Agent>;

  // Project Phases
  getProjectPhases(projectId: number): Promise<ProjectPhase[]>;
  createProjectPhase(phase: InsertProjectPhase): Promise<ProjectPhase>;
  updateProjectPhase(id: number, updates: Partial<ProjectPhase>): Promise<ProjectPhase>;

  // Tasks
  getTasks(projectId: number): Promise<Task[]>;
  getTasksByPhase(phaseId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;

  // Agent Sessions
  getAgentSessions(projectId: number): Promise<AgentSession[]>;
  createAgentSession(session: InsertAgentSession): Promise<AgentSession>;
  updateAgentSession(id: number, updates: Partial<AgentSession>): Promise<AgentSession>;

  // Code Executions
  getCodeExecutions(projectId: number): Promise<CodeExecution[]>;
  createCodeExecution(execution: InsertCodeExecution): Promise<CodeExecution>;

  // Knowledge Graph
  getKnowledgeGraph(projectId: number): Promise<KnowledgeGraphNode[]>;
  createKnowledgeNode(node: InsertKnowledgeGraphNode): Promise<KnowledgeGraphNode>;
  updateKnowledgeNode(id: number, updates: Partial<KnowledgeGraphNode>): Promise<KnowledgeGraphNode>;

  initialize(): Promise<void>;
  getProjects(): Promise<any[]>;
  createProject(data: { name: string; description?: string }): Promise<any>;
  getProject(id: number): Promise<any>;
  getAgents(projectId?: number): Promise<any[]>;
  createAgent(data: any): Promise<any>;
  getTasks(projectId: number): Promise<any[]>;
  createTask(data: any): Promise<any>;
  getKnowledgeGraph(projectId: number): Promise<any[]>;
  createKnowledgeNode(data: any): Promise<any>;
  updateKnowledgeNode(id: number, data: any): Promise<any>;
}

export const storage: IStorage = {
  async initialize() {
    try {
      console.log('Initializing database...');

      // Create tables if they don't exist
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL,
          status TEXT DEFAULT 'idle',
          current_task_id INTEGER,
          llm_provider TEXT NOT NULL,
          project_id INTEGER,
          capabilities TEXT,
          performance_metrics TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id),
          FOREIGN KEY (current_task_id) REFERENCES tasks (id)
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          phase_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          priority TEXT DEFAULT 'medium',
          assigned_agents TEXT,
          dependencies TEXT,
          outputs TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id)
        );

        CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          node_type TEXT NOT NULL,
          node_id TEXT NOT NULL,
          node_data TEXT,
          connections TEXT,
          metadata TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects (id)
        );

        CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_project ON knowledge_graph_nodes(project_id);
        CREATE INDEX IF NOT EXISTS idx_knowledge_node_id ON knowledge_graph_nodes(node_id);
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  },

  async getProjects() {
    const stmt = sqlite.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    return stmt.all();
  },

  async createProject(data: { name: string; description?: string }) {
    const stmt = sqlite.prepare(
      'INSERT INTO projects (name, description) VALUES (?, ?) RETURNING *'
    );
    return stmt.get(data.name, data.description || null);
  },

  async getProject(id: number) {
    const stmt = sqlite.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id);
  },

  async getAgents(projectId?: number) {
    let query = 'SELECT * FROM agents';
    let params: any[] = [];

    if (projectId) {
      query += ' WHERE project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = sqlite.prepare(query);
    return stmt.all(...params);
  },

  async createAgent(data: any) {
    const stmt = sqlite.prepare(`
      INSERT INTO agents (role, status, llm_provider, project_id, capabilities, performance_metrics)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING *
    `);
    return stmt.get(
      data.role,
      data.status || 'idle',
      data.llmProvider,
      data.projectId || null,
      JSON.stringify(data.capabilities || []),
      JSON.stringify(data.performanceMetrics || {})
    );
  },

  async getTasks(projectId: number) {
    const stmt = sqlite.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC');
    return stmt.all(projectId);
  },

  async createTask(data: any) {
    const stmt = sqlite.prepare(`
      INSERT INTO tasks (project_id, phase_id, title, description, status, priority, assigned_agents, dependencies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
    `);
    return stmt.get(
      data.projectId,
      data.phaseId || null,
      data.title,
      data.description || null,
      data.status || 'pending',
      data.priority || 'medium',
      JSON.stringify(data.assignedAgents || []),
      JSON.stringify(data.dependencies || [])
    );
  },

  async getKnowledgeGraph(projectId: number) {
    const stmt = sqlite.prepare('SELECT * FROM knowledge_graph_nodes WHERE project_id = ?');
    const rows = stmt.all(projectId);

    return rows.map(row => ({
      ...row,
      nodeData: JSON.parse(row.node_data || '{}'),
      connections: JSON.parse(row.connections || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  },

  async createKnowledgeNode(data: any) {
    const stmt = sqlite.prepare(`
      INSERT INTO knowledge_graph_nodes (project_id, node_type, node_id, node_data, connections, metadata)
      VALUES (?, ?, ?, ?, ?, ?) RETURNING *
    `);
    return stmt.get(
      data.projectId,
      data.nodeType,
      data.nodeId,
      JSON.stringify(data.nodeData || {}),
      JSON.stringify(data.connections || []),
      JSON.stringify(data.metadata || {})
    );
  },

  async updateKnowledgeNode(id: number, data: any) {
    const stmt = sqlite.prepare(`
      UPDATE knowledge_graph_nodes 
      SET node_data = ?, connections = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? RETURNING *
    `);
    return stmt.get(
      JSON.stringify(data.nodeData || {}),
      JSON.stringify(data.connections || []),
      JSON.stringify(data.metadata || {}),
      id
    );
  },

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Projects
  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project> {
    const [project] = await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return project;
  }

  // Agents
  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async getAgentsByCortex(cortex: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.cortex, cortex));
  }

  async getAgentsByRole(role: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.role, role));
  }

  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
    const [agent] = await db.update(agents).set({ ...updates, updatedAt: new Date() }).where(eq(agents.id, id)).returning();
    return agent;
  }

  // Project Phases
  async getProjectPhases(projectId: number): Promise<ProjectPhase[]> {
    return await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId)).orderBy(projectPhases.phaseNumber);
  }

  async createProjectPhase(insertPhase: InsertProjectPhase): Promise<ProjectPhase> {
    const [phase] = await db.insert(projectPhases).values(insertPhase).returning();
    return phase;
  }

  async updateProjectPhase(id: number, updates: Partial<ProjectPhase>): Promise<ProjectPhase> {
    const [phase] = await db.update(projectPhases).set({ ...updates, updatedAt: new Date() }).where(eq(projectPhases.id, id)).returning();
    return phase;
  }

  // Tasks
  async getTasksByPhase(phaseId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.phaseId, phaseId)).orderBy(tasks.createdAt);
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return task;
  }

  // Agent Sessions
  async getAgentSessions(projectId: number): Promise<AgentSession[]> {
    return await db.select().from(agentSessions).where(eq(agentSessions.projectId, projectId)).orderBy(desc(agentSessions.createdAt));
  }

  async createAgentSession(insertSession: InsertAgentSession): Promise<AgentSession> {
    const [session] = await db.insert(agentSessions).values(insertSession).returning();
    return session;
  }

  async updateAgentSession(id: number, updates: Partial<AgentSession>): Promise<AgentSession> {
    const [session] = await db.update(agentSessions).set(updates).where(eq(agentSessions.id, id)).returning();
    return session;
  }

  // Code Executions
  async getCodeExecutions(projectId: number): Promise<CodeExecution[]> {
    return await db.select().from(codeExecutions).where(eq(codeExecutions.projectId, projectId)).orderBy(desc(codeExecutions.createdAt));
  }

  async createCodeExecution(insertExecution: InsertCodeExecution): Promise<CodeExecution> {
    const [execution] = await db.insert(codeExecutions).values(insertExecution).returning();
    return execution;
  }

  // Knowledge Graph
  async createKnowledgeNode(insertNode: InsertKnowledgeGraphNode): Promise<KnowledgeGraphNode> {
    const [node] = await db.insert(knowledgeGraph).values(insertNode).returning();
    return node;
  }

  
};