import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export class CodeExecutor {
  private tempDir: string;

  constructor() {
    this.tempDir = join(process.cwd(), 'temp');
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async executeCode(code: string, language: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          return await this.executeJavaScript(code, startTime);
        case 'typescript':
        case 'ts':
          return await this.executeTypeScript(code, startTime);
        case 'python':
        case 'py':
          return await this.executePython(code, startTime);
        case 'node':
        case 'nodejs':
          return await this.executeNode(code, startTime);
        default:
          return {
            success: false,
            error: `Unsupported language: ${language}`,
            executionTime: Date.now() - startTime
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executeJavaScript(code: string, startTime: number): Promise<CodeExecutionResult> {
    return this.executeNode(code, startTime);
  }

  private async executeTypeScript(code: string, startTime: number): Promise<CodeExecutionResult> {
    // For TypeScript, we'll compile it to JavaScript first
    // This is a simplified version - production would use proper TS compiler
    const jsCode = code
      .replace(/: string/g, '')
      .replace(/: number/g, '')
      .replace(/: boolean/g, '')
      .replace(/: any/g, '')
      .replace(/interface \w+ \{[^}]*\}/g, '')
      .replace(/type \w+ = [^;]*;/g, '');
    
    return this.executeNode(jsCode, startTime);
  }

  private async executeNode(code: string, startTime: number): Promise<CodeExecutionResult> {
    const filename = `temp_${uuidv4()}.js`;
    const filepath = join(this.tempDir, filename);

    try {
      // Wrap code in safe execution context
      const wrappedCode = `
        try {
          console.log = (...args) => process.stdout.write(args.join(' ') + '\\n');
          console.error = (...args) => process.stderr.write(args.join(' ') + '\\n');
          
          ${code}
        } catch (error) {
          process.stderr.write('Execution Error: ' + error.message + '\\n');
          process.exit(1);
        }
      `;

      writeFileSync(filepath, wrappedCode);

      return new Promise((resolve) => {
        const child = spawn('node', [filepath], {
          timeout: 10000, // 10 second timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          // Clean up temp file
          try {
            unlinkSync(filepath);
          } catch (e) {
            // Ignore cleanup errors
          }

          resolve({
            success: code === 0,
            output: output.trim(),
            error: error.trim() || undefined,
            executionTime: Date.now() - startTime
          });
        });

        child.on('error', (err) => {
          // Clean up temp file
          try {
            unlinkSync(filepath);
          } catch (e) {
            // Ignore cleanup errors
          }

          resolve({
            success: false,
            error: err.message,
            executionTime: Date.now() - startTime
          });
        });
      });
    } catch (error) {
      // Clean up temp file
      try {
        unlinkSync(filepath);
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executePython(code: string, startTime: number): Promise<CodeExecutionResult> {
    const filename = `temp_${uuidv4()}.py`;
    const filepath = join(this.tempDir, filename);

    try {
      writeFileSync(filepath, code);

      return new Promise((resolve) => {
        const child = spawn('python3', [filepath], {
          timeout: 10000, // 10 second timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          // Clean up temp file
          try {
            unlinkSync(filepath);
          } catch (e) {
            // Ignore cleanup errors
          }

          resolve({
            success: code === 0,
            output: output.trim(),
            error: error.trim() || undefined,
            executionTime: Date.now() - startTime
          });
        });

        child.on('error', (err) => {
          // Clean up temp file
          try {
            unlinkSync(filepath);
          } catch (e) {
            // Ignore cleanup errors
          }

          resolve({
            success: false,
            error: err.message,
            executionTime: Date.now() - startTime
          });
        });
      });
    } catch (error) {
      // Clean up temp file
      try {
        unlinkSync(filepath);
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }
}

export const codeExecutor = new CodeExecutor();
