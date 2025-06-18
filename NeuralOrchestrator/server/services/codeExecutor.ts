import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
}

class CodeExecutor {
  private tempDir = './temp_executions';

  constructor() {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async executeCode(code: string, language: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();

    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          return await this.executeJavaScript(code, executionId);
        case 'typescript':
        case 'ts':
          return await this.executeTypeScript(code, executionId);
        case 'python':
        case 'py':
          return await this.executePython(code, executionId);
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executeJavaScript(code: string, executionId: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const fileName = join(this.tempDir, `${executionId}.js`);

    try {
      writeFileSync(fileName, code);

      const result = await this.runCommand('node', [fileName], 5000);

      this.cleanup(fileName);

      return {
        success: result.success,
        output: result.stdout,
        error: result.stderr,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.cleanup(fileName);
      throw error;
    }
  }

  private async executeTypeScript(code: string, executionId: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const fileName = join(this.tempDir, `${executionId}.ts`);

    try {
      writeFileSync(fileName, code);

      // First compile TypeScript
      const compileResult = await this.runCommand('npx', ['tsc', fileName, '--outDir', this.tempDir], 10000);

      if (!compileResult.success) {
        this.cleanup(fileName);
        return {
          success: false,
          error: `TypeScript compilation error: ${compileResult.stderr}`,
          executionTime: Date.now() - startTime
        };
      }

      // Execute compiled JavaScript
      const jsFileName = fileName.replace('.ts', '.js');
      const result = await this.runCommand('node', [jsFileName], 5000);

      this.cleanup(fileName);
      this.cleanup(jsFileName);

      return {
        success: result.success,
        output: result.stdout,
        error: result.stderr,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.cleanup(fileName);
      throw error;
    }
  }

  private async executePython(code: string, executionId: string): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    const fileName = join(this.tempDir, `${executionId}.py`);

    try {
      writeFileSync(fileName, code);

      const result = await this.runCommand('python3', [fileName], 5000);

      this.cleanup(fileName);

      return {
        success: result.success,
        output: result.stdout,
        error: result.stderr,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.cleanup(fileName);
      throw error;
    }
  }

  private runCommand(command: string, args: string[], timeout: number): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        process.kill();
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nExecution timeout'
        });
      }, timeout);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          success: false,
          stdout,
          stderr: error.message
        });
      });
    });
  }

  private cleanup(fileName: string): void {
    try {
      if (existsSync(fileName)) {
        unlinkSync(fileName);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${fileName}:`, error);
    }
  }
}

export const codeExecutor = new CodeExecutor();