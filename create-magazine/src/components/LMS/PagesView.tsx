import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, HelpCircle, CheckCircle2, List, Type, 
  ChevronRight, ArrowRight, BookOpen, Image as ImageIcon 
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ContentTypeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const ContentTypeCard: React.FC<ContentTypeCardProps> = ({ title, description, icon, onClick }) => (
  <motion.button
    whileHover={{ y: -4, shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
    onClick={onClick}
    className="bg-white p-6 rounded-[4px] border border-zinc-200 shadow-sm text-left flex flex-col gap-4 transition-all hover:border-[#1f6fb2]/30 group"
  >
    <div className="w-12 h-12 bg-zinc-50 rounded flex items-center justify-center text-[#1f6fb2] group-hover:bg-[#1f6fb2] group-hover:text-white transition-colors">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-zinc-900 text-lg mb-1">{title}</h3>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
    <div className="mt-auto pt-4 flex items-center text-[#1f6fb2] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
      Create Now <ArrowRight className="w-3 h-3 ml-1" />
    </div>
  </motion.button>
);

interface PagesViewProps {
  onSelectType: (type: string) => void;
  hideTypes?: string[];
  compact?: boolean;
}

export const PagesView: React.FC<PagesViewProps> = ({ onSelectType, hideTypes = [], compact = false }) => {
  const contentTypes = [
    {
      id: 'interactive-book',
      title: 'New Interactive Magazine',
      description: 'Create a full magazine with multiple articles, quizzes, and media.',
      icon: <BookOpen className="w-6 h-6" />
    },
    {
      id: 'text',
      title: 'Text',
      description: 'Add a text block to your page.',
      icon: <Type className="w-6 h-6" />
    },
    {
      id: 'image',
      title: 'Image',
      description: 'Add an image to your page.',
      icon: <ImageIcon className="w-6 h-6" />
    },
    {
      id: 'fill-blanks',
      title: 'Fill in the Blanks',
      description: 'Create a task with missing words in a text.',
      icon: <FileText className="w-6 h-6" />
    },
    {
      id: 'guess-answer',
      title: 'Guess the Answer',
      description: 'Create a task where the user has to guess the answer based on a picture.',
      icon: <HelpCircle className="w-6 h-6" />
    },
    {
      id: 'multiple-choice',
      title: 'Multiple Choice',
      description: 'Create flexible multiple choice questions.',
      icon: <CheckCircle2 className="w-6 h-6" />
    },
    {
      id: 'summary',
      title: 'Summary',
      description: 'Create a task where the user selects the correct statements.',
      icon: <List className="w-6 h-6" />
    },
    {
      id: 'true-false',
      title: 'True/False Question',
      description: 'Create questions that can be answered with true or false.',
      icon: <HelpCircle className="w-6 h-6" />
    }
  ].filter(t => !hideTypes.includes(t.id));

  return (
    <div className={cn("max-w-5xl mx-auto px-6", compact ? "py-4" : "py-12")}>
      {!compact && (
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">Select Interactive Magazine Content Type</h2>
          <p className="text-zinc-500">Choose the type of interactive element you want to add to your magazine.</p>
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-6", compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
        {contentTypes.map((type) => (
          <ContentTypeCard
            key={type.id}
            title={type.title}
            description={type.description}
            icon={type.icon}
            onClick={() => onSelectType(type.id)}
          />
        ))}
      </div>
    </div>
  );
};
