import React, { useState } from 'react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface GuessTheAnswerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function GuessTheAnswerEditor({ isOpen, onClose, onSave }: GuessTheAnswerEditorProps) {
  const [title, setTitle] = useState('Untitled Guess the Answer');
  const [description, setDescription] = useState('');
  const [solutionLabel, setSolutionLabel] = useState('Click to see the answer.');
  const [solutionText, setSolutionText] = useState('');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Guess the Answer"
      onDone={() => onSave({ title, description, solutionLabel, solutionText })}
    >
      <div className="max-w-4xl mx-auto">
        <FormGroup
          label="Title"
          required
          showMetadata
          helperText="Used for searching, reports and copyright information"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
          />
        </FormGroup>

        <FormGroup
          label="Task description"
          helperText="Describe how the user should solve the task."
        >
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
          />
        </FormGroup>

        <Accordion title="Media">
          <p className="text-sm text-zinc-500 italic">No media added yet.</p>
        </Accordion>

        <FormGroup
          label="Descriptive solution label"
          helperText="Clickable text area where the solution will be displayed."
        >
          <textarea
            value={solutionLabel}
            onChange={(e) => setSolutionLabel(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[100px] resize-none"
          />
        </FormGroup>

        <FormGroup
          label="Solution text"
          required
          helperText="The solution for the picture."
        >
          <textarea
            value={solutionText}
            onChange={(e) => setSolutionText(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[150px] resize-none"
          />
        </FormGroup>
      </div>
    </Modal>
  );
}
