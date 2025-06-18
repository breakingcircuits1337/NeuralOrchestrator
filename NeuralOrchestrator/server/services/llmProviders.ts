import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from "groq-sdk";

// LLM Provider interfaces
export interface LLMProvider {
  name: string;
  generateResponse(prompt: string, options?: any): Promise<string>;
  generateCode(prompt: string, language?: string): Promise<string>;
  analyzeCode(code: string, language?: string): Promise<string>;
}

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error("Gemini API error:", error);
      throw new Error(`Gemini generation failed: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language: string = "typescript"): Promise<string> {
    const codePrompt = `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, production-ready code with proper error handling and documentation.`;
    return this.generateResponse(codePrompt);
  }

  async analyzeCode(code: string, language: string = "typescript"): Promise<string> {
    const analysisPrompt = `Analyze the following ${language} code and provide insights on quality, performance, security, and best practices:\n\n${code}`;
    return this.generateResponse(analysisPrompt);
  }
}

export class MistralProvider implements LLMProvider {
  name = "mistral";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY!;
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error: any) {
      console.error("Mistral API error:", error);
      throw new Error(`Mistral generation failed: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language: string = "typescript"): Promise<string> {
    const codePrompt = `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, production-ready code with proper error handling and documentation.`;
    return this.generateResponse(codePrompt);
  }

  async analyzeCode(code: string, language: string = "typescript"): Promise<string> {
    const analysisPrompt = `Analyze the following ${language} code and provide insights on quality, performance, security, and best practices:\n\n${code}`;
    return this.generateResponse(analysisPrompt);
  }
}

export class GroqProvider implements LLMProvider {
  name = "groq";
  private client: Groq;

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-70b-versatile",
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature || 0.7,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("Groq API error:", error);
      throw new Error(`Groq generation failed: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language: string = "typescript"): Promise<string> {
    const codePrompt = `Generate ${language} code for the following requirement:\n\n${prompt}\n\nProvide clean, production-ready code with proper error handling and documentation.`;
    return this.generateResponse(codePrompt);
  }

  async analyzeCode(code: string, language: string = "typescript"): Promise<string> {
    const analysisPrompt = `Analyze the following ${language} code and provide insights on quality, performance, security, and best practices:\n\n${code}`;
    return this.generateResponse(analysisPrompt);
  }
}

export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set("gemini", new GeminiProvider());
    this.providers.set("mistral", new MistralProvider());
    this.providers.set("groq", new GroqProvider());
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  async generateWithProvider(providerName: string, prompt: string, options?: any): Promise<string> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.generateResponse(prompt, options);
  }
}

export const llmRegistry = new LLMProviderRegistry();