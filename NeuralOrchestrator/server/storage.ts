import { 
  users, projects, agents, projectPhases, tasks, agentSessions, 
  codeExecutions, knowledgeGraph,
  type User, type InsertUser, type Project, type InsertProject,
  type Agent, type InsertAgent, type ProjectPhase, type InsertProjectPhase,
  type Task, type InsertTask, type AgentSession, type InsertAgentSession,
  type CodeExecution, type InsertCodeExecution, type KnowledgeGraphNode,
  type InsertKnowledgeGraphNode
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
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
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
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

  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(insertAgent).returning();
    return agent;
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
  async getTasks(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(tasks.createdAt);
  }

  async getTasksByPhase(phaseId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.phaseId, phaseId)).orderBy(tasks.createdAt);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
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
  async getKnowledgeGraph(projectId: number): Promise<KnowledgeGraphNode[]> {
    return await db.select().from(knowledgeGraph).where(eq(knowledgeGraph.projectId, projectId));
  }

  async createKnowledgeNode(insertNode: InsertKnowledgeGraphNode): Promise<KnowledgeGraphNode> {
    const [node] = await db.insert(knowledgeGraph).values(insertNode).returning();
    return node;
  }

  async updateKnowledgeNode(id: number, updates: Partial<KnowledgeGraphNode>): Promise<KnowledgeGraphNode> {
    const [node] = await db.update(knowledgeGraph).set({ ...updates, updatedAt: new Date() }).where(eq(knowledgeGraph.id, id)).returning();
    return node;
  }
}

export const storage = new DatabaseStorage();
