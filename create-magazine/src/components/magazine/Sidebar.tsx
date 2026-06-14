import React from 'react';
import { 
  Type, Image as ImageIcon, Plus, Copy, Trash2, Layout, 
  ChevronLeft, ChevronRight, FileText, Grid, Ruler, Upload,
  Square, Circle, Triangle, Minus, MousePointer2, Loader2
} from 'lucide-react';
import { MagazinePage } from '../../types';

interface SidebarProps {
  pages: MagazinePage[];
  currentPageIndex: number;
  title: string;
  onTitleChange: (title: string) => void;
  coverUrl: string | null;
  isUploadingCover: boolean;
  isUploadingImage: boolean;
  onCoverChange: (file: File) => void;
  onImageUpload: (file: File) => void;
  onAddPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onSelectPage: (index: number) => void;
  onAddText: (type: 'heading' | 'subheading' | 'body') => void;
  onAddImage: (url: string) => void;
  onAddMargin: (options: { color: string; thickness: number; type: 'solid' | 'dashed' | 'dotted' }) => void;
  onTabChange?: (tab: 'elements' | 'pages' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  pages, currentPageIndex, title, onTitleChange, coverUrl, isUploadingCover, isUploadingImage, onCoverChange, onImageUpload, onAddPage, onDuplicatePage, onDeletePage, onSelectPage, onAddText, onAddImage, onAddMargin, onTabChange 
}) => {
  const [activeTab, setActiveTab] = React.useState<'elements' | 'pages' | 'settings'>('elements');

  const handleTabChange = (tab: 'elements' | 'pages' | 'settings') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [marginOptions, setMarginOptions] = React.useState<{ color: string; thickness: number; type: 'solid' | 'dashed' | 'dotted' }>({
    color: '#000000',
    thickness: 2,
    type: 'solid'
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-zinc-200 flex flex-col h-[calc(100vh-56px)] sticky top-14 z-40">
      <div className="flex border-b border-zinc-100">
        <button 
          onClick={() => handleTabChange('elements')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'elements' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Elements
        </button>
        <button 
          onClick={() => handleTabChange('pages')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'pages' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-400 hover:text-zinc-900'}`}
        >
          Pages ({pages.length})
        </button>
        <button 
          onClick={() => handleTabChange('settings')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-zinc-400 hover:text-zinc-900'}`}
        >
          Info
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'elements' ? (
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Text</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => onAddText('heading')}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-3 text-left group"
                >
                  <div className="w-8 h-8 bg-white rounded border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:text-blue-600 group-hover:border-blue-200">
                    <Type className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Add Heading</div>
                    <div className="text-[10px] text-zinc-500">Large, bold text</div>
                  </div>
                </button>
                <button 
                  onClick={() => onAddText('subheading')}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-3 text-left group"
                >
                  <div className="w-8 h-8 bg-white rounded border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:text-blue-600 group-hover:border-blue-200">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Add Subheading</div>
                    <div className="text-[10px] text-zinc-500">Medium sized text</div>
                  </div>
                </button>
                <button 
                  onClick={() => onAddText('body')}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-3 text-left group"
                >
                  <div className="w-8 h-8 bg-white rounded border border-zinc-200 flex items-center justify-center text-zinc-600 group-hover:text-blue-600 group-hover:border-blue-200">
                    <Type className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Add Body Text</div>
                    <div className="text-[10px] text-zinc-500">Standard paragraph text</div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Margins (1 Inch)</h3>
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Type</label>
                  <div className="flex gap-2">
                    {(['solid', 'dashed', 'dotted'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setMarginOptions({ ...marginOptions, type: t })}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md border transition-all ${
                          marginOptions.type === t 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={marginOptions.color}
                      onChange={(e) => setMarginOptions({ ...marginOptions, color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                    />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{marginOptions.color}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Thickness</label>
                    <span className="text-[9px] font-black text-indigo-600">{marginOptions.thickness}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={marginOptions.thickness}
                    onChange={(e) => setMarginOptions({ ...marginOptions, thickness: parseInt(e.target.value) })}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <button 
                  onClick={() => onAddMargin(marginOptions)}
                  className="w-full py-2.5 bg-zinc-900 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <Ruler className="w-4 h-4" />
                  Apply Margin
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Images</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                  disabled={isUploadingImage}
                  className={`w-full p-6 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group ${isUploadingImage ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-200 hover:border-indigo-400 hover:bg-indigo-50'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isUploadingImage ? 'bg-white text-indigo-500' : 'bg-zinc-50 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-white'}`}>
                    {isUploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-black text-zinc-900 uppercase tracking-tight">{isUploadingImage ? 'Uploading...' : 'Add Image'}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">PNG, JPG up to 5MB</div>
                  </div>
                  <input id="image-upload-input" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploadingImage} />
                </button>
              </div>
            </section>
          </div>
        ) : activeTab === 'pages' ? (
          <div className="space-y-4">
            <button 
              onClick={onAddPage}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add New Page
            </button>

            <div className="space-y-3">
              {pages.map((page, index) => (
                <div 
                  key={page.id}
                  className={`relative group rounded-lg border-2 transition-all ${currentPageIndex === index ? 'border-blue-500 ring-2 ring-blue-100' : 'border-zinc-200 hover:border-zinc-300'}`}
                >
                  <div 
                    onClick={() => onSelectPage(index)}
                    className="aspect-[1/1.41] bg-white rounded-md overflow-hidden cursor-pointer shadow-sm"
                  >
                    {page.thumbnail ? (
                      <img src={page.thumbnail} alt={`Page ${index + 1}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200">
                        <FileText className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 w-6 h-6 bg-zinc-900/80 backdrop-blur text-white text-[10px] font-bold rounded flex items-center justify-center">
                      {index + 1}
                    </div>
                    {index === 0 && (
                      <div className="absolute top-2 left-10 px-2 h-6 bg-indigo-600/90 backdrop-blur text-white text-[8px] font-black uppercase tracking-widest rounded flex items-center justify-center">
                        Cover
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDuplicatePage(index); }}
                      className="p-1.5 bg-white rounded shadow-md text-zinc-600 hover:text-blue-600 hover:bg-blue-50"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeletePage(index); }}
                      className="p-1.5 bg-white rounded shadow-md text-zinc-600 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Magazine Info</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Title</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-indigo-600 outline-none transition-all text-sm font-bold text-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Cover Image</label>
                  <div className="relative group">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onCoverChange(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="aspect-[1.6/1] rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-600 transition-all overflow-hidden relative">
                      {(pages[0]?.thumbnail && pages[0].thumbnail !== 'null') || coverUrl ? (
                        <img src={pages[0].thumbnail || coverUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-zinc-400 group-hover:text-indigo-600" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Change Cover</span>
                        </>
                      )}
                      {pages[0]?.thumbnail && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm py-1 text-center">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">Using Page 1 as Cover</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
