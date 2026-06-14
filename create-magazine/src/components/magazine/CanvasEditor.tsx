import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as fabric from 'fabric';

interface CanvasEditorProps {
  pageId?: string;
  initialData?: any;
  onSelect?: (obj: fabric.Object | null) => void;
  onError?: (message: string) => void;
  onLoading?: (isLoading: boolean) => void;
  onZoomChange?: (zoom: number) => void;
}

export interface CanvasEditorRef {
  fabricCanvas: React.RefObject<fabric.Canvas | null>;
  addText: (text?: string, options?: any) => void;
  updateMagazineTitle: (title: string) => void;
  addImage: (url: string) => void;
  addCoverImage: (url: string) => Promise<void>;
  addPlaceholder: (text: string, options?: any) => void;
  getJson: () => any;
  loadJson: (json: any) => void;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  align: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  updateSelected: (options: any) => void;
  addMargin: (options: { color: string; thickness: number; type: 'solid' | 'dashed' | 'dotted' }) => void;
  removeMargin: () => void;
  toDataURL: (options?: any) => string;
  undo: () => void;
  redo: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getZoom: () => number;
}

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(({ 
  pageId, initialData, onSelect, onError, onLoading, onZoomChange 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const isProcessingStack = useRef(false);
  const isLoading = useRef(false);

  // Helper to sanitize Fabric JSON by ensuring compatibility and removing problematic properties
  const sanitizeFabricJson = (json: any) => {
    if (!json) return json;
    try {
      // Deep clone to avoid modifying original
      const data = typeof json === 'string' ? JSON.parse(json) : JSON.parse(JSON.stringify(json));
      
      // Force current version to avoid legacy loading paths that might be buggy
      data.version = (fabric as any).version || "7.2.0";

      // Ensure objects array exists
      if (!data.objects) data.objects = [];

      const cleanObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;

        // Ensure type exists and is valid
        if (!obj.type || typeof obj.type !== 'string') return null;

        // Normalize type to lowercase for standard Fabric objects
        const standardTypes = ['text', 'textbox', 'i-text', 'image', 'rect', 'circle', 'triangle', 'ellipse', 'line', 'polyline', 'polygon', 'group', 'path'];
        const lowerType = obj.type.toLowerCase();
        if (standardTypes.includes(lowerType)) {
          obj.type = lowerType;
        }

        // Exclude margin guides from saved data
        if ((obj as any).name === 'margin-guide') return null;

        // Restore original source if it was replaced by a blob URL
        if (obj.type === 'image' && obj.originalSrc) {
          obj.src = obj.originalSrc;
          // Keep originalSrc for future loads/saves
        }

        // Remove problematic internal properties

        // Recursively clean nested structures
        if (obj.objects && Array.isArray(obj.objects)) {
          obj.objects = obj.objects.map(cleanObject).filter(Boolean);
          // If a group has no objects, it might be invalid
          if (obj.type === 'group' && obj.objects.length === 0) return null;
        }
        
        if (obj.clipPath) {
          obj.clipPath = cleanObject(obj.clipPath);
        }

        return obj;
      };

      // Sanitize background image
      if (data.backgroundImage) {
        if (typeof data.backgroundImage === 'string') {
          if (data.backgroundImage.startsWith('blob:')) {
            delete data.backgroundImage;
          }
        } else {
          data.backgroundImage = cleanObject(data.backgroundImage);
        }
      }
      
      // Sanitize objects
      if (Array.isArray(data.objects)) {
        data.objects = data.objects.map(cleanObject).filter(Boolean);
      }
      
      return data;
    } catch (err) {
      console.warn("Fabric: Failed to sanitize JSON:", err);
      return json;
    }
  };

  // Helper to pre-process images in Fabric JSON to ensure they are local blobs
  const preProcessImages = async (json: any) => {
    if (!json) return json;
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : JSON.parse(JSON.stringify(json));
      
      const processObject = async (obj: any) => {
        if (!obj) return;
        if (obj.type === 'image' || (typeof obj === 'object' && obj.src)) {
          // If it's a blob URL from a previous session, it's broken. 
          // If we have originalSrc, restore it.
          if (obj.src && typeof obj.src === 'string' && obj.src.startsWith('blob:')) {
            if (obj.originalSrc) {
              obj.src = obj.originalSrc;
            } else {
              // Broken blob without original source - remove it to prevent Fabric crash
              console.warn("Fabric: Removing broken blob URL without originalSrc in JSON:", obj.src);
              delete obj.src;
              // We can't easily remove the object from the parent array here without more complex logic,
              // but removing the src will at least prevent the fatal loading error.
              return;
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
                // If both fail, don't use crossOrigin to avoid total load failure
                delete obj.crossOrigin;
              }
            } catch (e) {
              console.warn("Fabric: Pre-fetch failed for image in JSON, trying proxy:", obj.src, e);
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
          await Promise.all(obj.objects.map(processObject));
        }
        if (obj.clipPath) {
          await processObject(obj.clipPath);
        }
      };

      if (data.objects && Array.isArray(data.objects)) {
        await Promise.all(data.objects.map(processObject));
      }
      
      if (data.backgroundImage) {
        if (typeof data.backgroundImage === 'string') {
          // Convert string background to object and process it
          const bgObj = { type: 'image', src: data.backgroundImage };
          await processObject(bgObj);
          data.backgroundImage = bgObj;
        } else if (typeof data.backgroundImage === 'object') {
          await processObject(data.backgroundImage);
        }
      }
      
      return data;
    } catch (err) {
      console.warn("Fabric: Failed to pre-process images:", err);
      return json;
    }
  };

  const saveState = () => {
    if (!fabricCanvas.current || (fabricCanvas.current as any).isDisposed || isProcessingStack.current || isLoading.current) return;
    try {
      // Ensure canvas has context before attempting to export JSON
      const canvas = fabricCanvas.current;
      if (!(canvas as any).getContext?.()) return;
      
      // Use the same robust logic as getJson
      const objects = canvas.getObjects();
      const validObjects = objects.filter(obj => obj && typeof obj.toObject === 'function');
      
      let json;
      try {
        // In Fabric 7, we can pass properties to include in the output
        json = canvas.toJSON(['originalSrc', 'name']);
      } catch (e) {
        // Fallback if toJSON fails
        json = {
          version: (fabric as any).version || "7.2.0",
          objects: validObjects.map(obj => {
            try { return obj.toObject(['originalSrc', 'name']); } catch (err) { return null; }
          }).filter(Boolean),
          background: canvas.backgroundColor
        };
      }

      const sanitized = sanitizeFabricJson(json);
      const jsonStr = JSON.stringify(sanitized);
      
      // Only push if different from last state
      if (undoStack.current.length > 0 && undoStack.current[undoStack.current.length - 1] === jsonStr) {
        return;
      }

      undoStack.current.push(jsonStr);
      if (undoStack.current.length > 50) undoStack.current.shift(); // Limit history
      redoStack.current = []; // Clear redo stack on new action
    } catch (err) {
      console.warn("Fabric: Failed to save state:", err);
    }
  };

  const [zoom, setZoom] = useState(1);

  const isManualZoom = useRef(false);

  const fitToContainer = (width?: number, height?: number) => {
    if (!fabricCanvas.current || !containerRef.current) return;
    
    // If user has manually zoomed, don't override it with auto-fit
    if (isManualZoom.current && !width && !height) return;
    if (isManualZoom.current && width && height) {
      // Even if manual, we might want to re-render or something? 
      // Actually, let's just stick to manual zoom until reset.
      return;
    }

    const container = containerRef.current;
    const canvas = fabricCanvas.current;
    
    // We want to fit the 595x842 canvas into the container
    // Subtract padding (p-12 = 48px each side = 96px total)
    const padding = 96;
    const availableWidth = (width || container.clientWidth) - padding;
    const availableHeight = (height || container.clientHeight) - padding;
    
    if (availableWidth <= 0 || availableHeight <= 0) return;

    // A4 aspect ratio is ~1.414
    // We want to fit the entire page into the container
    const scaleX = availableWidth / 595;
    const scaleY = availableHeight / 842;
    
    // To show the ENTIRE page, we use the smaller scale
    let scale = Math.min(scaleX, scaleY);
    
    // But let's keep a minimum scale so it's not too small
    scale = Math.max(scale, 0.05);
    
    // And a maximum scale for quality
    scale = Math.min(scale, 5.0);

    canvas.setZoom(scale);
    canvas.setDimensions({
      width: 595 * scale,
      height: 842 * scale
    });
    setZoom(scale);
    onZoomChange?.(scale);
    canvas.renderAll();
  };

  const handleZoom = (newZoom: number) => {
    if (!fabricCanvas.current) return;
    isManualZoom.current = true;
    const canvas = fabricCanvas.current;
    const scale = Math.min(Math.max(newZoom, 0.05), 5.0);
    
    canvas.setZoom(scale);
    canvas.setDimensions({
      width: 595 * scale,
      height: 842 * scale
    });
    setZoom(scale);
    onZoomChange?.(scale);
    canvas.renderAll();
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      window.requestAnimationFrame(() => {
        fitToContainer(width, height);
      });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 595, 
      height: 842, 
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    // Initial fit
    setTimeout(fitToContainer, 100);

    const SNAP_THRESHOLD = 10;

    // Alignment Guides / Snapping Logic
    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      const centerX = canvas.width! / 2;
      const centerY = canvas.height! / 2;

      // Horizontal Snapping to Center
      if (Math.abs(obj.getCenterPoint().x - centerX) < SNAP_THRESHOLD) {
        obj.set({
          left: centerX,
        });
        obj.setCoords();
      }

      // Vertical Snapping to Center
      if (Math.abs(obj.getCenterPoint().y - centerY) < SNAP_THRESHOLD) {
        obj.set({
          top: centerY,
        });
        obj.setCoords();
      }
    });

    canvas.on('selection:created', (e) => onSelect?.(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => onSelect?.(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => onSelect?.(null));

    // Save state on changes
    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    return () => {
      if (fabricCanvas.current) {
        (fabricCanvas.current as any).isDisposed = true;
        fabricCanvas.current.dispose();
        fabricCanvas.current = null;
      }
    };
  }, []);

  const lastLoadedPageId = useRef<string | null>(null);
  const lastLoadedJson = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const loadInitial = async () => {
      const canvas = fabricCanvas.current;
      if (!canvas || (canvas as any).isDisposed || !(canvas as any).getContext?.()) return;

      if (isLoading.current) return;
      
      const jsonStr = initialData ? JSON.stringify(initialData) : null;
      // If we are switching to a new page, or the data changed, we must reload
      if (pageId === lastLoadedPageId.current && jsonStr === lastLoadedJson.current) return;

      isLoading.current = true;
      onLoading?.(true);
      console.log(`CanvasEditor: Loading page ${pageId}...`);

      try {
        if (initialData) {
          if (isCancelled || (canvas as any).isDisposed) return;
          
          const sanitizedData = sanitizeFabricJson(initialData);
          const processedData = await preProcessImages(sanitizedData);
          
          if (isCancelled || (canvas as any).isDisposed) return;

          try {
            // Ensure canvas is still valid before loading
            if (!(canvas as any).isDisposed) {
              await canvas.loadFromJSON(processedData);
            }
          } catch (loadErr) {
            console.error("Fabric: loadFromJSON internal error:", loadErr);
            // If it fails, try to load an empty state to avoid a broken canvas
            if (!(canvas as any).isDisposed) {
              canvas.clear();
              canvas.backgroundColor = '#ffffff';
            }
          }
          
          lastLoadedJson.current = jsonStr;
          lastLoadedPageId.current = pageId || null;
        } else {
          if (isCancelled || (canvas as any).isDisposed) {
            isLoading.current = false;
            return;
          }
          
          canvas.clear();
          canvas.backgroundColor = '#ffffff';
          lastLoadedJson.current = null;
          lastLoadedPageId.current = pageId || null;
        }
        
        if (!isCancelled && !(canvas as any).isDisposed) {
          canvas.renderAll();
          isLoading.current = false;
          onLoading?.(false);
          saveState();
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Fabric: Error loading initial data:", err);
        }
      } finally {
        isLoading.current = false;
        onLoading?.(false);
      }
    };
    loadInitial();
    return () => {
      isCancelled = true;
    };
  }, [initialData, pageId]);

  useImperativeHandle(ref, () => ({
    fabricCanvas,
    addText: (text = 'Type something...', options = {}) => {
      if (!fabricCanvas.current) return;
      const textObj = new fabric.Textbox(text, {
        fontFamily: 'Inter',
        fontSize: 24,
        fill: '#000000',
        width: 200,
        ...options,
      });
      fabricCanvas.current?.add(textObj);
      fabricCanvas.current?.centerObject(textObj);
      fabricCanvas.current?.setActiveObject(textObj);
      fabricCanvas.current?.renderAll();
    },
    updateMagazineTitle: (title: string) => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      
      // Find existing title
      const existingTitle = canvas.getObjects().find(obj => (obj as any).name === 'magazine-title') as fabric.Textbox;
      
      if (existingTitle) {
        existingTitle.set({ text: title });
      } else {
        const textObj = new fabric.Textbox(title, {
          fontSize: 64,
          fontWeight: 'bold',
          top: 120,
          left: 595 / 2,
          originX: 'center',
          textAlign: 'center',
          width: 500,
          name: 'magazine-title',
          selectable: true,
          hasControls: true,
          charSpacing: 100,
          fontFamily: 'Inter'
        });
        canvas.add(textObj);
      }
      canvas.renderAll();
      saveState();
    },
    addImage: async (url: string) => {
      if (!fabricCanvas.current) return;
      
      try {
        let finalUrl = url;
        let originalUrl = url;
        let crossOrigin: string | undefined = 'anonymous';

        // For remote URLs, try fetching as blob to ensure CORS compatibility
        if (!url.startsWith('blob:') && !url.startsWith('data:')) {
          try {
            let response = await fetch(url, { mode: 'cors' });
            
            if (!response.ok) {
              // Try proxy if direct fetch fails
              const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
              response = await fetch(proxyUrl);
            }

            if (response.ok) {
              const blob = await response.blob();
              finalUrl = URL.createObjectURL(blob);
            } else {
              crossOrigin = undefined;
            }
          } catch (e) {
            console.warn("Fabric: Fetch failed for image, trying proxy:", e);
            try {
              const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
              const proxyResponse = await fetch(proxyUrl);
              if (proxyResponse.ok) {
                const blob = await proxyResponse.blob();
                finalUrl = URL.createObjectURL(blob);
              } else {
                crossOrigin = undefined;
              }
            } catch (proxyErr) {
              crossOrigin = undefined;
            }
          }
        }

        const img = await fabric.FabricImage.fromURL(finalUrl, {
          crossOrigin: crossOrigin as any
        }).catch(async () => {
          console.warn("Fabric: fromURL with crossOrigin failed, trying without");
          return await fabric.FabricImage.fromURL(finalUrl);
        });

        img.set({
          originalSrc: originalUrl
        } as any);

        img.scaleToWidth(200);
        fabricCanvas.current.add(img);
        fabricCanvas.current.centerObject(img);
        fabricCanvas.current.setActiveObject(img);
        fabricCanvas.current.renderAll();
        saveState();
      } catch (err) {
        console.error("Fabric: Error adding image:", err);
      }
    },
    addCoverImage: async (url: string) => {
      if (!fabricCanvas.current) return;
      
      const canvas = fabricCanvas.current;
      try {
        // Remove existing cover objects
        const objects = canvas.getObjects();
        objects.forEach(obj => {
          if ((obj as any).name === 'magazine-cover' || (obj as any).name === 'magazine-cover-bg') {
            canvas.remove(obj);
          }
        });

        let finalUrl = url;
        let originalUrl = url;
        let crossOrigin: string | undefined = 'anonymous';

        // For remote URLs, try fetching as blob to ensure CORS compatibility
        if (!url.startsWith('blob:') && !url.startsWith('data:')) {
          try {
            let response = await fetch(url, { mode: 'cors' });
            
            if (!response.ok) {
              // Try proxy if direct fetch fails
              const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
              response = await fetch(proxyUrl);
            }

            if (response.ok) {
              const blob = await response.blob();
              finalUrl = URL.createObjectURL(blob);
            } else {
              crossOrigin = undefined;
            }
          } catch (e) {
            console.warn("Fabric: Fetch failed for cover image, trying proxy:", e);
            try {
              const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
              const proxyResponse = await fetch(proxyUrl);
              if (proxyResponse.ok) {
                const blob = await proxyResponse.blob();
                finalUrl = URL.createObjectURL(blob);
              } else {
                crossOrigin = undefined;
              }
            } catch (proxyErr) {
              crossOrigin = undefined;
            }
          }
        }

        // Use FabricImage.fromURL with fallback
        const fabricImg = await fabric.FabricImage.fromURL(finalUrl, {
          crossOrigin: crossOrigin as any
        }).catch(async () => {
          // Final fallback: try without crossOrigin
          console.warn("Fabric: fromURL with crossOrigin failed for cover, trying without");
          return await fabric.FabricImage.fromURL(finalUrl);
        });

        fabricImg.set({
          originalSrc: originalUrl
        } as any);

        // Calculate "cover" scaling
        const canvasWidth = 595;
        const canvasHeight = 842;
        const scale = Math.max(canvasWidth / fabricImg.width!, canvasHeight / fabricImg.height!);
        
        fabricImg.set({
          scaleX: scale,
          scaleY: scale,
          left: (canvasWidth - fabricImg.width! * scale) / 2,
          top: (canvasHeight - fabricImg.height! * scale) / 2,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false,
          name: 'magazine-cover-bg'
        });
        
        // In Fabric 7, insertAt is removed. Use add and then sendObjectToBack
        canvas.add(fabricImg);
        canvas.sendObjectToBack(fabricImg);
        
        canvas.renderAll();
        saveState();
      } catch (err) {
        console.error("Fabric: Error adding cover image:", err);
      }
    },
    addPlaceholder: (text: string, options: any = {}) => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      
      const width = options.width || 400;
      const height = options.height || 500;
      
      const rect = new fabric.Rect({
        width: width,
        height: height,
        fill: '#f8fafc',
        stroke: '#cbd5e1',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        rx: 12,
        ry: 12,
        originX: 'center',
        originY: 'center',
        name: 'placeholder-rect'
      });

      const label = new fabric.Textbox(text, {
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: '600',
        fill: '#94a3b8',
        originX: 'center',
        originY: 'center',
        textAlign: 'center',
        width: width - 40,
        name: 'placeholder-text'
      });

      const group = new fabric.Group([rect, label], {
        left: options.left || 595 / 2,
        top: options.top || 842 / 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        hasControls: true,
        transparentCorners: false,
        cornerColor: '#4f46e5',
        cornerStyle: 'circle',
        padding: 10
      });
      
      group.set('name', options.name || 'placeholder-group');
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      saveState();
    },
    getJson: () => {
      if (!fabricCanvas.current) return null;
      try {
        // In Fabric 7, toJSON can sometimes fail if objects are in a weird state
        // We'll try to get it safely
        const canvas = fabricCanvas.current;
        
        // Check if all objects are valid before calling toJSON
        const objects = canvas.getObjects();
        const validObjects = objects.filter(obj => obj && typeof obj.toObject === 'function');
        
        // If some objects are broken, we might need to remove them or just log it
        if (validObjects.length !== objects.length) {
          console.warn(`Fabric: Found ${objects.length - validObjects.length} broken objects on canvas`);
        }

        // In Fabric 7, we can pass properties to include in the output
        const json = canvas.toJSON(['originalSrc', 'name']);
        
        // Ensure 'name' is preserved if it was lost
        if (json.objects && Array.isArray(json.objects)) {
          const originalObjects = canvas.getObjects();
          json.objects.forEach((obj: any, i: number) => {
            if (originalObjects[i] && (originalObjects[i] as any).name) {
              obj.name = (originalObjects[i] as any).name;
            }
            if (originalObjects[i] && (originalObjects[i] as any).originalSrc) {
              obj.originalSrc = (originalObjects[i] as any).originalSrc;
            }
          });
        }
        // Strip undefined values and sanitize blob URLs to avoid Firestore errors and loading issues
        return sanitizeFabricJson(JSON.parse(JSON.stringify(json)));
      } catch (err) {
        console.error("Fabric: Failed to get JSON, attempting fallback:", err);
        try {
          // Fallback: manually construct JSON from valid objects
          const canvas = fabricCanvas.current!;
          const objects = canvas.getObjects()
            .filter(obj => obj && typeof obj.toObject === 'function')
            .map(obj => {
              try {
                return obj.toObject();
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);
            
          const fallbackJson = {
            version: (fabric as any).version || "7.2.0",
            objects: objects,
            background: canvas.backgroundColor
          };
          return sanitizeFabricJson(fallbackJson);
        } catch (fallbackErr) {
          console.error("Fabric: Fallback JSON generation failed:", fallbackErr);
          return null;
        }
      }
    },
    loadJson: async (json: any) => {
      if (!fabricCanvas.current) return;
      try {
        if (json) {
          const sanitized = sanitizeFabricJson(json);
          const processed = await preProcessImages(sanitized);
          await fabricCanvas.current.loadFromJSON(processed);
        } else {
          fabricCanvas.current.clear();
          fabricCanvas.current.backgroundColor = '#ffffff';
        }
        fabricCanvas.current.renderAll();
      } catch (err) {
        console.error("Fabric: Failed to load JSON:", err);
      }
    },
    deleteSelected: () => {
      const activeObjects = fabricCanvas.current?.getActiveObjects();
      if (activeObjects) {
        fabricCanvas.current?.discardActiveObject();
        fabricCanvas.current?.remove(...activeObjects);
      }
    },
    bringForward: () => {
      const activeObject = fabricCanvas.current?.getActiveObject();
      if (activeObject && fabricCanvas.current) {
        fabricCanvas.current.bringObjectForward(activeObject);
      }
    },
    sendBackward: () => {
      const activeObject = fabricCanvas.current?.getActiveObject();
      if (activeObject && fabricCanvas.current) {
        fabricCanvas.current.sendObjectBackwards(activeObject);
      }
    },
    align: (direction) => {
      const activeObject = fabricCanvas.current?.getActiveObject();
      if (!activeObject || !fabricCanvas.current) return;

      const canvasWidth = fabricCanvas.current.getWidth();
      const canvasHeight = fabricCanvas.current.getHeight();

      switch (direction) {
        case 'left':
          activeObject.set('left', 0);
          break;
        case 'center':
          activeObject.centerH();
          break;
        case 'right':
          activeObject.set('left', canvasWidth - (activeObject.width! * activeObject.scaleX!));
          break;
        case 'top':
          activeObject.set('top', 0);
          break;
        case 'middle':
          activeObject.centerV();
          break;
        case 'bottom':
          activeObject.set('top', canvasHeight - (activeObject.height! * activeObject.scaleY!));
          break;
      }
      activeObject.setCoords();
      fabricCanvas.current?.renderAll();
    },
    updateSelected: (options) => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      const activeObject = canvas.getActiveObject();
      
      if (!activeObject) return;

      if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj) => {
          if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
            obj.set(options);
            if (obj.type === 'textbox') {
              (obj as any).initDimensions?.();
            }
          }
        });
      } else {
        activeObject.set(options);
        if (activeObject.type === 'textbox') {
          (activeObject as any).initDimensions?.();
        }
      }
      
      activeObject.setCoords();
      canvas.renderAll();
      saveState();
    },
    addMargin: (options) => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      
      // Remove existing margin if any
      const existingMargin = canvas.getObjects().find(obj => (obj as any).name === 'page-margin');
      if (existingMargin) {
        canvas.remove(existingMargin);
      }

      const margin = 72; // 1 inch at 72dpi
      const baseWidth = 595;
      const baseHeight = 842;
      const width = baseWidth - (margin * 2);
      const height = baseHeight - (margin * 2);

      let strokeDashArray: number[] | undefined = undefined;
      if (options.type === 'dashed') strokeDashArray = [10, 5];
      if (options.type === 'dotted') strokeDashArray = [2, 2];

      const marginRect = new fabric.Rect({
        left: margin,
        top: margin,
        width: width,
        height: height,
        fill: null,
        stroke: options.color,
        strokeWidth: options.thickness,
        strokeDashArray: strokeDashArray,
        selectable: true,
        evented: true,
        hasControls: true,
        lockRotation: true, // Usually margins shouldn't be rotated
        transparentCorners: false,
        cornerColor: '#4f46e5',
        cornerStyle: 'circle',
        padding: 5,
        name: 'page-margin',
        perPixelTargetFind: true
      });

      canvas.add(marginRect);
      canvas.renderAll();
      saveState();
    },
    removeMargin: () => {
      if (!fabricCanvas.current) return;
      const canvas = fabricCanvas.current;
      const existingMargin = canvas.getObjects().find(obj => (obj as any).name === 'page-margin');
      if (existingMargin) {
        canvas.remove(existingMargin);
        canvas.renderAll();
        saveState();
      }
    },
    toDataURL: (options: any = {}) => {
      if (!fabricCanvas.current) return '';
      
      try {
        // When exporting, we want the full resolution (multiplier: 1 / zoom)
        const currentZoom = fabricCanvas.current.getZoom();
        const multiplier = (options.multiplier || 1) / currentZoom;

        const dataUrl = fabricCanvas.current.toDataURL({ 
          format: options.format || 'png', 
          quality: options.quality || 1, 
          multiplier: multiplier
        });
        
        return dataUrl;
      } catch (err) {
        console.error("Fabric: toDataURL failed (possibly tainted canvas):", err);
        return '';
      }
    },
    undo: async () => {
      const canvas = fabricCanvas.current;
      if (!canvas || (canvas as any).isDisposed || undoStack.current.length <= 1) return;
      
      isProcessingStack.current = true;
      try {
        const currentState = undoStack.current.pop()!;
        redoStack.current.push(currentState);
        
        const previousState = undoStack.current[undoStack.current.length - 1];
        const parsed = JSON.parse(previousState);
        const sanitized = sanitizeFabricJson(parsed);
        const processed = await preProcessImages(sanitized);
        
        try {
          await canvas.loadFromJSON(processed);
        } catch (loadErr) {
          console.error("Fabric: Undo loadFromJSON failed:", loadErr);
        }
        
        if (!fabricCanvas.current || (fabricCanvas.current as any).isDisposed) return;
        
        canvas.renderAll();
      } catch (err) {
        console.error("Fabric: Undo failed:", err);
      } finally {
        isProcessingStack.current = false;
      }
    },
    redo: async () => {
      const canvas = fabricCanvas.current;
      if (!canvas || (canvas as any).isDisposed || redoStack.current.length === 0) return;
      
      isProcessingStack.current = true;
      try {
        const nextState = redoStack.current.pop()!;
        undoStack.current.push(nextState);
        
        const parsed = JSON.parse(nextState);
        const sanitized = sanitizeFabricJson(parsed);
        const processed = await preProcessImages(sanitized);
        
        try {
          await canvas.loadFromJSON(processed);
        } catch (loadErr) {
          console.error("Fabric: Redo loadFromJSON failed:", loadErr);
        }
        
        if (!fabricCanvas.current || (fabricCanvas.current as any).isDisposed) return;
        
        canvas.renderAll();
      } catch (err) {
        console.error("Fabric: Redo failed:", err);
      } finally {
        isProcessingStack.current = false;
      }
    },
    zoomIn: () => {
      handleZoom(zoom + 0.1);
    },
    zoomOut: () => {
      handleZoom(zoom - 0.1);
    },
    resetZoom: () => {
      isManualZoom.current = false;
      fitToContainer();
    },
    getZoom: () => zoom
  }), [zoom, onZoomChange]);

  return (
    <div ref={containerRef} className="min-w-full min-h-full flex justify-center items-start p-12">
      <div className="shadow-[0_20px_60px_rgba(0,0,0,0.15)] bg-white border border-zinc-200 ring-1 ring-black/5">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor;
