
import { useState, useCallback } from 'react';

export interface KnowledgeGraphData {
  nodes: any[];
  connections: any[];
  statistics: {
    totalNodes: number;
    nodeTypes: Record<string, number>;
    connectionTypes: Record<string, number>;
  };
}

export interface SemanticSimilarity {
  similarity: number;
  commonConcepts: string[];
  semanticDistance: number;
  relationshipStrength: number;
}

export interface ConnectionSuggestion {
  targetNodeId: string;
  connectionType: string;
  confidence: number;
  reasoning: string;
}

export function useKnowledgeGraph(projectId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getKnowledgeGraph = useCallback(async (): Promise<KnowledgeGraphData | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/knowledge`);
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge graph');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const analyzeSemanticSimilarity = useCallback(async (
    nodeId1: string,
    nodeId2: string
  ): Promise<SemanticSimilarity | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/knowledge/similarity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeId1, nodeId2 }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze semantic similarity');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const findSemanticClusters = useCallback(async (minSimilarity: number = 0.7) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/knowledge/clusters?minSimilarity=${minSimilarity}`
      );

      if (!response.ok) {
        throw new Error('Failed to find semantic clusters');
      }

      const data = await response.json();
      return data.clusters;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const suggestConnections = useCallback(async (
    nodeId: string,
    maxSuggestions: number = 5
  ): Promise<ConnectionSuggestion[] | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/knowledge/suggestions?nodeId=${nodeId}&maxSuggestions=${maxSuggestions}`
      );

      if (!response.ok) {
        throw new Error('Failed to get connection suggestions');
      }

      const data = await response.json();
      return data.suggestions;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const calculateGraphMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/knowledge/metrics`);
      if (!response.ok) {
        throw new Error('Failed to calculate graph metrics');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const evolveKnowledgeGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/knowledge/evolve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to evolve knowledge graph');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const findRelatedNodes = useCallback(async (
    nodeId: string,
    maxDepth: number = 2
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/knowledge/related?nodeId=${nodeId}&maxDepth=${maxDepth}`
      );

      if (!response.ok) {
        throw new Error('Failed to find related nodes');
      }

      const data = await response.json();
      return data.relatedNodes;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    loading,
    error,
    getKnowledgeGraph,
    analyzeSemanticSimilarity,
    findSemanticClusters,
    suggestConnections,
    calculateGraphMetrics,
    evolveKnowledgeGraph,
    findRelatedNodes,
  };
}
