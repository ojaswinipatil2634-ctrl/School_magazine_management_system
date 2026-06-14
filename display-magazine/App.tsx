
import React, { useState, useEffect } from 'react';
import { AppTab, UserRole, ThemeMode, UserProfile } from './types';
import { INITIAL_USER } from './constants';
import Navigation from './components/Navigation';
import Header from './components/Header';
import HomeView from './components/HomeView';
import MagazinesView from './components/MagazinesView';
import SearchView from './components/SearchView';
import VideosView from './components/VideosView';
import ProfileView from './components/ProfileView';
import AuthGateway from './components/AuthGateway';
import OrgDashboard from './components/OrgDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import InteractiveMagazineViewer from './components/InteractiveMagazineViewer';
import { auth, onAuthStateChanged, signOut, db } from './firebase';
import { doc, getDoc, getDocFromServer, setDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './firestore-errors';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.HOME);
  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.DEFAULT);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMagazineId, setPendingMagazineId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [viewingInteractiveMagazineId, setViewingInteractiveMagazineId] = useState<string | null>(null);
  const [highlightedMagazineId, setHighlightedMagazineId] = useState<string | null>(null);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Handle direct magazine links on mount
  useEffect(() => {
    const handleUrlParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const magId = urlParams.get('mag');
      
      if (magId) {
        console.log("Detected magazine ID in URL:", magId);
        // Switch to magazines tab and set highlight
        setCurrentTab(AppTab.MAGAZINES);
        setHighlightedMagazineId(magId);
        
        // Clean up URL to keep it tidy
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        // Fallback for old path-based links
        const path = window.location.pathname;
        if (path.startsWith('/magazine/')) {
          const id = path.split('/magazine/')[1];
          if (id) {
            setCurrentTab(AppTab.MAGAZINES);
            setHighlightedMagazineId(id);
            window.history.replaceState({}, '', '/');
          }
        }
      }
    };

    handleUrlParams();
  }, []);

  // Auth Listener
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch profile from Firestore with real-time listener
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            // Create initial profile if it doesn't exist
            const initialProfile: UserProfile = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              role: UserRole.VIEWER,
              avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${firebaseUser.uid}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
              bio: "",
              region: "",
              bookmarks: [],
              likedMagazines: [],
              viewHistory: [],
              followedSchools: [],
              achievements: []
            };
            setDoc(docRef, initialProfile); // Initial creation
            setUser(initialProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setUser(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Apply theme to body
  useEffect(() => {
    const isDark = themeMode === ThemeMode.DARK || (themeMode === ThemeMode.DEFAULT && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-slate-950', 'text-white');
      document.body.classList.remove('bg-gray-50', 'text-slate-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.add('bg-gray-50', 'text-slate-900');
      document.body.classList.remove('bg-slate-950', 'text-white');
    }
  }, [themeMode]);

  const handleLike = async (id: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    const isLiked = user.likedMagazines.includes(id);
    const updatedLiked = isLiked 
      ? user.likedMagazines.filter(mid => mid !== id)
      : [...user.likedMagazines, id];

    // Optimistic update
    setUser(prev => prev ? { ...prev, likedMagazines: updatedLiked } : null);

    // Update Firestore
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { likedMagazines: updatedLiked }, { merge: true });
    } catch (error) {
      console.error("Error updating liked magazines:", error);
    }
  };

  const handleView = async (id: string) => {
    if (!user) return;
    if (user.viewHistory.includes(id)) return;

    const updatedHistory = [id, ...user.viewHistory].slice(0, 20);

    // Optimistic update
    setUser(prev => prev ? { ...prev, viewHistory: updatedHistory } : null);

    // Update Firestore
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { viewHistory: updatedHistory }, { merge: true });
    } catch (error) {
      console.error("Error updating view history:", error);
    }
  };

  const handleReadMagazine = async (id: string) => {
    console.log("Attempting to read magazine:", id);

    // Require login to read any magazine
    if (!user) {
      console.log("User not logged in, showing auth modal for magazine:", id);
      setPendingMagazineId(id);
      setShowAuthModal(true);
      return;
    }

    // Track view
    handleView(id);

    // Try to find the magazine in the interactive collection first
    try {
      const interactiveRef = doc(db, 'interactive', id);
      const interactiveSnap = await getDoc(interactiveRef);
      
      if (interactiveSnap.exists()) {
        console.log("Found interactive magazine, opening viewer...");
        setViewingInteractiveMagazineId(id);
        return;
      }

      // Fallback to standard magazines collection
      console.log("Not found in interactive, checking standard magazines...");
      const docRef = doc(db, 'magazines', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pdfUrl) {
          console.log("Found standard magazine with PDF, opening in new tab...");
          window.open(data.pdfUrl, '_blank');
        } else {
          console.warn("No PDF URL found for this magazine");
        }
      } else {
        console.error("Magazine not found in any collection:", id);
      }
    } catch (error) {
      console.error("Error reading magazine:", error);
    }
  };

  const handleFollowSchool = async (schoolId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const isFollowing = user.followedSchools?.includes(schoolId);
    const updatedFollowedSchools = isFollowing
      ? user.followedSchools.filter(id => id !== schoolId)
      : [...(user.followedSchools || []), schoolId];

    const updatedUser = { ...user, followedSchools: updatedFollowedSchools };
    setUser(updatedUser);

    // Update Firestore
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { followedSchools: updatedFollowedSchools }, { merge: true });
    } catch (error) {
      console.error("Error updating followed schools:", error);
    }
  };

  const handleShare = async (id: string) => {
    try {
      // Use a robust way to construct the share URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/?mag=${id}`;
      
      console.log("Generated share URL:", shareUrl);
      
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Magazine link copied! 🎉");
      setTimeout(() => setShareMessage(null), 3000);
    } catch (err) {
      console.error('Could not share: ', err);
      // Fallback using current URL structure
      const fallbackUrl = `${window.location.origin}/?mag=${id}`;
      navigator.clipboard.writeText(fallbackUrl);
      setShareMessage("Magazine link copied! 🎉");
      setTimeout(() => setShareMessage(null), 3000);
    }
  };

  const handleLogin = (role: UserRole, data?: { name: string }) => {
    // If we already have a user from Firebase Auth, don't overwrite with mock data
    // unless it's an organization login which is handled differently in this app
    if (user && role === UserRole.VIEWER) {
      setShowAuthModal(false);
      if (pendingMagazineId) {
        handleReadMagazine(pendingMagazineId);
        setPendingMagazineId(null);
      }
      return;
    }

    // Start with a clean slate for the new user, using the name provided
    const newUser: UserProfile = { 
      ...INITIAL_USER, 
      role,
      name: data?.name || INITIAL_USER.name,
      bio: "", 
      region: "", 
      bookmarks: [],
      likedMagazines: [],
      viewHistory: [],
      followedSchools: [],
    };

    if (role === UserRole.ORGANIZATION) {
      newUser.name = "Modern Academy";
      newUser.bio = "Dedicated to educational excellence.";
      newUser.region = "International";
      newUser.avatar = "https://api.dicebear.com/7.x/initials/svg?seed=MA&backgroundColor=4f46e5";
      setCurrentTab(AppTab.DASHBOARD);
      setUser(newUser);
    } else {
      if (data?.name) {
        newUser.avatar = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${data.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
      }
      // If student login and there was a pending magazine, open it
      if (pendingMagazineId) {
        handleReadMagazine(pendingMagazineId);
        setPendingMagazineId(null);
      }
      // Note: For VIEWER, the onAuthStateChanged listener will handle setting the user from Firestore
    }
    
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentTab(AppTab.HOME);
      setPendingMagazineId(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderView = () => {
    // If we are in reading mode, the reader is rendered as an overlay (handled below)
    
    // Organization specific views (Dashboard is their primary home)
    if (user?.role === UserRole.ORGANIZATION && currentTab === AppTab.DASHBOARD) {
      return <OrgDashboard user={user} onNavigate={setCurrentTab} />;
    }

    switch (currentTab) {
      case AppTab.HOME:
        return <HomeView onRead={handleReadMagazine} onNavigate={setCurrentTab} onLike={handleLike} onFollowSchool={handleFollowSchool} onShare={handleShare} user={user} />;
      case AppTab.MAGAZINES:
        return (
          <MagazinesView 
            onRead={handleReadMagazine}
            onLike={handleLike}
            onFollowSchool={handleFollowSchool}
            onShare={handleShare}
            user={user}
            highlightId={highlightedMagazineId}
          />
        );
      case AppTab.SEARCH:
        return <SearchView onRead={handleReadMagazine} onLike={handleLike} onFollowSchool={handleFollowSchool} onShare={handleShare} user={user} />;
      case AppTab.VIDEOS:
        return <VideosView />;
      case AppTab.PROFILE:
        return user ? (
          <ProfileView 
            user={user} 
            setUser={setUser} 
            themeMode={themeMode} 
            setThemeMode={setThemeMode} 
            onLogout={handleLogout} 
            onNavigate={setCurrentTab}
            onRead={handleReadMagazine}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h2 className="text-xl font-black">Login Required</h2>
            <p className="text-gray-500 max-w-xs mx-auto">Please sign in to view your personalized creative profile.</p>
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20"
            >
              Log In Now
            </button>
          </div>
        );
      case AppTab.DASHBOARD:
        return user ? <OrgDashboard user={user} onNavigate={setCurrentTab} /> : <HomeView onRead={handleReadMagazine} onNavigate={setCurrentTab} />;
      default:
        return <HomeView onRead={handleReadMagazine} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col relative">
        <Header 
          activeTab={currentTab} 
          onTabChange={setCurrentTab} 
          user={user} 
          onLoginClick={() => setShowAuthModal(true)}
        />
        
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-32">
          {renderView()}
        </main>

        {shareMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center space-x-3">
              <div className="bg-green-500 rounded-full p-1">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest">{shareMessage}</span>
            </div>
          </div>
        )}
        
        {showAuthModal && (
          <AuthGateway 
            onSelectRole={handleLogin} 
            onClose={() => {
              setShowAuthModal(false);
              setPendingMagazineId(null);
            }} 
          />
        )}

        <div className="md:hidden">
          <Navigation 
            activeTab={currentTab} 
            onTabChange={setCurrentTab} 
            role={user?.role || UserRole.VIEWER} 
          />
        </div>

        {viewingInteractiveMagazineId && (
          <InteractiveMagazineViewer 
            magazineId={viewingInteractiveMagazineId} 
            onClose={() => setViewingInteractiveMagazineId(null)} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
