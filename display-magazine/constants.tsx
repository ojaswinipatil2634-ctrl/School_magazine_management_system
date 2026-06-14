
import { Magazine, School, VideoContent, UserProfile, UserRole } from './types';

export const COLORS = {
  primary: '#0D1B2A',
  secondary: '#1F6FEB',
  accent: '#F9C74F', // Soft Yellow
  bgDark: 'bg-slate-950',
  cardDark: 'bg-slate-900',
};

export const INITIAL_USER: UserProfile = {
  id: '',
  name: '',
  role: UserRole.VIEWER,
  avatar: '',
  bio: '',
  region: '',
  bookmarks: [],
  likedMagazines: [],
  viewHistory: [],
  followedSchools: [],
  achievements: [],
};
