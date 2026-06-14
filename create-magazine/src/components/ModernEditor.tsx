import React, { useState, useEffect } from 'react';
import { 
  Plus, BookOpen, Grid, Trash2, Edit2, Play, ChevronLeft, Layout, 
  Settings, Share2, Search, MoreVertical, Maximize2, X, Upload, 
  Type, Image as ImageIcon, Video, Music, CheckCircle2, HelpCircle, 
  GripVertical, Columns, List, FileText, MousePointer2, Layers, 
  MessageSquare, ExternalLink, Filter, ArrowUpDown, Undo2, Redo2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BookData, BookPage, ContentBlock, LayoutRow, BlockType, ContentItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { PagesView } from './LMS/PagesView';

interface ModernEditorProps {
  initialTitle?: string;
  initialData?: BookData;
  onSave: (title: string, data: BookData, onProgress?: (progress: number) => void) => void;
  crosswords: ContentItem[];
}

const CONTENT_TYPES: { type: BlockType; label: string; icon: any; tags: string[] }[] = [
  { type: 'text', label: 'Text', icon: Type, tags: ['Text Tool', 'Informative'] },
  { type: 'image', label: 'Image', icon: ImageIcon, tags: ['Image', 'Informative'] },
  { type: 'video', label: 'Video', icon: Video, tags: ['Video', 'Storytelling'] },
  { type: 'audio', label: 'Audio', icon: Music, tags: ['Audio'] },
  { type: 'multiple-choice', label: 'Multiple Choice', icon: CheckCircle2, tags: ['Assessment', 'Quiz'] },
  { type: 'true-false', label: 'True/False Question', icon: HelpCircle, tags: ['Assessment', 'Quiz'] },
  { type: 'fill-blanks', label: 'Fill in the Blanks', icon: FileText, tags: ['Assessment', 'Quiz'] },
  { type: 'summary', label: 'Summary', icon: FileText, tags: ['Assessment', 'Informative'] },
  { type: 'guess-answer', label: 'Guess the Answer', icon: HelpCircle, tags: ['Assessment', 'Cards'] },
];

const TAG_FILTERS = [
  'Assessment', 'Image', 'Video', 'Audio', 'Text Tool', 
  'Cards', 'Informative', 'Storytelling'
];

const ModernEditor: React.FC<ModernEditorProps> = ({ initialTitle, initialData, onSave, crosswords }) => {
  const [data, setData] = useState<BookData>(initialData || { pages: [{ id: uuidv4(), title: '', rows: [] }] });
  const [title, setTitle] = useState(initialTitle || '');
  const [activePageId, setActivePageId] = useState<string>(data.pages[0]?.id);
  const [showAddContentModal, setShowAddContentModal] = useState<{ rowId: string; colIndex: number } | null>(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showTextModal, setShowTextModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showVideoModal, setShowVideoModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showMultipleChoiceModal, setShowMultipleChoiceModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showTrueFalseModal, setShowTrueFalseModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showFillBlanksModal, setShowFillBlanksModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showAudioModal, setShowAudioModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [showGuessAnswerModal, setShowGuessAnswerModal] = useState<{ rowId: string; colIndex: number; blockId?: string } | null>(null);
  const [editingMCQ, setEditingMCQ] = useState<{ question: string; options: { id: string; text: string; isCorrect: boolean }[] }>({ question: '', options: [{ id: uuidv4(), text: '', isCorrect: false }] });
  const [editingTrueFalse, setEditingTrueFalse] = useState<{ question: string; isCorrect: boolean }>({ question: '', isCorrect: true });
  const [editingFillBlanks, setEditingFillBlanks] = useState<{ text: string }>({ text: '' });
  const [editingSummary, setEditingSummary] = useState<{ text: string }>({ text: '' });
  const [editingGuessAnswer, setEditingGuessAnswer] = useState<{ question: string; answer: string }>({ question: '', answer: '' });
  const [editingImageContent, setEditingImageContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'popularity' | 'az'>('popularity');

  // Undo/Redo History
  const [history, setHistory] = useState<BookData[]>([initialData || { pages: [{ id: uuidv4(), title: '', rows: [] }] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateData = (newData: BookData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setData(newData);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setData(history[prevIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setData(history[nextIndex]);
    }
  };

  const activePage = (data.pages || []).find(p => p.id === activePageId) || data.pages?.[0];

  const handleSave = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    setUploadProgress(0);
    
    onSave(title, data, (progress) => {
      setUploadProgress(progress);
      if (progress === 100) {
        setTimeout(() => setIsSaving(false), 500);
      }
    });
  };

  const addPage = (type: string = 'text') => {
    const pageId = uuidv4();
    const rowId = uuidv4();
    const colId = uuidv4();
    const blockId = uuidv4();

    const getDefaultContent = (t: string) => {
      switch (t) {
        case 'multiple-choice':
          return { question: '', options: [{ id: uuidv4(), text: '', isCorrect: false }] };
        case 'true-false':
          return { question: '', isCorrect: true };
        case 'fill-blanks':
          return { text: '' };
        case 'summary':
          return { text: '' };
        case 'guess-answer':
          return { question: '', answer: '' };
        default:
          return '';
      }
    };

    const newBlock: ContentBlock = {
      id: blockId,
      type: type as BlockType,
      content: getDefaultContent(type)
    };

    const newPage: BookPage = {
      id: pageId,
      title: '',
      rows: [
        {
          id: rowId,
          columns: [
            {
              id: colId,
              elements: [newBlock]
            }
          ]
        }
      ]
    };

    updateData({ ...data, pages: [...data.pages, newPage] });
    setActivePageId(pageId);
    setShowAddPageModal(false);
  };

  const addRow = (pageId: string, colCount: number = 1) => {
    const newRow: LayoutRow = {
      id: uuidv4(),
      columns: Array(colCount).fill(null).map(() => ({ id: uuidv4(), elements: [] }))
    };
    updateData({
      ...data,
      pages: data.pages.map(p => p.id === pageId ? { ...p, rows: [...p.rows, newRow] } : p)
    });
  };

  const removeRow = (pageId: string, rowId: string) => {
    updateData({
      ...data,
      pages: data.pages.map(p => p.id === pageId ? { ...p, rows: p.rows.filter(r => r.id !== rowId) } : p)
    });
  };

  const handleAddContent = (type: BlockType) => {
    if (!showAddContentModal) return;
    const { rowId, colIndex } = showAddContentModal;
    
    switch (type) {
      case 'image':
        setEditingImageContent('');
        setShowImageModal({ rowId, colIndex });
        break;
      case 'text':
        setShowTextModal({ rowId, colIndex });
        break;
      case 'video':
        setShowVideoModal({ rowId, colIndex });
        break;
      case 'multiple-choice':
        setShowMultipleChoiceModal({ rowId, colIndex });
        break;
      case 'true-false':
        setShowTrueFalseModal({ rowId, colIndex });
        break;
      case 'fill-blanks':
        setShowFillBlanksModal({ rowId, colIndex });
        break;
      case 'summary':
        setShowSummaryModal({ rowId, colIndex });
        break;
      case 'audio':
        setShowAudioModal({ rowId, colIndex });
        break;
      case 'guess-answer':
        setShowGuessAnswerModal({ rowId, colIndex });
        break;
      default:
        const newBlock: ContentBlock = {
          id: uuidv4(),
          type,
          content: ''
        };
        saveBlockToGrid(rowId, colIndex, newBlock);
    }
    setShowAddContentModal(null);
  };

  const saveBlockToGrid = (rowId: string, colIndex: number, block: ContentBlock, isUpdate: boolean = false) => {
    updateData({
      ...data,
      pages: data.pages.map(p => p.id === activePageId ? {
        ...p,
        rows: p.rows.map(r => r.id === rowId ? {
          ...r,
          columns: r.columns.map((c, idx) => idx === colIndex ? { 
            ...c, 
            elements: isUpdate 
              ? c.elements.map(e => e.id === block.id ? block : e)
              : [...c.elements, block] 
          } : c)
        } : r)
      } : p)
    });
  };

  const filteredContentTypes = CONTENT_TYPES
    .filter(ct => ct.label.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(ct => !activeTag || ct.tags.includes(activeTag))
    .sort((a, b) => sortBy === 'az' ? a.label.localeCompare(b.label) : 0);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <button 
            onClick={() => setShowAddPageModal(true)}
            className="font-bold text-zinc-900 uppercase tracking-widest text-xs hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            Pages
            <Plus className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setData({ ...data, showCover: !data.showCover })}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              data.showCover ? "bg-blue-50 text-blue-600" : "text-zinc-400 hover:bg-zinc-100"
            )}
            title="Toggle Book Cover"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 border-l border-zinc-100 ml-2 pl-2">
            <button 
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {data.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setActivePageId(page.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                activePageId === page.id 
                  ? "bg-blue-50 text-blue-700 border border-blue-100" 
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <span className="text-xs opacity-40 group-hover:opacity-100">{index + 1}.</span>
              <span className="truncate flex-1 text-left">{page.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-100 flex flex-col gap-2">
          <button
            onClick={() => setShowAddPageModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-lg shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            Add Page
          </button>
        </div>
      </aside>

      {/* Main Editing Area */}
      <main className="flex-1 overflow-y-auto bg-zinc-50/50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Magazine Cover Settings */}
          {!data.showCover && (
            <button 
              onClick={() => setData({ ...data, showCover: true })}
              className="w-full py-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-white flex flex-col items-center justify-center gap-4 text-zinc-400 hover:border-blue-500 hover:text-blue-600 transition-all group"
            >
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-zinc-900">Add Magazine Cover</p>
                <p className="text-sm">Set a title, cover image, and headline for your magazine</p>
              </div>
            </button>
          )}

          {data.showCover && (
            <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Magazine Cover
                </h3>
                <button 
                  onClick={() => setData({ ...data, showCover: false })}
                  className="text-xs font-bold text-zinc-400 hover:text-red-500 uppercase tracking-widest"
                >
                  Remove Cover
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Magazine Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="My School Magazine"
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cover Image</label>
                    <div className="flex flex-col gap-3">
                      <input 
                        type="file" 
                        id="cover-image-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              setError('Please upload an image file for the cover.');
                              return;
                            }
                            setError(null);
                            setImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setData({ ...data, coverImage: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button 
                        onClick={() => document.getElementById('cover-image-upload')?.click()}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium bg-zinc-50/50"
                      >
                        <Upload className="w-4 h-4" />
                        {data.coverImage ? 'Change Cover Image' : 'Upload Cover Image'}
                      </button>
                      {data.coverImage && (
                        <button 
                          onClick={() => setData({ ...data, coverImage: undefined })}
                          className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest self-start"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Cover Headline</label>
                    <textarea 
                      value={data.coverText || ''}
                      onChange={(e) => setData({ ...data, coverText: e.target.value })}
                      placeholder="Enter a catchy headline for your magazine..."
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] resize-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Preview</label>
                  <div className="aspect-[3/4] bg-zinc-100 rounded-xl overflow-hidden border border-zinc-200 relative group">
                    {data.coverImage ? (
                      <img 
                        src={data.coverImage} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 p-8 text-center">
                        <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-xs font-medium">No cover image set</p>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-white font-bold text-lg line-clamp-2 leading-tight">
                        {data.coverText || 'Your Headline Here'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Metadata</span>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Title</label>
              </div>
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => setData({
                  ...data,
                  pages: data.pages.map(p => p.id === activePageId ? { ...p, title: e.target.value } : p)
                })}
                className="w-full text-3xl font-bold bg-transparent border-none focus:ring-0 p-0 text-zinc-900 placeholder:text-zinc-200"
                placeholder="Untitled Page"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              <Maximize2 className="w-4 h-4" />
              Enter fullscreen mode
            </button>
          </div>

          {/* Layout Selection */}
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Layout</h4>
              <div className="flex gap-2">
                <button onClick={() => addRow(activePageId, 1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" title="1 Column"><Columns className="w-4 h-4" /></button>
                <button onClick={() => addRow(activePageId, 2)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" title="2 Columns"><div className="flex gap-0.5"><div className="w-2 h-4 bg-zinc-400 rounded-sm"/><div className="w-2 h-4 bg-zinc-400 rounded-sm"/></div></button>
                <button onClick={() => addRow(activePageId, 3)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" title="3 Columns"><div className="flex gap-0.5"><div className="w-1.5 h-4 bg-zinc-400 rounded-sm"/><div className="w-1.5 h-4 bg-zinc-400 rounded-sm"/><div className="w-1.5 h-4 bg-zinc-400 rounded-sm"/></div></button>
              </div>
            </div>
          </div>

          {/* Content Rows */}
          <div className="space-y-6">
            {activePage.rows.map((row) => (
              <div key={row.id} className="group relative bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="w-4 h-4 text-zinc-300" />
                </div>
                
                <div className="flex divide-x divide-zinc-100">
                  {row.columns.map((col, colIdx) => (
                    <div key={col.id} className="flex-1 p-6 min-h-[120px] space-y-4">
                      {col.elements.map((block) => (
                        <div key={block.id} className="relative p-4 bg-zinc-50 rounded-xl border border-zinc-200 group/block">
                          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-all">
                            <button 
                              onClick={() => {
                                // Handle Edit
                                if (block.type === 'text') {
                                  setShowTextModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                  // Pre-fill modal
                                  setTimeout(() => {
                                    const el = document.getElementById('text-content') as HTMLTextAreaElement;
                                    if (el) el.value = block.content;
                                  }, 0);
                                } else if (block.type === 'image') {
                                  setEditingImageContent(block.content);
                                  setShowImageModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                  // Pre-fill modal
                                  setTimeout(() => {
                                    const alt = document.getElementById('alt-text') as HTMLInputElement;
                                    const hover = document.getElementById('hover-text') as HTMLInputElement;
                                    const deco = document.getElementById('is-decorative') as HTMLInputElement;
                                    if (alt) alt.value = block.metadata?.altText || '';
                                    if (hover) hover.value = block.metadata?.hoverText || '';
                                    if (deco) deco.checked = block.metadata?.isDecorative || false;
                                  }, 0);
                                } else if (block.type === 'video') {
                                  setShowVideoModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                  setTimeout(() => {
                                    const url = document.getElementById('video-url') as HTMLInputElement;
                                    const title = document.getElementById('video-title') as HTMLInputElement;
                                    if (url) url.value = block.content;
                                    if (title) title.value = block.metadata?.hoverText || '';
                                  }, 0);
                                } else if (block.type === 'multiple-choice') {
                                  setEditingMCQ(block.content);
                                  setShowMultipleChoiceModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                } else if (block.type === 'true-false') {
                                  setEditingTrueFalse(block.content);
                                  setShowTrueFalseModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                } else if (block.type === 'fill-blanks') {
                                  setEditingFillBlanks(block.content);
                                  setShowFillBlanksModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                } else if (block.type === 'summary') {
                                  setEditingSummary(block.content);
                                  setShowSummaryModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                } else if (block.type === 'audio') {
                                  setShowAudioModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                  setTimeout(() => {
                                    const url = document.getElementById('audio-url') as HTMLInputElement;
                                    const title = document.getElementById('audio-title') as HTMLInputElement;
                                    if (url) url.value = block.content;
                                    if (title) title.value = block.metadata?.hoverText || '';
                                  }, 0);
                                } else if (block.type === 'guess-answer') {
                                  setEditingGuessAnswer(block.content);
                                  setShowGuessAnswerModal({ rowId: row.id, colIndex: colIdx, blockId: block.id });
                                }
                              }}
                              className="w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-blue-600 shadow-sm"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                setData({
                                  ...data,
                                  pages: data.pages.map(p => p.id === activePageId ? {
                                    ...p,
                                    rows: p.rows.map(r => r.id === row.id ? {
                                      ...r,
                                      columns: r.columns.map(c => c.id === col.id ? { ...c, elements: c.elements.filter(e => e.id !== block.id) } : c)
                                    } : r)
                                  } : p)
                                });
                              }}
                              className="w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            {CONTENT_TYPES.find(ct => ct.type === block.type)?.icon && React.createElement(CONTENT_TYPES.find(ct => ct.type === block.type)!.icon, { className: "w-3 h-3" })}
                            {block.type}
                          </div>
                          <div className="text-sm text-zinc-600 line-clamp-3">
                            {block.type === 'text' ? block.content : 
                             block.type === 'image' ? (block.metadata?.altText || 'Image Block') : 
                             block.type === 'video' ? (block.metadata?.hoverText || block.content) :
                             block.type === 'multiple-choice' ? block.content.question :
                             block.type === 'true-false' ? block.content.question :
                             block.type === 'fill-blanks' ? block.content.text :
                             block.type === 'summary' ? block.content.text :
                             block.type === 'audio' ? (block.metadata?.hoverText || block.content) :
                             block.type === 'guess-answer' ? block.content.question :
                             'Interactive Content'}
                          </div>
                        </div>
                      ))}
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setShowAddContentModal({ rowId: row.id, colIndex: colIdx })}
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add content
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-zinc-50/50 border-t border-zinc-100 p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => addRow(activePageId, 1)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add row
                  </button>
                  <button 
                    onClick={() => removeRow(activePageId, row.id)}
                    className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {activePage.rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-200 rounded-3xl bg-white">
                <Layout className="w-12 h-12 text-zinc-200 mb-4" />
                <p className="text-zinc-400 font-medium mb-6">Start by adding a row to your page</p>
                <div className="flex gap-3">
                  <button onClick={() => addRow(activePageId, 1)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">1 Column</button>
                  <button onClick={() => addRow(activePageId, 2)} className="px-6 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-medium hover:bg-zinc-50 transition-all">2 Columns</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddPageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddPageModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Add New Page</h3>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Select a content type for your new page</p>
                </div>
                <button 
                  onClick={() => setShowAddPageModal(null)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <PagesView 
                  hideTypes={['interactive-book']}
                  compact={true}
                  onSelectType={(type) => addPage(type)} 
                />
              </div>
            </motion.div>
          </div>
        )}

        {showAddContentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddContentModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Add Content</h3>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Select a module to add to your magazine</p>
                </div>
                <button 
                  onClick={() => setShowAddContentModal(null)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <PagesView 
                  hideTypes={['interactive-book']}
                  compact={true}
                  onSelectType={(type) => handleAddContent(type as BlockType)} 
                />
              </div>
            </motion.div>
          </div>
        )}

        {showAudioModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAudioModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Add Audio</h3>
                <button onClick={() => setShowAudioModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Audio URL *</label>
                  <input 
                    type="text" 
                    id="audio-url"
                    placeholder="Enter direct audio link (mp3, wav)..." 
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Title</label>
                  <input 
                    type="text" 
                    id="audio-title"
                    placeholder="Optional audio title..." 
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    const url = (document.getElementById('audio-url') as HTMLInputElement).value;
                    const title = (document.getElementById('audio-title') as HTMLInputElement).value;
                    if (!url) return;
                    const newBlock: ContentBlock = {
                      id: showAudioModal.blockId || uuidv4(),
                      type: 'audio',
                      content: url,
                      metadata: { hoverText: title }
                    };
                    saveBlockToGrid(showAudioModal.rowId, showAudioModal.colIndex, newBlock, !!showAudioModal.blockId);
                    setShowAudioModal(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowAudioModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showGuessAnswerModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowGuessAnswerModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Guess the Answer</h3>
                <button onClick={() => setShowGuessAnswerModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Question Text *</label>
                  <textarea 
                    value={editingGuessAnswer.question}
                    onChange={(e) => setEditingGuessAnswer({ ...editingGuessAnswer, question: e.target.value })}
                    placeholder="Enter the question or clue..." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Correct Answer *</label>
                  <input 
                    type="text"
                    value={editingGuessAnswer.answer}
                    onChange={(e) => setEditingGuessAnswer({ ...editingGuessAnswer, answer: e.target.value })}
                    placeholder="Enter the correct answer..." 
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (!editingGuessAnswer.question || !editingGuessAnswer.answer) return;
                    const newBlock: ContentBlock = {
                      id: showGuessAnswerModal.blockId || uuidv4(),
                      type: 'guess-answer',
                      content: editingGuessAnswer
                    };
                    saveBlockToGrid(showGuessAnswerModal.rowId, showGuessAnswerModal.colIndex, newBlock, !!showGuessAnswerModal.blockId);
                    setShowGuessAnswerModal(null);
                    setEditingGuessAnswer({ question: '', answer: '' });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowGuessAnswerModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showTrueFalseModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTrueFalseModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">True/False Question</h3>
                <button onClick={() => setShowTrueFalseModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Question Text *</label>
                  <textarea 
                    value={editingTrueFalse.question}
                    onChange={(e) => setEditingTrueFalse({ ...editingTrueFalse, question: e.target.value })}
                    placeholder="Enter your statement here..." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Correct Answer</label>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setEditingTrueFalse({ ...editingTrueFalse, isCorrect: true })}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold transition-all border-2",
                        editingTrueFalse.isCorrect ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                      )}
                    >
                      True
                    </button>
                    <button 
                      onClick={() => setEditingTrueFalse({ ...editingTrueFalse, isCorrect: false })}
                      className={cn(
                        "flex-1 py-3 rounded-xl font-bold transition-all border-2",
                        !editingTrueFalse.isCorrect ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200"
                      )}
                    >
                      False
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (!editingTrueFalse.question) return;
                    const newBlock: ContentBlock = {
                      id: showTrueFalseModal.blockId || uuidv4(),
                      type: 'true-false',
                      content: editingTrueFalse
                    };
                    saveBlockToGrid(showTrueFalseModal.rowId, showTrueFalseModal.colIndex, newBlock, !!showTrueFalseModal.blockId);
                    setShowTrueFalseModal(null);
                    setEditingTrueFalse({ question: '', isCorrect: true });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowTrueFalseModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showFillBlanksModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFillBlanksModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Fill in the Blanks</h3>
                <button onClick={() => setShowFillBlanksModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Text with Blanks *</label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Use *word* for blanks</span>
                  </div>
                  <textarea 
                    value={editingFillBlanks.text}
                    onChange={(e) => setEditingFillBlanks({ ...editingFillBlanks, text: e.target.value })}
                    placeholder="Example: The sky is *blue* and the grass is *green*." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[200px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (!editingFillBlanks.text) return;
                    const newBlock: ContentBlock = {
                      id: showFillBlanksModal.blockId || uuidv4(),
                      type: 'fill-blanks',
                      content: editingFillBlanks
                    };
                    saveBlockToGrid(showFillBlanksModal.rowId, showFillBlanksModal.colIndex, newBlock, !!showFillBlanksModal.blockId);
                    setShowFillBlanksModal(null);
                    setEditingFillBlanks({ text: '' });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowFillBlanksModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showSummaryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSummaryModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Summary</h3>
                <button onClick={() => setShowSummaryModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Summary Text *</label>
                  <textarea 
                    value={editingSummary.text}
                    onChange={(e) => setEditingSummary({ ...editingSummary, text: e.target.value })}
                    placeholder="Enter the summary content..." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[200px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (!editingSummary.text) return;
                    const newBlock: ContentBlock = {
                      id: showSummaryModal.blockId || uuidv4(),
                      type: 'summary',
                      content: editingSummary
                    };
                    saveBlockToGrid(showSummaryModal.rowId, showSummaryModal.colIndex, newBlock, !!showSummaryModal.blockId);
                    setShowSummaryModal(null);
                    setEditingSummary({ text: '' });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowSummaryModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showMultipleChoiceModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMultipleChoiceModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-zinc-900">Multiple Choice Question</h3>
                <button onClick={() => setShowMultipleChoiceModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Question Text *</label>
                  <textarea 
                    value={editingMCQ.question}
                    onChange={(e) => setEditingMCQ({ ...editingMCQ, question: e.target.value })}
                    placeholder="Enter your question here..." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Options</label>
                    <button 
                      onClick={() => setEditingMCQ({ ...editingMCQ, options: [...editingMCQ.options, { id: uuidv4(), text: '', isCorrect: false }] })}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Option
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {editingMCQ.options.map((option, idx) => (
                      <div key={option.id} className="flex items-center gap-3 group">
                        <button 
                          onClick={() => {
                            const newOptions = editingMCQ.options.map(o => ({ ...o, isCorrect: o.id === option.id }));
                            setEditingMCQ({ ...editingMCQ, options: newOptions });
                          }}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            option.isCorrect ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-200 text-transparent hover:border-blue-300"
                          )}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                        <input 
                          type="text"
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = editingMCQ.options.map(o => o.id === option.id ? { ...o, text: e.target.value } : o);
                            setEditingMCQ({ ...editingMCQ, options: newOptions });
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 px-4 py-3 bg-zinc-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button 
                          onClick={() => setEditingMCQ({ ...editingMCQ, options: editingMCQ.options.filter(o => o.id !== option.id) })}
                          className="p-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-8 border-t border-zinc-100 mt-8">
                <button 
                  onClick={() => {
                    if (!editingMCQ.question || editingMCQ.options.length < 2) return;
                    const newBlock: ContentBlock = {
                      id: showMultipleChoiceModal.blockId || uuidv4(),
                      type: 'multiple-choice',
                      content: editingMCQ
                    };
                    saveBlockToGrid(showMultipleChoiceModal.rowId, showMultipleChoiceModal.colIndex, newBlock, !!showMultipleChoiceModal.blockId);
                    setShowMultipleChoiceModal(null);
                    setEditingMCQ({ question: '', options: [{ id: uuidv4(), text: '', isCorrect: false }] });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowMultipleChoiceModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showVideoModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowVideoModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Add Video</h3>
                <button onClick={() => setShowVideoModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Video URL *</label>
                  <input 
                    type="text" 
                    id="video-url"
                    placeholder="Enter YouTube, Vimeo or direct video link..." 
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Title</label>
                  <input 
                    type="text" 
                    id="video-title"
                    placeholder="Optional video title..." 
                    className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    const url = (document.getElementById('video-url') as HTMLInputElement).value;
                    const title = (document.getElementById('video-title') as HTMLInputElement).value;
                    if (!url) return;
                    const newBlock: ContentBlock = {
                      id: showVideoModal.blockId || uuidv4(),
                      type: 'video',
                      content: url,
                      metadata: { hoverText: title }
                    };
                    saveBlockToGrid(showVideoModal.rowId, showVideoModal.colIndex, newBlock, !!showVideoModal.blockId);
                    setShowVideoModal(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowVideoModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showImageModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowImageModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Add Image</h3>
                <button onClick={() => setShowImageModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <input 
                  type="file" 
                  id="image-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditingImageContent(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div 
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="border-2 border-dashed border-zinc-200 rounded-3xl p-10 flex flex-col items-center justify-center space-y-4 bg-zinc-50/50 hover:bg-zinc-50 hover:border-blue-300 transition-all cursor-pointer group overflow-hidden relative"
                >
                  {editingImageContent ? (
                    <img src={editingImageContent} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                  ) : null}
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-zinc-300 group-hover:text-blue-500 shadow-sm transition-colors relative z-10">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center relative z-10">
                    <p className="font-bold text-zinc-900">{editingImageContent ? 'Change image' : 'Choose, drop or paste a file here'}</p>
                    <p className="text-xs text-zinc-400 mt-1">Max 20 MB (.jpg, .png)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" id="is-decorative" className="mt-1 w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <span className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">Decorative only</span>
                      <p className="text-xs text-zinc-400">If checked, this image will be ignored by screen readers.</p>
                    </div>
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Alternative text *</label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                    </div>
                    <input 
                      type="text" 
                      id="alt-text"
                      placeholder="Describe the image for accessibility..." 
                      className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-[10px] text-zinc-400">Essential for screen readers and if the image fails to load.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Hover text</label>
                    <input 
                      type="text" 
                      id="hover-text"
                      placeholder="Optional text shown on hover..." 
                      className="w-full px-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    const altText = (document.getElementById('alt-text') as HTMLInputElement).value;
                    const hoverText = (document.getElementById('hover-text') as HTMLInputElement).value;
                    const isDecorative = (document.getElementById('is-decorative') as HTMLInputElement).checked;
                    
                    const newBlock: ContentBlock = {
                      id: showImageModal.blockId || uuidv4(),
                      type: 'image',
                      content: editingImageContent || 'https://picsum.photos/seed/placeholder/800/600',
                      metadata: { altText, hoverText, isDecorative }
                    };
                    saveBlockToGrid(showImageModal.rowId, showImageModal.colIndex, newBlock, !!showImageModal.blockId);
                    setShowImageModal(null);
                    setEditingImageContent('');
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowImageModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}

        {showTextModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowTextModal(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">Add Text</h3>
                <button onClick={() => setShowTextModal(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Content *</label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Metadata</span>
                  </div>
                  <textarea 
                    id="text-content"
                    placeholder="Enter your text here..." 
                    className="w-full px-4 py-4 bg-zinc-100 border-none rounded-3xl focus:ring-2 focus:ring-blue-500 text-sm min-h-[200px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    const content = (document.getElementById('text-content') as HTMLTextAreaElement).value;
                    if (!content) return;
                    const newBlock: ContentBlock = {
                      id: showTextModal.blockId || uuidv4(),
                      type: 'text',
                      content
                    };
                    saveBlockToGrid(showTextModal.rowId, showTextModal.colIndex, newBlock, !!showTextModal.blockId);
                    setShowTextModal(null);
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Done
                </button>
                <button onClick={() => setShowTextModal(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Save Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all",
            isSaving && "opacity-70 cursor-not-allowed"
          )}
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          {isSaving ? `Uploading ${uploadProgress}%` : 'Save Magazine'}
        </button>
      </div>

      {/* Upload Progress Overlay */}
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-md space-y-8 text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-emerald-600 animate-bounce" />
                </div>
                <svg className="absolute inset-0 w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-emerald-500 transition-all duration-300"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * uploadProgress) / 100}
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Uploading Magazine</h2>
                <p className="text-zinc-500 font-medium">Please wait while we sync your interactive content to Firebase...</p>
              </div>

              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span>Progress</span>
                <span className="text-emerald-600">{uploadProgress}% Complete</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernEditor;
