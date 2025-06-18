
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KnowledgeNode {
  id: string;
  nodeType: string;
  nodeId: string;
  nodeData: any;
  x?: number;
  y?: number;
  connections?: any[];
}

interface KnowledgeConnection {
  from: string;
  to: string;
  type: string;
  weight: number;
}

interface GraphMetrics {
  density: number;
  clustering: number;
  centralityScores: Record<string, number>;
  pathLengths: Record<string, number>;
  communities: Array<{
    id: string;
    nodes: string[];
    modularity: number;
  }>;
}

interface SemanticCluster {
  clusterId: string;
  nodes: string[];
  centralConcepts: string[];
  cohesionScore: number;
}

export function KnowledgeGraphVisualization({ projectId }: { projectId: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [connections, setConnections] = useState<KnowledgeConnection[]>([]);
  const [metrics, setMetrics] = useState<GraphMetrics | null>(null);
  const [clusters, setClusters] = useState<SemanticCluster[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'graph' | 'clusters' | 'metrics'>('graph');

  useEffect(() => {
    loadKnowledgeGraph();
  }, [projectId]);

  const loadKnowledgeGraph = async () => {
    try {
      setLoading(true);
      
      // Load knowledge graph data
      const response = await fetch(`/api/projects/${projectId}/knowledge`);
      const data = await response.json();
      
      // Position nodes for visualization
      const positionedNodes = positionNodes(data.nodes);
      setNodes(positionedNodes);
      setConnections(data.connections);

      // Load metrics
      const metricsResponse = await fetch(`/api/projects/${projectId}/knowledge/metrics`);
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load clusters
      const clustersResponse = await fetch(`/api/projects/${projectId}/knowledge/clusters`);
      const clustersData = await clustersResponse.json();
      setClusters(clustersData.clusters);

    } catch (error) {
      console.error('Error loading knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const positionNodes = (nodeList: KnowledgeNode[]): KnowledgeNode[] => {
    // Simple force-directed layout
    const positioned = nodeList.map((node, index) => {
      const angle = (index * 2 * Math.PI) / nodeList.length;
      const radius = Math.min(300, 50 + nodeList.length * 5);
      
      return {
        ...node,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle)
      };
    });

    // Apply simple force simulation
    for (let iteration = 0; iteration < 50; iteration++) {
      positioned.forEach((node, i) => {
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        positioned.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x! - other.x!;
            const dy = node.y! - other.y!;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 1000 / (distance * distance);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
        });

        // Attraction from connected nodes
        connections.forEach(conn => {
          if (conn.from === node.nodeId) {
            const target = positioned.find(n => n.nodeId === conn.to);
            if (target) {
              const dx = target.x! - node.x!;
              const dy = target.y! - node.y!;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = conn.weight * 0.1;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Update position
        node.x = Math.max(50, Math.min(750, node.x! + fx * 0.01));
        node.y = Math.max(50, Math.min(550, node.y! + fy * 0.01));
      });
    }

    return positioned;
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.nodeId === conn.from);
      const toNode = nodes.find(n => n.nodeId === conn.to);

      if (fromNode && toNode && fromNode.x && fromNode.y && toNode.x && toNode.y) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = `rgba(99, 102, 241, ${conn.weight})`;
        ctx.lineWidth = Math.max(1, conn.weight * 3);
        ctx.stroke();

        // Draw connection type label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        ctx.fillStyle = '#6B7280';
        ctx.font = '10px sans-serif';
        ctx.fillText(conn.type, midX, midY);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (!node.x || !node.y) return;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
      
      // Color by node type
      const colors = {
        task: '#10B981',
        code: '#3B82F6',
        documentation: '#8B5CF6',
        agent: '#F59E0B'
      };
      ctx.fillStyle = colors[node.nodeType as keyof typeof colors] || '#6B7280';
      ctx.fill();

      // Highlight selected node
      if (selectedNode?.nodeId === node.nodeId) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Node label
      ctx.fillStyle = '#1F2937';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        node.nodeData.title || node.nodeId.slice(0, 10),
        node.x,
        node.y + 30
      );
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = nodes.find(node => {
      if (!node.x || !node.y) return false;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      return distance <= 15;
    });

    setSelectedNode(clickedNode || null);
  };

  const evolveGraph = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/knowledge/evolve`, {
        method: 'POST'
      });
      const evolution = await response.json();
      
      // Show evolution results
      console.log('Graph evolution:', evolution);
      
      // Reload graph
      await loadKnowledgeGraph();
    } catch (error) {
      console.error('Error evolving graph:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && nodes.length > 0) {
      drawGraph();
    }
  }, [nodes, connections, selectedNode, loading]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse">Loading knowledge graph...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Knowledge Graph</CardTitle>
            <div className="flex gap-2">
              <Button onClick={evolveGraph} disabled={loading}>
                Evolve Graph
              </Button>
              <Button onClick={loadKnowledgeGraph} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="graph">Graph View</TabsTrigger>
              <TabsTrigger value="clusters">Clusters</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="graph" className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="border rounded-lg cursor-pointer"
                    onClick={handleCanvasClick}
                  />
                </div>
                
                {selectedNode && (
                  <div className="w-80 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Node Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Badge variant="outline">{selectedNode.nodeType}</Badge>
                        </div>
                        <div>
                          <strong>ID:</strong> {selectedNode.nodeId}
                        </div>
                        {selectedNode.nodeData.title && (
                          <div>
                            <strong>Title:</strong> {selectedNode.nodeData.title}
                          </div>
                        )}
                        {selectedNode.nodeData.description && (
                          <div>
                            <strong>Description:</strong> 
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedNode.nodeData.description}
                            </p>
                          </div>
                        )}
                        {selectedNode.connections && (
                          <div>
                            <strong>Connections:</strong> {selectedNode.connections.length}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  📊 {nodes.length} Nodes
                </Badge>
                <Badge variant="secondary">
                  🔗 {connections.length} Connections
                </Badge>
                {metrics && (
                  <>
                    <Badge variant="outline">
                      Density: {(metrics.density * 100).toFixed(1)}%
                    </Badge>
                    <Badge variant="outline">
                      Clustering: {(metrics.clustering * 100).toFixed(1)}%
                    </Badge>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clusters" className="space-y-4">
              <div className="grid gap-4">
                {clusters.map(cluster => (
                  <Card key={cluster.clusterId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{cluster.clusterId}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <strong>Nodes:</strong> {cluster.nodes.length}
                      </div>
                      <div>
                        <strong>Cohesion Score:</strong> {(cluster.cohesionScore * 100).toFixed(1)}%
                      </div>
                      <div>
                        <strong>Central Concepts:</strong>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {cluster.centralConcepts.map(concept => (
                            <Badge key={concept} variant="outline" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Member Nodes:</strong>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {cluster.nodes.map(nodeId => (
                            <Badge key={nodeId} variant="secondary" className="text-xs">
                              {nodeId.slice(0, 12)}...
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              {metrics && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Graph Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Density:</span>
                        <span>{(metrics.density * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clustering Coefficient:</span>
                        <span>{(metrics.clustering * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Communities:</span>
                        <span>{metrics.communities.length}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Central Nodes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {Object.entries(metrics.centralityScores)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 5)
                          .map(([nodeId, score]) => (
                            <div key={nodeId} className="flex justify-between text-sm">
                              <span className="truncate">{nodeId.slice(0, 20)}...</span>
                              <span>{score.toFixed(3)}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardHeader>
                      <CardTitle>Communities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {metrics.communities.map(community => (
                          <div key={community.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <span className="font-medium">{community.id}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                ({community.nodes.length} nodes)
                              </span>
                            </div>
                            <Badge variant="outline">
                              Modularity: {community.modularity.toFixed(3)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
