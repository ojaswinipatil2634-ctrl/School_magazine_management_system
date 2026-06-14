import React, { useState, useEffect } from 'react';
import { 
  Plus, BookOpen, Grid, Trash2, Edit2, Play, ChevronLeft, Layout, 
  Settings, Share2, Search, FileText, HelpCircle, CheckCircle2, Music, Video, List,
  LogOut, LogIn, User, Cloud, Database, Upload, AlertCircle, X
} from 'lucide-react';
import { cn } from './lib/utils';
import { ContentItem, ContentType, BookData, CrosswordData, MagazineData } from './types';
import ModernEditor from './components/ModernEditor';
import CrosswordEditor from './components/CrosswordEditor';
import InteractiveBookViewer from './components/InteractiveBookViewer';
import CrosswordViewer from './components/CrosswordViewer';
import { FillInBlanksEditor } from './components/LMS/FillInBlanksEditor';
import { GuessTheAnswerEditor } from './components/LMS/GuessTheAnswerEditor';
import { MultipleChoiceEditor } from './components/LMS/MultipleChoiceEditor';
import { TrueFalseEditor } from './components/LMS/TrueFalseEditor';
import { AudioEditor } from './components/LMS/AudioEditor';
import { VideoEditor } from './components/LMS/VideoEditor';
import { SummaryEditor } from './components/LMS/SummaryEditor';
import { PagesView } from './components/LMS/PagesView';
import MagazineDashboard from './components/magazine/MagazineDashboard';
import MagazineEditor from './components/magazine/MagazineEditor';
import UploadForm from './components/UploadForm';
import Home from './components/Home';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db, collection, doc, setDoc, getDocs, query, where, orderBy, onSnapshot, writeBatch } from './firebase';

type ViewState = 'home' | 'dashboard' | 'editor' | 'viewer' | 'pages' | 'magazines' | 'magazine-editor' | 'pdf-viewer' | 'upload';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [magazines, setMagazines] = useState<MagazineData[]>([]);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [activeMagazine, setActiveMagazine] = useState<MagazineData | null>(null);
  const [newContentType, setNewContentType] = useState<ContentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [magazineFilter, setMagazineFilter] = useState<'all' | 'static' | 'interactive' | 'uploaded'>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // LMS Modal states
  const [showFillInBlanks, setShowFillInBlanks] = useState(false);
  const [showGuessTheAnswer, setShowGuessTheAnswer] = useState(false);
  const [showMultipleChoice, setShowMultipleChoice] = useState(false);
  const [showTrueFalse, setShowTrueFalse] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    (window as any).setView = setView;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        fetchContent();
      } else {
        setContent([]);
        setMagazines([]);
      }
    });

    let unsubscribeTemperMagazines: (() => void) | null = null;
    
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      
      // Fetch everything from 'temper_magazine' as requested
      const qTemper = query(
        collection(db, 'temper_magazine'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      unsubscribeTemperMagazines = onSnapshot(qTemper, (snapshot) => {
        const temperMags = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          source: doc.data().magazineType === 'interactive' ? 'interactive' : (doc.data().magazineType === 'uploaded' ? 'uploaded' : 'design')
        }));

        setMagazines(temperMags as any[]);
      }, (err) => {
        console.error('Failed to fetch temper_magazine:', err);
      });
    }

    return () => {
      unsubscribeAuth();
      if (unsubscribeTemperMagazines) unsubscribeTemperMagazines();
    };
  }, [user]);

  const fetchMagazines = async () => {
    try {
      if (!auth.currentUser) {
        setMagazines([]);
        return;
      }

      const userId = auth.currentUser.uid;
      
      // Fetch from 'temper_magazine'
      const qTemper = query(
        collection(db, 'temper_magazine'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const snapshotTemper = await getDocs(qTemper);
      const temperMags = snapshotTemper.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source: doc.data().magazineType === 'interactive' ? 'interactive' : (doc.data().magazineType === 'uploaded' ? 'uploaded' : 'design')
      }));

      setMagazines(temperMags.sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ) as any[]);
    } catch (err) {
      console.error('Failed to fetch magazines:', err);
    }
  };

  const handleUpload = async (titleOrMagazine: string | any, data?: any, metadata?: any, onProgress?: (progress: number) => void) => {
    if (!user) return;
    
    let id: string;
    let title: string;
    let bookData: any;
    let createdAt: string;

    if (typeof titleOrMagazine === 'string') {
      id = activeItem?.id || uuidv4();
      title = titleOrMagazine;
      bookData = data;
      createdAt = activeItem?.createdAt || new Date().toISOString();
    } else {
      id = titleOrMagazine.id;
      title = titleOrMagazine.title;
      bookData = titleOrMagazine.data;
      createdAt = titleOrMagazine.createdAt || new Date().toISOString();
    }

    if (onProgress) onProgress(10);

    // Transform data to follow user's specified structure
    const transformedData = {
      ...bookData,
      pages: bookData.pages.map((page: any, pIdx: number) => ({
        ...page,
        index: pIdx,
        rows: page.rows.map((row: any, rIdx: number) => ({
          ...row,
          index: rIdx,
          columns: row.columns.map((col: any, cIdx: number) => ({
            ...col,
            index: cIdx,
            elements: col.elements.map((el: any, eIdx: number) => {
              const transformedEl = { ...el, index: eIdx };
              
              // Transform content based on type
              if (el.type === 'multiple-choice') {
                transformedEl.content = {
                  question: el.content.question,
                  options: el.content.options.map((o: any) => ({
                    text: o.text,
                    isCorrect: o.isCorrect
                  }))
                };
              } else if (el.type === 'true-false') {
                transformedEl.content = {
                  question: el.content.question,
                  correctAnswer: el.content.isCorrect === true
                };
              } else if (el.type === 'guess-answer') {
                transformedEl.type = 'guess-the-word';
                transformedEl.content = {
                  question: el.content.question,
                  word: el.content.answer,
                  hint: el.content.hint || ''
                };
              } else if (el.type === 'fill-blanks') {
                transformedEl.type = 'fill-in-the-blanks';
                const answers: string[] = [];
                const text = el.content.text || '';
                const parts = text.split(/(\*.*?\*)/g);
                const displayParts = parts.map((part: string) => {
                  if (part.startsWith('*') && part.endsWith('*')) {
                    answers.push(part.slice(1, -1));
                    return '___';
                  }
                  return part;
                });
                transformedEl.content = {
                  text: displayParts.join(''),
                  answers: answers
                };
              }
              
              return transformedEl;
            })
          }))
        }))
      }))
    };
    
    if (onProgress) onProgress(40);

    try {
      // Save interactive magazine to Firestore 'interactive' collection as requested
      const magazineData: any = {
        id,
        title,
        userId: user.uid,
        magazineType: 'interactive',
        data: transformedData, // Store the transformed book data
        thumbnail: bookData?.coverImage || null,
        published: true, // Mark as published when uploaded
        isDraft: false,
        updatedAt: new Date().toISOString(),
        createdAt,
        schoolId: metadata?.schoolId || '',
        schoolName: metadata?.schoolName || '',
        region: metadata?.region || '',
        year: metadata?.year || ''
      };

      if (onProgress) onProgress(60);

      // Save to 'interactive' collection as requested
      await setDoc(doc(db, 'interactive', id), magazineData);
      if (onProgress) onProgress(80);
      
      // Also save to 'temper_magazine' for dashboard visibility
      await setDoc(doc(db, 'temper_magazine', id), magazineData);
      
      // Also save to 'magazines' for backward compatibility/other views
      await setDoc(doc(db, 'magazines', id), { ...magazineData, published: true });
      
      if (onProgress) onProgress(100);

      console.log('Interactive magazine uploaded to Firestore (interactive, temper_magazine, magazines)');
      
      setNotification({ type: 'success', message: 'Magazine uploaded successfully!' });
      setTimeout(() => setNotification(null), 3000);

      setMagazineFilter('interactive');
      setView('magazines');
    } catch (err) {
      console.error('Failed to upload magazine:', err);
      setNotification({ type: 'error', message: 'Failed to upload magazine.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const fetchContent = async () => {
    if (!auth.currentUser) {
      setContent([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/content?userId=${auth.currentUser.uid}`);
      const data = await res.json();
      setContent(data);
    } catch (err) {
      console.error('Failed to fetch content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleCreateNew = (type: ContentType) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (type === 'magazine') {
      setActiveMagazine(null);
      setView('magazine-editor');
    } else {
      setNewContentType(type);
      setActiveItem(null);
      setView('editor');
    }
  };

  const handleEdit = (item: ContentItem) => {
    setActiveItem(item);
    setNewContentType(null);
    setView('editor');
  };

  const handleView = (item: ContentItem) => {
    setActiveItem(item);
    setView('viewer');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    if (!user) return;
    try {
      // 1. Delete from SQLite if it exists there
      await fetch(`/api/content/${id}?userId=${user.uid}`, { method: 'DELETE' });
      
      // 2. Delete from all Firestore collections
      const deleteBatch = writeBatch(db);
      deleteBatch.delete(doc(db, 'magazines', id));
      deleteBatch.delete(doc(db, 'temper_magazine', id));
      deleteBatch.delete(doc(db, 'interactive', id));
      
      await deleteBatch.commit();
      
      setContent(content.filter(c => c.id !== id));
      setMagazines(magazines.filter(m => m.id !== id));
      
      setNotification({ type: 'success', message: 'Content deleted permanently!' });
    } catch (err) {
      console.error('Failed to delete:', err);
      setNotification({ type: 'error', message: 'Failed to delete content.' });
    }
  };

  const handleSave = async (title: string, data: any, onProgress?: (progress: number) => void) => {
    if (!title.trim()) {
      setNotification({ type: 'error', message: 'Please enter a title before saving.' });
      return;
    }
    const isNew = !activeItem;
    const id = isNew ? uuidv4() : activeItem.id;
    const type = isNew ? newContentType : activeItem.type;
    
    try {
      if (type === 'interactive-book' && user) {
        if (onProgress) onProgress(10);
        // Transform data to follow user's specified structure
        const transformedData = {
          ...data,
          pages: data.pages.map((page: any, pIdx: number) => ({
            ...page,
            index: pIdx,
            rows: page.rows.map((row: any, rIdx: number) => ({
              ...row,
              index: rIdx,
              columns: row.columns.map((col: any, cIdx: number) => ({
                ...col,
                index: cIdx,
                elements: col.elements.map((el: any, eIdx: number) => {
                  const transformedEl = { ...el, index: eIdx };
                  
                  // Transform content based on type
                  if (el.type === 'multiple-choice') {
                    transformedEl.content = {
                      question: el.content.question,
                      options: el.content.options.map((o: any) => ({
                        text: o.text,
                        isCorrect: o.isCorrect
                      }))
                    };
                  } else if (el.type === 'true-false') {
                    transformedEl.content = {
                      question: el.content.question,
                      correctAnswer: el.content.isCorrect === true
                    };
                  } else if (el.type === 'guess-answer') {
                    transformedEl.type = 'guess-the-word';
                    transformedEl.content = {
                      question: el.content.question,
                      word: el.content.answer,
                      hint: el.content.hint || ''
                    };
                  } else if (el.type === 'fill-blanks') {
                    transformedEl.type = 'fill-in-the-blanks';
                    const answers: string[] = [];
                    const text = el.content.text || '';
                    const parts = text.split(/(\*.*?\*)/g);
                    const displayParts = parts.map((part: string) => {
                      if (part.startsWith('*') && part.endsWith('*')) {
                        answers.push(part.slice(1, -1));
                        return '___';
                      }
                      return part;
                    });
                    transformedEl.content = {
                      text: displayParts.join(''),
                      answers: answers
                    };
                  }
                  
                  return transformedEl;
                })
              }))
            }))
          }))
        };

        if (onProgress) onProgress(30);

        // Save interactive magazine to Firestore 'temper_magazine' collection as a draft
        const magazineData: any = {
          id,
          title,
          userId: user.uid,
          magazineType: 'interactive',
          data: transformedData, // Store the transformed book data
          thumbnail: data.coverImage || null,
          published: true,
          isDraft: false,
          updatedAt: new Date().toISOString(),
          createdAt: activeItem?.updatedAt || new Date().toISOString()
        };

        if (onProgress) onProgress(50);

        // Save to 'interactive' collection as requested
        await setDoc(doc(db, 'interactive', id), magazineData);
        if (onProgress) onProgress(70);
        
        // Also save to 'temper_magazine' for dashboard visibility
        await setDoc(doc(db, 'temper_magazine', id), magazineData);
        if (onProgress) onProgress(90);
        
        // Also save to 'magazines' for backward compatibility/other views
        await setDoc(doc(db, 'magazines', id), magazineData);
        if (onProgress) onProgress(100);
        
        console.log('Interactive magazine uploaded to Firestore (interactive, temper_magazine, magazines)');
        
        setNotification({ type: 'success', message: 'Interactive magazine uploaded to Firebase successfully!' });
        
        setMagazineFilter('interactive');
        setView('magazines');
        return;
      }

      // Fallback for other content types (crossword, etc.) to SQLite
      const url = isNew ? '/api/content' : `/api/content/${id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, data, userId: user.uid })
      });
      
      if (res.ok) {
        await fetchContent();
        await fetchMagazines();
        setView('dashboard');
      }
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const filteredContent = content.filter(item => 
    item.type === 'interactive-book' &&
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewMagazine = (mag: any) => {
    if (mag.source === 'interactive' || mag.magazineType === 'interactive') {
      setActiveItem({
        id: mag.id,
        type: 'interactive-book',
        title: mag.title,
        data: mag.data,
        published: mag.published,
        updatedAt: mag.updatedAt
      });
      setView('viewer');
    } else {
      const pdfUrl = mag.pdfUrl || mag.data?.pdfURL;
      if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // This case is now handled by MagazineDashboard's local preview
        // but we keep a fallback alert just in case
        alert('PDF not found. Please try uploading or generating a preview from the dashboard.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-16">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('home')}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
              Ci
            </div>
            <span className="text-xl font-black text-zinc-900 tracking-tighter">
              CreativeIndia
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <button 
              onClick={() => { setView('magazines'); setMagazineFilter('static'); }}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all",
                (view === 'magazines' && magazineFilter === 'static') ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-900"
              )}
            >
              Static Magazines
            </button>
            <button 
              onClick={() => { setView('magazines'); setMagazineFilter('interactive'); }}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all",
                (view === 'magazines' && magazineFilter === 'interactive') ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-900"
              )}
            >
              Interactive Magazines
            </button>
            <button 
              onClick={() => { setView('magazines'); setMagazineFilter('uploaded'); }}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all",
                (view === 'magazines' && magazineFilter === 'uploaded') ? "text-indigo-600" : "text-zinc-400 hover:text-zinc-900"
              )}
            >
              Uploaded Magazines
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              handleCreateNew('magazine');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
          >
            <Layout className="w-4 h-4" />
            design static magazine
          </button>

          <button 
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setActiveItem(null); 
              setView('pages');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Create Interactive Magazine
          </button>

          <button 
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setView('upload');
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest leading-none">User</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">Viewer</div>
              </div>
              <div className="group relative">
                <div className="w-10 h-10 bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 cursor-pointer hover:ring-2 hover:ring-indigo-600 transition-all p-0.5">
                  <img 
                    src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                    alt="User" 
                    className="w-full h-full rounded-xl object-cover"
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="absolute top-full right-0 w-48 pt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <div className="bg-white rounded-2xl shadow-2xl border border-zinc-100 py-3 overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-50 mb-2">
                      <div className="text-xs font-black text-zinc-900 truncate">{user.displayName}</div>
                      <div className="text-[10px] font-bold text-zinc-400 truncate">{user.email}</div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className={cn("mx-auto py-6", (view === 'editor' || view === 'pages' || view === 'magazine-editor') ? "max-w-none px-0" : "max-w-7xl px-8")}>
        <AnimatePresence mode="wait">
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "fixed top-20 right-8 z-[1000] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border",
                notification.type === 'success' 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                  : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="font-bold text-sm">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Home 
                user={user}
                onDesignMagazine={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setActiveMagazine(null);
                  setView('magazine-editor');
                }}
                onCreateInteractive={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setActiveItem(null);
                  setView('pages');
                }}
                onUploadPDF={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setView('upload');
                }}
              />
            </motion.div>
          )}

          {view === 'magazines' && (
            <motion.div
              key="magazines"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MagazineDashboard 
                magazines={magazines}
                filter={magazineFilter}
                onCreate={() => {
                  if (!user) {
                    setShowAuthModal(true);
                    return;
                  }
                  if (magazineFilter === 'interactive') {
                    setActiveItem(null);
                    setView('pages');
                  } else {
                    handleCreateNew('magazine');
                  }
                }}
                onView={handleViewMagazine}
                onUploadInteractive={(mag: any, metadata: any, onProgress: (progress: number) => void) => {
                  handleUpload(mag, null, metadata, onProgress);
                }}
                onEdit={(mag: any) => {
                  if (mag.source === 'interactive' || mag.magazineType === 'interactive') {
                    setActiveItem({
                      id: mag.id,
                      type: 'interactive-book',
                      title: mag.title,
                      data: mag.data,
                      published: mag.published,
                      updatedAt: mag.updatedAt
                    });
                    setView('editor');
                  } else {
                    setActiveMagazine(mag);
                    setView('magazine-editor');
                  }
                }}
              />
            </motion.div>
          )}

          {view === 'magazine-editor' && (
            <motion.div
              key="magazine-editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MagazineEditor 
                key={activeMagazine?.id || 'new'}
                initialData={activeMagazine}
                onClose={() => setView('magazines')}
                onSaveSuccess={() => {
                  setMagazineFilter('static');
                  setView('magazines');
                }}
              />
            </motion.div>
          )}

          {view === 'pages' && (
            <motion.div
              key="pages"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <PagesView onSelectType={(type) => {
                if (type === 'interactive-book') {
                  handleCreateNew('interactive-book');
                } else {
                  // Start a new book with this content type as the first page
                  setNewContentType('interactive-book');
                  const pageId = uuidv4();
                  const rowId = uuidv4();
                  const colId = uuidv4();
                  const blockId = uuidv4();
                  
                  const getDefaultContent = (type: string) => {
                    switch (type) {
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

                  const initialData: BookData = {
                    pages: [
                      {
                        id: pageId,
                        title: '',
                        rows: [
                          {
                            id: rowId,
                            columns: [
                              {
                                id: colId,
                                elements: [
                                  {
                                    id: blockId,
                                    type: type as any,
                                    content: getDefaultContent(type)
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  };
                  setActiveItem({
                    id: 'temp-' + uuidv4(),
                    type: 'interactive-book',
                    title: '',
                    data: initialData,
                    published: false,
                    updatedAt: new Date().toISOString()
                  });
                  setView('editor');
                }
              }} />
            </motion.div>
          )}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome Back</h2>
                  <p className="text-zinc-500">Manage your interactive content and magazines.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setView('pages')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Plus className="w-4 h-4" />
                    Create Interactive Magazine
                  </button>
                  <button
                    onClick={() => handleCreateNew('magazine')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Layout className="w-4 h-4" />
                    Design Magazine
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-zinc-200 animate-pulse rounded" />
                  ))}
                </div>
              ) : filteredContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContent.map((item) => (
                    <div 
                      key={item.id} 
                      className="group bg-white rounded border border-zinc-200 overflow-hidden hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="aspect-video bg-zinc-100 relative overflow-hidden border-b border-zinc-100">
                        {item.type === 'interactive-book' ? (
                          <img 
                            src={(item.data as BookData).coverImage || `https://picsum.photos/seed/${item.id}/400/225`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            {item.type === 'crossword' ? <Grid className="w-16 h-16 opacity-20" /> : <FileText className="w-16 h-16 opacity-20" />}
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex gap-2">
                          <div className="px-2 py-0.5 bg-white/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-zinc-600 shadow-sm border border-zinc-200">
                            {item.type.replace('-', ' ')}
                          </div>
                          <div className="px-2 py-0.5 bg-blue-600/90 backdrop-blur rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm border border-blue-400 flex items-center gap-1">
                            <Database className="w-2 h-2" />
                            Firebase Synced
                          </div>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-zinc-900 mb-1 group-hover:text-[#1f6fb2] transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
                          {item.type === 'interactive-book' 
                            ? (item.data as BookData).description || 'No description provided.'
                            : `Enterprise interactive content module.`}
                        </p>
                        <div className="mt-auto pt-4 border-t border-zinc-100 flex items-center justify-between">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleView(item)}
                                className="p-2 text-zinc-400 hover:text-[#1f6fb2] hover:bg-blue-50 rounded transition-all"
                                title="View"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEdit(item)}
                                className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="px-2 py-0.5 text-[8px] font-mono text-zinc-400 truncate max-w-[120px]">
                              FB: {item.id}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded border border-zinc-200">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">Your library is empty</h3>
                  <p className="text-zinc-500 max-w-xs text-center mb-8">
                    Start creating interactive books and learning modules to build your collection.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleCreateNew('interactive-book')}
                      className="px-6 py-2.5 bg-[#1f6fb2] text-white rounded font-bold shadow-md hover:bg-[#1a5e96] transition-all"
                    >
                      Create Your First Interactive Magazine
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto py-8"
            >
              <div className="mb-6">
                <button 
                  onClick={() => setView('magazines')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold text-sm uppercase tracking-widest"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Saved Magazines
                </button>
              </div>
              <UploadForm />
            </motion.div>
          )}

          {view === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6"
            >
              {(newContentType || activeItem?.type) === 'interactive-book' ? (
                <ModernEditor
                  key={activeItem ? `${activeItem.id}-${activeItem.updatedAt}` : 'new'}
                  initialTitle={activeItem?.title}
                  initialData={activeItem?.data as BookData}
                  crosswords={content.filter(c => c.type === 'crossword')}
                  onSave={(title, data, onProgress) => {
                    handleSave(title, data, onProgress);
                  }}
                />
              ) : (
                <div className="max-w-4xl mx-auto">
                  <CrosswordEditor
                    initialData={activeItem?.data as CrosswordData}
                    onSave={(data) => {
                      const title = 'Untitled Crossword';
                      handleSave(title, data);
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}

          {view === 'viewer' && activeItem && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              {activeItem.type === 'interactive-book' ? (
                <InteractiveBookViewer 
                  id={activeItem.id}
                  title={activeItem.title}
                  data={activeItem.data as BookData} 
                  allContent={content} 
                />
              ) : (
                <div className="max-w-4xl mx-auto">
                  <CrosswordViewer data={activeItem.data as CrosswordData} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* LMS Modals */}
      <FillInBlanksEditor 
        isOpen={showFillInBlanks} 
        onClose={() => setShowFillInBlanks(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <GuessTheAnswerEditor 
        isOpen={showGuessTheAnswer} 
        onClose={() => setShowGuessTheAnswer(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <MultipleChoiceEditor
        isOpen={showMultipleChoice}
        onClose={() => setShowMultipleChoice(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <TrueFalseEditor
        isOpen={showTrueFalse}
        onClose={() => setShowTrueFalse(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <AudioEditor
        isOpen={showAudio}
        onClose={() => setShowAudio(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <VideoEditor
        isOpen={showVideo}
        onClose={() => setShowVideo(false)}
        onSave={(data) => handleSave(data.title, data)}
      />
      <SummaryEditor
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        onSave={(data) => handleSave(data.title, data)}
      />

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-100"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto">
                  <LogIn className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">Sign In Required</h2>
                  <p className="text-zinc-500 font-medium leading-relaxed">
                    You need to sign in to your account before you can start creating magazines.
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={handleLogin}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In with Google
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="w-full py-4 bg-zinc-50 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
