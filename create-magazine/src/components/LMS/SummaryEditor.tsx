import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, Plus } from 'lucide-react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface SummaryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function SummaryEditor({ isOpen, onClose, onSave }: SummaryEditorProps) {
  const [title, setTitle] = useState('Untitled Summary');
  const [introText, setIntroText] = useState('Choose the correct statement.');
  const [sets, setSets] = useState([
    { statements: ['', ''] }
  ]);

  const handleAddSet = () => {
    setSets([...sets, { statements: ['', ''] }]);
  };

  const handleAddStatement = (setIndex: number) => {
    const newSets = [...sets];
    newSets[setIndex].statements.push('');
    setSets(newSets);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Summary"
      onDone={() => onSave({ title, introText, sets })}
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
          label="Introduction text"
          required
          helperText="Will be displayed above the summary task."
        >
          <input
            type="text"
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm"
          />
        </FormGroup>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
                Summary<span className="text-red-500 ml-0.5">*</span>
              </h3>
            </div>
            <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
              <button className="px-4 py-1.5 bg-zinc-50 text-zinc-600 text-xs font-bold border-r border-zinc-200">Textual</button>
              <button className="px-4 py-1.5 bg-white text-zinc-900 text-xs font-bold">Default</button>
            </div>
          </div>
          
          {sets.map((set, setIndex) => (
            <div key={setIndex} className="mb-6 border border-zinc-300 rounded-sm overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-[#1f6fb2] text-white">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-sm font-bold tracking-tight">Set of statements</span>
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
              <div className="p-4 bg-white space-y-6">
                <p className="text-xs font-bold text-zinc-800">
                  List of statements for the summary - the first statement is correct.<span className="text-red-500 ml-0.5">*</span>
                </p>
                
                {set.statements.map((statement, stmtIndex) => (
                  <div key={stmtIndex} className="border border-zinc-300 rounded-sm overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#6b6b6b] text-white">
                      <span className="text-[11px] font-bold tracking-tight">Statement</span>
                      <div className="flex items-center gap-2">
                        <button className="p-0.5 hover:bg-white/10 rounded transition-colors"><X className="w-3 h-3" /></button>
                        <div className="flex flex-col gap-0.5">
                          <button className="p-0.5 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-2.5 h-2.5 -rotate-90" /></button>
                          <button className="p-0.5 hover:bg-white/10 rounded transition-colors"><ChevronRight className="w-2.5 h-2.5 rotate-90" /></button>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <textarea
                        value={statement}
                        onChange={(e) => {
                          const newSets = [...sets];
                          newSets[setIndex].statements[stmtIndex] = e.target.value;
                          setSets(newSets);
                        }}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => handleAddStatement(setIndex)}
                  className="px-4 py-2 bg-[#6b6b6b] hover:bg-[#5a5a5a] text-white rounded-sm font-bold text-xs transition-colors shadow-sm"
                >
                  Add statement
                </button>

                <Accordion title="Tip">
                  <p className="text-xs text-zinc-500 italic">Add a tip for this set of statements.</p>
                </Accordion>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddSet}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-xs uppercase transition-colors shadow-md"
          >
            ADD STATEMENTS
          </button>
        </div>

        <Accordion title="Overall Feedback">
          <p className="text-sm text-zinc-500 italic">Define custom feedback for any score range.</p>
        </Accordion>
      </div>
    </Modal>
  );
}
