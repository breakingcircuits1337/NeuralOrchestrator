import { EventEmitter } from 'events';
import { storage } from '../storage';
import { agentNetwork } from './agentNetwork';
import { llmRegistry } from './llmProviders';
import { codeExecutor } from './codeExecutor';
import type { Task, InsertTask, InsertCodeExecution } from '@shared/schema';

export interface AIMessage {
  id: string;
  agentId: string;
  agentType: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CodeGenerationResult {
  code: string;
  explanation: string;
  suggestions: string[];
  executionResult?: {
    success: boolean;
    output?: string;
    error?: string;


  private assessTaskComplexity(prompt: string): 'low' | 'medium' | 'high' {
    const complexityIndicators = {
      high: ['architecture', 'system', 'microservice', 'database', 'authentication', 'security'],
      medium: ['class', 'component', 'api', 'interface', 'algorithm'],
      low: ['function', 'variable', 'method', 'helper', 'util']
    };

    const lowerPrompt = prompt.toLowerCase();
    
    for (const indicator of complexityIndicators.high) {
      if (lowerPrompt.includes(indicator)) return 'high';
    }
    
    for (const indicator of complexityIndicators.medium) {
      if (lowerPrompt.includes(indicator)) return 'medium';
    }
    
    return 'low';
  }

  };
}

export class AIOrchestrator extends EventEmitter {
  private activeConversations: Map<string, AIMessage[]> = new Map();

  constructor() {
    super();
  }

  async generateCode(
    prompt: string, 
    projectId: number, 
    language: string = "typescript"
  ): Promise<CodeGenerationResult> {
    try {
      // Use optimal agent cluster for complex code generation
      const taskComplexity = this.assessTaskComplexity(prompt);
      const requiredRoles: any[] = ['coder', 'architect', 'tester'];
      
      const agentIds = await agentNetwork.getOptimalAgentCluster(
        taskComplexity,
        requiredRoles,
        'reasoning'
      );
      
      // Get project context
      const knowledgeGraph = await storage.getKnowledgeGraph(projectId);
      const recentTasks = await storage.getTasks(projectId);
      
      const context = {
        existingCode: knowledgeGraph.filter(node => node.nodeType === 'code'),
        projectHistory: recentTasks.slice(-5),
        language
      };

      // Generate code using multiple agents for consensus
      const codePromises = agentIds.map(async (agentId) => {
        const agent = await storage.getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const provider = llmRegistry.getProvider(agent.llmProvider);
        if (!provider) throw new Error(`Provider ${agent.llmProvider} not found`);

        const contextualPrompt = `
          Project Context: ${JSON.stringify(context, null, 2)}
          
          User Request: ${prompt}
          
          Generate production-ready ${language} code that:
          1. Follows best practices and patterns
          2. Includes proper error handling
          3. Is well-documented with comments
          4. Integrates well with existing codebase
          5. Includes type definitions where applicable
        `;

        return provider.generateCode(contextualPrompt, language);
      });

      const codeResults = await Promise.all(codePromises);
      
      // Select best result (for now, just use the first one)
      const selectedCode = codeResults[0];

      // Analyze the code
      const analysisPromises = agentIds.map(async (agentId) => {
        const agent = await storage.getAgent(agentId);
        if (!agent) return "";

        const provider = llmRegistry.getProvider(agent.llmProvider);
        if (!provider) return "";

        return provider.analyzeCode(selectedCode, language);
      });

      const analyses = await Promise.all(analysisPromises);
      const combinedAnalysis = analyses.join('\n\n');

      // Extract suggestions
      const suggestions = combinedAnalysis
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
        .map(line => line.trim().substring(1).trim())
        .slice(0, 5);

      // Execute code for validation
      let executionResult;
      try {
        executionResult = await codeExecutor.executeCode(selectedCode, language);
        
        // Save execution result
        await storage.createCodeExecution({
          projectId,
          code: selectedCode,
          language,
          output: executionResult.output,
          success: executionResult.success,
          executionTime: executionResult.executionTime
        });
      } catch (error) {
        console.error('Code execution failed:', error);
        executionResult = {
          success: false,
          error: error.message
        };
      }

      // Complete task for all agents
      for (const agentId of agentIds) {
        await agentNetwork.completeTask(agentId, executionResult?.success || false);
      }

      return {
        code: selectedCode,
        explanation: combinedAnalysis,
        suggestions,
        executionResult
      };

    } catch (error) {
      console.error('Code generation error:', error);
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }

  async conductResearch(
    query: string,
    projectId: number
  ): Promise<{
    summary: string;
    findings: string[];
    sources: string[];
    confidence: number;
  }> {
    try {
      // Assign research agents
      const agentIds = await agentNetwork.assignTask(`research_${Date.now()}`, 'researcher');
      
      // Get project context
      const project = await storage.getProject(projectId);
      const knowledgeGraph = await storage.getKnowledgeGraph(projectId);
      
      const context = project ? `Project: ${project.name} - ${project.description}` : '';

      // Conduct research using multiple agents
      const researchPromises = agentIds.map(async (agentId) => {
        const agent = await storage.getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const provider = llmRegistry.getProvider(agent.llmProvider);
        if (!provider) throw new Error(`Provider ${agent.llmProvider} not found`);

        const researchPrompt = `
          Context: ${context}
          
          Research Query: ${query}
          
          Provide comprehensive research including:
          1. Key findings and insights
          2. Best practices and recommendations
          3. Potential challenges and solutions
          4. Relevant technologies and approaches
          5. Industry standards and patterns
        `;

        return provider.generateResponse(researchPrompt);
      });

      const researchResults = await Promise.all(researchPromises);
      
      // Synthesize research results
      const synthesizerAgentIds = await agentNetwork.assignTask(`synthesis_${Date.now()}`, 'synthesizer');
      const synthesizerAgent = await storage.getAgent(synthesizerAgentIds[0]);
      
      if (synthesizerAgent) {
        const provider = llmRegistry.getProvider(synthesizerAgent.llmProvider);
        if (provider) {
          const synthesisPrompt = `
            Synthesize the following research results into a comprehensive summary:
            
            ${researchResults.map((result, index) => `Research Result ${index + 1}:\n${result}`).join('\n\n')}
            
            Provide:
            1. Executive summary
            2. Key findings (list format)
            3. Confidence level (0-100%)
            4. Recommended next steps
          `;

          const synthesis = await provider.generateResponse(synthesisPrompt);
          
          // Extract findings
          const findings = synthesis
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
            .map(line => line.trim().substring(1).trim())
            .slice(0, 10);

          // Mock sources (would be real in production)
          const sources = [
            'Industry Best Practices Database',
            'Technical Documentation',
            'Research Papers and Publications',
            'Expert Knowledge Base'
          ];

          // Complete tasks
          for (const agentId of [...agentIds, ...synthesizerAgentIds]) {
            await agentNetwork.completeTask(agentId, true);
          }

          return {
            summary: synthesis,
            findings,
            sources,
            confidence: 85 // Mock confidence score
          };
        }
      }

      throw new Error('Research synthesis failed');

    } catch (error) {
      console.error('Research error:', error);
      throw new Error(`Research failed: ${error.message}`);
    }
  }

  async analyzeProject(projectId: number): Promise<{
    overview: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    complexity: 'low' | 'medium' | 'high';
  }> {
    try {
      // Assign analyzer agents
      const agentIds = await agentNetwork.assignTask(`analysis_${Date.now()}`, 'analyzer');
      
      // Gather project data
      const project = await storage.getProject(projectId);
      const phases = await storage.getProjectPhases(projectId);
      const tasks = await storage.getTasks(projectId);
      const codeExecutions = await storage.getCodeExecutions(projectId);
      const knowledgeGraph = await storage.getKnowledgeGraph(projectId);

      const projectData = {
        project,
        phases,
        tasks,
        codeExecutions: codeExecutions.slice(-10), // Last 10 executions
        knowledgeGraph: knowledgeGraph.slice(0, 20) // Sample of knowledge graph
      };

      // Analyze using multiple agents
      const analysisPromises = agentIds.map(async (agentId) => {
        const agent = await storage.getAgent(agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);

        const provider = llmRegistry.getProvider(agent.llmProvider);
        if (!provider) throw new Error(`Provider ${agent.llmProvider} not found`);

        const analysisPrompt = `
          Analyze the following project data:
          
          ${JSON.stringify(projectData, null, 2)}
          
          Provide comprehensive analysis including:
          1. Project overview and current state
          2. Strengths and positive aspects
          3. Weaknesses and areas for improvement
          4. Specific recommendations
          5. Complexity assessment (low/medium/high)
          6. Risk assessment
        `;

        return provider.generateResponse(analysisPrompt);
      });

      const analysisResults = await Promise.all(analysisPromises);
      
      // Combine results
      const combinedAnalysis = analysisResults.join('\n\n');
      
      // Extract structured information
      const strengths = this.extractListItems(combinedAnalysis, ['strength', 'positive', 'good']);
      const weaknesses = this.extractListItems(combinedAnalysis, ['weakness', 'issue', 'problem', 'concern']);
      const recommendations = this.extractListItems(combinedAnalysis, ['recommend', 'suggest', 'should']);
      
      // Determine complexity
      let complexity: 'low' | 'medium' | 'high' = 'medium';
      if (tasks.length < 10) complexity = 'low';
      else if (tasks.length > 30) complexity = 'high';

      // Complete tasks
      for (const agentId of agentIds) {
        await agentNetwork.completeTask(agentId, true);
      }

      return {
        overview: combinedAnalysis.split('\n').slice(0, 5).join('\n'),
        strengths,
        weaknesses,
        recommendations,
        complexity
      };

    } catch (error) {
      console.error('Project analysis error:', error);
      throw new Error(`Project analysis failed: ${error.message}`);
    }
  }

  private extractListItems(text: string, keywords: string[]): string[] {
    const lines = text.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('-') || trimmed.startsWith('•')) &&
          keywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
        items.push(trimmed.substring(1).trim());
      }
    }

    return items.slice(0, 5); // Limit to 5 items
  }
}

export const aiOrchestrator = new AIOrchestrator();
