import React, { useState } from 'react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface TrueFalseEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function TrueFalseEditor({ isOpen, onClose, onSave }: TrueFalseEditorProps) {
  const [title, setTitle] = useState('Untitled True/False Question');
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'true' | 'false'>('true');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add True/False Question"
      onDone={() => onSave({ title, question, correctAnswer })}
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

        <Accordion title="Media">
          <p className="text-sm text-zinc-500 italic">No media added yet.</p>
        </Accordion>

        <FormGroup
          label="Question"
          required
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[100px] resize-none"
            placeholder="Enter your question..."
          />
        </FormGroup>

        <FormGroup
          label="Correct answer"
          required
        >
          <div className="flex items-center gap-6 mt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="correctAnswer"
                value="true"
                checked={correctAnswer === 'true'}
                onChange={() => setCorrectAnswer('true')}
                className="w-4 h-4 border-zinc-300 text-[#1f6fb2] focus:ring-[#1f6fb2]"
              />
              <span className="text-sm font-medium text-zinc-700 group-hover:text-[#1f6fb2] transition-colors">True</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="correctAnswer"
                value="false"
                checked={correctAnswer === 'false'}
                onChange={() => setCorrectAnswer('false')}
                className="w-4 h-4 border-zinc-300 text-[#1f6fb2] focus:ring-[#1f6fb2]"
              />
              <span className="text-sm font-medium text-zinc-700 group-hover:text-[#1f6fb2] transition-colors">False</span>
            </label>
          </div>
        </FormGroup>

        <Accordion title="Behavioural settings">
          <p className="text-sm text-zinc-500 italic">Configure how the question behaves.</p>
        </Accordion>
      </div>
    </Modal>
  );
}
