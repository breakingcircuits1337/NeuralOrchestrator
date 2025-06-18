
export interface LLMProvider {
  name: string;
  generateCode(prompt: string, language: string): Promise<string>;
  generateResponse(prompt: string): Promise<string>;
  analyzeCode(code: string, language: string): Promise<string>;
}

class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || '';
  }

  async generateCode(prompt: string, language: string): Promise<string> {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate ${language} code for: ${prompt}\n\nProvide only the code without explanations.`
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '// Code generation failed';
    } catch (error) {
      console.error('Gemini API error:', error);
      return `// Error generating code: ${error.message}`;
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + this.apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Gemini API error:', error);
      return `Error: ${error.message}`;
    }
  }

  async analyzeCode(code: string, language: string): Promise<string> {
    const prompt = `Analyze this ${language} code and provide feedback on:
1. Code quality and best practices
2. Potential issues or bugs
3. Performance improvements
4. Security considerations

Code:
\`\`\`${language}
${code}
\`\`\``;

    return this.generateResponse(prompt);
  }
}

class MistralProvider implements LLMProvider {
  name = 'mistral';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || '';
  }

  async generateCode(prompt: string, language: string): Promise<string> {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-medium',
          messages: [{
            role: 'user',
            content: `Generate ${language} code for: ${prompt}\n\nProvide only the code without explanations.`
          }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '// Code generation failed';
    } catch (error) {
      console.error('Mistral API error:', error);
      return `// Error generating code: ${error.message}`;
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-medium',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 1500
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Mistral API error:', error);
      return `Error: ${error.message}`;
    }
  }

  async analyzeCode(code: string, language: string): Promise<string> {
    const prompt = `Analyze this ${language} code and provide feedback on:
1. Code quality and best practices
2. Potential issues or bugs
3. Performance improvements
4. Security considerations

Code:
\`\`\`${language}
${code}
\`\`\``;

    return this.generateResponse(prompt);
  }
}

class GroqProvider implements LLMProvider {
  name = 'groq';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
  }

  async generateCode(prompt: string, language: string): Promise<string> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [{
            role: 'user',
            content: `Generate ${language} code for: ${prompt}\n\nProvide only the code without explanations.`
          }],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '// Code generation failed';
    } catch (error) {
      console.error('Groq API error:', error);
      return `// Error generating code: ${error.message}`;
    }
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: 1500
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Groq API error:', error);
      return `Error: ${error.message}`;
    }
  }

  async analyzeCode(code: string, language: string): Promise<string> {
    const prompt = `Analyze this ${language} code and provide feedback on:
1. Code quality and best practices
2. Potential issues or bugs
3. Performance improvements
4. Security considerations

Code:
\`\`\`${language}
${code}
\`\`\``;

    return this.generateResponse(prompt);
  }
}

class LLMRegistry {
  private providers: Map<string, LLMProvider> = new Map();

  constructor() {
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('mistral', new MistralProvider());
    this.providers.set('groq', new GroqProvider());
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  registerProvider(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }
}

export const llmRegistry = new LLMRegistry();
