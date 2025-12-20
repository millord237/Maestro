import type { AgentConfig } from '../agent-detector';

type BuildAgentArgsOptions = {
  baseArgs: string[];
  prompt?: string;
  cwd?: string;
  readOnlyMode?: boolean;
  modelId?: string;
  yoloMode?: boolean;
  agentSessionId?: string;
};

export function buildAgentArgs(
  agent: AgentConfig | null | undefined,
  options: BuildAgentArgsOptions
): string[] {
  let finalArgs = [...options.baseArgs];

  if (!agent) {
    return finalArgs;
  }

  if (agent.batchModePrefix && options.prompt) {
    finalArgs = [...agent.batchModePrefix, ...finalArgs];
  }

  if (agent.batchModeArgs && options.prompt) {
    finalArgs = [...finalArgs, ...agent.batchModeArgs];
  }

  if (agent.jsonOutputArgs && !finalArgs.some(arg => agent.jsonOutputArgs!.includes(arg))) {
    finalArgs = [...finalArgs, ...agent.jsonOutputArgs];
  }

  if (agent.workingDirArgs && options.cwd) {
    finalArgs = [...finalArgs, ...agent.workingDirArgs(options.cwd)];
  }

  if (options.readOnlyMode && agent.readOnlyArgs) {
    finalArgs = [...finalArgs, ...agent.readOnlyArgs];
  }

  if (options.modelId && agent.modelArgs) {
    finalArgs = [...finalArgs, ...agent.modelArgs(options.modelId)];
  }

  if (options.yoloMode && agent.yoloModeArgs) {
    finalArgs = [...finalArgs, ...agent.yoloModeArgs];
  }

  if (options.agentSessionId && agent.resumeArgs) {
    finalArgs = [...finalArgs, ...agent.resumeArgs(options.agentSessionId)];
  }

  return finalArgs;
}
