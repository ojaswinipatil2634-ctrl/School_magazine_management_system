import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, ThemeMode, Magazine } from '../types';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firestore-errors';

interface ProfileViewProps {
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  onLogout: () => void;
  onNavigate: (tab: any) => void;
  onRead: (id: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, setUser, themeMode, setThemeMode, onLogout, onNavigate, onRead }) => {
  const [activeSubTab, setActiveSubTab] = useState<'Profile' | 'Activity' | 'Settings'>('Profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Local form state for editing
  const [editName, setEditName] = useState(user.name);
  const [editBio, setEditBio] = useState(user.bio);
  const [editRegion, setEditRegion] = useState(user.region);

  const [followedSchoolsData, setFollowedSchoolsData] = useState<{id: string, name: string}[]>([]);
  const [likedMagazinesData, setLikedMagazinesData] = useState<Magazine[]>([]);
  const [viewHistoryData, setViewHistoryData] = useState<Magazine[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Fetch followed schools data
  useEffect(() => {
    const fetchSchools = async () => {
      if (user.followedSchools && user.followedSchools.length > 0) {
        try {
          const schools: {id: string, name: string}[] = [];
          for (const schoolId of user.followedSchools) {
            const schoolRef = doc(db, 'schools', schoolId);
            const schoolSnap = await getDoc(schoolRef);
            if (schoolSnap.exists()) {
              schools.push({ id: schoolId, name: schoolSnap.data().name });
            } else {
              // Try to find the school name from magazines if not in schools collection
              const magQuery = query(collection(db, 'magazines'), where('schoolId', '==', schoolId), limit(1));
              const magSnap = await getDocs(magQuery);
              if (!magSnap.empty) {
                schools.push({ id: schoolId, name: magSnap.docs[0].data().schoolName });
              } else {
                schools.push({ id: schoolId, name: 'Unknown School' }); // Better than showing ID
              }
            }
          }
          setFollowedSchoolsData(schools);
        } catch (error) {
          console.error("Error fetching school names:", error);
        }
      } else {
        setFollowedSchoolsData([]);
      }
    };
    fetchSchools();
  }, [user.followedSchools]);

  // Fetch activity data (liked and viewed magazines)
  useEffect(() => {
    const fetchActivityData = async () => {
      const hasLiked = user.likedMagazines && user.likedMagazines.length > 0;
      const hasHistory = user.viewHistory && user.viewHistory.length > 0;
      
      if (!hasLiked && !hasHistory) {
        setLikedMagazinesData([]);
        setViewHistoryData([]);
        return;
      }

      setLoadingActivity(true);
      try {
        // Helper to fetch magazine details
        const fetchMagDetails = async (ids: string[]) => {
          const results: Magazine[] = [];
          // Deduplicate IDs to prevent React key warnings
          const uniqueIds = Array.from(new Set(ids));
          
          for (const id of uniqueIds) {
            // Check standard magazines
            const magRef = doc(db, 'magazines', id);
            const magSnap = await getDoc(magRef);
            if (magSnap.exists()) {
              results.push({ id: magSnap.id, ...magSnap.data() } as Magazine);
            } else {
              // Check interactive magazines
              const interactiveRef = doc(db, 'interactive', id);
              const interactiveSnap = await getDoc(interactiveRef);
              if (interactiveSnap.exists()) {
                const data = interactiveSnap.data();
                results.push({
                  id: interactiveSnap.id,
                  title: data.title || 'Interactive Magazine',
                  schoolName: 'Interactive Creator',
                  thumbnail: data.thumbnail || `https://picsum.photos/seed/${interactiveSnap.id}/400/600`,
                  magazineType: 'interactive'
                } as any);
              }
            }
          }
          return results;
        };

        if (hasLiked) {
          const liked = await fetchMagDetails(user.likedMagazines);
          setLikedMagazinesData(liked);
        } else {
          setLikedMagazinesData([]);
        }

        if (hasHistory) {
          const history = await fetchMagDetails(user.viewHistory);
          setViewHistoryData(history);
        } else {
          setViewHistoryData([]);
        }
      } catch (error) {
        console.error("Error fetching activity magazines:", error);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchActivityData();
  }, [user.likedMagazines, user.viewHistory]);

  // Check if profile needs initialization
  useEffect(() => {
    // Removed automatic upgrade prompt as per user request
  }, []);

  const saveProfile = async () => {
    const updatedUser = {
      ...user,
      name: editName,
      bio: editBio,
      region: editRegion
    };
    
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), updatedUser, { merge: true });
      setUser(updatedUser);
      setIsEditingProfile(false);
      setShowUpgradePrompt(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const openEditor = () => {
    setEditName(user.name);
    setEditBio(user.bio);
    setEditRegion(user.region);
    setIsEditingProfile(true);
  };

  // Internal Tabs
  const hasActivity = (user.likedMagazines && user.likedMagazines.length > 0) || (user.viewHistory && user.viewHistory.length > 0);
  const availableTabs = hasActivity ? ['Profile', 'Activity', 'Settings'] : ['Profile', 'Settings'];

  // If active tab is Activity but it's no longer available, switch to Profile
  useEffect(() => {
    if (activeSubTab === 'Activity' && !hasActivity) {
      setActiveSubTab('Profile');
    }
  }, [hasActivity, activeSubTab]);

  return (
    <div className="space-y-8 pb-10 animate-fadeIn">
      {/* Profile Header */}
      <section className="relative pt-12 text-center flex flex-col items-center">
        <div className="w-28 h-28 rounded-full border-4 border-indigo-500 p-1 mb-4 shadow-2xl relative group">
           <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner" />
           <div 
             onClick={openEditor}
             className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
           >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           </div>
        </div>
        <h2 className="text-2xl font-black font-montserrat text-slate-900 dark:text-white">{user.name}</h2>
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
            {user.role === UserRole.VIEWER ? 'Creative Enthusiast' : 'Official Organization'}
          </p>
          <span className="text-slate-300">•</span>
          <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-widest">{user.region || 'Region Unset'}</p>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 max-w-sm px-4 line-clamp-2 italic">
          {user.bio ? `"${user.bio}"` : "Tap 'Edit Details' to set your bio and introduce yourself to the community."}
        </p>

        <div className="flex space-x-8 mt-8">
           <div className="text-center group cursor-default">
              <p className="text-xl font-black group-hover:text-indigo-500 transition-colors">{user.role === UserRole.VIEWER ? user.bookmarks.length : '12'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role === UserRole.VIEWER ? 'Saved' : 'Uploads'}</p>
           </div>
           <div className="text-center group cursor-default">
              <p className="text-xl font-black group-hover:text-indigo-500 transition-colors">{user.role === UserRole.VIEWER ? '14' : '45.2k'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role === UserRole.VIEWER ? 'Badges' : 'Views'}</p>
           </div>
           <div className="text-center group cursor-default">
              <p className="text-xl font-black group-hover:text-indigo-500 transition-colors">{user.role === UserRole.VIEWER ? '128' : '8.1k'}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role === UserRole.VIEWER ? 'Hearts' : 'Likes'}</p>
           </div>
        </div>
      </section>

      {/* Internal Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10">
         {availableTabs.map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveSubTab(tab as any)}
             className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
               activeSubTab === tab ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
             }`}
           >
             {tab}
           </button>
         ))}
      </div>

      {activeSubTab === 'Profile' && (
        <section className="space-y-10 animate-slideInRight">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">About Me</h3>
              <button 
                onClick={openEditor}
                className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest"
              >
                Edit Details
              </button>
            </div>
            <div className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              {user.bio || "No information provided yet."}
            </div>
          </div>

          {/* Followed Schools Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Followed Schools</h3>
            {followedSchoolsData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {followedSchoolsData.map(school => (
                  <div key={`followed-school-${school.id}`} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 font-black text-xs">
                        {school.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{school.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No followed schools yet</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeSubTab === 'Activity' && (
        <section className="space-y-10 animate-slideInRight">
          {loadingActivity ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading activity...</p>
            </div>
          ) : (
            <>
              {likedMagazinesData.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Liked Magazines ({likedMagazinesData.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {likedMagazinesData.map(mag => (
                      <div 
                        key={`liked-${mag.id}`} 
                        onClick={() => onRead(mag.id)}
                        className="flex flex-col space-y-2 group cursor-pointer"
                      >
                        <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
                          <img 
                            src={mag.thumbnail} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            alt={mag.title}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white line-clamp-1">{mag.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewHistoryData.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent History</h3>
                  <div className="space-y-3">
                    {viewHistoryData.map(mag => (
                      <div 
                        key={`history-${mag.id}`} 
                        onClick={() => onRead(mag.id)}
                        className="flex items-center space-x-4 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <img 
                            src={mag.thumbnail} 
                            className="w-full h-full object-cover" 
                            alt={mag.title}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{mag.title}</p>
                          <p className="text-[10px] text-gray-400">{mag.schoolName || 'Interactive Creator'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeSubTab === 'Settings' && (
        <section className="space-y-8 animate-slideInRight">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Display Theme</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: ThemeMode.LIGHT, label: 'Light' },
                { id: ThemeMode.DARK, label: 'Dark' },
                { id: ThemeMode.DEFAULT, label: 'Auto' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setThemeMode(mode.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-[28px] border-2 transition-all ${
                    themeMode === mode.id 
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200'
                  }`}
                >
                   <span className={`text-[10px] font-black uppercase tracking-widest ${themeMode === mode.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{mode.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center p-5 text-rose-500 font-black text-[11px] uppercase tracking-[0.2em] bg-rose-50 dark:bg-rose-950/20 rounded-[24px] border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-colors shadow-sm"
          >
            Logout & Switch to Guest
          </button>
        </section>
      )}

      {/* Profile Upgrade / Initialization Popup */}
      {(showUpgradePrompt || isEditingProfile) && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-slideUp">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black font-montserrat tracking-tight">
                    {showUpgradePrompt ? 'Upgrade Your Profile' : 'Modify Profile'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {showUpgradePrompt ? 'Tell us more about yourself' : 'Personalize your experience'}
                  </p>
                </div>
                {!showUpgradePrompt && (
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Full Name</label>
                   <input 
                     type="text" 
                     value={editName}
                     onChange={(e) => setEditName(e.target.value)}
                     placeholder="e.g. Rahul Sharma"
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Region / Location</label>
                   <input 
                     type="text" 
                     value={editRegion}
                     onChange={(e) => setEditRegion(e.target.value)}
                     placeholder="e.g. Mumbai, Maharashtra"
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Bio</label>
                   <textarea 
                     value={editBio}
                     rows={3}
                     onChange={(e) => setEditBio(e.target.value)}
                     placeholder="Write a short description about yourself..."
                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                   />
                </div>
                <button 
                  onClick={saveProfile}
                  className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Save & Upgrade
                </button>
                {showUpgradePrompt && (
                  <button 
                    onClick={() => setShowUpgradePrompt(false)}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
                  >
                    Skip for now
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
