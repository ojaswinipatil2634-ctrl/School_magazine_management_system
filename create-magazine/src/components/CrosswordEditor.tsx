import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Grid, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { CrosswordWord, CrosswordData } from '../types';

interface CrosswordEditorProps {
  initialData?: CrosswordData;
  onSave: (data: CrosswordData) => void;
}

export default function CrosswordEditor({ initialData, onSave }: CrosswordEditorProps) {
  const [words, setWords] = useState<CrosswordWord[]>(initialData?.words || []);
  const [gridSize, setGridSize] = useState(initialData?.gridSize || 15);

  const addWord = () => {
    setWords([...words, { answer: '', clue: '', x: 0, y: 0, direction: 'across' }]);
  };

  const removeWord = (index: number) => {
    setWords(words.filter((_, i) => i !== index));
  };

  const updateWord = (index: number, field: keyof CrosswordWord, value: any) => {
    const newWords = [...words];
    newWords[index] = { ...newWords[index], [field]: value };
    setWords(newWords);
  };

  const handleSave = () => {
    onSave({ words, gridSize });
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
          <Grid className="w-5 h-5" />
          Crossword Editor
        </h2>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Crossword
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-zinc-700">Grid Size:</label>
          <input
            type="number"
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value) || 15)}
            className="w-20 px-3 py-1 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-3">
          {words.map((word, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Answer</label>
                  <input
                    type="text"
                    value={word.answer}
                    onChange={(e) => updateWord(index, 'answer', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    placeholder="ANSWER"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Clue</label>
                  <input
                    type="text"
                    value={word.clue}
                    onChange={(e) => updateWord(index, 'clue', e.target.value)}
                    placeholder="Enter clue here..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">X</label>
                    <input
                      type="number"
                      value={word.x}
                      onChange={(e) => updateWord(index, 'x', parseInt(e.target.value) || 0)}
                      className="w-16 px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Y</label>
                    <input
                      type="number"
                      value={word.y}
                      onChange={(e) => updateWord(index, 'y', parseInt(e.target.value) || 0)}
                      className="w-16 px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Direction</label>
                    <select
                      value={word.direction}
                      onChange={(e) => updateWord(index, 'direction', e.target.value)}
                      className="px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="across">Across</option>
                      <option value="down">Down</option>
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeWord(index)}
                className="mt-6 p-2 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addWord}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-lg text-zinc-500 hover:border-emerald-500 hover:text-emerald-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Word
        </button>
      </div>
    </div>
  );
}
