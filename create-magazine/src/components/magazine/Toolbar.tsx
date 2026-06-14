import React from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, Image as ImageIcon, Trash2, Layers, ChevronUp, ChevronDown, 
  AlignCenterVertical, AlignCenterHorizontal, AlignStartVertical, AlignEndVertical, 
  AlignStartHorizontal, AlignEndHorizontal, Plus, Copy, FileText, Download, Save, CheckCircle2,
  X, Layout, Grid, Ruler, Upload
} from 'lucide-react';
import { ChromePicker } from 'react-color';

interface ToolbarProps {
  selectedObject: any;
  onUpdate: (options: any) => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAlign: (direction: any) => void;
  onSave: (closeAfter?: boolean) => void;
  onExport: () => void;
  onUpload: () => void;
  onClose: () => void;
  title: string;
  onTitleChange: (title: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedObject, onUpdate, onDelete, onBringForward, onSendBackward, onAlign, onSave, onExport, onUpload, onClose, title, onTitleChange 
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const isText = selectedObject?.type === 'i-text' || 
                 selectedObject?.type === 'textbox' || 
                 (selectedObject?.type === 'activeSelection' && 
                  selectedObject.getObjects().some((obj: any) => obj.type === 'textbox' || obj.type === 'i-text'));

  const currentTextAlign = React.useMemo(() => {
    if (!selectedObject) return 'left';
    if (selectedObject.type === 'activeSelection') {
      const firstText = selectedObject.getObjects().find((obj: any) => obj.type === 'textbox' || obj.type === 'i-text');
      return firstText?.textAlign || 'left';
    }
    return selectedObject.textAlign || 'left';
  }, [selectedObject]);

  const currentFontWeight = React.useMemo(() => {
    if (!selectedObject) return 'normal';
    if (selectedObject.type === 'activeSelection') {
      const firstText = selectedObject.getObjects().find((obj: any) => obj.type === 'textbox' || obj.type === 'i-text');
      return firstText?.fontWeight || 'normal';
    }
    return selectedObject.fontWeight || 'normal';
  }, [selectedObject]);

  const currentFontStyle = React.useMemo(() => {
    if (!selectedObject) return 'normal';
    if (selectedObject.type === 'activeSelection') {
      const firstText = selectedObject.getObjects().find((obj: any) => obj.type === 'textbox' || obj.type === 'i-text');
      return firstText?.fontStyle || 'normal';
    }
    return selectedObject.fontStyle || 'normal';
  }, [selectedObject]);

  const currentUnderline = React.useMemo(() => {
    if (!selectedObject) return false;
    if (selectedObject.type === 'activeSelection') {
      const firstText = selectedObject.getObjects().find((obj: any) => obj.type === 'textbox' || obj.type === 'i-text');
      return firstText?.underline || false;
    }
    return selectedObject.underline || false;
  }, [selectedObject]);

  const currentFontSize = React.useMemo(() => {
    if (!selectedObject) return 24;
    if (selectedObject.type === 'activeSelection') {
      const firstText = selectedObject.getObjects().find((obj: any) => obj.type === 'textbox' || obj.type === 'i-text');
      return firstText?.fontSize || 24;
    }
    return selectedObject.fontSize || 24;
  }, [selectedObject]);

  const currentFill = React.useMemo(() => {
    if (!selectedObject) return '#000000';
    if (selectedObject.type === 'activeSelection') {
      const firstObj = selectedObject.getObjects()[0];
      return firstObj?.fill || '#000000';
    }
    return selectedObject.fill || '#000000';
  }, [selectedObject]);

  return (
    <div className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-2">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-100 rounded-md text-zinc-500"
          title="Close Editor"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="h-6 w-px bg-zinc-200 mx-2" />
        
        <div className="flex items-center gap-2 mr-4">
          <input 
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-black text-zinc-900 uppercase tracking-tight w-48 focus:ring-2 focus:ring-indigo-100 rounded px-2 py-1"
            placeholder="Magazine Title"
          />
        </div>
        <div className="h-6 w-px bg-zinc-200 mx-2" />
        
        {selectedObject ? (
          <div className="flex items-center gap-1">
            {isText && (
              <>
                <button 
                  onClick={() => onUpdate({ fontWeight: currentFontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentFontWeight === 'bold' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ fontStyle: currentFontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentFontStyle === 'italic' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ underline: !currentUnderline })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentUnderline ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <Underline className="w-4 h-4" />
                </button>
                <div className="h-6 w-px bg-zinc-200 mx-1" />
                <button 
                  onClick={() => onUpdate({ textAlign: 'left' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentTextAlign === 'left' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ textAlign: 'center' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentTextAlign === 'center' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ textAlign: 'right' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentTextAlign === 'right' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onUpdate({ textAlign: 'justify' })}
                  className={`p-2 rounded-md hover:bg-zinc-100 ${currentTextAlign === 'justify' ? 'bg-zinc-100 text-blue-600' : 'text-zinc-600'}`}
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
                <div className="h-6 w-px bg-zinc-200 mx-1" />
                <div className="relative">
                  <button 
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 rounded border border-zinc-200 shadow-sm"
                    style={{ backgroundColor: typeof currentFill === 'string' ? currentFill : '#000000' }}
                  />
                  {showColorPicker && (
                    <div className="absolute top-10 left-0 z-50">
                      <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
                      <ChromePicker 
                        color={typeof currentFill === 'string' ? currentFill : '#000000'} 
                        onChange={(color) => onUpdate({ fill: color.hex })} 
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 border border-zinc-200 rounded px-1">
                  <button 
                    onClick={() => onUpdate({ fontSize: Math.max(1, (currentFontSize || 24) - 1) })}
                    className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <input 
                    type="number"
                    className="w-10 text-xs text-center outline-none bg-transparent"
                    value={currentFontSize}
                    onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 1 })}
                  />
                  <button 
                    onClick={() => onUpdate({ fontSize: (currentFontSize || 24) + 1 })}
                    className="p-1 hover:bg-zinc-100 rounded text-zinc-600"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
                <select 
                  className="text-sm border border-zinc-200 rounded px-2 py-1 outline-none"
                  value={currentFontSize}
                  onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                >
                  {[8, 10, 12, 14, 16, 18, 20, 24, 32, 48, 64, 72, 96, 120].map(size => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </>
            )}
            <div className="h-6 w-px bg-zinc-200 mx-1" />
            <div className="flex items-center gap-1">
              <button onClick={() => onAlign('left')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Left"><AlignStartHorizontal className="w-4 h-4" /></button>
              <button onClick={() => onAlign('center')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Center"><AlignCenterHorizontal className="w-4 h-4" /></button>
              <button onClick={() => onAlign('right')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Right"><AlignEndHorizontal className="w-4 h-4" /></button>
              <button onClick={() => onAlign('top')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Top"><AlignStartVertical className="w-4 h-4" /></button>
              <button onClick={() => onAlign('middle')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Middle"><AlignCenterVertical className="w-4 h-4" /></button>
              <button onClick={() => onAlign('bottom')} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Align Bottom"><AlignEndVertical className="w-4 h-4" /></button>
            </div>
            <div className="h-6 w-px bg-zinc-200 mx-1" />
            <button onClick={onBringForward} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Bring Forward"><ChevronUp className="w-4 h-4" /></button>
            <button onClick={onSendBackward} className="p-2 hover:bg-zinc-100 rounded-md text-zinc-600" title="Send Backward"><ChevronDown className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-md text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="text-sm text-zinc-400 font-medium italic">Select an element to edit</div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={() => onSave(false)}
          className="flex items-center gap-2 px-4 py-1.5 bg-white border border-zinc-200 rounded-md text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <button 
          onClick={() => onSave(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 rounded-md text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save & Close
        </button>
        <button 
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-1.5 bg-white border border-zinc-200 rounded-md text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
        <button 
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-md text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload to Cloud
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
