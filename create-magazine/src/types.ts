export type ContentType = 'interactive-book' | 'crossword' | 'magazine';

export interface MagazinePage {
  id: string;
  fabricData: any; // Fabric.js JSON
  thumbnail?: string;
}

export interface MagazineData {
  id: string;
  title: string;
  description?: string;
  userId: string;
  pages?: MagazinePage[];
  thumbnail?: string;
  pdfUrl?: string;
  published: boolean;
  isDraft?: boolean;
  magazineType?: 'static' | 'interactive';
  updatedAt: string;
  createdAt: string;
  schoolId?: string;
  schoolName?: string;
  region?: string;
  year?: number;
  likes?: number;
  views?: number;
}

export type BlockType = 
  | 'text' | 'image' | 'video' | 'audio' 
  | 'multiple-choice' | 'single-choice' | 'true-false' 
  | 'fill-blanks' | 'drag-words' | 'drag-drop' 
  | 'mark-words' | 'question-set' | 'summary' 
  | 'course-presentation' | 'interactive-video' 
  | 'image-hotspots' | 'accordion' | 'dialog-cards' | 'link'
  | 'crossword' | 'guess-answer';

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: any; // Can be string or object depending on type
  metadata?: {
    altText?: string;
    hoverText?: string;
    isDecorative?: boolean;
  };
}

export interface LayoutRow {
  id: string;
  columns: {
    id: string;
    elements: ContentBlock[];
  }[];
}

export interface BookPage {
  id: string;
  title: string;
  rows: LayoutRow[];
}

export interface BookData {
  coverImage?: string;
  coverText?: string;
  showCover?: boolean;
  description?: string;
  pdfURL?: string;
  pages: BookPage[];
}

export interface CrosswordWord {
  answer: string;
  clue: string;
  x: number;
  y: number;
  direction: 'across' | 'down';
}

export interface CrosswordData {
  words: CrosswordWord[];
  gridSize: number;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  data: BookData | CrosswordData | MagazineData;
  published: boolean;
  updatedAt: string;
}
