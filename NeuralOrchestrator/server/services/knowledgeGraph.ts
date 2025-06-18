import { storage } from '../storage';
import type { Task, KnowledgeGraphNode, InsertKnowledgeGraphNode } from '@shared/schema';

export interface KnowledgeConnection {
  from: string;
  to: string;
  type: 'depends_on' | 'implements' | 'tests' | 'documents' | 'uses' | 'extends';
  weight: number;
}

export class KnowledgeGraph {
  async addTaskKnowledge(task: Task, output: any): Promise<void> {
    try {
      // Create knowledge node for the task
      const taskNode: InsertKnowledgeGraphNode = {
        projectId: task.projectId,
        nodeType: 'task',
        nodeId: task.id.toString(),
        nodeData: {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          outputs: [output]
        },
        connections: this.generateTaskConnections(task),
        metadata: {
          phaseId: task.phaseId,
          createdAt: new Date(),
          agentIds: task.assignedAgents
        }
      };

      await storage.createKnowledgeNode(taskNode);

      // Create knowledge node for the output
      if (output.type === 'code') {
        await this.addCodeKnowledge(task.projectId, output, task.id.toString());
      } else if (output.type === 'documentation') {
        await this.addDocumentationKnowledge(task.projectId, output, task.id.toString());
      }

    } catch (error) {
      console.error('Error adding task knowledge:', error);
    }
  }

  private async addCodeKnowledge(
    projectId: number, 
    codeOutput: any, 
    taskId: string
  ): Promise<void> {
    const codeNode: InsertKnowledgeGraphNode = {
      projectId,
      nodeType: 'code',
      nodeId: `code_${taskId}`,
      nodeData: {
        content: codeOutput.content,
        language: codeOutput.metadata?.language || 'typescript',
        quality: codeOutput.metadata?.quality || 0,
        functions: this.extractFunctions(codeOutput.content),
        imports: this.extractImports(codeOutput.content),
        exports: this.extractExports(codeOutput.content)
      },
      connections: [
        {
          nodeId: taskId,
          type: 'generated_by',
          weight: 1.0
        }
      ],
      metadata: {
        agentIds: codeOutput.metadata?.agentIds || [],
        analyzedAt: new Date()
      }
    };

    await storage.createKnowledgeNode(codeNode);
  }

  private async addDocumentationKnowledge(
    projectId: number,
    docOutput: any,
    taskId: string
  ): Promise<void> {
    const docNode: InsertKnowledgeGraphNode = {
      projectId,
      nodeType: 'documentation',
      nodeId: `doc_${taskId}`,
      nodeData: {
        content: docOutput.content,
        format: docOutput.metadata?.format || 'markdown',
        completeness: docOutput.metadata?.completeness || 0,
        sections: this.extractDocSections(docOutput.content),
        keywords: this.extractKeywords(docOutput.content)
      },
      connections: [
        {
          nodeId: taskId,
          type: 'documents',
          weight: 1.0
        }
      ],
      metadata: {
        agentIds: docOutput.metadata?.agentIds || [],
        analyzedAt: new Date()
      }
    };

    await storage.createKnowledgeNode(docNode);
  }

  async getProjectKnowledge(projectId: number): Promise<{
    nodes: KnowledgeGraphNode[];
    connections: KnowledgeConnection[];
    statistics: {
      totalNodes: number;
      nodeTypes: Record<string, number>;
      connectionTypes: Record<string, number>;
    };
  }> {
    const nodes = await storage.getKnowledgeGraph(projectId);
    const connections = this.extractConnections(nodes);
    
    const statistics = {
      totalNodes: nodes.length,
      nodeTypes: this.countNodeTypes(nodes),
      connectionTypes: this.countConnectionTypes(connections)
    };

    return {
      nodes,
      connections,
      statistics
    };
  }

  async findRelatedNodes(
    projectId: number, 
    nodeId: string, 
    maxDepth: number = 2
  ): Promise<KnowledgeGraphNode[]> {
    const allNodes = await storage.getKnowledgeGraph(projectId);
    const nodeMap = new Map(allNodes.map(node => [node.nodeId, node]));
    
    const visited = new Set<string>();
    const result: KnowledgeGraphNode[] = [];
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId: currentNodeId, depth } = queue.shift()!;
      
      if (visited.has(currentNodeId) || depth > maxDepth) {
        continue;
      }

      visited.add(currentNodeId);
      const node = nodeMap.get(currentNodeId);
      
      if (node) {
        result.push(node);
        
        // Add connected nodes to queue
        const connections = (node.connections as any[]) || [];
        for (const connection of connections) {
          if (!visited.has(connection.nodeId)) {
            queue.push({ nodeId: connection.nodeId, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  private generateTaskConnections(task: Task): any[] {
    const connections: any[] = [];
    
    // Add dependencies
    if (task.dependencies && Array.isArray(task.dependencies)) {
      for (const depId of task.dependencies) {
        connections.push({
          nodeId: depId.toString(),
          type: 'depends_on',
          weight: 0.8
        });
      }
    }

    return connections;
  }

  private extractFunctions(code: string): string[] {
    const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\()/g;
    const functions: string[] = [];
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName && !functions.includes(functionName)) {
        functions.push(functionName);
      }
    }

    return functions;
  }

  private extractImports(code: string): string[] {
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private extractExports(code: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    const exports: string[] = [];
    let match;

    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  private extractDocSections(content: string): string[] {
    const sectionRegex = /^#+\s+(.+)$/gm;
    const sections: string[] = [];
    let match;

    while ((match = sectionRegex.exec(content)) !== null) {
      sections.push(match[1].trim());
    }

    return sections;
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount = new Map<string, number>();
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private extractConnections(nodes: KnowledgeGraphNode[]): KnowledgeConnection[] {
    const connections: KnowledgeConnection[] = [];
    
    for (const node of nodes) {
      const nodeConnections = (node.connections as any[]) || [];
      for (const conn of nodeConnections) {
        connections.push({
          from: node.nodeId,
          to: conn.nodeId,
          type: conn.type,
          weight: conn.weight || 1.0
        });
      }
    }

    return connections;
  }

  private countNodeTypes(nodes: KnowledgeGraphNode[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      counts[node.nodeType] = (counts[node.nodeType] || 0) + 1;
    }
    return counts;
  }

  private countConnectionTypes(connections: KnowledgeConnection[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const conn of connections) {
      counts[conn.type] = (counts[conn.type] || 0) + 1;
    }
    return counts;
  }
}

export const knowledgeGraph = new KnowledgeGraph();
