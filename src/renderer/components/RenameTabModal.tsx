import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Theme } from '../types';
import { useLayerStack } from '../contexts/LayerStackContext';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';

interface RenameTabModalProps {
  theme: Theme;
  initialName: string;
  claudeSessionId?: string | null;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function RenameTabModal(props: RenameTabModalProps) {
  const { theme, initialName, claudeSessionId, onClose, onRename } = props;
  const { registerLayer, unregisterLayer, updateLayerHandler } = useLayerStack();
  const layerIdRef = useRef<string>();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialName);

  // Generate placeholder with UUID octet if available
  const placeholder = claudeSessionId
    ? `Rename ${claudeSessionId.split('-')[0].toUpperCase()}...`
    : 'Enter tab name...';

  const handleRename = () => {
    onRename(value.trim());
    onClose();
  };

  // Register layer on mount
  useEffect(() => {
    const id = registerLayer({
      id: 'rename-tab-modal',
      type: 'modal',
      priority: MODAL_PRIORITIES.RENAME_TAB,
      blocksLowerLayers: true,
      capturesFocus: true,
      focusTrap: 'strict',
      ariaLabel: 'Rename Tab',
      onEscape: onClose
    });
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current) {
        unregisterLayer(layerIdRef.current);
      }
    };
  }, [registerLayer, unregisterLayer]);

  // Update handler when dependencies change
  useEffect(() => {
    if (layerIdRef.current) {
      updateLayerHandler(layerIdRef.current, onClose);
    }
  }, [onClose, updateLayerHandler]);

  // Auto-focus the input on mount
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-200 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label="Rename Tab"
      tabIndex={-1}
    >
      <div className="w-[400px] border rounded-lg shadow-2xl overflow-hidden" style={{ backgroundColor: theme.colors.bgSidebar, borderColor: theme.colors.border }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.colors.border }}>
          <h2 className="text-sm font-bold" style={{ color: theme.colors.textMain }}>Rename Tab</h2>
          <button onClick={onClose} style={{ color: theme.colors.textDim }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRename();
              }
            }}
            placeholder={placeholder}
            className="w-full p-3 rounded border bg-transparent outline-none"
            style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded border hover:bg-white/5 transition-colors"
              style={{ borderColor: theme.colors.border, color: theme.colors.textMain }}
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              className="px-4 py-2 rounded"
              style={{ backgroundColor: theme.colors.accent, color: theme.colors.accentForeground }}
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
