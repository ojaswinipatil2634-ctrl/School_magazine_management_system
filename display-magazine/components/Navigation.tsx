
import React from 'react';
import { AppTab, UserRole } from '../types';

interface NavigationProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  role: UserRole;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, role }) => {
  const isOrg = role === UserRole.ORGANIZATION;

  const viewerTabs = [
    { id: AppTab.HOME, label: 'Home', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { id: AppTab.MAGAZINES, label: 'Library', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    )},
    { id: AppTab.SEARCH, label: 'Search', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    )},
    { id: AppTab.VIDEOS, label: 'Videos', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
    )},
    { id: AppTab.PROFILE, label: 'Me', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    )},
  ];

  const orgTabs = [
    { id: AppTab.DASHBOARD, label: 'Analytics', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    )},
    { id: 'publication_portal', label: 'Portal', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    ), isExternal: true, url: `https://remix-remix-remix-creativeindia-digital-magazine-302094898169.us-west1.run.app?returnUrl=${encodeURIComponent(window.location.origin)}` },
    { id: AppTab.PROFILE, label: 'Profile', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
    )},
  ];

  const tabs = isOrg ? orgTabs : viewerTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 px-4 py-2 flex justify-between items-center z-40 transition-colors duration-300">
      {tabs.map((tab: any) => (
        tab.isExternal ? (
          <a
            key={tab.id}
            href={tab.url}
            className={`flex flex-col items-center justify-center space-y-1 ${isOrg ? 'w-1/3' : 'w-1/5'} py-1 transition-all duration-300 text-gray-400 dark:text-gray-500 hover:text-indigo-600`}
          >
            {tab.icon}
            <span className="text-[10px] font-bold tracking-tight uppercase">{tab.label}</span>
          </a>
        ) : (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center space-y-1 ${isOrg ? 'w-1/3' : 'w-1/5'} py-1 transition-all duration-300 ${
              activeTab === tab.id 
                ? 'text-indigo-600 dark:text-indigo-400 scale-110' 
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-bold tracking-tight uppercase">{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

export default Navigation;
