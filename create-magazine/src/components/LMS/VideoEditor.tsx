import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from './Modal';
import { FormGroup } from './FormGroup';
import { Accordion } from './Accordion';

interface VideoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export function VideoEditor({ isOpen, onClose, onSave }: VideoEditorProps) {
  const [title, setTitle] = useState('Untitled Video');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Video"
      onDone={() => onSave({ title })}
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
          label="Video sources"
          required
          helperText="To ensure that the video works in all browsers you should add both WebM and MP4 formatted sources."
        >
          <div className="w-24 h-24 border-2 border-dashed border-zinc-200 rounded-sm flex items-center justify-center hover:border-[#1f6fb2] hover:bg-blue-50 transition-all cursor-pointer group">
            <Plus className="w-8 h-8 text-zinc-300 group-hover:text-[#1f6fb2] transition-colors" />
          </div>
        </FormGroup>

        <div className="space-y-4 mt-8">
          <Accordion title="Visuals">
            <p className="text-sm text-zinc-500 italic">Configure visual settings for the video player.</p>
          </Accordion>
          <Accordion title="Playback">
            <p className="text-sm text-zinc-500 italic">Configure playback settings like autoplay and looping.</p>
          </Accordion>
          <Accordion title="Accessibility">
            <p className="text-sm text-zinc-500 italic">Add tracks for subtitles and descriptions.</p>
          </Accordion>
        </div>
      </div>
    </Modal>
  );
}
