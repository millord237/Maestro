export interface SlashCommand {
  command: string;
  description: string;
  execute: (context: SlashCommandContext) => void;
}

export interface SlashCommandContext {
  activeSessionId: string;
  sessions: any[];
  setSessions: (sessions: any[] | ((prev: any[]) => any[])) => void;
  currentMode: 'ai' | 'terminal';
}

export const slashCommands: SlashCommand[] = [
  {
    command: '/clear',
    description: 'Clear the output history',
    execute: (context: SlashCommandContext) => {
      const { activeSessionId, setSessions, currentMode } = context;
      const targetLogKey = currentMode === 'ai' ? 'aiLogs' : 'shellLogs';

      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          [targetLogKey]: []
        };
      }));
    }
  }
];
