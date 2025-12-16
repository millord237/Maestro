import { useState, useRef, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { Theme } from '../types';
import { MODAL_PRIORITIES } from '../constants/modalPriorities';
import { Modal, ModalFooter } from './ui/Modal';

interface PlaybookNameModalProps {
  theme: Theme;
  onSave: (name: string) => void;
  onCancel: () => void;
  /** Optional initial name for editing existing playbook */
  initialName?: string;
  /** Title shown in the modal header */
  title?: string;
  /** Button text for the save action */
  saveButtonText?: string;
}

export function PlaybookNameModal({
  theme,
  onSave,
  onCancel,
  initialName = '',
  title = 'Save Playbook',
  saveButtonText = 'Save'
}: PlaybookNameModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount and select text if there's an initial name
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (initialName) {
        inputRef.current?.select();
      }
    });
  }, [initialName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(trimmedName);
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal
      theme={theme}
      title={title}
      priority={MODAL_PRIORITIES.PLAYBOOK_NAME}
      onClose={onCancel}
      headerIcon={<Save className="w-4 h-4" style={{ color: theme.colors.accent }} />}
      initialFocusRef={inputRef as React.RefObject<HTMLElement>}
      footer={
        <ModalFooter
          theme={theme}
          onCancel={onCancel}
          onConfirm={handleSave}
          confirmLabel={saveButtonText}
          confirmDisabled={!isValid}
        />
      }
    >
      <label
        className="block text-xs mb-2 font-medium"
        style={{ color: theme.colors.textDim }}
      >
        Playbook Name
      </label>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="Enter playbook name..."
        className="w-full p-3 rounded border bg-transparent outline-none focus:ring-1"
        style={{
          borderColor: theme.colors.border,
          color: theme.colors.textMain
        }}
      />
      <p className="text-xs mt-2" style={{ color: theme.colors.textDim }}>
        Give your playbook a descriptive name to easily identify it later.
      </p>
    </Modal>
  );
}
