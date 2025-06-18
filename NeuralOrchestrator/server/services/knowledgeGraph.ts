import { storage } from '../storage';
import type { Task, KnowledgeGraphNode, InsertKnowledgeGraphNode } from '@shared/schema';

export interface KnowledgeConnection {
  from: string;
  to: string;
  type: 'depends_on' | 'implements' | 'tests' | 'documents' | 'uses' | 'extends';
  weight: number;
}

export class KnowledgeGraph {
  private semanticCache: Map<string, any> = new Map();
  private graphMetrics: Map<string, any> = new Map();

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

  // Advanced Knowledge Graph Features

  async analyzeSemanticSimilarity(
    projectId: number,
    nodeId1: string,
    nodeId2: string
  ): Promise<{
    similarity: number;
    commonConcepts: string[];
    semanticDistance: number;
    relationshipStrength: number;
  }> {
    const cacheKey = `${nodeId1}_${nodeId2}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey);
    }

    const nodes = await storage.getKnowledgeGraph(projectId);
    const node1 = nodes.find(n => n.nodeId === nodeId1);
    const node2 = nodes.find(n => n.nodeId === nodeId2);

    if (!node1 || !node2) {
      throw new Error('One or both nodes not found');
    }

    // Extract semantic features
    const features1 = this.extractSemanticFeatures(node1);
    const features2 = this.extractSemanticFeatures(node2);

    // Calculate similarity metrics
    const similarity = this.calculateCosineSimilarity(features1.vector, features2.vector);
    const commonConcepts = this.findCommonConcepts(features1.concepts, features2.concepts);
    const semanticDistance = this.calculateSemanticDistance(node1, node2, nodes);
    const relationshipStrength = this.analyzeRelationshipStrength(node1, node2, nodes);

    const result = {
      similarity,
      commonConcepts,
      semanticDistance,
      relationshipStrength
    };

    this.semanticCache.set(cacheKey, result);
    return result;
  }

  async findSemanticClusters(
    projectId: number,
    minSimilarity: number = 0.7
  ): Promise<Array<{
    clusterId: string;
    nodes: string[];
    centralConcepts: string[];
    cohesionScore: number;
  }>> {
    const nodes = await storage.getKnowledgeGraph(projectId);
    const clusters: Array<{
      clusterId: string;
      nodes: string[];
      centralConcepts: string[];
      cohesionScore: number;
    }> = [];

    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.nodeId)) continue;

      const cluster = await this.expandSemanticCluster(
        projectId,
        node.nodeId,
        minSimilarity,
        visited
      );

      if (cluster.nodes.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters.sort((a, b) => b.cohesionScore - a.cohesionScore);
  }

  async suggestKnowledgeConnections(
    projectId: number,
    nodeId: string,
    maxSuggestions: number = 5
  ): Promise<Array<{
    targetNodeId: string;
    connectionType: string;
    confidence: number;
    reasoning: string;
  }>> {
    const nodes = await storage.getKnowledgeGraph(projectId);
    const sourceNode = nodes.find(n => n.nodeId === nodeId);

    if (!sourceNode) {
      throw new Error('Source node not found');
    }

    const suggestions: Array<{
      targetNodeId: string;
      connectionType: string;
      confidence: number;
      reasoning: string;
    }> = [];

    for (const targetNode of nodes) {
      if (targetNode.nodeId === nodeId) continue;

      const similarity = await this.analyzeSemanticSimilarity(
        projectId,
        nodeId,
        targetNode.nodeId
      );

      if (similarity.similarity > 0.6) {
        const connectionType = this.predictConnectionType(sourceNode, targetNode);
        const confidence = this.calculateConnectionConfidence(
          sourceNode,
          targetNode,
          similarity
        );

        suggestions.push({
          targetNodeId: targetNode.nodeId,
          connectionType,
          confidence,
          reasoning: this.generateConnectionReasoning(sourceNode, targetNode, similarity)
        });
      }
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);
  }

  async calculateGraphMetrics(projectId: number): Promise<{
    density: number;
    clustering: number;
    centralityScores: Record<string, number>;
    pathLengths: Record<string, number>;
    communities: Array<{
      id: string;
      nodes: string[];
      modularity: number;
    }>;
  }> {
    const cacheKey = `metrics_${projectId}`;
    if (this.graphMetrics.has(cacheKey)) {
      return this.graphMetrics.get(cacheKey);
    }

    const nodes = await storage.getKnowledgeGraph(projectId);
    const connections = this.extractConnections(nodes);

    // Build adjacency matrix
    const nodeMap = new Map(nodes.map((n, i) => [n.nodeId, i]));
    const adjacencyMatrix = this.buildAdjacencyMatrix(nodes, connections);

    // Calculate metrics
    const density = this.calculateGraphDensity(nodes.length, connections.length);
    const clustering = this.calculateClusteringCoefficient(adjacencyMatrix);
    const centralityScores = this.calculateBetweennessCentrality(nodes, connections);
    const pathLengths = this.calculateAveragePathLengths(adjacencyMatrix);
    const communities = this.detectCommunities(nodes, connections);

    const metrics = {
      density,
      clustering,
      centralityScores,
      pathLengths,
      communities
    };

    this.graphMetrics.set(cacheKey, metrics);
    return metrics;
  }

  async evolveKnowledgeGraph(projectId: number): Promise<{
    newConnections: number;
    strengthenedConnections: number;
    weakenedConnections: number;
    insights: string[];
  }> {
    const nodes = await storage.getKnowledgeGraph(projectId);
    let newConnections = 0;
    let strengthenedConnections = 0;
    let weakenedConnections = 0;
    const insights: string[] = [];

    // Analyze usage patterns and temporal data
    for (const node of nodes) {
      const suggestions = await this.suggestKnowledgeConnections(
        projectId,
        node.nodeId,
        3
      );

      // Add high-confidence connections
      for (const suggestion of suggestions) {
        if (suggestion.confidence > 0.8) {
          await this.addConnection(
            projectId,
            node.nodeId,
            suggestion.targetNodeId,
            suggestion.connectionType,
            suggestion.confidence
          );
          newConnections++;
          insights.push(`Added ${suggestion.connectionType} connection: ${node.nodeId} -> ${suggestion.targetNodeId}`);
        }
      }

      // Strengthen frequently used connections
      const connections = (node.connections as any[]) || [];
      for (const conn of connections) {
        const usage = await this.getConnectionUsage(projectId, node.nodeId, conn.nodeId);
        if (usage.frequency > 0.7) {
          conn.weight = Math.min(1.0, conn.weight * 1.1);
          strengthenedConnections++;
        } else if (usage.frequency < 0.3) {
          conn.weight = Math.max(0.1, conn.weight * 0.9);
          weakenedConnections++;
        }
      }

      // Update node with evolved connections
      await storage.updateKnowledgeNode(node.id, {
        connections,
        metadata: {
          ...node.metadata,
          lastEvolved: new Date()
        }
      });
    }

    // Generate insights about knowledge evolution
    if (newConnections > 5) {
      insights.push(`Knowledge graph is expanding rapidly with ${newConnections} new connections`);
    }

    const metrics = await this.calculateGraphMetrics(projectId);
    if (metrics.density > 0.3) {
      insights.push('Knowledge graph is becoming densely connected, indicating mature domain understanding');
    }

    return {
      newConnections,
      strengthenedConnections,
      weakenedConnections,
      insights
    };
  }

  // Private helper methods for advanced features

  private extractSemanticFeatures(node: KnowledgeGraphNode): {
    vector: number[];
    concepts: string[];
    keywords: string[];
  } {
    const nodeData = node.nodeData as any;
    const concepts: string[] = [];
    const keywords: string[] = [];

    // Extract concepts based on node type
    if (node.nodeType === 'code') {
      concepts.push(...(nodeData.functions || []));
      concepts.push(...(nodeData.imports || []));
      keywords.push(nodeData.language || '');
    } else if (node.nodeType === 'documentation') {
      concepts.push(...(nodeData.sections || []));
      keywords.push(...(nodeData.keywords || []));
    } else if (node.nodeType === 'task') {
      concepts.push(nodeData.priority || '');
      concepts.push(nodeData.status || '');
      keywords.push(...this.extractKeywords(nodeData.description || ''));
    }

    // Create semantic vector (simplified TF-IDF-like approach)
    const vector = this.createSemanticVector(concepts, keywords);

    return { vector, concepts, keywords };
  }

  private calculateCosineSimilarity(vector1: number[], vector2: number[]): number {
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * (vector2[i] || 0), 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }

  private findCommonConcepts(concepts1: string[], concepts2: string[]): string[] {
    return concepts1.filter(concept => concepts2.includes(concept));
  }

  private calculateSemanticDistance(
    node1: KnowledgeGraphNode,
    node2: KnowledgeGraphNode,
    allNodes: KnowledgeGraphNode[]
  ): number {
    // Use breadth-first search to find shortest path
    const nodeMap = new Map(allNodes.map(n => [n.nodeId, n]));
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number }> = [
      { nodeId: node1.nodeId, distance: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;

      if (nodeId === node2.nodeId) {
        return distance;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (node) {
        const connections = (node.connections as any[]) || [];
        for (const conn of connections) {
          if (!visited.has(conn.nodeId)) {
            queue.push({ nodeId: conn.nodeId, distance: distance + 1 });
          }
        }
      }
    }

    return Infinity; // No path found
  }

  private analyzeRelationshipStrength(
    node1: KnowledgeGraphNode,
    node2: KnowledgeGraphNode,
    allNodes: KnowledgeGraphNode[]
  ): number {
    // Check direct connections
    const connections1 = (node1.connections as any[]) || [];
    const connections2 = (node2.connections as any[]) || [];

    const directConnection = connections1.find(c => c.nodeId === node2.nodeId);
    if (directConnection) {
      return directConnection.weight || 0.5;
    }

    // Check indirect connections (mutual connections)
    const mutual = connections1.filter(c1 =>
      connections2.some(c2 => c1.nodeId === c2.nodeId)
    );

    return mutual.length > 0 ? mutual.length * 0.1 : 0;
  }

  private async expandSemanticCluster(
    projectId: number,
    seedNodeId: string,
    minSimilarity: number,
    visited: Set<string>
  ): Promise<{
    clusterId: string;
    nodes: string[];
    centralConcepts: string[];
    cohesionScore: number;
  }> {
    const clusterNodes = [seedNodeId];
    const queue = [seedNodeId];
    visited.add(seedNodeId);

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const relatedNodes = await this.findRelatedNodes(projectId, currentNodeId, 1);

      for (const relatedNode of relatedNodes) {
        if (visited.has(relatedNode.nodeId)) continue;

        const similarity = await this.analyzeSemanticSimilarity(
          projectId,
          seedNodeId,
          relatedNode.nodeId
        );

        if (similarity.similarity >= minSimilarity) {
          clusterNodes.push(relatedNode.nodeId);
          queue.push(relatedNode.nodeId);
          visited.add(relatedNode.nodeId);
        }
      }
    }

    // Extract central concepts
    const nodes = await storage.getKnowledgeGraph(projectId);
    const clusterNodeObjects = nodes.filter(n => clusterNodes.includes(n.nodeId));
    const allConcepts = clusterNodeObjects.flatMap(n => 
      this.extractSemanticFeatures(n).concepts
    );
    const centralConcepts = this.findMostFrequentConcepts(allConcepts, 5);

    // Calculate cohesion score
    const cohesionScore = await this.calculateClusterCohesion(projectId, clusterNodes);

    return {
      clusterId: `cluster_${seedNodeId}`,
      nodes: clusterNodes,
      centralConcepts,
      cohesionScore
    };
  }

  private predictConnectionType(
    sourceNode: KnowledgeGraphNode,
    targetNode: KnowledgeGraphNode
  ): string {
    // Rule-based connection type prediction
    if (sourceNode.nodeType === 'task' && targetNode.nodeType === 'code') {
      return 'generates';
    }
    if (sourceNode.nodeType === 'code' && targetNode.nodeType === 'documentation') {
      return 'documented_by';
    }
    if (sourceNode.nodeType === 'task' && targetNode.nodeType === 'task') {
      return 'depends_on';
    }
    if (sourceNode.nodeType === targetNode.nodeType) {
      return 'relates_to';
    }
    return 'uses';
  }

  private calculateConnectionConfidence(
    sourceNode: KnowledgeGraphNode,
    targetNode: KnowledgeGraphNode,
    similarity: any
  ): number {
    let confidence = similarity.similarity;

    // Boost confidence based on node types
    if (sourceNode.nodeType === 'task' && targetNode.nodeType === 'code') {
      confidence *= 1.2;
    }

    // Boost confidence based on common concepts
    if (similarity.commonConcepts.length > 2) {
      confidence *= 1.1;
    }

    // Boost confidence based on relationship strength
    if (similarity.relationshipStrength > 0.5) {
      confidence *= 1.15;
    }

    return Math.min(1.0, confidence);
  }

  private generateConnectionReasoning(
    sourceNode: KnowledgeGraphNode,
    targetNode: KnowledgeGraphNode,
    similarity: any
  ): string {
    const reasons = [];

    if (similarity.similarity > 0.8) {
      reasons.push('High semantic similarity');
    }

    if (similarity.commonConcepts.length > 0) {
      reasons.push(`Shared concepts: ${similarity.commonConcepts.join(', ')}`);
    }

    if (similarity.relationshipStrength > 0.5) {
      reasons.push('Strong existing relationships');
    }

    if (similarity.semanticDistance < 3) {
      reasons.push('Close in knowledge graph');
    }

    return reasons.join('; ') || 'General semantic relationship';
  }

  private createSemanticVector(concepts: string[], keywords: string[]): number[] {
    // Create a simple semantic vector based on concept and keyword frequency
    const allTerms = [...concepts, ...keywords];
    const termFreq = new Map<string, number>();

    for (const term of allTerms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }

    // Create fixed-size vector (simplified approach)
    const vectorSize = 100;
    const vector = new Array(vectorSize).fill(0);

    for (const [term, freq] of termFreq.entries()) {
      const hash = this.simpleHash(term) % vectorSize;
      vector[hash] += freq;
    }

    return vector;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private buildAdjacencyMatrix(
    nodes: KnowledgeGraphNode[],
    connections: KnowledgeConnection[]
  ): number[][] {
    const size = nodes.length;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));
    const nodeIndexMap = new Map(nodes.map((node, index) => [node.nodeId, index]));

    for (const conn of connections) {
      const fromIndex = nodeIndexMap.get(conn.from);
      const toIndex = nodeIndexMap.get(conn.to);

      if (fromIndex !== undefined && toIndex !== undefined) {
        matrix[fromIndex][toIndex] = conn.weight;
        matrix[toIndex][fromIndex] = conn.weight; // Undirected graph
      }
    }

    return matrix;
  }

  private calculateGraphDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount < 2) return 0;
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxEdges;
  }

  private calculateClusteringCoefficient(adjacencyMatrix: number[][]): number {
    const n = adjacencyMatrix.length;
    let totalCoefficient = 0;

    for (let i = 0; i < n; i++) {
      const neighbors = [];
      for (let j = 0; j < n; j++) {
        if (adjacencyMatrix[i][j] > 0) {
          neighbors.push(j);
        }
      }

      if (neighbors.length < 2) continue;

      let triangles = 0;
      for (let j = 0; j < neighbors.length; j++) {
        for (let k = j + 1; k < neighbors.length; k++) {
          if (adjacencyMatrix[neighbors[j]][neighbors[k]] > 0) {
            triangles++;
          }
        }
      }

      const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
      totalCoefficient += triangles / possibleTriangles;
    }

    return totalCoefficient / n;
  }

  private calculateBetweennessCentrality(
    nodes: KnowledgeGraphNode[],
    connections: KnowledgeConnection[]
  ): Record<string, number> {
    const centrality: Record<string, number> = {};
    
    // Simplified betweenness centrality calculation
    for (const node of nodes) {
      centrality[node.nodeId] = 0;
    }

    // For each pair of nodes, find shortest paths and count how many pass through each node
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const paths = this.findShortestPaths(nodes[i].nodeId, nodes[j].nodeId, nodes, connections);
        
        for (const path of paths) {
          // Skip source and target nodes
          for (let k = 1; k < path.length - 1; k++) {
            centrality[path[k]] += 1 / paths.length;
          }
        }
      }
    }

    return centrality;
  }

  private calculateAveragePathLengths(adjacencyMatrix: number[][]): Record<string, number> {
    // Floyd-Warshall algorithm for all-pairs shortest paths
    const n = adjacencyMatrix.length;
    const dist = adjacencyMatrix.map(row => [...row]);

    // Initialize distances
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          dist[i][j] = 0;
        } else if (dist[i][j] === 0) {
          dist[i][j] = Infinity;
        }
      }
    }

    // Floyd-Warshall
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
          }
        }
      }
    }

    // Calculate average path lengths
    const pathLengths: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j && dist[i][j] !== Infinity) {
          sum += dist[i][j];
          count++;
        }
      }
      pathLengths[i.toString()] = count > 0 ? sum / count : 0;
    }

    return pathLengths;
  }

  private detectCommunities(
    nodes: KnowledgeGraphNode[],
    connections: KnowledgeConnection[]
  ): Array<{
    id: string;
    nodes: string[];
    modularity: number;
  }> {
    // Simplified community detection using modularity optimization
    const communities: Array<{
      id: string;
      nodes: string[];
      modularity: number;
    }> = [];

    // Group nodes by type as initial communities
    const typeGroups = new Map<string, string[]>();
    for (const node of nodes) {
      const group = typeGroups.get(node.nodeType) || [];
      group.push(node.nodeId);
      typeGroups.set(node.nodeType, group);
    }

    for (const [type, nodeIds] of typeGroups.entries()) {
      if (nodeIds.length > 1) {
        const modularity = this.calculateModularity(nodeIds, connections);
        communities.push({
          id: `community_${type}`,
          nodes: nodeIds,
          modularity
        });
      }
    }

    return communities;
  }

  private calculateModularity(communityNodes: string[], connections: KnowledgeConnection[]): number {
    const totalEdges = connections.length;
    let intraEdges = 0;
    let totalDegree = 0;

    // Count edges within community
    for (const conn of connections) {
      if (communityNodes.includes(conn.from) && communityNodes.includes(conn.to)) {
        intraEdges++;
      }
      if (communityNodes.includes(conn.from) || communityNodes.includes(conn.to)) {
        totalDegree++;
      }
    }

    if (totalEdges === 0) return 0;

    const expectedIntraEdges = (totalDegree * totalDegree) / (4 * totalEdges);
    return (intraEdges - expectedIntraEdges) / totalEdges;
  }

  private findShortestPaths(
    source: string,
    target: string,
    nodes: KnowledgeGraphNode[],
    connections: KnowledgeConnection[]
  ): string[][] {
    // Simplified shortest path finding (returns one path)
    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: source, path: [source] }
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === target) {
        return [path];
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const connectedNodes = connections
        .filter(c => c.from === nodeId || c.to === nodeId)
        .map(c => c.from === nodeId ? c.to : c.from);

      for (const connectedNode of connectedNodes) {
        if (!visited.has(connectedNode)) {
          queue.push({
            nodeId: connectedNode,
            path: [...path, connectedNode]
          });
        }
      }
    }

    return [];
  }

  private findMostFrequentConcepts(concepts: string[], limit: number): string[] {
    const frequency = new Map<string, number>();
    
    for (const concept of concepts) {
      frequency.set(concept, (frequency.get(concept) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([concept]) => concept);
  }

  private async calculateClusterCohesion(
    projectId: number,
    nodeIds: string[]
  ): Promise<number> {
    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const similarity = await this.analyzeSemanticSimilarity(
          projectId,
          nodeIds[i],
          nodeIds[j]
        );
        totalSimilarity += similarity.similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  private async addConnection(
    projectId: number,
    fromNodeId: string,
    toNodeId: string,
    connectionType: string,
    weight: number
  ): Promise<void> {
    const nodes = await storage.getKnowledgeGraph(projectId);
    const fromNode = nodes.find(n => n.nodeId === fromNodeId);

    if (!fromNode) return;

    const connections = (fromNode.connections as any[]) || [];
    const existingConnection = connections.find(c => c.nodeId === toNodeId);

    if (existingConnection) {
      existingConnection.weight = Math.max(existingConnection.weight, weight);
    } else {
      connections.push({
        nodeId: toNodeId,
        type: connectionType,
        weight
      });
    }

    await storage.updateKnowledgeNode(fromNode.id, {
      connections,
      metadata: {
        ...fromNode.metadata,
        lastUpdated: new Date()
      }
    });
  }

  private async getConnectionUsage(
    projectId: number,
    fromNodeId: string,
    toNodeId: string
  ): Promise<{ frequency: number; lastUsed: Date | null }> {
    // This would typically query usage logs or activity data
    // For now, returning mock data based on connection weight
    const nodes = await storage.getKnowledgeGraph(projectId);
    const fromNode = nodes.find(n => n.nodeId === fromNodeId);

    if (!fromNode) {
      return { frequency: 0, lastUsed: null };
    }

    const connections = (fromNode.connections as any[]) || [];
    const connection = connections.find(c => c.nodeId === toNodeId);

    return {
      frequency: connection ? connection.weight : 0,
      lastUsed: connection ? new Date() : null
    };
  }
}

export const knowledgeGraph = new KnowledgeGraph();

export const knowledgeGraph = new KnowledgeGraph();
