
import { Request, Response } from 'express';
import { knowledgeGraph } from '../services/knowledgeGraph';

export const knowledgeGraphRoutes = {
  // Get project knowledge graph with statistics
  async getProjectKnowledge(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const knowledge = await knowledgeGraph.getProjectKnowledge(parseInt(projectId));
      res.json(knowledge);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Analyze semantic similarity between nodes
  async analyzeSemanticSimilarity(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { nodeId1, nodeId2 } = req.body;
      
      const similarity = await knowledgeGraph.analyzeSemanticSimilarity(
        parseInt(projectId),
        nodeId1,
        nodeId2
      );
      
      res.json(similarity);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Find semantic clusters in the knowledge graph
  async findSemanticClusters(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { minSimilarity = 0.7 } = req.query;
      
      const clusters = await knowledgeGraph.findSemanticClusters(
        parseInt(projectId),
        parseFloat(minSimilarity as string)
      );
      
      res.json({ clusters });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get knowledge connection suggestions
  async suggestConnections(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { nodeId, maxSuggestions = 5 } = req.query;
      
      const suggestions = await knowledgeGraph.suggestKnowledgeConnections(
        parseInt(projectId),
        nodeId as string,
        parseInt(maxSuggestions as string)
      );
      
      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Calculate advanced graph metrics
  async calculateGraphMetrics(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const metrics = await knowledgeGraph.calculateGraphMetrics(parseInt(projectId));
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Evolve knowledge graph through machine learning
  async evolveKnowledgeGraph(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const evolution = await knowledgeGraph.evolveKnowledgeGraph(parseInt(projectId));
      res.json(evolution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Find related nodes with depth control
  async findRelatedNodes(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { nodeId, maxDepth = 2 } = req.query;
      
      const relatedNodes = await knowledgeGraph.findRelatedNodes(
        parseInt(projectId),
        nodeId as string,
        parseInt(maxDepth as string)
      );
      
      res.json({ relatedNodes });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
