import React from 'react';
import { cn } from '../../lib/utils';

interface FormGroupProps {
  label: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  showMetadata?: boolean;
}

export function FormGroup({ label, required, helperText, children, showMetadata }: FormGroupProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="text-sm font-bold text-zinc-800">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {showMetadata && (
          <span className="px-2 py-0.5 bg-blue-50 text-[#1f6fb2] text-[10px] font-bold rounded-sm border border-blue-100 uppercase tracking-wider">
            Metadata
          </span>
        )}
      </div>
      {children}
      {helperText && (
        <p className="mt-1.5 text-xs text-zinc-500 italic leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}
