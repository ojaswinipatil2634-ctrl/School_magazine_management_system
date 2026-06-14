
export enum AppTab {
  HOME = 'home',
  MAGAZINES = 'magazines',
  SEARCH = 'search',
  VIDEOS = 'videos',
  PROFILE = 'profile',
  DASHBOARD = 'dashboard', // For organizations
  MANAGE = 'manage',       // For organizations
  INTERACTIVE = 'interactive' // New tab for interactive magazines
}

export enum UserRole {
  VIEWER = 'viewer',
  ORGANIZATION = 'organization'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  DEFAULT = 'default'
}

export interface School {
  id: string;
  name: string;
  region: string;
  logo: string;
  banner: string;
  about: string;
  totalLikes: number;
  totalViews: number;
}

export interface Magazine {
  id: string;
  title: string;
  schoolId: string;
  schoolName: string;
  region: string;
  thumbnail: string;
  pdfUrl?: string; // Optional URL to the PDF file in Firebase Storage
  description: string;
  likes: number;
  views: number;
  year: number;
  language: string;
  magazineType?: 'pdf' | 'interactive';
}

export interface InteractiveMagazineElement {
  id: string;
  type: 'text' | 'image' | 'multiple-choice' | 'video' | 'header';
  content: any;
}

export interface InteractiveMagazineColumn {
  id: string;
  elements: InteractiveMagazineElement[];
}

export interface InteractiveMagazineRow {
  id: string;
  columns: InteractiveMagazineColumn[];
}

export interface InteractiveMagazinePage {
  id: string;
  title: string;
  rows: InteractiveMagazineRow[];
}

export interface InteractiveMagazineData {
  showCover: boolean;
  coverImage: string;
  coverText: string;
  pages: InteractiveMagazinePage[];
}

export interface InteractiveMagazine {
  id: string;
  title: string;
  userId: string;
  magazineType: 'interactive';
  published: boolean;
  thumbnail: string;
  updatedAt: string;
  data: InteractiveMagazineData;
}

export interface VideoContent {
  id: string;
  title: string;
  speaker: string;
  thumbnail: string;
  duration: string;
  description: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  bio: string;
  region: string;
  bookmarks: string[]; // Magazine IDs
  likedMagazines: string[]; // Magazine IDs
  viewHistory: string[]; // Magazine IDs
  followedSchools: string[]; // School IDs
  achievements: string[];
}
