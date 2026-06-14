import React, { useState } from 'react';
import { Plus, Info, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface FillInBlanksEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function FillInBlanksEditor({ isOpen, onClose, onSave }: FillInBlanksEditorProps) {
  const [title, setTitle] = useState('Untitled Fill in the Blanks');
  const [description, setDescription] = useState('Fill in the missing words');
  const [textBlocks, setTextBlocks] = useState(['Oslo is the capital of *Norway*.']);
  const [feedback, setFeedback] = useState('');

  const handleAddBlock = () => {
    setTextBlocks([...textBlocks, '']);
  };

  const handleUpdateBlock = (index: number, value: string) => {
    const newBlocks = [...textBlocks];
    newBlocks[index] = value;
    setTextBlocks(newBlocks);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create or Upload Content"
      onDone={() => onSave({ title, description, textBlocks, feedback })}
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
            className="w-full px-3 py-2 border border-zinc-300 rounded focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
          />
        </FormGroup>

        <Accordion title="Media">
          <p className="text-sm text-zinc-500 italic">No media added yet.</p>
        </Accordion>

        <FormGroup
          label="Task description"
          required
          helperText="A guide telling the user how to answer this task."
        >
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
          />
        </FormGroup>

        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#1f6fb2] mb-4 tracking-tight border-b border-zinc-100 pb-2">
            Text blocks<span className="text-red-500 ml-0.5">*</span>
          </h3>
          
          {textBlocks.map((block, index) => (
            <div key={index} className="mb-6 border border-zinc-300 rounded-sm overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1f6fb2] text-white">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-tight">Line of text</span>
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
                <div className="flex justify-end">
                  <button className="flex items-center gap-1.5 px-3 py-1 bg-[#f0d84f] hover:bg-[#e6cc3d] text-zinc-900 rounded-sm text-[11px] font-bold uppercase transition-colors shadow-sm">
                    <Info className="w-3.5 h-3.5" />
                    Show instructions
                  </button>
                </div>
                <textarea
                  value={block}
                  onChange={(e) => handleUpdateBlock(index, e.target.value)}
                  className="w-full px-3 py-3 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[100px] resize-none shadow-inner"
                  placeholder="Enter text with *blanks*..."
                />
              </div>
            </div>
          ))}

          <button
            onClick={handleAddBlock}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-xs uppercase transition-colors shadow-md"
          >
            ADD TEXT BLOCK
          </button>
        </div>

        <div className="pt-8 border-t border-zinc-200">
          <Accordion title="Overall Feedback">
            <div className="space-y-6">
              <p className="text-sm font-bold text-zinc-800">Define custom feedback for any score range</p>
              <p className="text-xs text-zinc-500 italic">Click the "Add range" button to add as many ranges as you need. Example: 0-20% Bad score, 21-91% Average Score, 91-100% Great Score!</p>
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <div className="flex gap-8 mb-2">
                    <label className="text-xs font-bold text-zinc-800">Score Range<span className="text-red-500 ml-0.5">*</span></label>
                    <label className="text-xs font-bold text-zinc-800">Feedback for defined score range</label>
                  </div>
                  <div className="flex gap-4 items-center p-4 bg-zinc-50 border border-zinc-200 rounded-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-300 rounded-sm text-sm text-zinc-600 font-medium w-40">
                      0 % <span className="text-zinc-300 mx-1">-</span> 100 %
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Fill in the feedback"
                        className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-xs uppercase transition-colors shadow-sm">
                  ADD RANGE
                </button>
                <button className="px-4 py-2 border border-zinc-300 hover:bg-zinc-50 text-zinc-600 rounded-sm font-bold text-xs uppercase transition-colors flex items-center gap-2">
                  <X className="w-3 h-3" /> Distribute Evenly
                </button>
              </div>
            </div>
          </Accordion>
        </div>
      </div>
    </Modal>
  );
}
