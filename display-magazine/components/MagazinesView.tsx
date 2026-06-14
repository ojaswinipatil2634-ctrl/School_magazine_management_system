
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Magazine } from '../types';
import { handleFirestoreError, OperationType } from '../firestore-errors';

interface MagazinesViewProps {
  onRead: (id: string) => void;
  onLike: (id: string) => void;
  onFollowSchool: (schoolId: string) => void;
  onShare: (id: string) => void;
  user: any;
  highlightId?: string | null;
}

const MagazinesView: React.FC<MagazinesViewProps> = ({ onRead, onLike, onFollowSchool, onShare, user, highlightId }) => {
  const [filter, setFilter] = useState('All');
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [standardMagazines, setStandardMagazines] = useState<Magazine[]>([]);
  const [interactiveMagazines, setInteractiveMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const tabs = ['All', 'Interactive', 'School', 'Region', 'Liked', 'Viewed'];

  useEffect(() => {
    if (highlightId && magazines.length > 0) {
      const highlightedMag = magazines.find(m => m.id === highlightId);
      if (highlightedMag) {
        if (highlightedMag.magazineType === 'interactive') {
          setFilter('Interactive');
        } else {
          setFilter('All');
        }
        
        // Scroll to the element after a short delay to allow for filter rendering
        setTimeout(() => {
          const element = document.getElementById(`mag-${highlightId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [highlightId, magazines]);

  const filteredMagazines = magazines.filter(mag => {
    if (filter === 'All') return true;
    if (filter === 'Interactive') return mag.magazineType === 'interactive';
    if (filter === 'School') return mag.schoolId !== 'static';
    if (filter === 'Region') return true; // We will group all by region
    if (filter === 'Liked') return user?.likedMagazines?.includes(mag.id);
    if (filter === 'Viewed') return user?.viewHistory?.includes(mag.id);
    return true;
  });

  useEffect(() => {
    setLoading(true);
    
    // Real-time listener for standard magazines
    const magQuery = query(collection(db, 'magazines'), limit(48));
    const unsubscribeMags = onSnapshot(magQuery, (snapshot) => {
      const firestoreMagazines = snapshot.docs.map(doc => {
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
          language: data.language || 'English',
          magazineType: 'pdf'
        } as Magazine;
      });
      setStandardMagazines(firestoreMagazines);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'magazines');
      setLoading(false);
    });

    // Real-time listener for interactive magazines
    const interactiveQuery = query(collection(db, 'interactive'), limit(24));
    const unsubscribeInteractive = onSnapshot(interactiveQuery, (snapshot) => {
      const interactiveMagazines = snapshot.docs.map(doc => {
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
      setInteractiveMagazines(interactiveMagazines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'interactive');
    });

    return () => {
      unsubscribeMags();
      unsubscribeInteractive();
    };
  }, []);

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

  const renderMagazineCard = (mag: Magazine) => {
    const isHighlighted = highlightId === mag.id;
    const uniqueKey = `${mag.magazineType || 'pdf'}-${mag.id}`;
    
    return (
      <div 
        key={uniqueKey}
        id={`mag-${mag.id}`}
        onClick={() => onRead(mag.id)}
        className={`flex flex-col space-y-1.5 group cursor-pointer transition-all duration-500 ${
          isHighlighted ? 'ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-slate-950 rounded-xl p-2 scale-105 shadow-2xl z-10 bg-blue-500/5' : ''
        }`}
      >
        <div className="aspect-[3/4] rounded-lg overflow-hidden relative shadow-sm group-hover:shadow-md transition-all">
          <img 
            src={mag.thumbnail} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            alt={mag.title} 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors"></div>
          {mag.magazineType === 'interactive' && (
            <div className="absolute top-2 left-2 z-10">
              <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg">Interactive</span>
            </div>
          )}
          {isHighlighted && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-600/20 backdrop-blur-[2px] z-20">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-bounce shadow-xl">
                Shared with you
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-2">
             <button 
              onClick={(e) => {
                e.stopPropagation();
                onLike(mag.id);
              }}
              className={`p-1.5 rounded-full shadow-lg transition-all ${user?.likedMagazines?.includes(mag.id) ? 'bg-rose-500 text-white' : 'bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:scale-110'}`}
             >
                <svg className="w-3 h-3" fill={user?.likedMagazines?.includes(mag.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
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
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
               </button>
             )}
          </div>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="bg-white/90 backdrop-blur dark:bg-slate-900/90 p-1.5 rounded-full shadow-lg text-blue-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
             </div>
          </div>
        </div>
        <div className="px-0.5">
          <h3 className="text-[11px] font-bold leading-tight line-clamp-2 h-8 group-hover:text-blue-500 transition-colors">{mag.title}</h3>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium truncate flex-1">{mag.schoolName}</p>
          </div>
          <div className="flex items-center space-x-2 mt-1 opacity-70">
            <div className="flex items-center space-x-0.5">
              <svg className="w-2.5 h-2.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
              <span className="text-[9px] font-bold">{mag.likes}</span>
            </div>
            <div className="flex items-center space-x-0.5">
              <svg className="w-2.5 h-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span className="text-[9px] font-bold">{mag.views}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedMagazines = (groupBy: 'schoolName' | 'region') => {
    const groups: { [key: string]: { mags: Magazine[], displayName: string, schoolId?: string } } = {};
    
    filteredMagazines.forEach(mag => {
      let key = 'unknown';
      let displayName = 'Unknown';

      if (groupBy === 'schoolName') {
        // Use normalized schoolName as the key to group all magazines with the same name together
        key = (mag.schoolName || 'Unknown School').trim().toLowerCase();
        displayName = mag.schoolName || 'Unknown School';
      } else {
        key = (mag.region || 'Unknown').trim().toLowerCase();
        displayName = mag.region || 'National';
      }
      
      if (!groups[key]) {
        groups[key] = { 
          mags: [], 
          displayName, 
          schoolId: (mag.schoolId && mag.schoolId !== 'unknown') ? mag.schoolId : undefined 
        };
      }
      groups[key].mags.push(mag);
      
      // If we found a valid schoolId for this group, update it
      if (!groups[key].schoolId && mag.schoolId && mag.schoolId !== 'unknown') {
        groups[key].schoolId = mag.schoolId;
      }
    });

    return Object.entries(groups).sort((a, b) => a[1].displayName.localeCompare(b[1].displayName)).map(([key, group]) => (
      <div key={key} className="space-y-4 pt-2">
        <div className="flex items-center space-x-3">
          <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{group.displayName}</h3>
          
          {groupBy === 'schoolName' && group.schoolId && group.schoolId !== 'static' && group.schoolId !== 'unknown' && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFollowSchool(group.schoolId!);
              }}
              className={`ml-2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest transition-all ${
                user?.followedSchools?.includes(group.schoolId)
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              {user?.followedSchools?.includes(group.schoolId) ? 'Following' : 'Follow'}
            </button>
          )}

          <div className="flex-1 h-[1px] bg-gray-100 dark:bg-slate-800"></div>
          <span className="text-[9px] font-bold text-gray-400">{group.mags.length}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {group.mags.map(mag => renderMagazineCard(mag))}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-6 pb-6 animate-fadeIn">
      <h2 className="text-2xl font-bold font-montserrat">Library</h2>
      
      {/* Scrollable Tabs */}
      <div className="flex overflow-x-auto gap-3 no-scrollbar py-1">
        {tabs.map(tab => (
          <button 
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              filter === tab 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && magazines.length === 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-800 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {filter === 'School' ? (
            renderGroupedMagazines('schoolName')
          ) : filter === 'Region' ? (
            renderGroupedMagazines('region')
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredMagazines.map(mag => renderMagazineCard(mag))}
            </div>
          )}
          
          {filteredMagazines.length === 0 && !loading && (
            <div className="text-center py-20 opacity-50">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-sm font-bold">No magazines found in this category.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MagazinesView;
