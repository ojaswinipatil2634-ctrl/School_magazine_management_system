import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, List, BookOpen, Settings, CheckCircle2, XCircle, RotateCcw, Eye, Maximize2, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { BookData, ContentItem } from '../types';
import CrosswordViewer from './CrosswordViewer';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveBookViewerProps {
  id: string;
  title: string;
  data: BookData;
  allContent: ContentItem[];
}

export default function InteractiveBookViewer({ id, title, data, allContent }: InteractiveBookViewerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showCover, setShowCover] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [quizStates, setQuizStates] = useState<Record<string, { 
    selectedOption?: string; 
    isSubmitted: boolean; 
    isCorrect?: boolean;
    showSolution?: boolean;
  }>>({});
  const [guessStates, setGuessStates] = useState<Record<string, boolean>>({});
  const [fillBlanksStates, setFillBlanksStates] = useState<Record<string, Record<number, string>>>({});

  const currentPage = data.pages[currentPageIndex];

  const nextPage = () => {
    if (currentPageIndex < data.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleQuizSubmit = (elementId: string, correctOptionId: string) => {
    const state = quizStates[elementId];
    if (!state?.selectedOption) return;

    setQuizStates({
      ...quizStates,
      [elementId]: {
        ...state,
        isSubmitted: true,
        isCorrect: state.selectedOption === correctOptionId
      }
    });
  };

  const renderElement = (element: any) => {
    switch (element.type) {
      case 'text':
        const textContent = typeof element.content === 'string' ? element.content : element.content?.text || '';
        return <div className="prose prose-zinc max-w-none whitespace-pre-wrap text-zinc-700 leading-relaxed text-lg">{textContent}</div>;
      case 'image':
        return (
          <div className="space-y-4">
            <img 
              src={element.content} 
              alt={element.metadata?.altText || ''} 
              title={element.metadata?.hoverText || ''}
              className="w-full rounded-lg shadow-sm object-cover max-h-[500px]" 
              referrerPolicy="no-referrer" 
            />
            {element.metadata?.hoverText && <p className="text-sm text-zinc-500 text-center font-medium">{element.metadata.hoverText}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xl bg-black">
            <iframe
              src={element.content.includes('youtube.com') || element.content.includes('youtu.be') 
                ? element.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                : element.content}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        );
      case 'audio':
        return (
          <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-900">{element.metadata?.hoverText || 'Audio Content'}</p>
              <audio controls className="w-full mt-2 h-8">
                <source src={element.content} type="audio/mpeg" />
              </audio>
            </div>
          </div>
        );
      case 'multiple-choice':
      case 'true-false': {
        const state = quizStates[element.id] || { isSubmitted: false };
        let options = element.content?.options || [];
        
        // Handle True/False specifically
        if (element.type === 'true-false') {
          const correctAnswer = element.content.correctAnswer;
          options = [
            { id: 'true', text: 'True', isCorrect: correctAnswer === true },
            { id: 'false', text: 'False', isCorrect: correctAnswer === false }
          ];
        }
        
        // Convert string options to objects for the viewer if they are strings (legacy support)
        const normalizedOptions = options.map((o: any) => {
          if (typeof o === 'string') {
            const isCorrect = o === element.content.answer;
            return { id: o, text: o, isCorrect };
          }
          return o;
        });
        
        const correctOption = normalizedOptions.find((o: any) => o.isCorrect);

        return (
          <div className="space-y-6 bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm">
            <h4 className="text-xl font-bold text-zinc-900">{element.content?.question}</h4>
            <div className="space-y-3">
              {normalizedOptions.map((option: any) => {
                const isSelected = state.selectedOption === option.id;
                const isCorrect = option.isCorrect;
                const showResult = state.isSubmitted || state.showSolution;

                return (
                  <button
                    key={option.id}
                    disabled={state.isSubmitted}
                    onClick={() => setQuizStates({
                      ...quizStates,
                      [element.id]: { ...state, selectedOption: option.id }
                    })}
                    className={cn(
                      "w-full text-left px-6 py-4 rounded-xl border-2 transition-all flex items-center justify-between group",
                      !showResult && isSelected && "border-blue-600 bg-blue-50/50",
                      !showResult && !isSelected && "border-zinc-100 bg-zinc-50 hover:border-zinc-200",
                      showResult && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-900",
                      showResult && isSelected && !isCorrect && "border-red-500 bg-red-50 text-red-900",
                      showResult && !isSelected && !isCorrect && "border-zinc-100 bg-zinc-50 opacity-50"
                    )}
                  >
                    <span className="font-medium">{option.text}</span>
                    {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </button>
                );
              })}
            </div>

            {!state.isSubmitted ? (
              <button
                disabled={!state.selectedOption}
                onClick={() => handleQuizSubmit(element.id, correctOption?.id)}
                className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Check
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: state.isCorrect ? '100%' : '0%' }}
                      className={cn("h-full", state.isCorrect ? "bg-emerald-500" : "bg-red-500")}
                    />
                  </div>
                  <span className="text-sm font-bold text-zinc-900">{state.isCorrect ? '1/1' : '0/1'}</span>
                </div>
                <div className="flex gap-3">
                  {!state.isCorrect && (
                    <button
                      onClick={() => setQuizStates({
                        ...quizStates,
                        [element.id]: { ...state, showSolution: true }
                      })}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Show solution
                    </button>
                  )}
                  <button
                    onClick={() => setQuizStates({
                      ...quizStates,
                      [element.id]: { isSubmitted: false, showSolution: false, selectedOption: undefined }
                    })}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-full font-bold hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'guess-answer':
      case 'guess-the-word': {
        const isRevealed = guessStates[element.id];
        const answer = element.content.word || element.content.answer;
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-zinc-100 shadow-sm space-y-8 text-center">
            <div className="space-y-4">
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Riddle:</p>
              <p className="text-2xl font-medium text-zinc-800 leading-relaxed whitespace-pre-wrap">{element.content.question}</p>
              {element.content.hint && isRevealed && (
                <p className="text-sm text-zinc-500 italic">Hint: {element.content.hint}</p>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {!isRevealed ? (
                <motion.button
                  key="reveal"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => setGuessStates({ ...guessStates, [element.id]: true })}
                  className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Click to see the answer.
                </motion.button>
              ) : (
                <motion.div
                  key="answer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Answer</p>
                  <p className="text-3xl font-bold text-blue-600">{answer}</p>
                  <button 
                    onClick={() => setGuessStates({ ...guessStates, [element.id]: false })}
                    className="text-xs font-bold text-zinc-400 hover:text-zinc-600 mt-4 underline underline-offset-4"
                  >
                    Hide answer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }
      case 'fill-blanks':
      case 'fill-in-the-blanks': {
        const text = element.content.text || '';
        const answers = element.content.answers || [];
        const state = fillBlanksStates[element.id] || {};

        // If we have the new structure with 'answers' array and '___' in text
        if (answers.length > 0 && text.includes('___')) {
          const parts = text.split('___');
          return (
            <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 shadow-sm leading-loose text-lg">
              {parts.map((part: string, idx: number) => (
                <React.Fragment key={idx}>
                  <span>{part}</span>
                  {idx < parts.length - 1 && (
                    <input
                      type="text"
                      value={state[idx] || ''}
                      onChange={(e) => setFillBlanksStates({
                        ...fillBlanksStates,
                        [element.id]: { ...state, [idx]: e.target.value }
                      })}
                      placeholder="..."
                      className={cn(
                        "mx-2 px-3 py-1 rounded-lg border-2 transition-all w-32 text-center font-bold",
                        !(state[idx]) && "border-zinc-200 bg-white",
                        state[idx] && state[idx].toLowerCase().trim() !== answers[idx].toLowerCase().trim() && "border-red-300 bg-red-50 text-red-700",
                        state[idx] && state[idx].toLowerCase().trim() === answers[idx].toLowerCase().trim() && "border-emerald-500 bg-emerald-50 text-emerald-700"
                      )}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          );
        }

        // Fallback to legacy *word* structure
        const parts = text.split(/(\*.*?\*)/g);
        return (
          <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 shadow-sm leading-loose text-lg">
            {parts.map((part: string, idx: number) => {
              if (part.startsWith('*') && part.endsWith('*')) {
                const answer = part.slice(1, -1);
                const value = state[idx] || '';
                const isCorrect = value.toLowerCase().trim() === answer.toLowerCase().trim();
                const showResult = !!value && value.length >= answer.length;

                return (
                  <input
                    key={idx}
                    type="text"
                    value={value}
                    onChange={(e) => setFillBlanksStates({
                      ...fillBlanksStates,
                      [element.id]: { ...state, [idx]: e.target.value }
                    })}
                    placeholder="..."
                    className={cn(
                      "mx-2 px-3 py-1 rounded-lg border-2 transition-all w-32 text-center font-bold",
                      !value && "border-zinc-200 bg-white",
                      value && !showResult && "border-blue-300 bg-blue-50",
                      showResult && isCorrect && "border-emerald-500 bg-emerald-50 text-emerald-700",
                      showResult && !isCorrect && "border-red-300 bg-red-50 text-red-700"
                    )}
                  />
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
        );
      }
      case 'summary':
        return (
          <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <FileText className="w-5 h-5" />
              <h4 className="font-bold uppercase tracking-widest text-sm">Summary</h4>
            </div>
            <div className="prose prose-blue max-w-none text-zinc-700 leading-relaxed text-lg italic">
              {element.content.text}
            </div>
          </div>
        );
      case 'crossword':
        const crossword = (allContent || []).find(c => c.id === element.content);
        if (!crossword) return <div className="p-4 bg-zinc-100 rounded-lg text-zinc-500 italic">Crossword not found</div>;
        return <CrosswordViewer data={crossword.data as any} />;
      default:
        return (
          <div className="p-8 bg-zinc-50 border border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-400 space-y-2">
            <Settings className="w-8 h-8 opacity-20" />
            <p className="text-sm font-medium uppercase tracking-widest">{element.type.replace('-', ' ')}</p>
            <p className="text-xs">Interactive content coming soon</p>
          </div>
        );
    }
  };

  const isCoverPage = showCover;

  return (
    <div className="max-w-6xl mx-auto bg-white min-h-screen flex flex-col relative overflow-hidden">
      {/* Top Header Bar */}
      {!isCoverPage && (
        <div className="flex items-center justify-between px-8 py-4 border-b border-zinc-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-blue-600">{currentPageIndex + 1} / {data.pages.length}</span>
            <div className="flex gap-2">
              <button onClick={prevPage} disabled={currentPageIndex === 0} className="p-1.5 hover:bg-zinc-100 rounded-lg disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={nextPage} disabled={currentPageIndex === data.pages.length - 1} className="p-1.5 hover:bg-zinc-100 rounded-lg disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5" /></button>
              <button className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"><Maximize2 className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowTOC(!showTOC)}
              className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
            >
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPageIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "mx-auto w-full",
              isCoverPage ? "max-w-4xl py-20 px-8" : "max-w-5xl py-12 px-8"
            )}
          >
            {isCoverPage ? (
              <div className="flex flex-col items-center text-center space-y-12">
                <div className="w-full aspect-[4/3] max-w-md bg-blue-50 rounded-lg shadow-2xl overflow-hidden relative group">
                  <img 
                    src={data.coverImage || `https://picsum.photos/seed/${id}/800/600`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {!data.coverImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-900 opacity-40">Example image</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold text-zinc-900 tracking-tight">{title || 'School Magazine'}</h1>
                  {data.coverText && (
                    <p className="text-2xl text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
                      {data.coverText}
                    </p>
                  )}
                  {!data.coverText && <p className="text-xl text-zinc-500 font-medium">Interactive Edition</p>}
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setShowCover(false)}
                    className="px-12 py-4 bg-blue-600 text-white rounded-lg font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all text-lg"
                  >
                    Read
                  </button>
                  {data.pdfURL && (
                    <a 
                      href={data.pdfURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-12 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-bold shadow-xl shadow-blue-50 hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all text-lg flex items-center gap-2"
                    >
                      <FileText className="w-5 h-5" />
                      Download PDF
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <h2 className="text-3xl font-bold text-zinc-900 tracking-tight border-b border-zinc-100 pb-6">
                  {currentPage?.title}
                </h2>
                <div className="space-y-16">
                  {currentPage?.rows.map((row) => (
                    <div key={row.id} className="flex flex-col md:flex-row gap-12">
                      {row.columns.map((col) => (
                        <div key={col.id} className="flex-1 space-y-12">
                          {col.elements.map((element) => (
                            <div key={element.id}>
                              {renderElement(element)}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar */}
      {!isCoverPage && (
        <div className="px-8 py-6 border-t border-zinc-100 bg-white flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-zinc-900 truncate max-w-[300px]">{title} 🌟</h3>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-blue-600">{currentPageIndex + 1} / {data.pages.length}</span>
              <div className="flex gap-2">
                <button onClick={prevPage} disabled={currentPageIndex === 0} className="p-2 hover:bg-zinc-100 rounded-lg disabled:opacity-30 transition-colors border border-zinc-200"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextPage} disabled={currentPageIndex === data.pages.length - 1} className="p-2 hover:bg-zinc-100 rounded-lg disabled:opacity-30 transition-colors border border-zinc-200"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!isCoverPage && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${((currentPageIndex + 1) / data.pages.length) * 100}%` }}
          />
        </div>
      )}

      {/* Table of Contents Overlay */}
      <AnimatePresence>
        {showTOC && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTOC(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-80 bg-white z-[60] shadow-2xl border-l border-zinc-200 p-8"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-bold text-zinc-900 uppercase tracking-widest text-sm">Table of Contents</h3>
                <button onClick={() => setShowTOC(false)} className="text-zinc-400 hover:text-zinc-900">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                {data.pages.map((page, idx) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      setCurrentPageIndex(idx);
                      setShowTOC(false);
                    }}
                    className={cn(
                      "w-full text-left px-5 py-4 rounded-xl text-sm font-bold transition-all flex items-center gap-4",
                      idx === currentPageIndex 
                        ? "bg-blue-50 text-blue-700 border border-blue-100" 
                        : "text-zinc-600 hover:bg-zinc-50 border border-transparent"
                    )}
                  >
                    <span className="text-xs opacity-40 w-6">{idx + 1}</span>
                    <span className="truncate">{page.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
