import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as pty from 'node-pty';

interface ProcessConfig {
  sessionId: string;
  toolType: string;
  cwd: string;
  command: string;
  args: string[];
  requiresPty?: boolean; // Whether this agent needs a pseudo-terminal
}

interface ManagedProcess {
  sessionId: string;
  toolType: string;
  ptyProcess?: pty.IPty;
  childProcess?: ChildProcess;
  cwd: string;
  pid: number;
  isTerminal: boolean;
}

export class ProcessManager extends EventEmitter {
  private processes: Map<string, ManagedProcess> = new Map();

  /**
   * Spawn a new process for a session
   */
  spawn(config: ProcessConfig): { pid: number; success: boolean } {
    const { sessionId, toolType, cwd, command, args, requiresPty } = config;

    // Determine if this should use a PTY:
    // - If toolType is 'terminal', always use PTY for full shell emulation
    // - If requiresPty is true, use PTY for AI agents that need TTY (like Claude Code)
    const usePty = toolType === 'terminal' || requiresPty === true;
    const isTerminal = toolType === 'terminal';

    try {
      if (usePty) {
        // Use node-pty for terminal mode or AI agents that require PTY
        let ptyCommand: string;
        let ptyArgs: string[];

        if (isTerminal) {
          // Full shell emulation for terminal mode
          ptyCommand = process.platform === 'win32' ? 'powershell.exe' : 'bash';
          ptyArgs = [];
        } else {
          // Spawn the AI agent directly with PTY support
          ptyCommand = command;
          ptyArgs = args;
        }

        const ptyProcess = pty.spawn(ptyCommand, ptyArgs, {
          name: 'xterm-256color',
          cols: 100,
          rows: 30,
          cwd: cwd,
          env: process.env as any,
        });

        const managedProcess: ManagedProcess = {
          sessionId,
          toolType,
          ptyProcess,
          cwd,
          pid: ptyProcess.pid,
          isTerminal: true,
        };

        this.processes.set(sessionId, managedProcess);

        // Handle output
        ptyProcess.onData((data) => {
          console.log(`[ProcessManager] PTY onData for session ${sessionId} (PID ${ptyProcess.pid}):`, data.substring(0, 100));
          this.emit('data', sessionId, data);
        });

        ptyProcess.onExit(({ exitCode }) => {
          console.log(`[ProcessManager] PTY onExit for session ${sessionId}:`, exitCode);
          this.emit('exit', sessionId, exitCode);
          this.processes.delete(sessionId);
        });

        console.log(`[ProcessManager] PTY process created:`, {
          sessionId,
          toolType,
          isTerminal,
          requiresPty: requiresPty || false,
          pid: ptyProcess.pid,
          command: ptyCommand,
          args: ptyArgs,
          cwd
        });

        return { pid: ptyProcess.pid, success: true };
      } else {
        // Use regular child_process for AI tools
        const childProcess = spawn(command, args, {
          cwd,
          env: process.env,
          shell: false, // Explicitly disable shell to prevent injection
        });

        const managedProcess: ManagedProcess = {
          sessionId,
          toolType,
          childProcess,
          cwd,
          pid: childProcess.pid || -1,
          isTerminal: false,
        };

        this.processes.set(sessionId, managedProcess);

        // Handle stdout
        childProcess.stdout?.on('data', (data: Buffer) => {
          this.emit('data', sessionId, data.toString());
        });

        // Handle stderr
        childProcess.stderr?.on('data', (data: Buffer) => {
          this.emit('data', sessionId, `[stderr] ${data.toString()}`);
        });

        // Handle exit
        childProcess.on('exit', (code) => {
          this.emit('exit', sessionId, code || 0);
          this.processes.delete(sessionId);
        });

        childProcess.on('error', (error) => {
          this.emit('data', sessionId, `[error] ${error.message}`);
          this.processes.delete(sessionId);
        });

        return { pid: childProcess.pid || -1, success: true };
      }
    } catch (error: any) {
      console.error('Failed to spawn process:', error);
      return { pid: -1, success: false };
    }
  }

  /**
   * Write data to a process's stdin
   */
  write(sessionId: string, data: string): boolean {
    const process = this.processes.get(sessionId);
    if (!process) {
      console.error(`[ProcessManager] write() - No process found for session: ${sessionId}`);
      return false;
    }

    console.log('[ProcessManager] write() - Process info:', {
      sessionId,
      toolType: process.toolType,
      isTerminal: process.isTerminal,
      pid: process.pid,
      hasPtyProcess: !!process.ptyProcess,
      hasChildProcess: !!process.childProcess,
      hasStdin: !!process.childProcess?.stdin,
      dataLength: data.length,
      dataPreview: data.substring(0, 50)
    });

    try {
      if (process.isTerminal && process.ptyProcess) {
        console.log(`[ProcessManager] Writing to PTY process (PID ${process.pid})`);
        process.ptyProcess.write(data);
        return true;
      } else if (process.childProcess?.stdin) {
        console.log(`[ProcessManager] Writing to child process stdin (PID ${process.pid})`);
        process.childProcess.stdin.write(data);
        return true;
      }
      console.error(`[ProcessManager] No valid input stream for session: ${sessionId}`);
      return false;
    } catch (error) {
      console.error('Failed to write to process:', error);
      return false;
    }
  }

  /**
   * Resize terminal (for pty processes)
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const process = this.processes.get(sessionId);
    if (!process || !process.isTerminal || !process.ptyProcess) return false;

    try {
      process.ptyProcess.resize(cols, rows);
      return true;
    } catch (error) {
      console.error('Failed to resize terminal:', error);
      return false;
    }
  }

  /**
   * Kill a specific process
   */
  kill(sessionId: string): boolean {
    const process = this.processes.get(sessionId);
    if (!process) return false;

    try {
      if (process.isTerminal && process.ptyProcess) {
        process.ptyProcess.kill();
      } else if (process.childProcess) {
        process.childProcess.kill('SIGTERM');
      }
      this.processes.delete(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to kill process:', error);
      return false;
    }
  }

  /**
   * Kill all managed processes
   */
  killAll(): void {
    for (const [sessionId] of this.processes) {
      this.kill(sessionId);
    }
  }

  /**
   * Get all active processes
   */
  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get a specific process
   */
  get(sessionId: string): ManagedProcess | undefined {
    return this.processes.get(sessionId);
  }
}
