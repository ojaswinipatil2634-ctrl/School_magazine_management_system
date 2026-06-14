import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-300 rounded-sm overflow-hidden mb-4 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#6b6b6b] hover:bg-[#5a5a5a] transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />}
        <span className="text-sm font-bold text-white tracking-tight">{title}</span>
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-zinc-200">
          {children}
        </div>
      )}
    </div>
  );
}
