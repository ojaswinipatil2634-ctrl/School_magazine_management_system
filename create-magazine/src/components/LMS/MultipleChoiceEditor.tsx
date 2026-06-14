import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Plus, Info } from 'lucide-react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface MultipleChoiceEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function MultipleChoiceEditor({ isOpen, onClose, onSave }: MultipleChoiceEditorProps) {
  const [title, setTitle] = useState('Untitled Multiple Choice');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { text: '', correct: false },
    { text: '', correct: false }
  ]);

  const handleAddOption = () => {
    setOptions([...options, { text: '', correct: false }]);
  };

  const handleUpdateOption = (index: number, field: string, value: any) => {
    const newOptions = [...options];
    (newOptions[index] as any)[field] = value;
    setOptions(newOptions);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Multiple Choice"
      onDone={() => onSave({ title, question, options })}
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
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[80px] resize-none"
            placeholder="Enter your question..."
          />
        </FormGroup>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ChevronDown className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
              Available options<span className="text-red-500 ml-0.5">*</span>
            </h3>
          </div>
          
          {options.map((option, index) => (
            <div key={index} className="mb-6 border border-zinc-300 rounded-sm overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1f6fb2] text-white">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-tight">Option</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-white/10 rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <button className="p-0.5 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-3 h-3 -rotate-90" /></button>
                    <button className="p-0.5 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-3 h-3 rotate-90" /></button>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white space-y-4">
                <FormGroup label="Text" required>
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => handleUpdateOption(index, 'text', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
                  />
                </FormGroup>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={option.correct}
                    onChange={(e) => handleUpdateOption(index, 'correct', e.target.checked)}
                    className="w-4 h-4 border-zinc-300 rounded text-[#1f6fb2] focus:ring-[#1f6fb2]"
                  />
                  <label className="text-sm font-bold text-zinc-700">Correct</label>
                </div>
                <Accordion title="Tips and feedback">
                  <p className="text-xs text-zinc-500 italic">Add tips and feedback for this option.</p>
                </Accordion>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddOption}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-xs uppercase transition-colors shadow-md"
          >
            ADD OPTION
          </button>
        </div>

        <Accordion title="Overall Feedback">
          <p className="text-sm text-zinc-500 italic">Define custom feedback for any score range.</p>
        </Accordion>
      </div>
    </Modal>
  );
}
