
import React, { useState, useEffect } from 'react';
import { collection, getDocs, limit, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AppTab, Magazine } from '../types';
import { handleFirestoreError, OperationType } from '../firestore-errors';

interface HomeViewProps {
  onRead: (id: string) => void;
  onNavigate: (tab: AppTab) => void;
  onLike: (id: string) => void;
  onFollowSchool: (schoolId: string) => void;
  onShare: (id: string) => void;
  user: any;
}

const HomeView: React.FC<HomeViewProps> = ({ onRead, onNavigate, onLike, onFollowSchool, onShare, user }) => {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [standardMagazines, setStandardMagazines] = useState<Magazine[]>([]);
  const [interactiveMagazines, setInteractiveMagazines] = useState<Magazine[]>([]);
  const [followedMagazines, setFollowedMagazines] = useState<Magazine[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for standard magazines
    const magQuery = query(collection(db, 'magazines'), limit(pageSize * page));
    const unsubscribeMags = onSnapshot(magQuery, (snapshot) => {
      const mags = snapshot.docs.map(doc => ({ id: doc.id, magazineType: 'pdf', ...doc.data() } as Magazine));
      setStandardMagazines(mags);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'magazines');
      setLoading(false);
    });

    // Real-time listener for interactive magazines
    const interactiveQuery = query(collection(db, 'interactive'), limit(12));
    const unsubscribeInteractive = onSnapshot(interactiveQuery, (snapshot) => {
      const interactiveMags = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Interactive Magazine',
          schoolId: data.schoolId || data.userId || 'unknown',
          schoolName: data.schoolName || 'Interactive Creator',
          region: data.region || 'Digital',
          thumbnail: data.thumbnail || `https://picsum.photos/seed/${doc.id}/400/600`,
          description: data.description || 'Interactive digital experience',
          likes: data.likes || 0,
          views: data.views || 0,
          year: data.year || new Date().getFullYear(),
          language: data.language || 'English',
          magazineType: 'interactive'
        } as Magazine;
      });
      setInteractiveMagazines(interactiveMags);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interactive');
    });

    // Fetch some schools to follow (one-time is fine for this list)
    const fetchSchools = async () => {
      try {
        const schoolQuery = query(collection(db, 'schools'), limit(10));
        const schoolSnapshot = await getDocs(schoolQuery);
        const schoolList = schoolSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSchools(schoolList);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'schools');
      }
    };
    fetchSchools();

    return () => {
      unsubscribeMags();
      unsubscribeInteractive();
    };
  }, [page]);

  // Merge magazines whenever either collection updates
  useEffect(() => {
    const merged = [...standardMagazines, ...interactiveMagazines];
    // Deduplicate by unique key to prevent React warnings
    const seen = new Set();
    const unique = merged.filter(mag => {
      const key = `${mag.magazineType || 'pdf'}-${mag.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setMagazines(unique);
  }, [standardMagazines, interactiveMagazines]);

  // Real-time feed for followed schools
  useEffect(() => {
    if (!user || !user.followedSchools || user.followedSchools.length === 0) {
      setFollowedMagazines([]);
      return;
    }

    const path = 'magazines';
    // Firestore 'in' query is limited to 10 items. 
    // If more than 10, we'll fetch all and filter client-side for simplicity in this demo.
    // In a production app, you'd use multiple queries or a different indexing strategy.
    let q;
    if (user.followedSchools.length <= 10) {
      q = query(
        collection(db, path), 
        where('schoolId', 'in', user.followedSchools),
        orderBy('year', 'desc')
      );
    } else {
      q = query(collection(db, path), orderBy('year', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mags = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled Magazine',
          schoolId: data.schoolId || 'unknown',
          schoolName: data.schoolName || 'Unknown School',
          region: data.region || 'National',
          thumbnail: data.thumbnail || `https://picsum.photos/seed/${doc.id}/400/600`,
          pdfUrl: data.pdfUrl,
          description: data.description || '',
          likes: data.likes || 0,
          views: data.views || 0,
          year: data.year || new Date().getFullYear(),
          language: data.language || 'English'
        } as Magazine;
      });

      if (user.followedSchools.length > 10) {
        setFollowedMagazines(mags.filter(m => user.followedSchools.includes(m.schoolId)));
      } else {
        setFollowedMagazines(mags);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [user?.followedSchools]);

  return (
    <div className="space-y-16 animate-fadeIn pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[40px] md:rounded-[60px] bg-slate-900 text-white min-h-[400px] flex flex-col justify-center p-8 md:p-16">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-l from-indigo-500/20 to-transparent"></div>
          <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover grayscale" alt="Education Hero" />
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="bg-indigo-600/30 backdrop-blur-md border border-indigo-400/30 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">National School Network</span>
          <h1 className="text-4xl md:text-6xl font-black font-montserrat leading-[1.1] tracking-tight">
            Showcase Your <span className="text-indigo-400">Creative</span> Legacy.
          </h1>
          <p className="text-slate-400 text-sm md:text-lg font-medium max-w-lg leading-relaxed">
            The ultimate platform for Indian schools to publish digital magazines, share artistic achievements, and inspire the next generation of storytellers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={() => onNavigate(AppTab.MAGAZINES)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Explore Library</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
            <div 
              onClick={() => onNavigate(AppTab.SEARCH)}
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-6 flex items-center text-white/50 cursor-pointer hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5 mr-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-xs font-bold uppercase tracking-widest">Search Schools...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Magazines Section */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black font-montserrat uppercase tracking-wider text-slate-900 dark:text-white">Latest Magazines</h2>
            <div className="h-1 w-12 bg-indigo-600 mt-2"></div>
          </div>
          <button 
            onClick={() => onNavigate(AppTab.MAGAZINES)}
            className="text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center"
          >
            Explore All
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {magazines.map((mag) => (
            <div 
              key={`${mag.magazineType || 'pdf'}-${mag.id}`} 
              onClick={() => onRead(mag.id)}
              className="group cursor-pointer space-y-2"
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-all duration-500">
                <img src={mag.thumbnail} alt={mag.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                {mag.magazineType === 'interactive' && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest shadow-lg">Interactive</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                   <span className="text-white text-[7px] font-black uppercase tracking-widest bg-indigo-600 px-1.5 py-0.5 rounded">Read</span>
                </div>
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-2">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onLike(mag.id);
                    }}
                    className={`p-1.5 rounded-full shadow-lg transition-all ${user?.likedMagazines?.includes(mag.id) ? 'bg-rose-500 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:scale-110'}`}
                   >
                      <svg className="w-2.5 h-2.5" fill={user?.likedMagazines?.includes(mag.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                   </button>
                   {mag.magazineType !== 'interactive' && (
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(mag.id);
                      }}
                      className="p-1.5 rounded-full shadow-lg transition-all bg-white/90 dark:bg-slate-900/90 text-indigo-600 hover:scale-110"
                      title="Share Magazine"
                     >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                     </button>
                   )}
                </div>
                <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-indigo-600 shadow-sm">
                  {mag.year}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-[10px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors line-clamp-2 h-7">{mag.title}</h3>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mt-0.5 truncate">{mag.schoolName}</p>
              </div>
            </div>
          ))}
        </div>
        {magazines.length >= pageSize * page && (
          <div className="flex justify-center mt-12">
            <button 
              onClick={() => setPage(p => p + 1)}
              className="px-8 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
            >
              Load More
            </button>
          </div>
        )}
      </section>

      {/* Followed Schools Section */}
      {user && followedMagazines.length > 0 && (
        <section className="animate-fadeIn">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-black font-montserrat uppercase tracking-wider text-slate-900 dark:text-white">Followed Schools</h2>
              <div className="h-1 w-12 bg-indigo-600 mt-2"></div>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {followedMagazines.slice(0, 12).map((mag) => (
              <div 
                key={`followed-${mag.id}`} 
                onClick={() => onRead(mag.id)}
                className="group cursor-pointer space-y-2"
              >
                <div className="aspect-[3/4] relative overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-all duration-500">
                  <img src={mag.thumbnail} alt={mag.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                     <span className="text-white text-[7px] font-black uppercase tracking-widest bg-indigo-600 px-1.5 py-0.5 rounded">Read</span>
                  </div>
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-2">
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onLike(mag.id);
                      }}
                      className={`p-1.5 rounded-full shadow-lg transition-all ${user?.likedMagazines?.includes(mag.id) ? 'bg-rose-500 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:scale-110'}`}
                     >
                        <svg className="w-2.5 h-2.5" fill={user?.likedMagazines?.includes(mag.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                     </button>
                     {mag.magazineType !== 'interactive' && (
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare(mag.id);
                        }}
                        className="p-1.5 rounded-full shadow-lg transition-all bg-white/90 dark:bg-slate-900/90 text-indigo-600 hover:scale-110"
                        title="Share Magazine"
                       >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                       </button>
                     )}
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-indigo-600 shadow-sm">
                    {mag.year}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-[10px] leading-tight text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors line-clamp-2 h-7">{mag.title}</h3>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight mt-0.5 truncate">{mag.schoolName}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeView;
