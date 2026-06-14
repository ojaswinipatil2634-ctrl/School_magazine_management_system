import React, { useState, useEffect, useRef } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { CrosswordData, CrosswordWord } from '../types';

interface CrosswordViewerProps {
  data: CrosswordData;
}

export default function CrosswordViewer({ data }: CrosswordViewerProps) {
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [feedback, setFeedback] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const grid = Array(data.gridSize).fill(null).map(() => Array(data.gridSize).fill(''));
    setUserGrid(grid);
    setFeedback(Array(data.gridSize).fill(null).map(() => Array(data.gridSize).fill(false)));
  }, [data]);

  const handleInput = (x: number, y: number, value: string) => {
    const newGrid = [...userGrid];
    newGrid[y][x] = value.toUpperCase().slice(-1);
    setUserGrid(newGrid);
  };

  const checkAnswers = () => {
    const words = data.words || [];
    const newFeedback = Array(data.gridSize).fill(null).map(() => Array(data.gridSize).fill(false));
    words.forEach(word => {
      for (let i = 0; i < word.answer.length; i++) {
        const cx = word.direction === 'across' ? word.x + i : word.x;
        const cy = word.direction === 'down' ? word.y + i : word.y;
        if (userGrid[cy][cx] === word.answer[i]) {
          newFeedback[cy][cx] = true;
        }
      }
    });
    setFeedback(newFeedback);
  };

  const reset = () => {
    setUserGrid(Array(data.gridSize).fill(null).map(() => Array(data.gridSize).fill('')));
    setFeedback(Array(data.gridSize).fill(null).map(() => Array(data.gridSize).fill(false)));
  };

  // Determine which cells are part of the crossword
  const activeCells = new Set<string>();
  const cellNumbers = new Map<string, number>();
  
  const words = data.words || [];
  
  words.forEach((word, index) => {
    cellNumbers.set(`${word.x},${word.y}`, index + 1);
    for (let i = 0; i < word.answer.length; i++) {
      const cx = word.direction === 'across' ? word.x + i : word.x;
      const cy = word.direction === 'down' ? word.y + i : word.y;
      activeCells.add(`${cx},${cy}`);
    }
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 bg-white rounded-xl shadow-sm border border-zinc-200">
      <div className="flex-1">
        <div 
          className="grid gap-px bg-zinc-300 border border-zinc-300"
          style={{ gridTemplateColumns: `repeat(${data.gridSize}, 1fr)` }}
        >
          {Array(data.gridSize).fill(null).map((_, y) => (
            Array(data.gridSize).fill(null).map((_, x) => {
              const isActive = activeCells.has(`${x},${y}`);
              const number = cellNumbers.get(`${x},${y}`);
              
              return (
                <div 
                  key={`${x}-${y}`} 
                  className={cn(
                    "aspect-square relative flex items-center justify-center text-lg font-bold transition-colors",
                    isActive ? "bg-white" : "bg-zinc-100",
                    selectedCell?.x === x && selectedCell?.y === y ? "ring-2 ring-emerald-500 z-10" : ""
                  )}
                  onClick={() => isActive && setSelectedCell({ x, y })}
                >
                  {number && (
                    <span className="absolute top-0.5 left-0.5 text-[10px] font-normal text-zinc-500 leading-none">
                      {number}
                    </span>
                  )}
                  {isActive && (
                    <input
                      type="text"
                      value={userGrid[y]?.[x] || ''}
                      onChange={(e) => handleInput(x, y, e.target.value)}
                      className={cn(
                        "w-full h-full text-center bg-transparent border-none focus:ring-0 p-0 uppercase",
                        feedback[y]?.[x] ? "text-emerald-600" : "text-zinc-900"
                      )}
                    />
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-6">
        <div className="flex gap-2">
          <button
            onClick={checkAnswers}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Check className="w-4 h-4" />
            Check
          </button>
          <button
            onClick={reset}
            className="px-3 py-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Across</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {(data.words || []).filter(w => w.direction === 'across').map((word, i) => (
                <div key={i} className="text-sm text-zinc-600">
                  <span className="font-bold text-zinc-900 mr-2">{cellNumbers.get(`${word.x},${word.y}`)}.</span>
                  {word.clue}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Down</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {(data.words || []).filter(w => w.direction === 'down').map((word, i) => (
                <div key={i} className="text-sm text-zinc-600">
                  <span className="font-bold text-zinc-900 mr-2">{cellNumbers.get(`${word.x},${word.y}`)}.</span>
                  {word.clue}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
