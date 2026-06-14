
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Maximize2, 
  Minimize2, 
  Share2, 
  Heart,
  BookOpen,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { InteractiveMagazine, InteractiveMagazinePage, InteractiveMagazineElement } from '../types';

interface InteractiveMagazineViewerProps {
  magazineId: string;
  onClose: () => void;
}

const InteractiveMagazineViewer: React.FC<InteractiveMagazineViewerProps> = ({ magazineId, onClose }) => {
  const [magazine, setMagazine] = useState<InteractiveMagazine | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1); // -1 is cover
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [showCover, setShowCover] = useState(true);

  useEffect(() => {
    const fetchMagazine = async () => {
      try {
        const docRef = doc(db, 'interactive', magazineId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMagazine(data as InteractiveMagazine);
          setShowCover(data.data?.showCover ?? true);
          if (data.data?.showCover === false) {
            setCurrentPageIndex(0);
          }
        }
      } catch (error) {
        console.error("Error fetching interactive magazine:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMagazine();
  }, [magazineId]);

  const handleNext = () => {
    if (!magazine) return;
    if (currentPageIndex < magazine.data.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPageIndex > (showCover ? -1 : 0)) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleQuizSelect = (elementId: string, answer: any) => {
    setQuizAnswers(prev => ({
      ...prev,
      [elementId]: answer
    }));
  };

  const handleInputChange = (elementId: string, value: string) => {
    setQuizAnswers(prev => ({
      ...prev,
      [elementId]: value
    }));
  };

  const sortItems = (items: any[] | undefined): any[] => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const aVal = a.index ?? a.order ?? 0;
      const bVal = b.index ?? b.order ?? 0;
      return aVal - bVal;
    });
  };

  const getColSpan = (count: number) => {
    if (count <= 1) return 'md:col-span-12';
    if (count === 2) return 'md:col-span-6';
    if (count === 3) return 'md:col-span-4';
    if (count === 4) return 'md:col-span-3';
    return 'md:col-span-2';
  };

  const renderContent = (content: any) => {
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && content !== null) {
      if (content.text) return content.text;
      return JSON.stringify(content);
    }
    return '';
  };

  const handleShare = async () => {
    if (!magazine) return;
    const shareData = {
      title: magazine.title,
      text: `Check out this interactive magazine: ${magazine.title}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const renderQuizOption = (element: InteractiveMagazineElement, option: any, idx: number) => {
    const isSelected = quizAnswers[element.id] === idx;
    const isCorrect = typeof option === 'object' ? option.isCorrect : (element.content.correctIndex === idx);
    const showFeedback = isSelected && (typeof option === 'object' ? 'isCorrect' in option : 'correctIndex' in element.content);
    const optionText = typeof option === 'object' ? option.text : option;

    return (
      <button
        key={idx}
        onClick={() => handleQuizSelect(element.id, idx)}
        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
          isSelected
            ? showFeedback
              ? isCorrect 
                ? 'bg-green-500/20 border-green-500 text-white'
                : 'bg-red-500/20 border-red-500 text-white'
              : 'bg-blue-500/20 border-blue-500 text-white'
            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">{optionText}</span>
          {showFeedback && (
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          )}
        </div>
        {isSelected ? (
          showFeedback ? (
            isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />
          ) : <CheckCircle2 className="w-5 h-5 text-blue-400" />
        ) : (
          <Circle className="w-5 h-5 opacity-20" />
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white font-medium">Loading Interactive Experience...</p>
        </div>
      </div>
    );
  }

  if (!magazine) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
        <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Magazine Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">The interactive magazine you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentPage = currentPageIndex === -1 ? null : magazine.data.pages[currentPageIndex];

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden ${isFullscreen ? 'p-0' : 'p-0 md:p-4'}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{magazine.title}</h1>
            <p className="text-xs text-slate-400">
              {currentPageIndex === -1 ? 'Cover' : `Page ${currentPageIndex + 1} of ${magazine.data.pages.length}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Share Magazine"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Close Viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {currentPageIndex === -1 ? (
            <motion.div
              key="cover"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full h-full flex items-center justify-center p-4 md:p-8"
            >
              <div className="relative w-full max-w-4xl aspect-[3/4] md:aspect-video rounded-2xl overflow-hidden shadow-2xl group">
                <img 
                  src={magazine.data.coverImage || magazine.thumbnail} 
                  alt={magazine.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent flex flex-col justify-end p-8 md:p-16">
                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl md:text-7xl font-black mb-4 leading-tight"
                  >
                    {magazine.data.coverText || magazine.title}
                  </motion.h2>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <button 
                      onClick={handleNext}
                      className="px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg hover:bg-blue-500 hover:text-white transition-all transform hover:scale-105"
                    >
                      Start Reading
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`page-${currentPageIndex}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-12"
            >
              <div className="max-w-5xl mx-auto space-y-12 pb-24">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-bold mb-2">
                    {sortItems(magazine.data.pages)[currentPageIndex]?.title}
                  </h2>
                  <div className="w-24 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
                </div>

                {sortItems(sortItems(magazine.data.pages)[currentPageIndex]?.rows).map((row, rowIndex) => (
                  <div key={`${row.id}-${rowIndex}`} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {sortItems(row.columns).map((col, colIndex) => (
                      <div 
                        key={`${col.id}-${colIndex}`} 
                        className={`space-y-6 ${getColSpan(row.columns.length)}`}
                      >
                        {sortItems(col.elements).map((element, elIndex) => (
                          <div key={`${element.id}-${elIndex}`} className="w-full">
                            {element.type === 'text' && (
                              <div className="prose prose-invert max-w-none text-lg text-slate-300 leading-relaxed">
                                {renderContent(element.content)}
                              </div>
                            )}
                            {element.type === 'header' && (
                              <h3 className="text-2xl font-bold text-white mb-4">
                                {renderContent(element.content)}
                              </h3>
                            )}
                            {element.type === 'image' && (
                              <div className="rounded-xl overflow-hidden shadow-lg">
                                <img 
                                  src={typeof element.content === 'string' ? element.content : element.content?.url} 
                                  alt="Magazine content" 
                                  className="w-full h-auto"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            {element.type === 'video' && (
                              <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                                <iframe 
                                  src={typeof element.content === 'string' ? element.content : element.content?.url} 
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              </div>
                            )}
                            {element.type === 'multiple-choice' && (
                              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                                <h4 className="text-xl font-bold mb-6">{element.content.question}</h4>
                                <div className="space-y-3">
                                  {element.content.options?.map((option: any, idx: number) => renderQuizOption(element, option, idx))}
                                </div>
                              </div>
                            )}
                            {element.type === 'true-false' && (
                              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                                <h4 className="text-xl font-bold mb-6">{element.content.question}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {[true, false].map((val) => {
                                    const isSelected = quizAnswers[element.id] === val;
                                    const isCorrect = element.content.correctAnswer === val;
                                    
                                    return (
                                      <button
                                        key={val.toString()}
                                        onClick={() => handleQuizSelect(element.id, val)}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                                          isSelected
                                            ? isCorrect 
                                              ? 'bg-green-500/20 border-green-500 text-white'
                                              : 'bg-red-500/20 border-red-500 text-white'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                      >
                                        <span className="font-bold uppercase tracking-wider">{val ? 'True' : 'False'}</span>
                                        {isSelected && (
                                          <div className="flex items-center gap-1">
                                            {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}
                                            <span className="text-[10px] font-bold uppercase">{isCorrect ? 'Correct' : 'Wrong'}</span>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {element.type === 'guess-the-word' && (
                              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                                <h4 className="text-xl font-bold mb-4">{element.content.question}</h4>
                                {element.content.hint && (
                                  <p className="text-sm text-slate-400 italic mb-6">Hint: {element.content.hint}</p>
                                )}
                                <div className="space-y-4">
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      placeholder="Type your answer here..."
                                      value={quizAnswers[element.id] || ''}
                                      onChange={(e) => handleInputChange(element.id, e.target.value)}
                                      className={`w-full bg-slate-800 border rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                                        quizAnswers[element.id]
                                          ? quizAnswers[element.id].toLowerCase().trim() === element.content.word?.toLowerCase().trim()
                                            ? 'border-green-500 focus:ring-green-500'
                                            : 'border-red-500 focus:ring-red-500'
                                          : 'border-slate-700 focus:ring-blue-500'
                                      }`}
                                    />
                                    {quizAnswers[element.id] && (
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {quizAnswers[element.id].toLowerCase().trim() === element.content.word?.toLowerCase().trim() ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        ) : (
                                          <X className="w-6 h-6 text-red-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {quizAnswers[element.id] && (
                                    <p className={`text-sm font-bold uppercase tracking-widest ${
                                      quizAnswers[element.id].toLowerCase().trim() === element.content.word?.toLowerCase().trim()
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                    }`}>
                                      {quizAnswers[element.id].toLowerCase().trim() === element.content.word?.toLowerCase().trim() 
                                        ? 'Correct! 🎉' 
                                        : 'Keep trying...'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {element.type === 'fill-in-the-blanks' && (
                              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
                                <h4 className="text-xl font-bold mb-6">Fill in the Blanks</h4>
                                <div className="text-lg text-slate-300 leading-relaxed mb-6">
                                  {element.content.text?.split('___').map((part: string, i: number, arr: any[]) => {
                                    const currentAnswers = (quizAnswers[element.id] as any) || {};
                                    const userValue = currentAnswers[i] || '';
                                    const correctValue = element.content.answers?.[i] || '';
                                    const isFilled = userValue.length > 0;
                                    const isCorrect = userValue.toLowerCase().trim() === correctValue.toLowerCase().trim();

                                    return (
                                      <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                          <span className="relative inline-block">
                                            <input 
                                              type="text"
                                              className={`inline-block w-32 mx-2 bg-slate-800 border-b-2 text-center focus:outline-none transition-colors ${
                                                isFilled 
                                                  ? isCorrect ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
                                                  : 'border-slate-600 focus:border-blue-500'
                                              }`}
                                              placeholder="..."
                                              value={userValue}
                                              onChange={(e) => {
                                                handleQuizSelect(element.id, { ...currentAnswers, [i]: e.target.value });
                                              }}
                                            />
                                            {isFilled && (
                                              <span className="absolute -top-6 left-1/2 -translate-x-1/2">
                                                {isCorrect ? (
                                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                  <X className="w-4 h-4 text-red-500" />
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                                {quizAnswers[element.id] && element.content.answers && (
                                  <div className="flex justify-between items-center">
                                    <p className="text-xs text-slate-500 italic">Type the correct words in the blanks</p>
                                    {Object.keys(quizAnswers[element.id]).length === element.content.answers.length && (
                                      <div className="text-sm font-bold text-blue-400">
                                        All blanks filled!
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {!['text', 'header', 'image', 'video', 'multiple-choice', 'true-false', 'guess-the-word', 'fill-in-the-blanks'].includes(element.type) && (
                              <div className="p-4 bg-slate-900/30 border border-dashed border-slate-700 rounded-xl text-xs text-slate-500">
                                Unsupported content type: {element.type}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 pointer-events-none">
          <button
            onClick={handlePrev}
            disabled={currentPageIndex === (showCover ? -1 : 0)}
            className={`p-3 md:p-4 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white pointer-events-auto transition-all transform hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none`}
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentPageIndex === magazine.data.pages.length - 1}
            className={`p-3 md:p-4 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white pointer-events-auto transition-all transform hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none`}
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </div>
      </div>

      {/* Footer Progress */}
      <div className="p-4 bg-gradient-to-t from-slate-950 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{currentPageIndex === -1 ? 'Cover' : `Page ${currentPageIndex + 1}`}</span>
            <span>{magazine.data.pages.length} Pages</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ 
                width: `${((currentPageIndex + (showCover ? 2 : 1)) / (magazine.data.pages.length + (showCover ? 1 : 0))) * 100}%` 
              }}
              className="h-full bg-blue-600 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMagazineViewer;
