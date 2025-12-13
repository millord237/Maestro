import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, RotateCcw, Play, Variable, ChevronDown, ChevronRight, Save, FolderOpen, Bookmark, Maximize2, Download, Upload } from 'lucide-react';
import type { Theme, BatchDocumentEntry, BatchRunConfig, Playbook, PlaybookDocumentEntry, WorktreeConfig } from '../types';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { TEMPLATE_VARIABLES } from '../utils/templateVariables';
import { PlaybookDeleteConfirmModal } from './PlaybookDeleteConfirmModal';
import { PlaybookNameModal } from './PlaybookNameModal';
import { AgentPromptComposerModal } from './AgentPromptComposerModal';
import { DocumentsPanel } from './DocumentsPanel';
import { GitWorktreeSection, WorktreeValidationState, GhCliStatus } from './GitWorktreeSection';

// Default batch processing prompt
export const DEFAULT_BATCH_PROMPT = `# Context

Your name is **{{AGENT_NAME}}**, a Maestro-managed AI agent.

- **Agent Path:** {{AGENT_PATH}}
- **Git Branch:** {{GIT_BRANCH}}
- **Auto Run Folder:** {{AUTORUN_FOLDER}}
- **Loop Iteration:** {{LOOP_NUMBER}}
- **Working Folder for Temporary Files:** {{AUTORUN_FOLDER}}/Working

If you need to create the working folder, do so.

---

## Instructions

1. Project Orientation
    Begin by reviewing CLAUDE.md (when available) in this folder to understand the project's structure, conventions, and workflow expectations.

2. Task Selection
    Process the FIRST unchecked task (- [ ]) from top to bottom. Note that there may be relevant images associated with the task. If there are, analyze them, and include in your final synopsis back how many images you analyzed in preparation for solving the task.

    IMPORTANT: You will only work on this single task. If it appears to have logical subtasks, treat them as one cohesive unit—but do not move on to the next major item.

3. Task Evaluation
    - Fully understand the task and inspect the relevant code.
    - Determine which tasks you're going to work on in this run.
    - There will be future runs to take care of other tasks.
    - Your goal is to select enough items from the top of the unfinished list that make sense to work on within the same context window.

4. Task Implementation
    - Implement the task according to the project's established style, architecture, and coding norms.
    - Ensure that test cases are created, and that they pass.
    - Ensure you haven't broken any existing test cases.

5. Completion + Reporting
    - Mark the task as completed by changing "- [ ]" to "- [x]".
    - CRITICAL: Your FIRST sentence MUST be a specific synopsis of what you accomplished (e.g., "Added pagination to the user list component" or "Refactored auth middleware to use JWT tokens"). Never start with generic phrases like "Task completed successfully" - always lead with the specific work done.
    - Follow with any relevant details about:
      - Implementation approach or key decisions made
      - Why the task was intentionally skipped (if applicable)
      - If implementation failed, explain the failure and do NOT check off the item.

6. Version Control
    For any code or documentation changes, if we're in a Github repo:
    - Commit using a descriptive message prefixed with "MAESTRO: ".
    - Push to GitHub.
    - Update CLAUDE.md, README.md, or any other top-level documentation if appropriate.

7. Exit Immediately
    After completing (or skipping) your task, EXIT. Do not proceed to additional tasks—another agent instance will handle them. If there are no remaining open tasks, exit immediately and state that there is nothing left to do.

---

## Tasks

Process tasks from this document:

{{DOCUMENT_PATH}}

Check of tasks and add any relevant notes around the completion directly within that document.`;

interface BatchRunnerModalProps {
  theme: Theme;
  onClose: () => void;
  onGo: (config: BatchRunConfig) => void;
  onSave: (prompt: string) => void;
  initialPrompt?: string;
  lastModifiedAt?: number;
  showConfirmation: (message: string, onConfirm: () => void) => void;
  // Multi-document support
  folderPath: string;
  currentDocument: string;
  allDocuments: string[]; // All available docs in folder (without .md)
  getDocumentTaskCount: (filename: string) => Promise<number>; // Get task count for a document
  onRefreshDocuments: () => Promise<void>; // Refresh document list from folder
  // Session ID for playbook storage
  sessionId: string;
  // Session cwd for git worktree support
  sessionCwd: string;
  // Custom path to gh CLI binary (optional, for worktree features)
  ghPath?: string;
}

// Helper function to count unchecked tasks in scratchpad content
function countUncheckedTasks(content: string): number {
  if (!content) return 0;
  const matches = content.match(/^-\s*\[\s*\]/gm);
  return matches ? matches.length : 0;
}

// Helper function to format the last modified date
function formatLastModified(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

export function BatchRunnerModal(props: BatchRunnerModalProps) {
  const {
    theme,
    onClose,
    onGo,
    onSave,
    initialPrompt,
    lastModifiedAt,
    showConfirmation,
    folderPath,
    currentDocument,
    allDocuments,
    getDocumentTaskCount,
    onRefreshDocuments,
    sessionId,
    sessionCwd,
    ghPath
  } = props;

  // Document list state
  const [documents, setDocuments] = useState<BatchDocumentEntry[]>(() => {
    // Initialize with current document
    if (currentDocument) {
      return [{
        id: crypto.randomUUID(),
        filename: currentDocument,
        resetOnCompletion: false,
        isDuplicate: false
      }];
    }
    return [];
  });

  // Task counts per document (keyed by filename)
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [loadingTaskCounts, setLoadingTaskCounts] = useState(true);

  // Loop mode state
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [maxLoops, setMaxLoops] = useState<number | null>(null); // null = infinite

  // Prompt state
  const [prompt, setPrompt] = useState(initialPrompt || DEFAULT_BATCH_PROMPT);
  const [variablesExpanded, setVariablesExpanded] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt || '');
  const [promptComposerOpen, setPromptComposerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Playbook state
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loadedPlaybook, setLoadedPlaybook] = useState<Playbook | null>(null);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(true);
  const [showPlaybookDropdown, setShowPlaybookDropdown] = useState(false);
  const [showSavePlaybookModal, setShowSavePlaybookModal] = useState(false);
  const [savingPlaybook, setSavingPlaybook] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [playbookToDelete, setPlaybookToDelete] = useState<Playbook | null>(null);
  const playbackDropdownRef = useRef<HTMLDivElement>(null);

  // Git worktree state - only show worktree section for git repos
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [checkingGitRepo, setCheckingGitRepo] = useState(true);

  // Worktree configuration state
  const [worktreeEnabled, setWorktreeEnabled] = useState(false);
  const [worktreePath, setWorktreePath] = useState('');
  const [branchName, setBranchName] = useState('');
  const [createPROnCompletion, setCreatePROnCompletion] = useState(false);
  const [prTargetBranch, setPrTargetBranch] = useState('main');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [ghCliStatus, setGhCliStatus] = useState<GhCliStatus | null>(null);

  // Worktree validation state
  const [worktreeValidation, setWorktreeValidation] = useState<WorktreeValidationState>({
    checking: false, exists: false, isWorktree: false, branchMismatch: false, sameRepo: true
  });

  const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();
  const layerIdRef = useRef<string>();

  // Use ref for getDocumentTaskCount to avoid dependency issues
  const getDocumentTaskCountRef = useRef(getDocumentTaskCount);
  getDocumentTaskCountRef.current = getDocumentTaskCount;

  // Load task counts for all documents (only when document list changes)
  useEffect(() => {
    const loadTaskCounts = async () => {
      setLoadingTaskCounts(true);
      const counts: Record<string, number> = {};

      for (const doc of allDocuments) {
        try {
          counts[doc] = await getDocumentTaskCountRef.current(doc);
        } catch {
          counts[doc] = 0;
        }
      }

      setTaskCounts(counts);
      setLoadingTaskCounts(false);
    };

    loadTaskCounts();
  }, [allDocuments]);

  // Load playbooks on mount
  useEffect(() => {
    const loadPlaybooks = async () => {
      setLoadingPlaybooks(true);
      try {
        const result = await window.maestro.playbooks.list(sessionId);
        if (result.success) {
          setPlaybooks(result.playbooks);
        }
      } catch (error) {
        console.error('Failed to load playbooks:', error);
      }
      setLoadingPlaybooks(false);
    };

    loadPlaybooks();
  }, [sessionId]);

  // Check if session cwd is a git repo on mount (for worktree support)
  useEffect(() => {
    const checkGitRepo = async () => {
      setCheckingGitRepo(true);
      try {
        const result = await window.maestro.git.isRepo(sessionCwd);
        const isRepo = result === true;
        setIsGitRepo(isRepo);

        // If it's a git repo, fetch available branches and check gh CLI
        if (isRepo) {
          const [branchResult, ghResult] = await Promise.all([
            window.maestro.git.branches(sessionCwd),
            window.maestro.git.checkGhCli(ghPath || undefined)
          ]);

          if (branchResult.branches && branchResult.branches.length > 0) {
            setAvailableBranches(branchResult.branches);
            // Set default target branch to 'main' or 'master' if available
            if (branchResult.branches.includes('main')) {
              setPrTargetBranch('main');
            } else if (branchResult.branches.includes('master')) {
              setPrTargetBranch('master');
            } else {
              setPrTargetBranch(branchResult.branches[0]);
            }
          }

          setGhCliStatus(ghResult);
        }
      } catch (error) {
        console.error('Failed to check if git repo:', error);
        setIsGitRepo(false);
      }
      setCheckingGitRepo(false);
    };

    checkGitRepo();
  }, [sessionCwd, ghPath]);

  // Validate worktree path when it changes (debounced 500ms)
  useEffect(() => {
    // Reset validation state when worktree is disabled or path is empty
    if (!worktreeEnabled || !worktreePath) {
      setWorktreeValidation({
        checking: false,
        exists: false,
        isWorktree: false,
        branchMismatch: false,
        sameRepo: true,
        hasUncommittedChanges: false
      });
      return;
    }

    // Set checking state immediately
    setWorktreeValidation(prev => ({ ...prev, checking: true }));

    // Debounce the validation check
    const timeoutId = setTimeout(async () => {
      try {
        // Check if the path exists and get worktree info
        const worktreeInfoResult = await window.maestro.git.worktreeInfo(worktreePath);

        if (!worktreeInfoResult.success) {
          setWorktreeValidation({
            checking: false,
            exists: false,
            isWorktree: false,
            branchMismatch: false,
            sameRepo: true,
            hasUncommittedChanges: false,
            error: worktreeInfoResult.error
          });
          return;
        }

        // If the path doesn't exist, that's fine - it will be created
        if (!worktreeInfoResult.exists) {
          setWorktreeValidation({
            checking: false,
            exists: false,
            isWorktree: false,
            branchMismatch: false,
            sameRepo: true,
            hasUncommittedChanges: false
          });
          return;
        }

        // Path exists - check if it's part of the same repo
        // If there's no repoRoot, the directory exists but isn't a git repo - that's fine for a new worktree
        const mainRepoRootResult = await window.maestro.git.getRepoRoot(sessionCwd);
        const sameRepo = !worktreeInfoResult.repoRoot || (mainRepoRootResult.success &&
          worktreeInfoResult.repoRoot === mainRepoRootResult.root);

        // Check for branch mismatch (only if branch name is provided AND the path is already a git repo)
        // If there's no currentBranch, the directory isn't a git repo yet, so no mismatch
        const branchMismatch = branchName !== '' &&
          worktreeInfoResult.currentBranch !== undefined &&
          worktreeInfoResult.currentBranch !== branchName;

        // If there's a branch mismatch and it's the same repo, check for uncommitted changes
        // This helps warn users that checkout will fail if there are uncommitted changes
        let hasUncommittedChanges = false;
        if (branchMismatch && sameRepo) {
          try {
            // Use git status to check for uncommitted changes in the worktree
            const statusResult = await window.maestro.git.status(worktreePath);
            // If there's any output from git status --porcelain, there are changes
            hasUncommittedChanges = statusResult.stdout.trim().length > 0;
          } catch {
            // If we can't check, assume no uncommitted changes
            hasUncommittedChanges = false;
          }
        }

        setWorktreeValidation({
          checking: false,
          exists: true,
          isWorktree: worktreeInfoResult.isWorktree || false,
          currentBranch: worktreeInfoResult.currentBranch,
          branchMismatch,
          sameRepo,
          hasUncommittedChanges,
          error: !sameRepo ? 'This path contains a worktree for a different repository' : undefined
        });
      } catch (error) {
        console.error('Failed to validate worktree path:', error);
        setWorktreeValidation({
          checking: false,
          exists: false,
          isWorktree: false,
          branchMismatch: false,
          sameRepo: true,
          hasUncommittedChanges: false,
          error: 'Failed to validate worktree path'
        });
      }
    }, 500); // 500ms debounce

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [worktreePath, branchName, worktreeEnabled, sessionCwd]);

  // Calculate total tasks across selected documents (excluding missing documents)
  const totalTaskCount = documents.reduce((sum, doc) => {
    // Don't count tasks from missing documents
    if (doc.isMissing) return sum;
    return sum + (taskCounts[doc.filename] || 0);
  }, 0);
  const hasNoTasks = totalTaskCount === 0;

  // Count missing documents for warning display
  const missingDocCount = documents.filter(doc => doc.isMissing).length;
  const hasMissingDocs = missingDocCount > 0;

  // Track if the current configuration differs from the loaded playbook
  const isPlaybookModified = useMemo(() => {
    if (!loadedPlaybook) return false;

    // Compare documents
    const currentDocs = documents.map(d => ({
      filename: d.filename,
      resetOnCompletion: d.resetOnCompletion
    }));
    const savedDocs = loadedPlaybook.documents;

    if (currentDocs.length !== savedDocs.length) return true;
    for (let i = 0; i < currentDocs.length; i++) {
      if (currentDocs[i].filename !== savedDocs[i].filename ||
          currentDocs[i].resetOnCompletion !== savedDocs[i].resetOnCompletion) {
        return true;
      }
    }

    // Compare loop setting
    if (loopEnabled !== loadedPlaybook.loopEnabled) return true;

    // Compare maxLoops setting
    const savedMaxLoops = loadedPlaybook.maxLoops ?? null;
    if (maxLoops !== savedMaxLoops) return true;

    // Compare prompt
    if (prompt !== loadedPlaybook.prompt) return true;

    // Compare worktree settings
    const savedWorktree = loadedPlaybook.worktreeSettings;
    if (savedWorktree) {
      // Playbook has worktree settings - check if current state differs
      if (!worktreeEnabled) return true;
      if (branchName !== savedWorktree.branchNameTemplate) return true;
      if (createPROnCompletion !== savedWorktree.createPROnCompletion) return true;
      if (savedWorktree.prTargetBranch && prTargetBranch !== savedWorktree.prTargetBranch) return true;
    } else {
      // Playbook doesn't have worktree settings - modified if worktree is now enabled with a branch
      if (worktreeEnabled && branchName) return true;
    }

    return false;
  }, [documents, loopEnabled, maxLoops, prompt, loadedPlaybook, worktreeEnabled, branchName, createPROnCompletion, prTargetBranch]);

  // Register layer on mount
  useEffect(() => {
    const id = registerLayer({
      type: 'modal',
      priority: MODAL_PRIORITIES.BATCH_RUNNER,
      onEscape: () => {
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
          setPlaybookToDelete(null);
        } else if (showSavePlaybookModal) {
          setShowSavePlaybookModal(false);
        } else {
          onClose();
        }
      }
    });
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current) {
        unregisterLayer(layerIdRef.current);
      }
    };
  }, [registerLayer, unregisterLayer, showSavePlaybookModal, showDeleteConfirmModal]);

  // Update handler when dependencies change
  useEffect(() => {
    if (layerIdRef.current) {
      updateLayerHandler(layerIdRef.current, () => {
        if (showDeleteConfirmModal) {
          setShowDeleteConfirmModal(false);
          setPlaybookToDelete(null);
        } else if (showSavePlaybookModal) {
          setShowSavePlaybookModal(false);
        } else {
          onClose();
        }
      });
    }
  }, [onClose, updateLayerHandler, showSavePlaybookModal, showDeleteConfirmModal]);

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handleReset = () => {
    showConfirmation(
      'Reset the prompt to the default? Your customizations will be lost.',
      () => {
        setPrompt(DEFAULT_BATCH_PROMPT);
      }
    );
  };

  const handleSave = () => {
    onSave(prompt);
    setSavedPrompt(prompt);
  };

  const handleGo = () => {
    // Also save when running
    onSave(prompt);

    // Filter out missing documents before starting batch run
    const validDocuments = documents.filter(doc => !doc.isMissing);

    // Build config with optional worktree settings
    const config: BatchRunConfig = {
      documents: validDocuments,
      prompt,
      loopEnabled,
      maxLoops: loopEnabled ? maxLoops : null
    };

    // Add worktree config if enabled and valid
    if (worktreeEnabled && isGitRepo && worktreePath && branchName) {
      config.worktree = {
        enabled: true,
        path: worktreePath,
        branchName,
        createPROnCompletion,
        prTargetBranch,
        ghPath: ghPath || undefined
      };
    }

    onGo(config);
    onClose();
  };

  const isModified = prompt !== DEFAULT_BATCH_PROMPT;
  const hasUnsavedChanges = prompt !== savedPrompt && prompt !== DEFAULT_BATCH_PROMPT;

  // Handle loading a playbook
  const handleLoadPlaybook = useCallback((playbook: Playbook) => {
    // Convert stored entries to BatchDocumentEntry with IDs
    // Also detect missing documents (documents in playbook that don't exist in allDocuments)
    const allDocsSet = new Set(allDocuments);

    const entries: BatchDocumentEntry[] = playbook.documents.map((doc, index) => ({
      id: crypto.randomUUID(),
      filename: doc.filename,
      resetOnCompletion: doc.resetOnCompletion,
      // Mark as duplicate if same filename appears earlier
      isDuplicate: playbook.documents.slice(0, index).some(d => d.filename === doc.filename),
      // Mark as missing if document doesn't exist in the folder
      isMissing: !allDocsSet.has(doc.filename)
    }));

    setDocuments(entries);
    setLoopEnabled(playbook.loopEnabled);
    setMaxLoops(playbook.maxLoops ?? null);
    setPrompt(playbook.prompt);
    setLoadedPlaybook(playbook);
    setShowPlaybookDropdown(false);

    // Restore worktree settings if present
    if (playbook.worktreeSettings) {
      setWorktreeEnabled(true);
      setBranchName(playbook.worktreeSettings.branchNameTemplate);
      setCreatePROnCompletion(playbook.worktreeSettings.createPROnCompletion);
      if (playbook.worktreeSettings.prTargetBranch) {
        setPrTargetBranch(playbook.worktreeSettings.prTargetBranch);
      }
    } else {
      // Clear worktree settings if playbook doesn't have them
      setWorktreeEnabled(false);
      setBranchName('');
      setCreatePROnCompletion(false);
    }
  }, [allDocuments]);

  // Handle opening the delete confirmation modal
  const handleDeletePlaybook = useCallback((playbook: Playbook, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaybookToDelete(playbook);
    setShowDeleteConfirmModal(true);
  }, []);

  // Handle confirming the delete action
  const handleConfirmDeletePlaybook = useCallback(async () => {
    if (!playbookToDelete) return;

    try {
      const result = await window.maestro.playbooks.delete(sessionId, playbookToDelete.id);
      if (result.success) {
        setPlaybooks(prev => prev.filter(p => p.id !== playbookToDelete.id));
        // If the deleted playbook was loaded, clear it
        if (loadedPlaybook?.id === playbookToDelete.id) {
          setLoadedPlaybook(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete playbook:', error);
    }

    setShowDeleteConfirmModal(false);
    setPlaybookToDelete(null);
  }, [sessionId, playbookToDelete, loadedPlaybook]);

  // Handle canceling the delete action
  const handleCancelDeletePlaybook = useCallback(() => {
    setShowDeleteConfirmModal(false);
    setPlaybookToDelete(null);
  }, []);

  // Handle exporting a playbook
  const handleExportPlaybook = useCallback(async (playbook: Playbook) => {
    try {
      const result = await window.maestro.playbooks.export(sessionId, playbook.id, folderPath);
      if (!result.success && result.error !== 'Export cancelled') {
        console.error('Failed to export playbook:', result.error);
      }
    } catch (error) {
      console.error('Failed to export playbook:', error);
    }
  }, [sessionId, folderPath]);

  // Handle importing a playbook
  const handleImportPlaybook = useCallback(async () => {
    try {
      const result = await window.maestro.playbooks.import(sessionId, folderPath);
      if (result.success && result.playbook) {
        // Add to local playbooks list
        setPlaybooks(prev => [...prev, result.playbook]);
        // Load the imported playbook
        handleLoadPlaybook(result.playbook);
      } else if (result.error && result.error !== 'Import cancelled') {
        console.error('Failed to import playbook:', result.error);
      }
    } catch (error) {
      console.error('Failed to import playbook:', error);
    }
  }, [sessionId, folderPath, handleLoadPlaybook]);

  // Handle saving a new playbook
  const handleSaveAsPlaybook = useCallback(async (name: string) => {
    if (savingPlaybook) return;

    setSavingPlaybook(true);
    try {
      // Build playbook data, including worktree settings if enabled
      const playbookData: Parameters<typeof window.maestro.playbooks.create>[1] = {
        name,
        documents: documents.map(d => ({
          filename: d.filename,
          resetOnCompletion: d.resetOnCompletion
        })),
        loopEnabled,
        maxLoops,
        prompt
      };

      // Include worktree settings if worktree is enabled
      // Note: We store branchName as the template - users can modify it when loading
      if (worktreeEnabled && branchName) {
        playbookData.worktreeSettings = {
          branchNameTemplate: branchName,
          createPROnCompletion,
          prTargetBranch
        };
      }

      const result = await window.maestro.playbooks.create(sessionId, playbookData);

      if (result.success) {
        setPlaybooks(prev => [...prev, result.playbook]);
        setLoadedPlaybook(result.playbook);
        setShowSavePlaybookModal(false);
      }
    } catch (error) {
      console.error('Failed to save playbook:', error);
    }
    setSavingPlaybook(false);
  }, [sessionId, documents, loopEnabled, maxLoops, prompt, worktreeEnabled, branchName, createPROnCompletion, prTargetBranch, savingPlaybook]);

  // Handle updating an existing playbook
  const handleSaveUpdate = useCallback(async () => {
    if (!loadedPlaybook || savingPlaybook) return;

    setSavingPlaybook(true);
    try {
      // Build update data, including worktree settings if enabled
      const updateData: Parameters<typeof window.maestro.playbooks.update>[2] = {
        documents: documents.map(d => ({
          filename: d.filename,
          resetOnCompletion: d.resetOnCompletion
        })),
        loopEnabled,
        maxLoops,
        prompt,
        updatedAt: Date.now()
      };

      // Include worktree settings if worktree is enabled, otherwise clear them
      if (worktreeEnabled && branchName) {
        updateData.worktreeSettings = {
          branchNameTemplate: branchName,
          createPROnCompletion,
          prTargetBranch
        };
      } else {
        // Explicitly set to undefined to clear previous worktree settings
        updateData.worktreeSettings = undefined;
      }

      const result = await window.maestro.playbooks.update(sessionId, loadedPlaybook.id, updateData);

      if (result.success) {
        setLoadedPlaybook(result.playbook);
        setPlaybooks(prev => prev.map(p => p.id === result.playbook.id ? result.playbook : p));
      }
    } catch (error) {
      console.error('Failed to update playbook:', error);
    }
    setSavingPlaybook(false);
  }, [sessionId, loadedPlaybook, documents, loopEnabled, maxLoops, prompt, worktreeEnabled, branchName, createPROnCompletion, prTargetBranch, savingPlaybook]);

  // Handle discarding changes and reloading original playbook configuration
  const handleDiscardChanges = useCallback(() => {
    if (loadedPlaybook) {
      handleLoadPlaybook(loadedPlaybook);
    }
  }, [loadedPlaybook, handleLoadPlaybook]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (playbackDropdownRef.current && !playbackDropdownRef.current.contains(e.target as Node)) {
        setShowPlaybookDropdown(false);
      }
    };

    if (showPlaybookDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPlaybookDropdown]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Batch Runner"
      tabIndex={-1}
    >
      <div
        className="w-[700px] max-h-[85vh] border rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: theme.colors.bgSidebar, borderColor: theme.colors.border }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.colors.border }}>
          <h2 className="text-sm font-bold" style={{ color: theme.colors.textMain }}>
            Auto Run Configuration
          </h2>
          <div className="flex items-center gap-4">
            {/* Total Task Count Badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: hasNoTasks ? theme.colors.error + '20' : theme.colors.success + '20',
                border: `1px solid ${hasNoTasks ? theme.colors.error + '40' : theme.colors.success + '40'}`
              }}
            >
              <span
                className="text-lg font-bold"
                style={{ color: hasNoTasks ? theme.colors.error : theme.colors.success }}
              >
                {loadingTaskCounts ? '...' : totalTaskCount}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: hasNoTasks ? theme.colors.error : theme.colors.success }}
              >
                {totalTaskCount === 1 ? 'task' : 'tasks'}
              </span>
            </div>
            <button onClick={onClose} style={{ color: theme.colors.textDim }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Playbook Section */}
          <div className="mb-6 flex items-center justify-between">
            {/* Load Playbook Dropdown - only show when playbooks exist or one is loaded */}
            {(playbooks.length > 0 || loadedPlaybook) ? (
              <div className="relative" ref={playbackDropdownRef}>
                <button
                  onClick={() => setShowPlaybookDropdown(!showPlaybookDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors"
                  style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
                  disabled={loadingPlaybooks}
                >
                  <FolderOpen className="w-4 h-4" style={{ color: theme.colors.accent }} />
                  <span className="text-sm">
                    {loadedPlaybook ? loadedPlaybook.name : 'Load Playbook'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: theme.colors.textDim }} />
                </button>

                {/* Dropdown Menu */}
                {showPlaybookDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 w-64 rounded-lg border shadow-lg z-10 overflow-hidden"
                    style={{ backgroundColor: theme.colors.bgSidebar, borderColor: theme.colors.border }}
                  >
                    <div className="max-h-48 overflow-y-auto">
                      {playbooks.map((pb) => (
                        <div
                          key={pb.id}
                          className={`flex items-center gap-2 px-3 py-2 hover:bg-white/5 cursor-pointer transition-colors ${
                            loadedPlaybook?.id === pb.id ? 'bg-white/10' : ''
                          }`}
                          onClick={() => handleLoadPlaybook(pb)}
                        >
                          <span
                            className="flex-1 text-sm truncate"
                            style={{ color: theme.colors.textMain }}
                          >
                            {pb.name}
                          </span>
                          <span
                            className="text-[10px] shrink-0"
                            style={{ color: theme.colors.textDim }}
                          >
                            {pb.documents.length} doc{pb.documents.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPlaybook(pb);
                            }}
                            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                            style={{ color: theme.colors.textDim }}
                            title="Export playbook"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePlaybook(pb, e)}
                            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                            style={{ color: theme.colors.textDim }}
                            title="Delete playbook"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Import playbook button */}
                    <div
                      className="border-t px-3 py-2"
                      style={{ borderColor: theme.colors.border }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportPlaybook();
                        }}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/5 transition-colors text-sm"
                        style={{ color: theme.colors.accent }}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Import Playbook
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div /> /* Empty placeholder to maintain flex layout */
            )}

            {/* Right side: Save as Playbook OR Save Update/Discard buttons */}
            <div className="flex items-center gap-2">
              {/* Save as Playbook button - shown when >1 doc and no playbook loaded */}
              {documents.length > 1 && !loadedPlaybook && (
                <button
                  onClick={() => setShowSavePlaybookModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors"
                  style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
                >
                  <Bookmark className="w-4 h-4" style={{ color: theme.colors.accent }} />
                  <span className="text-sm">Save as Playbook</span>
                </button>
              )}

              {/* Save Update, Save as New, and Discard buttons - shown when playbook is loaded and modified */}
              {loadedPlaybook && isPlaybookModified && (
                <>
                  <button
                    onClick={handleDiscardChanges}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors"
                    style={{ borderColor: theme.colors.border, color: theme.colors.textDim }}
                    title="Discard changes and reload original playbook configuration"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-sm">Discard</span>
                  </button>
                  <button
                    onClick={() => setShowSavePlaybookModal(true)}
                    disabled={savingPlaybook}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
                    title="Save as a new playbook with a different name"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="text-sm">Save as New</span>
                  </button>
                  <button
                    onClick={handleSaveUpdate}
                    disabled={savingPlaybook}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: theme.colors.accent, color: theme.colors.accent }}
                    title="Save changes to the loaded playbook"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-sm">{savingPlaybook ? 'Saving...' : 'Save Update'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Documents Section */}
          <DocumentsPanel
            theme={theme}
            documents={documents}
            setDocuments={setDocuments}
            taskCounts={taskCounts}
            loadingTaskCounts={loadingTaskCounts}
            loopEnabled={loopEnabled}
            setLoopEnabled={setLoopEnabled}
            maxLoops={maxLoops}
            setMaxLoops={setMaxLoops}
            allDocuments={allDocuments}
            onRefreshDocuments={onRefreshDocuments}
          />

          {/* Git Worktree Section - only visible for git repos */}
          {isGitRepo && !checkingGitRepo && (
            <GitWorktreeSection
              theme={theme}
              worktreeEnabled={worktreeEnabled}
              setWorktreeEnabled={setWorktreeEnabled}
              worktreePath={worktreePath}
              setWorktreePath={setWorktreePath}
              branchName={branchName}
              setBranchName={setBranchName}
              createPROnCompletion={createPROnCompletion}
              setCreatePROnCompletion={setCreatePROnCompletion}
              prTargetBranch={prTargetBranch}
              setPrTargetBranch={setPrTargetBranch}
              worktreeValidation={worktreeValidation}
              availableBranches={availableBranches}
              ghCliStatus={ghCliStatus}
            />
          )}

          {/* Divider */}
          <div className="border-t mb-6" style={{ borderColor: theme.colors.border }} />

          {/* Agent Prompt Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase" style={{ color: theme.colors.textDim }}>
                  Agent Prompt
                </label>
                {isModified && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}
                  >
                    CUSTOMIZED
                  </span>
                )}
              </div>
              <button
                onClick={handleReset}
                disabled={!isModified}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: theme.colors.textDim }}
                title="Reset to default prompt"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <div className="text-[10px] mb-2" style={{ color: theme.colors.textDim }}>
              This prompt is sent to the AI agent for each document in the queue.{' '}
              {isModified && lastModifiedAt && (
                <span style={{ color: theme.colors.textMain }}>
                  Last modified {formatLastModified(lastModifiedAt)}.
                </span>
              )}
            </div>

            {/* Template Variables Documentation */}
            <div
              className="rounded-lg border overflow-hidden mb-2"
              style={{ backgroundColor: theme.colors.bgMain, borderColor: theme.colors.border }}
            >
              <button
                onClick={() => setVariablesExpanded(!variablesExpanded)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Variable className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
                  <span className="text-xs font-bold uppercase" style={{ color: theme.colors.textDim }}>
                    Template Variables
                  </span>
                </div>
                {variablesExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" style={{ color: theme.colors.textDim }} />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: theme.colors.textDim }} />
                )}
              </button>
              {variablesExpanded && (
                <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: theme.colors.border }}>
                  <p className="text-[10px] mb-2" style={{ color: theme.colors.textDim }}>
                    Use these variables in your prompt. They will be replaced with actual values at runtime.
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-h-48 overflow-y-auto scrollbar-thin">
                    {TEMPLATE_VARIABLES.map(({ variable, description }) => (
                      <div key={variable} className="flex items-center gap-2 py-0.5">
                        <code
                          className="text-[10px] font-mono px-1 py-0.5 rounded shrink-0"
                          style={{ backgroundColor: theme.colors.bgActivity, color: theme.colors.accent }}
                        >
                          {variable}
                        </code>
                        <span className="text-[10px] truncate" style={{ color: theme.colors.textDim }}>
                          {description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  // Insert actual tab character instead of moving focus
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const textarea = e.currentTarget;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue = prompt.substring(0, start) + '\t' + prompt.substring(end);
                    setPrompt(newValue);
                    // Restore cursor position after the tab
                    requestAnimationFrame(() => {
                      textarea.selectionStart = start + 1;
                      textarea.selectionEnd = start + 1;
                    });
                  }
                }}
                className="w-full p-4 pr-10 rounded border bg-transparent outline-none resize-none font-mono text-sm"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.textMain,
                  minHeight: '200px'
                }}
                placeholder="Enter the prompt for the batch agent..."
              />
              <button
                onClick={() => setPromptComposerOpen(true)}
                className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: theme.colors.textDim }}
                title="Expand editor"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2 shrink-0" style={{ borderColor: theme.colors.border }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-white/5 transition-colors"
            style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 rounded border hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderColor: theme.colors.border, color: theme.colors.success }}
            title={hasUnsavedChanges ? 'Save prompt for this session' : 'No unsaved changes'}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleGo}
            disabled={hasNoTasks || documents.length === 0 || documents.length === missingDocCount}
            className="flex items-center gap-2 px-4 py-2 rounded text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: (hasNoTasks || documents.length === 0 || documents.length === missingDocCount) ? theme.colors.textDim : theme.colors.accent }}
            title={
              documents.length === 0 ? 'No documents selected' :
              documents.length === missingDocCount ? 'All selected documents are missing' :
              hasNoTasks ? 'No unchecked tasks in documents' :
              'Run batch processing'
            }
          >
            <Play className="w-4 h-4" />
            Go
          </button>
        </div>
      </div>

      {/* Save Playbook Modal */}
      {showSavePlaybookModal && (
        <PlaybookNameModal
          theme={theme}
          onSave={handleSaveAsPlaybook}
          onCancel={() => setShowSavePlaybookModal(false)}
          title="Save as Playbook"
          saveButtonText={savingPlaybook ? 'Saving...' : 'Save'}
        />
      )}

      {/* Playbook Delete Confirmation Modal */}
      {showDeleteConfirmModal && playbookToDelete && (
        <PlaybookDeleteConfirmModal
          theme={theme}
          playbookName={playbookToDelete.name}
          onConfirm={handleConfirmDeletePlaybook}
          onCancel={handleCancelDeletePlaybook}
        />
      )}

      {/* Agent Prompt Composer Modal */}
      <AgentPromptComposerModal
        isOpen={promptComposerOpen}
        onClose={() => setPromptComposerOpen(false)}
        theme={theme}
        initialValue={prompt}
        onSubmit={(value) => setPrompt(value)}
      />
    </div>
  );
}
