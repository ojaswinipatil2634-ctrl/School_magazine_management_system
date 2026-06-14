import React, { useEffect, useState } from 'react';
import { 
  Plus, Search, Grid, List as ListIcon, Trash2, Edit2, Download, 
  ExternalLink, Clock, FileText, Layout, Play, BookOpen, Loader2,
  MoreVertical, Share2, Copy, Upload, School, MapPin, Calendar, X,
  Check, CheckCircle2, AlertCircle
} from 'lucide-react';
import { cn, dataURLtoBlob } from '../../lib/utils';
import { db, publishDb, collection, getDocs, query, where, orderBy, deleteDoc, doc, auth, storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, setDoc, serverTimestamp, writeBatch } from '../../firebase';
import { MagazineData, MagazinePage } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import * as fabric from 'fabric';

interface MagazineDashboardProps {
  magazines: MagazineData[];
  onEdit: (magazine: MagazineData) => void;
  onCreate: () => void;
  onView: (magazine: MagazineData) => void;
  onUploadInteractive?: (magazine: MagazineData, metadata: any, onProgress: (progress: number) => void) => void;
  filter?: 'all' | 'static' | 'interactive' | 'uploaded';
}

const MagazineDashboard: React.FC<MagazineDashboardProps> = ({ magazines: initialMagazines, onEdit, onCreate, onView, onUploadInteractive, filter = 'all' }) => {
  const [magazines, setMagazines] = useState<MagazineData[]>(initialMagazines);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showingId, setShowingId] = useState<string | null>(null);
  const [previewMagazine, setPreviewMagazine] = useState<MagazineData | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [uploadingMagazine, setUploadingMagazine] = useState<MagazineData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmMagazine, setDeleteConfirmMagazine] = useState<MagazineData | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    schoolId: '',
    schoolName: '',
    region: 'National',
    year: new Date().getFullYear()
  });

  useEffect(() => {
    if (status.type) {
      const timer = setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [status.type]);

  useEffect(() => {
    setMagazines(initialMagazines);
  }, [initialMagazines]);

  const handleDelete = async (magazine: any) => {
    const isStatic = (magazine as any).source === 'design' || magazine.magazineType === 'static';
    
    setLoading(true);
    setStatus({ type: null, message: 'Deleting magazine...' });
    setDeleteConfirmMagazine(null);

    try {
      const deleteBatch = writeBatch(db);

      if (isStatic) {
        // 1. Delete pages subcollection for static magazines (from both possible locations)
        try {
          const pagesRef = collection(db, 'magazines', magazine.id, 'pages');
          const pagesSnapshot = await getDocs(pagesRef);
          pagesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
        } catch (e: any) {
          console.log("Note: Could not fetch pages from 'magazines' for deletion:", e.message);
        }

        try {
          const temperPagesRef = collection(db, 'temper_magazine', magazine.id, 'pages');
          const temperPagesSnapshot = await getDocs(temperPagesRef);
          temperPagesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
        } catch (e: any) {
          console.log("Note: Could not fetch pages from 'temper_magazine' for deletion:", e.message);
        }
      }
      
      // 2. Delete main document from all possible locations
      deleteBatch.delete(doc(db, 'magazines', magazine.id));
      deleteBatch.delete(doc(db, 'temper_magazine', magazine.id));
      deleteBatch.delete(doc(db, 'interactive', magazine.id));
      
      // 3. If published, delete from publishDb too
      if (magazine.published) {
        deleteBatch.delete(doc(publishDb, 'magazines', magazine.id));
      }

      await deleteBatch.commit();
      
      setMagazines(magazines.filter(m => m.id !== magazine.id));
      setStatus({ type: 'success', message: 'Magazine deleted permanently!' });
    } catch (error: any) {
      console.error('Delete error:', error);
      setStatus({ type: 'error', message: 'Failed to delete magazine: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchPages = async (magazineId: string): Promise<MagazinePage[]> => {
    try {
      // Try 'magazines' first
      try {
        const pagesRef = collection(db, 'magazines', magazineId, 'pages');
        const q = query(pagesRef, orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          return snapshot.docs.map(doc => doc.data() as MagazinePage);
        }
      } catch (e: any) {
        // If it's a permission error, it might be because the magazine is in temper_magazine
        // and we don't have permission to read the non-existent path in 'magazines'
        console.log("Note: Could not fetch from 'magazines' collection, will try 'temper_magazine':", e.message);
      }
      
      // Try 'temper_magazine'
      const pagesRef = collection(db, 'temper_magazine', magazineId, 'pages');
      const q = query(pagesRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => doc.data() as MagazinePage);
    } catch (error) {
      console.error("Error fetching pages for PDF:", error);
      return [];
    }
  };

  const generatePDFBlob = async (magazine: MagazineData) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const canvasWidth = 595;
    const canvasHeight = 842;

    // Fetch pages if they are not present (for static magazines stored in subcollections)
    let pagesToProcess = magazine.pages || [];
    if ((magazine as any).source === 'design' && pagesToProcess.length > 0 && !pagesToProcess[0].fabricData) {
      pagesToProcess = await fetchPages(magazine.id);
    }

    for (let i = 0; i < pagesToProcess.length; i++) {
      if (i > 0) pdf.addPage();
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const fCanvas = new fabric.StaticCanvas(tempCanvas);
      
      try {
        if (pagesToProcess[i].fabricData) {
          // Sanitize data before loading to prevent Fabric 7 internal errors
          const rawData = pagesToProcess[i].fabricData;
          const data = typeof rawData === 'string' ? JSON.parse(rawData) : JSON.parse(JSON.stringify(rawData));
          
          // Force current version to avoid legacy loading paths
          data.version = (fabric as any).version || "7.2.0";

          // Pre-process images to ensure they are local blobs before loading to prevent CORS issues
          const preProcessImages = async (obj: any) => {
            if (!obj) return null;
            
            // If it's a string (likely a URL for backgroundImage), convert to object
            if (typeof obj === 'string') {
              if (obj.startsWith('blob:')) return null; // Broken blob
              const bgObj = {
                type: 'image',
                src: obj
              };
              return await preProcessImages(bgObj);
            }

            // First sanitize the object using cleanObject logic
            const standardTypes = ['text', 'textbox', 'i-text', 'image', 'rect', 'circle', 'triangle', 'ellipse', 'line', 'polyline', 'polygon', 'group', 'path'];
            const lowerType = obj.type?.toLowerCase();
            if (standardTypes.includes(lowerType)) {
              obj.type = lowerType;
            }

            const problematicKeys = ['_set', '_init', '_render', '_objects'];
            problematicKeys.forEach(key => {
              if (key in obj) delete obj[key];
            });

            // Then handle image pre-fetching
            if (obj.type === 'image' || obj.src) {
              // Restore original source if it was replaced by a blob URL in a previous session
              if (obj.src && typeof obj.src === 'string' && obj.src.startsWith('blob:')) {
                if (obj.originalSrc) {
                  obj.src = obj.originalSrc;
                } else {
                  // If it's a blob URL but we have no original source, it's a broken reference from a previous session.
                  // We must remove the src to prevent Fabric from attempting to load a non-existent blob,
                  // which causes a fatal internal error in Fabric 7.
                  console.warn("Fabric PDF: Removing broken blob URL without originalSrc:", obj.src);
                  delete obj.src;
                  return null; // Skip this object entirely as it won't render anyway
                }
              }

              if (obj.src && typeof obj.src === 'string' && !obj.src.startsWith('blob:') && !obj.src.startsWith('data:')) {
                // Store original source
                obj.originalSrc = obj.src;
                
                try {
                  // Use cache-busting to avoid issues with cached images without CORS headers
                  const fetchUrl = obj.src.includes('?') ? `${obj.src}&t=${Date.now()}` : `${obj.src}?t=${Date.now()}`;
                  let response = await fetch(fetchUrl, { mode: 'cors' });
                  
                  if (!response.ok) {
                    // Try proxy if direct fetch fails
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(obj.src)}`;
                    response = await fetch(proxyUrl);
                  }

                  if (response.ok) {
                    const blob = await response.blob();
                    obj.src = URL.createObjectURL(blob);
                    obj.crossOrigin = 'anonymous';
                  } else {
                    // If both fail, don't use crossOrigin to allow loading (will taint)
                    console.warn("Fabric PDF: CORS fetch failed for", obj.src, "- Canvas will be tainted");
                    delete obj.crossOrigin;
                  }
                } catch (e) {
                  console.warn("Fabric PDF: Pre-fetch failed for image, trying proxy:", obj.src, e);
                  try {
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(obj.src)}`;
                    const proxyResponse = await fetch(proxyUrl);
                    if (proxyResponse.ok) {
                      const blob = await proxyResponse.blob();
                      obj.src = URL.createObjectURL(blob);
                      obj.crossOrigin = 'anonymous';
                    } else {
                      delete obj.crossOrigin;
                    }
                  } catch (proxyErr) {
                    delete obj.crossOrigin;
                  }
                }
              }
            }

            if (obj.objects && Array.isArray(obj.objects)) {
              const processedObjects = [];
              for (const child of obj.objects) {
                const processed = await preProcessImages(child);
                if (processed) processedObjects.push(processed);
              }
              obj.objects = processedObjects;
              if (obj.type === 'group' && obj.objects.length === 0) return null;
            }

            if (obj.clipPath) {
              obj.clipPath = await preProcessImages(obj.clipPath);
            }

            return obj;
          };

          if (data.objects && Array.isArray(data.objects)) {
            const processedObjects = [];
            for (const obj of data.objects) {
              const processed = await preProcessImages(obj);
              if (processed) processedObjects.push(processed);
            }
            data.objects = processedObjects;
          }
          
          if (data.backgroundImage) {
            data.backgroundImage = await preProcessImages(data.backgroundImage);
          }

          // In Fabric 7, loadFromJSON is async and returns a promise
          try {
            await fCanvas.loadFromJSON(data);
          } catch (loadErr) {
            console.error(`Fabric: Internal loadFromJSON error on page ${i}:`, loadErr);
          }
        }
        fCanvas.renderAll();
        
        let imgData = '';
        try {
          imgData = fCanvas.toDataURL({ 
            format: 'jpeg', 
            quality: 0.9, 
            multiplier: 2.0
          });
        } catch (err) {
          console.error(`Fabric: toDataURL failed on page ${i} during PDF generation (possibly tainted):`, err);
          imgData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }

        if (imgData) {
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }
      } catch (err) {
        console.error(`Fabric: Failed to load page ${i} for PDF:`, err);
        // Add a blank page or some error text to the PDF instead of failing completely
        pdf.text("Error loading page content", 105, 148, { align: 'center' });
      } finally {
        fCanvas.dispose();
      }
    }

    return pdf.output('blob');
  };

  const handleShow = (magazine: MagazineData) => {
    if ((magazine as any).source === 'interactive' || magazine.magazineType === 'interactive') {
      onView(magazine);
      return;
    }
    setPreviewMagazine(magazine);
  };

  const handleReadNow = async (magazine: MagazineData) => {
    if (magazine.pdfUrl) {
      window.open(magazine.pdfUrl, '_blank');
      setPreviewMagazine(null);
      return;
    }

    // Generate local preview
    setShowingId(magazine.id);
    setStatus({ type: null, message: 'Generating preview PDF...' });

    // Open a blank window immediately to avoid popup blocker
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write('<html><body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f4f4f5;font-family:sans-serif;color:#18181b;"><div style="text-align:center;padding:20px;background:white;border-radius:24px;shadow:0 10px 15px -3px rgba(0,0,0,0.1);"><h3 style="margin:0;font-size:1.5rem;font-weight:900;text-transform:uppercase;letter-spacing:-0.025em;">Generating Preview</h3><p style="margin-top:8px;color:#71717a;font-weight:500;">Please wait while we prepare your magazine...</p></div></body></html>');
    }

    try {
      const pdfBlob = await generatePDFBlob(magazine);
      const url = URL.createObjectURL(pdfBlob);
      
      if (newWindow) {
        newWindow.location.href = url;
        setStatus({ type: 'success', message: 'Preview generated!' });
      } else {
        // Fallback if window was blocked anyway
        const link = document.createElement('a');
        link.href = url;
        link.download = `${magazine.title || 'magazine'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus({ type: 'success', message: 'Preview downloaded (popup was blocked)!' });
      }
      
      setPreviewMagazine(null);
    } catch (error: any) {
      console.error('Preview error:', error);
      if (newWindow) newWindow.close();
      setStatus({ type: 'error', message: 'Failed to generate preview: ' + error.message });
    } finally {
      setShowingId(null);
    }
  };

  const handleUpload = async (magazine: MagazineData, metadata: typeof uploadMetadata) => {
    if (!auth.currentUser || isUploading) return;
    setIsUploading(true);
    setUploadingId(magazine.id);
    setUploadingMagazine(null);
    setUploadProgress(0);
    setStatus({ type: null, message: 'Preparing magazine for upload...' });

    try {
      // 1. Generate PDF
      setStatus({ type: null, message: 'Generating PDF document...' });
      const pdfBlob = await generatePDFBlob(magazine);
      console.log('PDF Generation Complete:', {
        size: pdfBlob?.size,
        type: pdfBlob?.type,
        magazineId: magazine.id
      });

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF is empty or invalid.');
      }

      // 2. Upload to Storage with Progress Tracking
      const timestamp = Date.now();
      const fileName = magazine.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const storagePath = `magazines/01/${timestamp}_${fileName}.pdf`;
      
      console.log('Starting Upload:', {
        path: storagePath,
        schoolId: metadata.schoolId,
        fileName: fileName
      });

      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, pdfBlob);

      const pdfUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload Progress: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
            setUploadProgress(Math.round(progress));
            setStatus({ type: null, message: `Uploading PDF: ${Math.round(progress)}%` });
          }, 
          (error) => {
            console.error('Upload task error:', error);
            reject(error);
          }, 
          async () => {
            console.log('Upload Successful, getting download URL...');
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Download URL obtained:', downloadURL);
              resolve(downloadURL);
            } catch (err) {
              console.error('Error getting download URL:', err);
              reject(err);
            }
          }
        );
      });

      // 3. Update Firestore with structured metadata (Publishing Database)
      setStatus({ type: null, message: 'Saving metadata to publishing database...' });
      // Use the thumbnail of page 1 as the primary source for the magazine thumbnail
      let finalThumbnail = magazine.thumbnail || `https://picsum.photos/seed/${magazine.id}/400/600`;
      
      // If the thumbnail is a data URL, upload it to Storage to avoid Firestore 1MB limit
      if (finalThumbnail && finalThumbnail.startsWith('data:image')) {
        try {
          const blob = dataURLtoBlob(finalThumbnail);
          const storageRef = ref(storage, `thumbnails/${magazine.id}_published_cover.jpg`);
          await uploadBytes(storageRef, blob);
          finalThumbnail = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error("Failed to upload thumbnail to storage during dashboard publish:", uploadErr);
        }
      }

      const magazineDoc: MagazineData = {
        ...magazine,
        id: magazine.id,
        title: magazine.title,
        userId: auth.currentUser.uid,
        pdfUrl,
        thumbnail: finalThumbnail,
        published: true,
        updatedAt: new Date().toISOString(),
        createdAt: magazine.createdAt || new Date().toISOString(),
        schoolId: metadata.schoolId,
        schoolName: metadata.schoolName,
        region: metadata.region,
        year: metadata.year,
        likes: magazine.likes || 0,
        views: magazine.views || 0,
        magazineType: 'static'
      };

      // Remove source property if it exists
      const { source, ...sanitizedData } = magazineDoc as any;
      
      // Ensure createdAt is a timestamp if it's new
      if (!magazine.createdAt) {
        sanitizedData.createdAt = serverTimestamp();
      }

      // Save to publishDb
      await setDoc(doc(publishDb, 'magazines', magazine.id), sanitizedData);
      
      // Update temper_magazine to mark it as published
      await setDoc(doc(db, 'temper_magazine', magazine.id), { ...sanitizedData, published: true }, { merge: true });
      
      // Also update the 'magazines' collection in main db for the upload action
      await setDoc(doc(db, 'magazines', magazine.id), { ...sanitizedData, published: true }, { merge: true });
      
      setStatus({ type: 'success', message: 'Magazine uploaded successfully!' });
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload: ' + (error.message || 'Unknown error');
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Upload failed: Permission denied. Please check storage rules.';
      }
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setUploadingId(null);
      setIsUploading(false);
    }
  };

  const filteredMagazines = magazines.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const isInteractive = (m as any).source === 'interactive' || m.magazineType === 'interactive';
    const isStatic = (m as any).source === 'design' || m.magazineType === 'static';
    const isUploaded = (m as any).source === 'uploaded' || m.magazineType === 'uploaded';
    
    // Draft logic for static magazines
    const isDraft = m.isDraft === true;

    if (filter === 'static') {
      return matchesSearch && isStatic && !isDraft;
    }
    if (filter === 'interactive') {
      return matchesSearch && isInteractive;
    }
    if (filter === 'uploaded') {
      return matchesSearch && isUploaded;
    }
    
    // In "All" view, hide uploaded magazines from the main feed to keep it clean
    // or show them if requested. The user asked for an "uploaded magazine section".
    return matchesSearch && (!isStatic || !isDraft) && !isUploaded;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">
            {filter === 'static' ? 'Static Magazines' : filter === 'interactive' ? 'Interactive Magazines' : filter === 'uploaded' ? 'Uploaded Magazines' : 'My Magazines'}
          </h2>
          <p className="text-zinc-500">
            {filter === 'uploaded' 
              ? 'Manage your uploaded PDF publications.' 
              : `Design, export, and manage your ${filter === 'all' ? 'interactive' : filter} publications.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search magazines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
            />
          </div>
          <div className="flex bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          {filter === 'uploaded' && (
            <button
              onClick={() => (window as any).setView('upload')}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-100 font-black uppercase tracking-widest text-[10px]"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
          )}
          {filter !== 'uploaded' && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-100 font-black uppercase tracking-widest text-[10px]"
            >
              <Plus className="w-4 h-4" />
              {filter === 'interactive' ? 'Create Interactive Magazine' : filter === 'static' ? 'Design Static Magazine' : 'Create New'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[1/1.41] bg-zinc-50 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredMagazines.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" : "space-y-4"}>
          {filteredMagazines.map((magazine) => (
            <motion.div 
              key={magazine.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={viewMode === 'grid' ? "group bg-white rounded-3xl border border-zinc-100 overflow-hidden hover:shadow-2xl transition-all flex flex-col" : "bg-white p-5 rounded-3xl border border-zinc-100 flex items-center justify-between hover:shadow-xl transition-all"}
            >
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-[1/1.41] bg-zinc-50 relative overflow-hidden">
                    {magazine.thumbnail ? (
                      <img 
                        src={magazine.thumbnail} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200">
                        <FileText className="w-20 h-20 opacity-20" />
                      </div>
                    )}
                      <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button 
                          onClick={() => handleShow(magazine)}
                          disabled={showingId === magazine.id}
                          className="p-3 bg-white rounded-xl text-zinc-900 hover:bg-indigo-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 shadow-xl disabled:opacity-50"
                          title="Show"
                        >
                          {showingId === magazine.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </button>
                        
                        {magazine.magazineType !== 'uploaded' && (
                          <>
                            {(magazine as any).source === 'design' && (
                              <button 
                                onClick={() => setUploadingMagazine(magazine)}
                                disabled={uploadingId === magazine.id}
                                className="p-3 bg-white rounded-xl text-zinc-900 hover:bg-green-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 delay-75 shadow-xl disabled:opacity-50"
                                title="Upload to Cloud"
                              >
                                {uploadingId === magazine.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              </button>
                            )}
                            {((magazine as any).source === 'interactive' || magazine.magazineType === 'interactive') && onUploadInteractive && (
                              <button 
                                onClick={() => setUploadingMagazine(magazine)}
                                className="p-3 bg-white rounded-xl text-zinc-900 hover:bg-indigo-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 delay-75 shadow-xl"
                                title="Upload"
                              >
                                <Upload className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => onEdit(magazine)}
                              className="p-3 bg-white rounded-xl text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 delay-100 shadow-xl"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {deleteConfirmMagazine?.id === magazine.id ? (
                          <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 delay-150">
                            <button 
                              onClick={() => handleDelete(magazine)}
                              className="p-3 bg-red-600 rounded-xl text-white hover:bg-red-700 transition-all shadow-xl"
                              title="Confirm Delete"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmMagazine(null)}
                              className="p-3 bg-zinc-900 rounded-xl text-white hover:bg-zinc-800 transition-all shadow-xl"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmMagazine(magazine)}
                            className="p-3 bg-white rounded-xl text-zinc-900 hover:bg-red-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 delay-150 shadow-xl"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-black text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1 text-lg tracking-tight">
                        {magazine.title}
                      </h3>
                      {magazine.published && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest flex-shrink-0">
                          Published
                        </span>
                      )}
                    </div>
                    {magazine.schoolName && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                        <School className="w-3 h-3" />
                        {magazine.schoolName} {magazine.region ? `• ${magazine.region}` : ''}
                      </div>
                    )}
                    {magazine.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3 leading-relaxed">
                        {magazine.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(magazine.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layout className="w-3 h-3" />
                        {(magazine as any).source === 'interactive' ? 'Interactive' : `${magazine.pages?.length || 0} Pages`}
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-zinc-50 flex gap-2">
                      <button 
                        onClick={() => handleShow(magazine)}
                        disabled={showingId === magazine.id}
                        className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {showingId === magazine.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Show
                      </button>
                      
                      {magazine.magazineType !== 'uploaded' && (
                        <>
                          {(magazine as any).source === 'design' && (
                            <button 
                              onClick={() => setUploadingMagazine(magazine)}
                              disabled={uploadingId === magazine.id}
                              className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-green-600 hover:bg-green-50 rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {uploadingId === magazine.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Upload
                            </button>
                          )}
                          {((magazine as any).source === 'interactive' || magazine.magazineType === 'interactive') && onUploadInteractive && (
                            <button 
                              onClick={() => setUploadingMagazine(magazine)}
                              className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all flex items-center justify-center gap-1.5"
                            >
                              <Upload className="w-3 h-3" />
                              Upload
                            </button>
                          )}
                          <button 
                            onClick={() => onEdit(magazine)}
                            className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 rounded-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-20 bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden shadow-sm">
                      {magazine.thumbnail && <img src={magazine.thumbnail} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-black text-zinc-900 text-lg tracking-tight">{magazine.title}</h3>
                        {magazine.published && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                            Published
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1.5">
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(magazine.updatedAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1.5"><Layout className="w-3 h-3" /> {magazine.pages?.length || 0} Pages</span>
                      </div>
                      {magazine.description && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-1">
                          {magazine.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {magazine.magazineType !== 'uploaded' && (
                      <>
                        {(magazine as any).source === 'design' && (
                          <button 
                            onClick={() => setUploadingMagazine(magazine)}
                            disabled={uploadingId === magazine.id}
                            className="p-3 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                            title="Upload to Cloud"
                          >
                            {uploadingId === magazine.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                          </button>
                        )}
                        {((magazine as any).source === 'interactive' || magazine.magazineType === 'interactive') && onUploadInteractive && (
                          <button 
                            onClick={() => setUploadingMagazine(magazine)}
                            className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Upload"
                          >
                            <Upload className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      onClick={() => handleShow(magazine)}
                      disabled={showingId === magazine.id}
                      className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
                      title="Show"
                    >
                      {showingId === magazine.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                    </button>
                    {magazine.magazineType !== 'uploaded' && (
                      <button 
                        onClick={() => onEdit(magazine)}
                        className="p-3 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {deleteConfirmMagazine?.id === magazine.id ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDelete(magazine)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Confirm Delete"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmMagazine(null)}
                          className="p-3 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirmMagazine(magazine)}
                        className="p-3 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[40px] border-2 border-dashed border-zinc-100">
          <div className="w-28 h-28 bg-zinc-50 rounded-full flex items-center justify-center mb-8">
            <BookOpen className="w-14 h-14 text-zinc-200" />
          </div>
          <h3 className="text-3xl font-black text-zinc-900 mb-3 tracking-tight">
            {filter === 'static' ? 'No static magazines yet' : filter === 'interactive' ? 'No interactive magazines yet' : filter === 'uploaded' ? 'No uploaded magazines yet' : 'No magazines yet'}
          </h3>
          <p className="text-zinc-400 max-w-xs text-center mb-10 font-medium">
            {filter === 'static' 
              ? 'Start your first design project and create beautiful digital magazines for your school.' 
              : filter === 'interactive' 
              ? 'Create engaging interactive books with crosswords, quizzes, and more.' 
              : filter === 'uploaded'
              ? 'Upload your pre-designed PDF magazines to share them with the community.'
              : 'Start your first project and create beautiful publications for your school.'}
          </p>
          {filter === 'uploaded' ? (
            <button
              onClick={() => (window as any).setView('upload')}
              className="px-10 py-4 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-200 hover:opacity-90 transition-all transform hover:scale-105 flex items-center gap-3"
            >
              <Upload className="w-5 h-5" />
              Upload Your First PDF Magazine
            </button>
          ) : (
            <button
              onClick={onCreate}
              className="px-10 py-4 bg-gradient-to-r from-[#00c4cc] to-[#7d2ae8] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-200 hover:opacity-90 transition-all transform hover:scale-105"
            >
              {filter === 'static' ? 'Create Your First Static Magazine' : filter === 'interactive' ? 'Create Your First Interactive Magazine' : 'Create Your First Magazine'}
            </button>
          )}
        </div>
      )}

      {/* Upload Metadata Modal */}
      <AnimatePresence>
        {uploadingMagazine && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Upload Magazine</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cloud Distribution</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUploadingMagazine(null)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">School ID</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text"
                        value={uploadMetadata.schoolId}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, schoolId: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                        placeholder="e.g. SCH-001"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">School Name</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text"
                        value={uploadMetadata.schoolName}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, schoolName: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                        placeholder="e.g. St. Xavier's"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Region</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <select 
                        value={uploadMetadata.region}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, region: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all appearance-none"
                      >
                        <option value="National">National</option>
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="number"
                        value={uploadMetadata.year}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-0.5">Ready to Publish</p>
                      <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed uppercase tracking-tighter">
                        "{uploadingMagazine.title}" will be uploaded to the cloud and made available to your school community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50/50 border-t border-zinc-100 flex gap-3">
                <button 
                  onClick={() => setUploadingMagazine(null)}
                  className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (uploadingMagazine.magazineType === 'interactive' || (uploadingMagazine as any).source === 'interactive') {
                      setIsUploading(true);
                      setUploadingId(uploadingMagazine.id);
                      setUploadProgress(0);
                      setStatus({ type: null, message: 'Uploading interactive magazine...' });
                      
                      onUploadInteractive?.(uploadingMagazine, uploadMetadata, (progress) => {
                        setUploadProgress(progress);
                        if (progress === 100) {
                          setTimeout(() => {
                            setIsUploading(false);
                            setUploadingMagazine(null);
                          }, 1000);
                        }
                      });
                    } else {
                      handleUpload(uploadingMagazine, uploadMetadata);
                    }
                  }}
                  disabled={!uploadMetadata.schoolId || !uploadMetadata.schoolName}
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Confirm & Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Overlay */}
      <AnimatePresence>
        {(uploadingId || showingId || status.type) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
            >
              {status.type === 'success' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Success!</h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1">{status.message}</p>
                  </div>
                </div>
              ) : status.type === 'error' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Error</h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1">{status.message}</p>
                  </div>
                  <button 
                    onClick={() => setStatus({ type: null, message: '' })}
                    className="mt-2 px-6 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-black text-indigo-600">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">
                      {showingId ? 'Generating Preview' : 'Processing'}
                    </h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1">{status.message}</p>
                  </div>
                  
                  {uploadProgress > 0 && (
                    <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-indigo-600"
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmMagazine && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-zinc-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight">Delete Magazine?</h3>
              <p className="text-zinc-500 font-medium mb-8 leading-relaxed">
                Are you sure you want to delete <span className="text-zinc-900 font-bold">"{deleteConfirmMagazine.title}"</span> permanently? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmMagazine(null)}
                  className="flex-1 py-4 px-6 bg-zinc-50 text-zinc-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmMagazine)}
                  className="flex-1 py-4 px-6 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Magazine Preview Side Panel */}
      <AnimatePresence>
        {previewMagazine && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewMagazine(null)}
              className="fixed inset-0 z-[300] bg-zinc-900/20 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[301] w-full max-w-2xl max-h-[90vh] bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Magazine Preview</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Digital Edition</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewMagazine(null)}
                  className="p-2 hover:bg-zinc-200 rounded-xl transition-colors text-zinc-400 hover:text-zinc-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="aspect-[1/1.41] relative bg-zinc-50 rounded-[32px] overflow-hidden shadow-2xl border border-zinc-100 group">
                    {previewMagazine.thumbnail ? (
                      <img 
                        src={previewMagazine.thumbnail} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-200">
                        <FileText className="w-24 h-24 opacity-20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex flex-col justify-center space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-3xl font-black text-zinc-900 tracking-tight leading-tight">{previewMagazine.title}</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {(previewMagazine as any).source === 'interactive' ? 'Interactive' : 'Static'}
                        </span>
                        <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {previewMagazine.pages?.length || 0} Pages
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Updated</span>
                          </div>
                          <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
                            {new Date(previewMagazine.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {previewMagazine.schoolName && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <School className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">School</span>
                            </div>
                            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest truncate max-w-[150px]">
                              {previewMagazine.schoolName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        onClick={() => handleReadNow(previewMagazine)}
                        disabled={showingId === previewMagazine.id}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
                      >
                        {showingId === previewMagazine.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                        Read Content
                      </button>
                      {(previewMagazine as any).source === 'design' && (
                        <button 
                          onClick={() => {
                            setPreviewMagazine(null);
                            onEdit(previewMagazine);
                          }}
                          className="w-full py-5 bg-white border-2 border-zinc-100 text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-50 transition-all flex items-center justify-center gap-3"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Magazine
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MagazineDashboard;
