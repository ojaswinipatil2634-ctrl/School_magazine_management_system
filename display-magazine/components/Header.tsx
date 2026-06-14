
import React from 'react';
import { AppTab, UserProfile, UserRole } from '../types';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  user: UserProfile | null;
  onLoginClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, user, onLoginClick }) => {
  const isOrg = user?.role === UserRole.ORGANIZATION;

  const viewerNav = [
    { id: AppTab.HOME, label: 'Home' },
    { id: AppTab.MAGAZINES, label: 'Magazines' },
    { id: AppTab.SEARCH, label: 'Search' },
  ];

  const orgNav = [
    { id: AppTab.DASHBOARD, label: 'Dashboard' },
    { id: 'publication_portal', label: 'Publication Portal', isExternal: true, url: `https://remix-remix-remix-creativeindia-digital-magazine-302094898169.us-west1.run.app?returnUrl=${encodeURIComponent(window.location.origin)}` },
    { id: AppTab.PROFILE, label: 'Settings' },
  ];

  const navItems = isOrg ? orgNav : viewerNav;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-10">
        <div 
          className="flex items-center space-x-2 cursor-pointer" 
          onClick={() => onTabChange(isOrg ? AppTab.DASHBOARD : AppTab.HOME)}
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic">Ci</div>
          <span className="text-xl font-black font-montserrat tracking-tighter text-slate-900 dark:text-white hidden sm:block">CreativeIndia</span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map(item => (
            item.isExternal ? (
              <a
                key={item.id}
                href={item.url}
                className="text-xs font-black uppercase tracking-widest transition-all text-gray-400 hover:text-slate-900 dark:hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as AppTab)}
                className={`text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === item.id 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            )
          ))}
        </nav>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div 
            onClick={() => onTabChange(AppTab.PROFILE)}
            className="flex items-center space-x-3 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all group"
          >
            <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-700" alt="avatar" />
            <div className="hidden lg:flex flex-col items-start leading-none">
              <span className="text-[10px] font-black text-slate-900 dark:text-white group-hover:text-indigo-500 uppercase tracking-tighter">{user.name}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{user.role}</span>
            </div>
          </div>
        ) : (
          <button 
            onClick={onLoginClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
