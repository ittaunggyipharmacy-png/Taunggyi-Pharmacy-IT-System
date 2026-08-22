import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, Printer, Download, RotateCcw, X, Crop, ZoomIn, ZoomOut, Check, 
  Undo2, Redo2, Maximize, Maximize2, Minimize2, RotateCw, Trash2, Move 
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../lib/cropImage';
import { cn } from '../../lib/utils';
import { NodeType, LayoutNode } from './types';

const DEFAULT_NODES: LayoutNode[] = [
  { id: 'orig-front', type: 'image', imageType: 'front', filter: 'none', x: 6.765, y: 35, rotation: 0, visible: true },
  { id: 'orig-back', type: 'image', imageType: 'back', filter: 'none', x: 111.795, y: 35, rotation: 0, visible: true },
  { id: 'bw1-front', type: 'image', imageType: 'front', filter: 'grayscale', x: 6.765, y: 125, rotation: 0, visible: true },
  { id: 'bw1-back', type: 'image', imageType: 'back', filter: 'grayscale', x: 111.795, y: 125, rotation: 0, visible: true },
  { id: 'bw2-front', type: 'image', imageType: 'front', filter: 'grayscale', x: 6.765, y: 215, rotation: 0, visible: true },
  { id: 'bw2-back', type: 'image', imageType: 'back', filter: 'grayscale', x: 111.795, y: 215, rotation: 0, visible: true },
  { id: 'txt-1', type: 'text', text: 'ORIGINAL ID CARD (FRONT & BACK)', x: 105, y: 25, rotation: 0, visible: true },
];

export function IdLayoutGenerator() {
  const [rawFront, setRawFront] = useState<string | null>(null);
  const [rawBack, setRawBack] = useState<string | null>(null);
  
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  const [nodes, setNodes] = useState<LayoutNode[]>(DEFAULT_NODES);
  const [history, setHistory] = useState<LayoutNode[][]>([DEFAULT_NODES]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomA4, setZoomA4] = useState(0.65);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [editingSide, setEditingSide] = useState<'front' | 'back' | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const a4Ref = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);

  const ASPECT_RATIO = 3.6 / 2.3;

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Fit to screen calculation
  const handleFitScreen = useCallback(() => {
    if (canvasContainerRef.current) {
      const container = canvasContainerRef.current;
      const paddingX = 48;
      const paddingY = 48;
      const availW = Math.max(100, container.clientWidth - paddingX);
      const availH = Math.max(100, container.clientHeight - paddingY);

      // A4 in standard 96 DPI CSS pixels (1mm = 3.779527559px)
      // 210mm = 793.7px, 297mm = 1122.5px
      const a4W = 793.7;
      const a4H = 1122.5;

      const scaleW = availW / a4W;
      const scaleH = availH / a4H;
      const fitScale = Math.min(scaleW, scaleH);
      
      const clamped = Math.max(0.25, Math.min(1.5, Math.floor(fitScale * 100) / 100));
      setZoomA4(clamped);
    }
  }, []);

  // Initial fit on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitScreen();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleFitScreen]);

  // Recalculate on fullscreen toggle or window resize
  useEffect(() => {
    const handleResize = () => {
      handleFitScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleFitScreen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitScreen();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, handleFitScreen]);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const pushHistory = (newState: LayoutNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setNodes(history[historyIndex - 1]);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setNodes(history[historyIndex + 1]);
      setSelectedId(null);
    }
  };

  const updateSelectedNode = (updates: Partial<LayoutNode>) => {
    if (!selectedId) return;
    const newNodes = nodes.map(n => n.id === selectedId ? { ...n, ...updates } : n);
    setNodes(newNodes);
    pushHistory(newNodes);
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;

    const node = nodesRef.current.find(n => n.id === id);
    if (!node) return;
    const startNodeX = node.x;
    const startNodeY = node.y;

    const a4Rect = a4Ref.current?.getBoundingClientRect();
    const pxToMm = a4Rect ? 210 / a4Rect.width : 1;

    let finalX = startNodeX;
    let finalY = startNodeY;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) * pxToMm;
      const dy = (moveEvent.clientY - startY) * pxToMm;
      
      let newX = startNodeX + dx;
      let newY = startNodeY + dy;

      const SNAP_TOLERANCE = 2;
      const snapX = [6.765, 111.795, 105];
      for (const sx of snapX) {
        if (Math.abs(newX - sx) < SNAP_TOLERANCE) {
          newX = sx;
          break;
        }
      }
      const snapY = Array.from(new Set(DEFAULT_NODES.map(n => n.y)));
      for (const sy of snapY) {
        if (Math.abs(newY - sy) < SNAP_TOLERANCE) {
          newY = sy;
          break;
        }
      }

      finalX = newX;
      finalY = newY;

      setNodes(prev => prev.map(n => n.id === id ? { ...n, x: newX, y: newY } : n));
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
      
      if (finalX !== startNodeX || finalY !== startNodeY) {
        pushHistory(nodesRef.current);
      }
    };

    window.addEventListener('pointermove', onPointerMove as any);
    window.addEventListener('pointerup', onPointerUp as any);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (side === 'front') {
          setRawFront(reader.result as string);
        } else {
          setRawBack(reader.result as string);
        }
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setEditingSide(side);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels || !editingSide) return;
    const imageToCrop = editingSide === 'front' ? rawFront : rawBack;
    if (!imageToCrop) return;

    try {
      const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (editingSide === 'front') {
        setFrontImage(croppedImage);
      } else {
        setBackImage(croppedImage);
      }
      setEditingSide(null);
    } catch (e) {
      console.error(e);
      alert('Error cropping image.');
    }
  };

  const handleEdit = (side: 'front' | 'back') => {
    if (side === 'front' && !rawFront) return;
    if (side === 'back' && !rawBack) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setEditingSide(side);
  };

  const handleDownloadPdf = async () => {
    if (!a4Ref.current) return;
    const prevSelected = selectedId;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 100)); // wait for render to clear borders
    try {
      const imgData = await toJpeg(a4Ref.current, {
        quality: 1.0,
        pixelRatio: 2,
        style: {
          transform: 'none'
        }
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      pdf.save('ID_Card_Layout.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setSelectedId(prevSelected);
    }
  };

  const handlePrint = async () => {
    if (!a4Ref.current) return;
    const prevSelected = selectedId;
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 100)); // wait for borders to clear
    
    try {
      const imgData = await toJpeg(a4Ref.current, {
        quality: 1.0,
        pixelRatio: 2,
        style: { transform: 'none' }
      });
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '-9999px';
      iframe.style.bottom = '-9999px';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.write(`
          <html>
            <head>
              <title>Print ID Layout</title>
              <style>
                @page { size: A4 portrait; margin: 0; }
                body { margin: 0; padding: 0; background: white; }
                img { width: 210mm; height: 297mm; display: block; }
              </style>
            </head>
            <body>
              <img src="${imgData}" />
            </body>
          </html>
        `);
        iframeDoc.close();
        
        const img = iframeDoc.querySelector('img');
        if (img) {
          img.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 2000);
          };
        }
      }
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print. Please try again.');
    } finally {
      setSelectedId(prevSelected);
    }
  };

  const resetAll = () => {
    setRawFront(null);
    setRawBack(null);
    setFrontImage(null);
    setBackImage(null);
    setNodes(DEFAULT_NODES);
    setHistory([DEFAULT_NODES]);
    setHistoryIndex(0);
    setSelectedId(null);
  };

  const resetLayout = () => {
    setNodes(DEFAULT_NODES);
    pushHistory(DEFAULT_NODES);
    setSelectedId(null);
  };

  const editingImage = editingSide === 'front' ? rawFront : rawBack;
  const selectedNode = nodes.find(n => n.id === selectedId);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-[#2c2e31] p-4 sm:p-6 lg:p-8">
      {/* Cropper Modal */}
      {editingSide && editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Crop ID Card ({editingSide === 'front' ? 'Front' : 'Back'})</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Drag to move, use slider to zoom. Aspect ratio is locked to 3.6 : 2.3</p>
              </div>
              <button onClick={() => setEditingSide(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="relative flex-1 bg-slate-100 dark:bg-slate-800">
              <Cropper
                image={editingImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={ASPECT_RATIO}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <ZoomOut size={18} className="text-slate-500" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-32 sm:w-48 accent-indigo-600"
                />
                <ZoomIn size={18} className="text-slate-500" />
              </div>
              <button 
                onClick={handleApplyCrop}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Check size={16} />
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Main Controls */}
        <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">A4 ID Card Editor</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Upload, crop, and drag items directly on the A4 canvas below.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={resetAll}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors"
            >
              <RotateCcw size={16} />
              Reset All
            </button>
            <button 
              onClick={handleDownloadPdf}
              disabled={!frontImage && !backImage}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              PDF
            </button>
            <button 
              onClick={handlePrint}
              disabled={!frontImage && !backImage}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        {/* Upload Areas */}
        <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[150px] relative">
            <div className="w-full flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Front Source Image</h3>
              {rawFront && (
                <button onClick={() => handleEdit('front')} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                  <Crop size={14} /> Re-Crop Master
                </button>
              )}
            </div>
            <label className="flex flex-col items-center justify-center w-full flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors p-4">
              <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-2" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{rawFront ? 'Replace Front Image' : 'Upload Front Image'}</span>
              <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageUpload(e, 'front')} />
            </label>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[150px] relative">
            <div className="w-full flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Back Source Image</h3>
              {rawBack && (
                <button onClick={() => handleEdit('back')} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                  <Crop size={14} /> Re-Crop Master
                </button>
              )}
            </div>
            <label className="flex flex-col items-center justify-center w-full flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors p-4">
              <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-2" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{rawBack ? 'Replace Back Image' : 'Upload Back Image'}</span>
              <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleImageUpload(e, 'back')} />
            </label>
          </div>
        </div>

        {/* Editor Area (Wrapped with Fullscreen support) */}
        <div className={cn(
          "transition-all duration-200",
          isFullscreen ? "fixed inset-0 z-50 bg-slate-900 p-4 sm:p-6 flex flex-col min-h-0 h-screen w-screen overflow-hidden gap-4" : "space-y-4"
        )}>
          
          {/* Editor Toolbar */}
          <div className="print:hidden bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-3">
              <button title="Undo" onClick={undo} disabled={historyIndex === 0} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30">
                <Undo2 size={18} />
              </button>
              <button title="Redo" onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30">
                <Redo2 size={18} />
              </button>
            </div>
            
            <button onClick={resetLayout} className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
              <RotateCcw size={16} /> Reset Layout
            </button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Zoom Controls & Fit to Screen */}
            <div className="flex items-center gap-2">
              <button title="Zoom Out" onClick={() => setZoomA4(z => Math.max(0.25, Math.round((z - 0.05) * 100) / 100))} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-semibold w-12 text-center text-slate-700 dark:text-slate-200">
                {Math.round(zoomA4 * 100)}%
              </span>
              <button title="Zoom In" onClick={() => setZoomA4(z => Math.min(2.0, Math.round((z + 0.05) * 100) / 100))} className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <ZoomIn size={16} />
              </button>
              
              {/* Fit Screen Button */}
              <button 
                title="Fit Page to Screen" 
                onClick={handleFitScreen} 
                className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Maximize size={14} /> Fit Screen
              </button>

              {/* 100% Zoom Button */}
              <button 
                title="Actual Size (100%)" 
                onClick={() => setZoomA4(1.0)} 
                className={cn(
                  "px-2 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  zoomA4 === 1.0 
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                100%
              </button>
            </div>

            {/* Fullscreen Mode Toggle */}
            <div className="flex items-center pl-2 border-l border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsFullscreen(prev => !prev)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm",
                  isFullscreen
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
                title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand to Fullscreen"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 size={14} /> Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 size={14} /> Full Screen
                  </>
                )}
              </button>
            </div>

            <div className="flex-1" />

            {/* Contextual Toolbar for Selected Node */}
            {selectedNode && (
              <div className="flex items-center gap-2 pl-3 border-l border-indigo-100 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-900/20 p-1.5 rounded-lg">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mr-2 flex items-center gap-1">
                  <Move size={14} /> {selectedNode.type === 'image' ? `ID ${selectedNode.imageType?.toUpperCase()}` : 'Text'}
                </span>
                {selectedNode.type === 'image' && (
                  <button onClick={() => handleEdit(selectedNode.imageType!)} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50">
                    <Crop size={12} /> Crop
                  </button>
                )}
                <button onClick={() => updateSelectedNode({ rotation: (selectedNode.rotation + 90) % 360 })} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50">
                  <RotateCw size={12} /> Rotate
                </button>
                <button onClick={() => updateSelectedNode({ visible: false })} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 text-xs rounded shadow-sm border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 size={12} /> Hide
                </button>
              </div>
            )}
          </div>

          {/* Live A4 Editor Canvas Wrapper */}
          <div 
            ref={canvasContainerRef}
            className={cn(
              "relative flex overflow-auto print:overflow-visible print:block bg-slate-200/90 dark:bg-slate-950/80 rounded-2xl border border-slate-300 dark:border-slate-700 p-6 sm:p-8 print:p-0 transition-all",
              isFullscreen ? "flex-1 min-h-0 w-full rounded-xl border-slate-700" : "h-[calc(100vh-280px)] min-h-[580px] max-h-[880px]"
            )}
          >
            {/* Sizer container with margin: auto for perfect centering & scroll preservation */}
            <div 
              className="relative m-auto shrink-0 transition-all duration-150"
              style={{ 
                width: `${210 * zoomA4}mm`,
                height: `${297 * zoomA4}mm`
              }}
            >
              <div 
                className="absolute top-0 left-0 transition-transform duration-150"
                style={{ 
                  transform: `scale(${zoomA4})`,
                  transformOrigin: '0 0',
                  width: '210mm',
                  height: '297mm'
                }}
              >
                {/* A4 Page Container */}
                <div 
                  ref={a4Ref}
                  className="a4-canvas relative shadow-2xl print:shadow-none"
                  onClick={() => setSelectedId(null)}
                  style={{
                    width: '210mm',
                    height: '297mm',
                    boxSizing: 'border-box', 
                    backgroundColor: '#ffffff'
                  }}
                >
                  {nodes.filter(n => n.visible).map(node => {
                    const isSelected = selectedId === node.id;
                    
                    if (node.type === 'image') {
                      return (
                        <div
                          key={node.id}
                          onPointerDown={(e) => handlePointerDown(e, node.id)}
                          onDoubleClick={() => handleEdit(node.imageType!)}
                          className={cn(
                            "absolute cursor-move touch-none print:outline-none select-none",
                            isSelected ? "z-10" : ""
                          )}
                          style={{
                            left: `${node.x}mm`,
                            top: `${node.y}mm`,
                            width: '3.6in',
                            height: '2.3in',
                            transform: `rotate(${node.rotation}deg)`,
                            transformOrigin: 'center', 
                            outline: isSelected ? '2px solid #6366f1' : '2px solid transparent', 
                            outlineOffset: '2px'
                          }}
                        >
                          {node.imageType === 'front' && !frontImage && (
                            <div className="w-full h-full flex items-center justify-center pointer-events-none text-sm font-medium" style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' }}>FRONT (3.6" × 2.3")</div>
                          )}
                          {node.imageType === 'back' && !backImage && (
                            <div className="w-full h-full flex items-center justify-center pointer-events-none text-sm font-medium" style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', border: '1px solid #cbd5e1' }}>BACK (3.6" × 2.3")</div>
                          )}
                          {(node.imageType === 'front' && frontImage || node.imageType === 'back' && backImage) && (
                            <img 
                              src={node.imageType === 'front' ? frontImage! : backImage!} 
                              className="w-full h-full object-cover pointer-events-none block"
                              style={{ filter: node.filter === 'grayscale' ? 'grayscale(100%) contrast(1.2)' : 'none' }}
                              alt={node.imageType}
                              draggable={false}
                            />
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={node.id}
                          onPointerDown={(e) => handlePointerDown(e, node.id)}
                          className={cn(
                            "absolute cursor-move touch-none font-bold text-center text-sm uppercase tracking-wider whitespace-pre-wrap print:outline-none select-none",
                            isSelected ? "z-10" : ""
                          )}
                          style={{
                            left: `${node.x}mm`,
                            top: `${node.y}mm`,
                            transform: `translateX(-50%) rotate(${node.rotation}deg)`,
                            width: 'max-content', 
                            color: '#000000', 
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.5)' : 'transparent', 
                            outline: isSelected ? '2px solid #6366f1' : '2px solid transparent', 
                            outlineOffset: '4px'
                          }}
                        >
                          {node.text}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #root { background-color: transparent !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; visibility: visible !important; }
          .print\\:w-auto { width: auto !important; }
          .print\\:m-0 { margin: 0 !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:outline-none { outline: none !important; }
          
          .a4-canvas {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
          }
          .a4-canvas * { visibility: visible !important; }
          
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
