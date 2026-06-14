
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Magazine } from '../types';
import { handleFirestoreError, OperationType } from '../firestore-errors';

interface SearchViewProps {
  onRead: (id: string) => void;
  onLike: (id: string) => void;
  onFollowSchool: (schoolId: string) => void;
  onShare: (id: string) => void;
  user: any;
}

const SearchView: React.FC<SearchViewProps> = ({ onRead, onLike, onFollowSchool, onShare, user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchMagazines = async () => {
      setLoading(true);
      try {
        // Fetch from Firestore with limit
        const q = query(collection(db, 'magazines'), limit(50));
        const interactiveQ = query(collection(db, 'interactive'), limit(25));
        
        let querySnapshot;
        let interactiveSnapshot;
        
        try {
          querySnapshot = await getDocs(q);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'magazines');
          return;
        }

        try {
          interactiveSnapshot = await getDocs(interactiveQ);
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'interactive');
          return;
        }
        
        const firestoreMagazines = querySnapshot.docs.map(doc => ({
          id: doc.id,
          magazineType: 'pdf',
          ...(doc.data() as object)
        })) as Magazine[];
        
        const interactiveMagazines = interactiveSnapshot.docs.map(doc => {
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
        
        const merged = [...firestoreMagazines, ...interactiveMagazines];
        // Deduplicate by unique key to prevent React warnings
        const seen = new Set();
        const unique = merged.filter(mag => {
          const key = `${mag.magazineType || 'pdf'}-${mag.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        setMagazines(unique);
      } catch (error) {
        console.error("Error fetching magazines:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMagazines();
  }, []);

  const categories = [
    { name: 'Magazines', icon: '📖', key: 'title' },
    { name: 'Schools', icon: '🏫', key: 'schoolName' },
    { name: 'Regions', icon: '📍', key: 'region' },
  ];

  const results = magazines.filter(m => {
    if (!searchQuery) return false;
    const lowerQuery = searchQuery.toLowerCase();
    
    if (activeCategory === 'Magazines') {
      return m.title.toLowerCase().includes(lowerQuery);
    } else if (activeCategory === 'Schools') {
      return m.schoolName.toLowerCase().includes(lowerQuery);
    } else if (activeCategory === 'Regions') {
      return m.region.toLowerCase().includes(lowerQuery);
    }
    
    // Default search (all fields)
    return (
      m.title.toLowerCase().includes(lowerQuery) || 
      m.schoolName.toLowerCase().includes(lowerQuery) ||
      m.region.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold font-montserrat">Search</h2>
          {activeCategory && (
            <button 
              onClick={() => setActiveCategory(null)}
              className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full"
            >
              Clear Filter: {activeCategory}
            </button>
          )}
        </div>
        <div className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeCategory ? `Search by ${activeCategory.slice(0, -1)}...` : "Search anything..."} 
            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl px-12 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
          />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {searchQuery === '' ? (
        <section className="space-y-6">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Categories</h3>
          <div className="grid grid-cols-2 gap-4">
            {categories.map(cat => (
              <button 
                key={cat.name} 
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center space-x-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-colors ${
                  activeCategory === cat.name 
                    ? 'border-blue-500 ring-2 ring-blue-500/10' 
                    : 'border-gray-100 dark:border-slate-800 hover:border-blue-500'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="font-bold text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
           <h3 className="text-sm font-bold text-gray-400">{results.length} results for "{searchQuery}"</h3>
           <div className="space-y-4">
              {results.map(res => (
                <div 
                  key={`${res.magazineType || 'pdf'}-${res.id}`} 
                  onClick={() => onRead(res.id)}
                  className="flex items-center space-x-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 animate-slideInRight cursor-pointer"
                >
                  <img src={res.thumbnail} className="w-16 h-20 object-cover rounded-xl shadow" alt={res.title} />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm leading-tight">{res.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-[10px] text-gray-500">{res.schoolName}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                       <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">{res.region}</span>
                       {res.magazineType === 'interactive' && (
                         <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Interactive</span>
                       )}
                       <span className="text-[9px] text-gray-400">{res.year}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onLike(res.id);
                      }}
                      className={`p-2 rounded-full transition-colors ${user?.likedMagazines?.includes(res.id) ? 'text-rose-500 bg-rose-500/10' : 'text-gray-300 hover:text-rose-500 hover:bg-rose-50'}`}
                    >
                      <svg className="w-5 h-5" fill={user?.likedMagazines?.includes(res.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                    {res.magazineType !== 'interactive' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onShare(res.id);
                        }}
                        className="p-2 rounded-full text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                        title="Share Magazine"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="text-sm font-bold">No magazines found.</p>
                  <p className="text-xs">Try adjusting your keywords.</p>
                </div>
              )}
           </div>
        </section>
      )}
    </div>
  );
};

export default SearchView;
