import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onDone?: () => void;
}

export function Modal({ isOpen, onClose, title, children, footer, onDone }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative w-full max-w-5xl bg-[#f1f3f5] rounded-md shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-zinc-300"
          >
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3.5 bg-white border-b border-zinc-300">
              <h2 className="text-lg font-bold text-zinc-800 tracking-tight">{title}</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={onDone || onClose}
                  className="px-6 py-1.5 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-sm transition-colors shadow-sm"
                >
                  Done
                </button>
                <button
                  onClick={onClose}
                  className="p-1 text-zinc-400 hover:text-[#1f6fb2] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white m-4 rounded-sm border border-zinc-200 shadow-sm">
              {children}
            </div>

            {/* Footer */}
            <footer className="px-6 py-4 bg-white border-t border-zinc-200 flex justify-start gap-3">
              {footer || (
                <>
                  <button
                    onClick={onDone || onClose}
                    className="px-6 py-1.5 bg-[#1f6fb2] hover:bg-[#1a5e96] text-white rounded-sm font-bold text-sm transition-colors shadow-sm"
                  >
                    Done
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-sm font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
