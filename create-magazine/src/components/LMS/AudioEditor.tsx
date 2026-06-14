import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';

interface AudioEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function AudioEditor({ isOpen, onClose, onSave }: AudioEditorProps) {
  const [title, setTitle] = useState('Untitled Audio');
  const [playerMode, setPlayerMode] = useState('Minimalistic');
  const [fitToWrapper, setFitToWrapper] = useState(false);
  const [enableAutoplay, setEnableAutoplay] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Audio"
      onDone={() => onSave({ title, playerMode, fitToWrapper, enableAutoplay })}
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
          label="Source files"
          required
        >
          <div className="w-24 h-24 border-2 border-dashed border-zinc-200 rounded-sm flex items-center justify-center hover:border-[#1f6fb2] hover:bg-blue-50 transition-all cursor-pointer group">
            <Plus className="w-8 h-8 text-zinc-300 group-hover:text-[#1f6fb2] transition-colors" />
          </div>
        </FormGroup>

        <FormGroup
          label="Player mode"
          required
          helperText="Select the layout of the player."
        >
          <select
            value={playerMode}
            onChange={(e) => setPlayerMode(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border border-zinc-300 rounded-sm focus:border-[#1f6fb2] focus:ring-1 focus:ring-[#1f6fb2] outline-none transition-all text-sm bg-white"
          >
            <option>Minimalistic</option>
            <option>Full</option>
            <option>Transparent</option>
          </select>
        </FormGroup>

        <div className="space-y-4 mt-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={fitToWrapper}
              onChange={(e) => setFitToWrapper(e.target.checked)}
              className="w-4 h-4 border-zinc-300 rounded text-[#1f6fb2] focus:ring-[#1f6fb2]"
            />
            <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">Fit to wrapper</span>
          </label>

          <div className="space-y-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={enableAutoplay}
                onChange={(e) => setEnableAutoplay(e.target.checked)}
                className="w-4 h-4 border-zinc-300 rounded text-[#1f6fb2] focus:ring-[#1f6fb2]"
              />
              <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">Enable autoplay</span>
            </label>
            <p className="text-[11px] text-zinc-500 ml-7 italic">With autoplay the audio starts to play immediately. Do note that this is not supported by all browsers</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
