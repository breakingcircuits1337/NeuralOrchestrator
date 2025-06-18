import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  cortex: varchar("cortex", { length: 50 }).notNull(),
  llmProvider: varchar("llm_provider", { length: 50 }).notNull(),
  specializations: jsonb("specializations"),
  status: varchar("status", { length: 20 }).default("idle"),
  workload: integer("workload").default(0),
  expertise: jsonb("expertise"),
  performance: jsonb("performance"),
  connections: jsonb("connections"),
  memory: jsonb("memory"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  phaseNumber: integer("phase_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending"),
  progress: integer("progress").default(0),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  assignedAgents: jsonb("assigned_agents"),
  dependencies: jsonb("dependencies"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").references(() => projectPhases.id),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  status: varchar("status", { length: 20 }).default("pending"),
  progress: integer("progress").default(0),
  estimatedTime: integer("estimated_time"),
  assignedAgents: jsonb("assigned_agents"),
  dependencies: jsonb("dependencies"),
  outputs: jsonb("outputs"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const agentSessions = pgTable("agent_sessions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  agentId: uuid("agent_id").references(() => agents.id),
  sessionType: varchar("session_type", { length: 50 }).notNull(),
  messages: jsonb("messages"),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const codeExecutions = pgTable("code_executions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  code: text("code").notNull(),
  language: varchar("language", { length: 50 }).notNull(),
  output: text("output"),
  success: boolean("success").default(false),
  executionTime: integer("execution_time"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const knowledgeGraph = pgTable("knowledge_graph", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  nodeType: varchar("node_type", { length: 50 }).notNull(),
  nodeId: text("node_id").notNull(),
  nodeData: jsonb("node_data").notNull(),
  connections: jsonb("connections"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  phases: many(projectPhases),
  tasks: many(tasks),
  agentSessions: many(agentSessions),
  codeExecutions: many(codeExecutions),
  knowledgeNodes: many(knowledgeGraph),
}));

export const projectPhasesRelations = relations(projectPhases, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectPhases.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  phase: one(projectPhases, {
    fields: [tasks.phaseId],
    references: [projectPhases.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  codeExecutions: many(codeExecutions),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  project: one(projects, {
    fields: [agentSessions.projectId],
    references: [projects.id],
  }),
  agent: one(agents, {
    fields: [agentSessions.agentId],
    references: [agents.id],
  }),
}));

export const codeExecutionsRelations = relations(codeExecutions, ({ one }) => ({
  project: one(projects, {
    fields: [codeExecutions.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [codeExecutions.taskId],
    references: [tasks.id],
  }),
}));

export const knowledgeGraphRelations = relations(knowledgeGraph, ({ one }) => ({
  project: one(projects, {
    fields: [knowledgeGraph.projectId],
    references: [projects.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertAgentSessionSchema = createInsertSchema(agentSessions).omit({
  id: true,
  createdAt: true,
  endedAt: true,
});

export const insertCodeExecutionSchema = createInsertSchema(codeExecutions).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeGraphSchema = createInsertSchema(knowledgeGraph).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type ProjectPhase = typeof projectPhases.$inferSelect;
export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = z.infer<typeof insertAgentSessionSchema>;

export type CodeExecution = typeof codeExecutions.$inferSelect;
export type InsertCodeExecution = z.infer<typeof insertCodeExecutionSchema>;

export type KnowledgeGraphNode = typeof knowledgeGraph.$inferSelect;
export type InsertKnowledgeGraphNode = z.infer<typeof insertKnowledgeGraphSchema>;
