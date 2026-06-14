import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as fabric from 'fabric';
import { MagazinePage, MagazineData } from '../../types';
import CanvasEditor, { CanvasEditorRef } from './CanvasEditor';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import { Loader2, CheckCircle2, AlertCircle, X, Undo2, Redo2, Upload, Image as ImageIcon, Layout, Play, Save, School, MapPin, Calendar, FileText, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { db, publishDb, collection, doc, setDoc, auth, storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, writeBatch, getDocs, query, orderBy, handleFirestoreError, OperationType, serverTimestamp } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn, dataURLtoBlob } from '../../lib/utils';

interface MagazineEditorProps {
  initialData?: MagazineData | null;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

const MagazineEditor: React.FC<MagazineEditorProps> = ({ initialData, onClose, onSaveSuccess }) => {
  const [pages, setPages] = useState<MagazinePage[]>(initialData?.pages || [
    { id: uuidv4(), fabricData: null }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [title, setTitle] = useState(initialData?.title || 'Magazine Title');
  const [zoom, setZoom] = useState(1);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.thumbnail || null);
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [lastSaved, setLastSaved] = useState<string | null>(initialData?.updatedAt || null);
  const [isDirty, setIsDirty] = useState(false);
  const [isCanvasLoading, setIsCanvasLoading] = useState(false);
  const [isNewMagazine, setIsNewMagazine] = useState(!initialData);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [deletedPageIds, setDeletedPageIds] = useState<string[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMetadata, setUploadMetadata] = useState({
    schoolId: '',
    schoolName: '',
    region: 'National',
    year: new Date().getFullYear()
  });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showInfoInstruction, setShowInfoInstruction] = useState(!initialData);
  const [hasOpenedInfo, setHasOpenedInfo] = useState(false);

  const canvasEditorRef = useRef<CanvasEditorRef>(null);

  // Fetch pages from subcollection if not present or missing data in initialData
  useEffect(() => {
    const fetchPages = async () => {
      const needsFetching = initialData?.id && (
        !initialData.pages || 
        initialData.pages.length === 0 || 
        initialData.pages.some(p => !p.fabricData)
      );

      if (needsFetching) {
        setIsLoadingPages(true);
        try {
          let snapshot;
          try {
            const pagesRef = collection(db, 'temper_magazine', initialData!.id, 'pages');
            const q = query(pagesRef, orderBy('order', 'asc'));
            snapshot = await getDocs(q);
          } catch (e: any) {
            console.log("Note: Could not fetch from 'temper_magazine', trying 'magazines':", e.message);
            const pagesRef = collection(db, 'magazines', initialData!.id, 'pages');
            const q = query(pagesRef, orderBy('order', 'asc'));
            snapshot = await getDocs(q);
          }
          
          if (snapshot && !snapshot.empty) {
            const fetchedPages = snapshot.docs.map(doc => doc.data() as MagazinePage);
            setPages(fetchedPages);
          } else if (initialData?.pages && initialData.pages.length > 0) {
            // If subcollection is empty but we have IDs, maybe it's an old format or error
            // We keep the IDs but they will be empty canvases
            setPages(initialData.pages.map(p => ({ ...p, fabricData: null })));
          }
        } catch (error) {
          console.error("Error fetching pages:", error);
          setStatus({ type: 'error', message: 'Failed to load magazine pages' });
        } finally {
          setIsLoadingPages(false);
        }
      }
    };

    fetchPages();
  }, [initialData]);

  // Automatically apply cover image to first page if it's empty
  useEffect(() => {
    if (currentPageIndex === 0 && coverUrl && !isCanvasLoading && !isLoadingPages) {
      const timer = setTimeout(() => {
        if (canvasEditorRef.current) {
          // Check if canvas is empty or only has margin guides
          const canvas = canvasEditorRef.current.fabricCanvas.current;
          if (canvas) {
            const objects = canvas.getObjects().filter(obj => obj.name !== 'margin-guide');
            if (objects.length === 0) {
              canvasEditorRef.current.addCoverImage(coverUrl);
            }
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentPageIndex, coverUrl, isCanvasLoading, isLoadingPages]);

  useEffect(() => {
    if (pendingCoverUrl && canvasEditorRef.current && !isCanvasLoading && currentPageIndex === 0) {
      // Small delay to ensure canvas is fully ready
      const timer = setTimeout(async () => {
        if (canvasEditorRef.current) {
          await canvasEditorRef.current.addCoverImage(pendingCoverUrl);
          setPendingCoverUrl(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingCoverUrl, isCanvasLoading, currentPageIndex]);

  useEffect(() => {
    if (status.type === 'success') {
      const timer = setTimeout(() => setStatus({ type: null, message: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [status.type]);

  // Sync current page data to state when switching pages
  const saveCurrentPageData = (overrideCoverUrl?: string) => {
    if (canvasEditorRef.current) {
      const json = canvasEditorRef.current.getJson();
      // Only generate thumbnail if we don't have a cover URL and it's the first page
      // or if we specifically need it for page previews.
      // Generating data URLs for every page on every save is expensive.
      const thumbnail = overrideCoverUrl || ((currentPageIndex === 0) 
        ? canvasEditorRef.current.toDataURL({
            format: 'jpeg',
            quality: 0.7,
            multiplier: 0.5 // Better resolution for the cover page
          }) 
        : (pages[currentPageIndex]?.thumbnail || null));
        
      const updatedPages = [...pages];
      
      // Check if data actually changed before setting dirty
      if (updatedPages[currentPageIndex]) {
        const oldData = JSON.stringify(updatedPages[currentPageIndex].fabricData);
        const newData = JSON.stringify(json);
        if (oldData !== newData) {
          setIsDirty(true);
        }

        updatedPages[currentPageIndex] = {
          ...updatedPages[currentPageIndex],
          fabricData: json,
          thumbnail
        };
      }
      setPages(updatedPages);
      return updatedPages;
    }
    return pages;
  };

  const handleCoverChange = async (file: File) => {
    if (isUploadingCover) return;
    
    // Immediate local preview for better UX
    const localUrl = URL.createObjectURL(file);
    setCoverUrl(localUrl);
    setIsDirty(true);

    // If on page 1, apply immediately to canvas
    if (currentPageIndex === 0 && canvasEditorRef.current) {
      await canvasEditorRef.current.addCoverImage(localUrl);
    }

    setIsUploadingCover(true);
    setStatus({ type: null, message: 'Uploading cover...' });
    
    try {
      const storageRef = ref(storage, `magazines/covers/${uuidv4()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setCoverUrl(url);
      
      // Update the thumbnail of page 1 immediately to reflect the new cover
      const updatedPages = [...pages];
      if (updatedPages[0]) {
        updatedPages[0] = { ...updatedPages[0], thumbnail: url };
        setPages(updatedPages);
      }
      
      // If not on page 1, switch to page 1 to show the cover being applied
      if (currentPageIndex !== 0) {
        setPendingCoverUrl(url);
        handleSelectPage(0);
        // The useEffect will handle addCoverImage once the page switches
      } else if (canvasEditorRef.current) {
        // If already on page 1, apply immediately
        try {
          await canvasEditorRef.current.addCoverImage(url);
        } catch (err) {
          console.warn("Failed to add cover to canvas, but URL is saved:", err);
        }
      }
      
      setStatus({ type: 'success', message: 'Cover image updated!' });
    } catch (error: any) {
      console.error("Cover upload error:", error);
      setStatus({ type: 'error', message: 'Failed to upload cover image: ' + (error.message || 'Unknown error') });
    } finally {
      setIsUploadingCover(false);
      // We don't revoke the localUrl immediately because Fabric.js or the UI 
      // might still be referencing it until the remote URL is fully loaded and rendered.
      // The browser will clean it up when the page is closed/refreshed.
    }
  };

  const handleImageUpload = async (file: File) => {
    if (isUploadingImage) return;
    setIsUploadingImage(true);
    setStatus({ type: null, message: 'Optimizing & Uploading image...' });
    
    try {
      // Basic image optimization
      let fileToUpload = file;
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) { // If > 1MB
        try {
          const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              
              // Max dimension 1200px
              const maxDim = 1200;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = (height / width) * maxDim;
                  width = maxDim;
                } else {
                  width = (width / height) * maxDim;
                  height = maxDim;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
              }, 'image/jpeg', 0.7);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
          fileToUpload = new File([optimizedBlob], file.name, { type: 'image/jpeg' });
        } catch (err) {
          console.warn("Image optimization failed, uploading original:", err);
        }
      }

      const storageRef = ref(storage, `magazines/elements/${uuidv4()}_${fileToUpload.name}`);
      const snapshot = await uploadBytes(storageRef, fileToUpload);
      const url = await getDownloadURL(snapshot.ref);
      
      addImageToCorrectPage(url);
      // REMOVED: Status message as per UX fix
      // setStatus({ type: 'success', message: 'Image uploaded!' });
    } catch (error: any) {
      console.error("Image upload error:", error);
      setStatus({ type: 'error', message: 'Failed to upload image: ' + (error.message || 'Unknown error') });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addImageToCorrectPage = (url: string) => {
    if (currentPageIndex === 0) {
      if (pages.length === 1) {
        // Add new page
        const newPage = { id: uuidv4(), fabricData: null };
        const updatedPages = saveCurrentPageData();
        setPages([...updatedPages, newPage]);
        setCurrentPageIndex(1);
        setIsDirty(true);
      } else {
        // Switch to page 2
        handleSelectPage(1);
      }
      
      // Give some time for the canvas to switch and load
      setTimeout(() => {
        canvasEditorRef.current?.addImage(url);
      }, 500);
    } else {
      canvasEditorRef.current?.addImage(url);
    }
  };

  const handleSelectPage = (index: number) => {
    saveCurrentPageData();
    setCurrentPageIndex(index);
    
    // Auto-remove margin from first page if it exists
    if (index === 0) {
      setTimeout(() => {
        canvasEditorRef.current?.removeMargin();
      }, 500);
    }
  };

  const handleAddPage = async () => {
    saveCurrentPageData();
    const newPageId = uuidv4();
    const newPage = { id: newPageId, fabricData: null };
    const newPages = [...pages, newPage];
    setPages(newPages);
    const newIndex = pages.length;
    setCurrentPageIndex(newIndex);
    setIsDirty(true);

    // No default image added to new pages
  };

  const handleDuplicatePage = (index: number) => {
    const updatedPages = saveCurrentPageData();
    const pageToDuplicate = updatedPages[index];
    
    let fabricData = pageToDuplicate.fabricData ? JSON.parse(JSON.stringify(pageToDuplicate.fabricData)) : null;
    
    // If duplicating the cover page, strip the cover image from the new page
    if (index === 0 && fabricData && fabricData.objects) {
      fabricData.objects = fabricData.objects.filter((obj: any) => 
        obj.name !== 'magazine-cover' && obj.name !== 'magazine-cover-bg'
      );
    }

    const newPage = { 
      id: uuidv4(), 
      fabricData,
      thumbnail: index === 0 ? null : (pageToDuplicate.thumbnail || null)
    };
    const finalPages = [...updatedPages];
    finalPages.splice(index + 1, 0, newPage);
    setPages(finalPages);
    setIsDirty(true);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length === 1) return;
    const updatedPages = saveCurrentPageData();
    const pageToDelete = updatedPages[index];
    if (pageToDelete.id) {
      setDeletedPageIds(prev => [...prev, pageToDelete.id]);
    }
    const finalPages = updatedPages.filter((_, i) => i !== index);
    setPages(finalPages);
    if (currentPageIndex >= finalPages.length) {
      setCurrentPageIndex(finalPages.length - 1);
    }
    setIsDirty(true);
  };

  const handleAddText = (type: 'heading' | 'subheading' | 'body') => {
    const options = {
      heading: { fontSize: 48, fontWeight: 'bold', text: 'Add Heading' },
      subheading: { fontSize: 32, fontWeight: 'bold', text: 'Add Subheading' },
      body: { fontSize: 18, fontWeight: 'normal', text: 'Add body text here...' }
    }[type];

    if (currentPageIndex === 0) {
      if (pages.length === 1) {
        const newPage = { id: uuidv4(), fabricData: null };
        const updatedPages = saveCurrentPageData();
        setPages([...updatedPages, newPage]);
        setCurrentPageIndex(1);
        setIsDirty(true);
      } else {
        handleSelectPage(1);
      }
      
      setTimeout(() => {
        canvasEditorRef.current?.addText(options.text, options);
      }, 500);
    } else {
      canvasEditorRef.current?.addText(options.text, options);
    }
  };

  const handleSave = async (closeAfter = false, overrideCoverUrl?: string): Promise<MagazinePage[]> => {
    if (!auth.currentUser) {
      setStatus({ type: 'error', message: 'Please sign in to save your magazine.' });
      return pages;
    }
    
    if (!title.trim()) {
      setStatus({ type: 'error', message: 'Please enter a magazine title.' });
      return pages;
    }

    const updatedPages = saveCurrentPageData(overrideCoverUrl);
    setIsSaving(true);
    setStatus({ type: null, message: 'Saving...' });

    try {
      const magazineId = initialData?.id || uuidv4();
      const userId = auth.currentUser.uid;
      
      // Use the thumbnail of page 1 as the primary source for the magazine thumbnail
      let finalThumbnail = updatedPages[0]?.thumbnail || overrideCoverUrl || coverUrl || '';
      
      // If the thumbnail is a data URL, upload it to Storage to avoid Firestore 1MB limit
      if (finalThumbnail && finalThumbnail.startsWith('data:image')) {
        try {
          const blob = dataURLtoBlob(finalThumbnail);
          const storageRef = ref(storage, `thumbnails/${magazineId}_cover.jpg`);
          await uploadBytes(storageRef, blob);
          finalThumbnail = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error("Failed to upload thumbnail to storage:", uploadErr);
          // Fallback to data URL if upload fails, but it might still hit the limit
        }
      }
      
      // 1. Save Magazine Metadata
      const magazineMetadata: any = {
        id: magazineId,
        title,
        userId,
        pages: updatedPages.map(p => ({
          id: p.id || uuidv4()
        })),
        magazineType: 'static',
        thumbnail: finalThumbnail || null,
        published: initialData?.published ?? false,
        updatedAt: new Date().toISOString(),
        createdAt: initialData?.createdAt ?? new Date().toISOString()
      };

      const sanitizedMetadata = JSON.parse(JSON.stringify(magazineMetadata));

      await setDoc(doc(db, 'temper_magazine', magazineId), sanitizedMetadata);

      // 2. Save each page to the subcollection
      const batch = writeBatch(db);
      updatedPages.forEach((page, index) => {
        const pageRef = doc(db, 'temper_magazine', magazineId, 'pages', page.id);
        const fabricData = page.fabricData ? JSON.parse(JSON.stringify(page.fabricData)) : null;
        
        batch.set(pageRef, {
          id: page.id,
          fabricData,
          order: index
        });
      });

      await batch.commit();

      // 3. Delete pages that were removed
      if (deletedPageIds.length > 0) {
        const deleteBatch = writeBatch(db);
        deletedPageIds.forEach(id => {
          const pageRef = doc(db, 'temper_magazine', magazineId, 'pages', id);
          deleteBatch.delete(pageRef);
        });
        await deleteBatch.commit();
        setDeletedPageIds([]);
      }
      
      setLastSaved(new Date().toISOString());
      setIsDirty(false);
      setStatus({ type: 'success', message: 'Magazine saved successfully!' });
      
      if (closeAfter) {
        setTimeout(() => {
          onClose();
          onSaveSuccess?.();
        }, 1000);
      }
      return updatedPages;
    } catch (error: any) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Failed to save magazine: ' + error.message });
      return updatedPages;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!auth.currentUser || isUploading) return;
    
    if (!title.trim()) {
      setStatus({ type: 'error', message: 'Please enter a magazine title before uploading.' });
      return;
    }

    if (!uploadMetadata.schoolId || !uploadMetadata.schoolName) {
      setStatus({ type: 'error', message: 'Please fill in all school metadata fields.' });
      return;
    }

    setIsUploading(true);
    setIsSaving(true);
    setShowUploadModal(false);
    setUploadProgress(0);
    setStatus({ type: null, message: 'Preparing magazine for upload...' });

    try {
      // 0. Save current state to drafts first to ensure we have the latest data
      setStatus({ type: null, message: 'Saving current draft...' });
      const currentPages = await handleSave(false);

      // 1. Generate PDF
      setStatus({ type: null, message: 'Generating PDF document...' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < currentPages.length; i++) {
        setStatus({ type: null, message: `Processing page ${i + 1} of ${currentPages.length}...` });
        if (i > 0) pdf.addPage();
        
        const canvas = document.createElement('canvas');
        const fabricCanvas = new fabric.StaticCanvas(canvas, {
          width: 595,
          height: 842
        });

        try {
          if (currentPages[i].fabricData) {
            const data = typeof currentPages[i].fabricData === 'string' ? JSON.parse(currentPages[i].fabricData as any) : JSON.parse(JSON.stringify(currentPages[i].fabricData));
            
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

              // First sanitize the object
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
                if (obj.src && obj.src.startsWith('blob:') && obj.originalSrc) {
                  obj.src = obj.originalSrc;
                }

                if (obj.src && !obj.src.startsWith('blob:') && !obj.src.startsWith('data:')) {
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

            try {
              await fabricCanvas.loadFromJSON(data);
              fabricCanvas.renderAll();
              
              let imgData = '';
              try {
                imgData = fabricCanvas.toDataURL({ 
                  format: 'jpeg', 
                  quality: 0.9, 
                  multiplier: 2 
                });
              } catch (taintErr) {
                console.warn(`Fabric PDF: toDataURL failed on page ${i + 1} (tainted), using fallback:`, taintErr);
                imgData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
              }
              
              if (imgData) {
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
              }
            } catch (loadErr) {
              console.error(`Fabric PDF: loadFromJSON failed on page ${i + 1}:`, loadErr);
            }
          }
        } catch (err) {
          console.error(`Error processing page ${i}:`, err);
        } finally {
          fabricCanvas.dispose();
        }
      }

      const pdfBlob = pdf.output('blob');
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error('Generated PDF is empty or invalid.');
      }

      // 2. Upload to Storage
      const timestamp = Date.now();
      const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const storagePath = `magazines/01/${timestamp}_${fileName}.pdf`;
      
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, pdfBlob);

      const pdfUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
            setStatus({ type: null, message: `Uploading PDF: ${Math.round(progress)}%` });
          }, 
          (error) => reject(error), 
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      // 3. Save Metadata to Firestore (Both Databases)
      setStatus({ type: null, message: 'Saving metadata to cloud...' });
      const magazineId = initialData?.id || uuidv4();
      
      // Use the thumbnail of page 1 as the primary source for the magazine thumbnail
      let finalThumbnail = coverUrl || currentPages[0].thumbnail || `https://picsum.photos/seed/${magazineId}/400/600`;
      
      // If the thumbnail is a data URL, upload it to Storage to avoid Firestore 1MB limit
      if (finalThumbnail && finalThumbnail.startsWith('data:image')) {
        try {
          const blob = dataURLtoBlob(finalThumbnail);
          const storageRef = ref(storage, `thumbnails/${magazineId}_published_cover.jpg`);
          await uploadBytes(storageRef, blob);
          finalThumbnail = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error("Failed to upload thumbnail to storage during publish:", uploadErr);
        }
      }

      const magazineDoc = {
        id: magazineId,
        title: title,
        schoolId: uploadMetadata.schoolId,
        schoolName: uploadMetadata.schoolName,
        pdfUrl,
        thumbnail: finalThumbnail,
        region: uploadMetadata.region,
        year: uploadMetadata.year,
        likes: initialData?.likes || 0,
        views: initialData?.views || 0,
        createdAt: initialData?.createdAt ? initialData.createdAt : serverTimestamp(),
        updatedAt: new Date().toISOString(),
        published: true,
        userId: auth.currentUser.uid,
        magazineType: 'static'
      };

      const sanitizedData = JSON.parse(JSON.stringify(magazineDoc));
      if (!initialData?.createdAt) {
        sanitizedData.createdAt = serverTimestamp();
      }

      // Save to publishDb (Public)
      await setDoc(doc(publishDb, 'magazines', magazineId), sanitizedData);
      
      // Update the internal db (Drafts) to mark it as published
      await setDoc(doc(db, 'temper_magazine', magazineId), { ...sanitizedData, published: true }, { merge: true });
      
      // Also update the 'magazines' collection in main db for the upload action
      await setDoc(doc(db, 'magazines', magazineId), { ...sanitizedData, published: true }, { merge: true });
      
      setStatus({ type: 'success', message: 'Magazine uploaded successfully!' });
      setIsDirty(false);
      setUploadProgress(100);
      
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', message: 'Failed to upload: ' + (error.message || 'Unknown error') });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleExportPDF = async () => {
    const updatedPages = saveCurrentPageData();
    setIsExporting(true);
    setStatus({ type: null, message: 'Generating PDF for download...' });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const canvasWidth = 595;
      const canvasHeight = 842;

      for (let i = 0; i < updatedPages.length; i++) {
        if (i > 0) pdf.addPage();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const fCanvas = new fabric.StaticCanvas(tempCanvas);
        
        if (updatedPages[i].fabricData) {
          const data = typeof updatedPages[i].fabricData === 'string' ? JSON.parse(updatedPages[i].fabricData as any) : JSON.parse(JSON.stringify(updatedPages[i].fabricData));
          
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

            // First sanitize the object
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
          
          if (data.backgroundImage && typeof data.backgroundImage === 'object') {
            data.backgroundImage = await preProcessImages(data.backgroundImage);
          }

          await fCanvas.loadFromJSON(data);
        }
        fCanvas.renderAll();
        
        let imgData = '';
        try {
          imgData = fCanvas.toDataURL({ 
            format: 'jpeg', 
            quality: 0.9, 
            multiplier: 2 
          });
        } catch (err) {
          console.error(`Fabric: toDataURL failed on page ${i + 1} during export (possibly tainted):`, err);
          imgData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        }
        
        if (imgData) {
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        }
        await fCanvas.dispose();
      }

      pdf.save(`${title || 'magazine'}.pdf`);
      setStatus({ type: 'success', message: 'PDF downloaded successfully!' });
    } catch (error: any) {
      console.error('Export error:', error);
      setStatus({ type: 'error', message: 'Failed to generate PDF: ' + error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndClose = () => {
    setIsDirty(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    setShowExitConfirm(false);
    await handleSave(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-100 flex flex-col overflow-hidden">
      <AnimatePresence>
        {showInfoInstruction && !hasOpenedInfo && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-24 left-72 z-[60] ml-4"
          >
            <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 relative">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-600 rotate-45" />
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Fill Magazine Info First</p>
                <p className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">Click the Info tab to set your title and cover</p>
              </div>
              <button 
                onClick={() => setShowInfoInstruction(false)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Metadata Modal */}
      <AnimatePresence>
        {showUploadModal && (
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
                  onClick={() => setShowUploadModal(false)}
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
                        "{title}" will be uploaded to the cloud and made available to your school community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50/50 border-t border-zinc-100 flex gap-3">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={!uploadMetadata.schoolId || !uploadMetadata.schoolName || isSaving}
                  className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Confirm & Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Unsaved Changes</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  You have unsaved changes in your magazine. What would you like to do before exiting?
                </p>
              </div>
              <div className="bg-zinc-50 p-6 flex flex-col gap-3">
                <button 
                  onClick={handleSaveAndClose}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save & Exit
                </button>
                <button 
                  onClick={handleDiscardAndClose}
                  className="w-full py-3 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl font-bold text-sm transition-all"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-3 text-zinc-400 hover:text-zinc-600 font-bold text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        <Toolbar 
          selectedObject={selectedObject}
          onUpdate={(options) => {
            canvasEditorRef.current?.updateSelected(options);
            setUpdateTrigger(prev => prev + 1);
          }}
          onDelete={() => canvasEditorRef.current?.deleteSelected()}
          onBringForward={() => canvasEditorRef.current?.bringForward()}
          onSendBackward={() => canvasEditorRef.current?.sendBackward()}
          onAlign={(dir) => canvasEditorRef.current?.align(dir)}
          onSave={(closeAfter) => handleSave(closeAfter)}
          onExport={handleExportPDF}
          onUpload={() => setShowUploadModal(true)}
          onClose={handleClose}
        />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          pages={pages}
          currentPageIndex={currentPageIndex}
          title={title}
          onTitleChange={(newTitle) => {
            setTitle(newTitle);
            setIsDirty(true);
            // REMOVED: Automatic title syncing to canvas
          }}
          coverUrl={coverUrl}
          isUploadingCover={isUploadingCover}
          isUploadingImage={isUploadingImage}
          onCoverChange={handleCoverChange}
          onImageUpload={handleImageUpload}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onSelectPage={handleSelectPage}
          onAddText={handleAddText}
          onAddImage={addImageToCorrectPage}
          onAddMargin={(options) => {
            if (currentPageIndex === 0) {
              setStatus({ type: 'error', message: 'Margins cannot be added to the cover page.' });
              return;
            }
            canvasEditorRef.current?.addMargin(options);
          }}
          onTabChange={(tab) => {
            if (tab === 'settings') {
              setHasOpenedInfo(true);
              // Update thumbnails when switching to info tab to ensure cover preview is fresh
              saveCurrentPageData();
            }
          }}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="h-10 bg-white border-b border-zinc-200 flex items-center px-4 gap-4">
            <input 
              type="text" 
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              className="text-sm font-bold text-zinc-700 outline-none hover:bg-zinc-50 px-2 py-1 rounded transition-colors w-64"
              placeholder="Magazine Title"
            />
            <div className="h-4 w-px bg-zinc-200" />
            <div className="relative">
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => canvasEditorRef.current?.undo()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => canvasEditorRef.current?.redo()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => canvasEditorRef.current?.zoomOut()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => canvasEditorRef.current?.resetZoom()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                title="Fit to Screen"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button 
                onClick={() => canvasEditorRef.current?.zoomIn()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-md transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold text-zinc-400 w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-200" />
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <span>Page {currentPageIndex + 1} of {pages.length}</span>
              {currentPageIndex === 0 && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                  Cover Page
                </span>
              )}
              {lastSaved && (
                <>
                  <div className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-zinc-300">Saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              )}
              {isDirty && (
                <>
                  <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400">Unsaved Changes</span>
                </>
              )}
            </div>
          </div>

          <div className="relative flex-1 overflow-auto bg-zinc-200/50 flex justify-center items-start">
            <CanvasEditor 
              ref={canvasEditorRef}
              pageId={pages[currentPageIndex]?.id}
              initialData={pages[currentPageIndex]?.fabricData}
              onSelect={setSelectedObject}
              onError={(msg) => setStatus({ type: 'error', message: msg })}
              onLoading={setIsCanvasLoading}
              onZoomChange={setZoom}
            />

            {/* Cover Placeholder Overlay Removed */}
          </div>

          {/* Canvas Loading Overlay */}
          {(isCanvasLoading || isLoadingPages) && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                  {isLoadingPages ? 'Loading Magazine Pages...' : 'Loading Page Content...'}
                </p>
              </div>
            </div>
          )}

          {/* Status Overlay */}
          <AnimatePresence>
            {(isSaving || isExporting || status.type) && (
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
                          {isExporting ? 'Exporting PDF' : 'Processing'}
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
        </div>
      </div>
    </div>
  );
};

export default MagazineEditor;
