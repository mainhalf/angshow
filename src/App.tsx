/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { 
  Upload, 
  Type, 
  Image as ImageIcon, 
  Download, 
  RotateCcw, 
  Trash2, 
  Layers, 
  Palette,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Monitor,
  Film,
  Plus,
  Play,
  X,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
// @ts-ignore
import gifshot from 'gifshot';

// --- Constants & Types ---

const FONTS = [
  { name: '系统默认', value: 'Inter' },
  { name: '思源黑体', value: 'Noto Sans SC' },
  { name: '站酷黄油', value: 'ZCOOL QingKe HuangYou' },
  { name: '站酷小薇', value: 'ZCOOL XiaoWei' },
  { name: '站酷快乐', value: 'ZCOOL KuaiLe' },
  { name: '马善政毛笔', value: 'Ma Shan Zheng' },
  { name: '龙藏体', value: 'Long Cang' },
  { name: '刘建毛草', value: 'Liu Jian Mao Cao' },
  { name: '指芒星体', value: 'Zhi Mang Xing' },
  { name: '经典衬线', value: 'Playfair Display' },
  { name: '极客代码', value: 'JetBrains Mono' },
];

const FILTERS = [
  { id: 'none', name: 'Original', description: 'No filter' },
  { id: 'leica', name: 'Leica M', description: 'High contrast, deep shadows, classic look' },
  { id: 'hasselblad', name: 'Hasselblad', description: 'Natural colors, soft highlights, medium format feel' },
  { id: 'noir', name: 'Noir', description: 'Dramatic black and white' },
  { id: 'vintage', name: 'Vintage', description: 'Warm tones, faded edges' },
  { id: 'vibrant', name: 'Vibrant', description: 'Punchy colors and high saturation' },
];

// --- Components ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'filters' | 'text' | 'gif'>('filters');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentFont, setCurrentFont] = useState('Inter');
  const [currentTextColor, setCurrentTextColor] = useState('#000000');
  const [frames, setFrames] = useState<string[]>([]);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifDelay, setGifDelay] = useState(0.5);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 600;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: initialWidth,
      height: initialHeight,
      backgroundColor: '#000000',
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    // Handle selection events
    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (!activeObject) return;

      if (activeObject.type === 'textbox') {
        setActiveTab('text');
        const textbox = activeObject as fabric.Textbox;
        setCurrentFont(textbox.fontFamily);
        setCurrentTextColor(textbox.fill as string);
      } else if (activeObject.type === 'activeSelection') {
        setActiveTab('text');
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);

    // Responsive resize
    const handleResize = () => {
      if (!containerRef.current || !fabricCanvas.current) return;
      const container = containerRef.current;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      if (newWidth > 0 && newHeight > 0) {
        fabricCanvas.current.setDimensions({
          width: newWidth,
          height: newHeight
        });
        fabricCanvas.current.renderAll();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    resizeObserver.observe(container);

    return () => {
      canvas.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  // --- Actions ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas.current) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const data = f.target?.result as string;
      
      const imgElement = new Image();
      imgElement.src = data;
      imgElement.onload = () => {
        if (!fabricCanvas.current) return;
        
        const canvas = fabricCanvas.current;
        canvas.clear();
        canvas.backgroundColor = '#000000';

        const fabImg = new fabric.FabricImage(imgElement);
        
        // Scale image to fit canvas
        const scale = Math.min(
          (canvas.width! * 0.9) / fabImg.width!,
          (canvas.height! * 0.9) / fabImg.height!
        );
        
        fabImg.set({
          scaleX: scale,
          scaleY: scale,
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          name: 'mainImage'
        });

        canvas.add(fabImg);
        canvas.setActiveObject(fabImg);
        canvas.renderAll();
        setImageLoaded(true);
      };
    };
    reader.readAsDataURL(file);
  };

  const applyFilter = (filterId: string) => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const mainImg = canvas.getObjects().find(obj => obj.name === 'mainImage') as fabric.FabricImage;
    
    if (!mainImg) return;

    setSelectedFilter(filterId);
    mainImg.filters = [];

    switch (filterId) {
      case 'leica':
        mainImg.filters.push(new fabric.filters.Contrast({ contrast: 0.3 }));
        mainImg.filters.push(new fabric.filters.Saturation({ saturation: -0.2 }));
        break;
      case 'hasselblad':
        mainImg.filters.push(new fabric.filters.Brightness({ brightness: 0.05 }));
        mainImg.filters.push(new fabric.filters.Contrast({ contrast: 0.1 }));
        mainImg.filters.push(new fabric.filters.Saturation({ saturation: 0.1 }));
        break;
      case 'noir':
        mainImg.filters.push(new fabric.filters.Grayscale());
        mainImg.filters.push(new fabric.filters.Contrast({ contrast: 0.4 }));
        break;
      case 'vintage':
        mainImg.filters.push(new fabric.filters.Sepia());
        mainImg.filters.push(new fabric.filters.Brightness({ brightness: 0.1 }));
        break;
      case 'vibrant':
        mainImg.filters.push(new fabric.filters.Saturation({ saturation: 0.5 }));
        mainImg.filters.push(new fabric.filters.Contrast({ contrast: 0.2 }));
        break;
    }

    mainImg.applyFilters();
    canvas.renderAll();
  };

  const addText = () => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    
    const text = new fabric.Textbox('点击输入文字', {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontFamily: currentFont,
      fontSize: 40,
      fill: currentTextColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      width: 300,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setActiveTab('text');
  };

  const updateTextProperty = (prop: string, value: any) => {
    if (!fabricCanvas.current) return;
    const canvas = fabricCanvas.current;
    const activeObject = canvas.getActiveObject();

    if (prop === 'fontFamily') setCurrentFont(value);
    if (prop === 'fill') setCurrentTextColor(value);

    if (!activeObject) return;

    if (activeObject.type === 'textbox') {
      activeObject.set(prop as any, value);
    } else if (activeObject.type === 'activeSelection') {
      const selection = activeObject as fabric.ActiveSelection;
      selection.forEachObject((obj) => {
        if (obj.type === 'textbox') {
          obj.set(prop as any, value);
        }
      });
    }
    
    canvas.renderAll();
  };

  const captureFrame = () => {
    if (!fabricCanvas.current) return;
    // Discard active object to not include selection handles in GIF
    fabricCanvas.current.discardActiveObject();
    fabricCanvas.current.renderAll();
    
    const dataURL = fabricCanvas.current.toDataURL({
      format: 'png',
      quality: 0.8,
    });
    setFrames([...frames, dataURL]);
  };

  const removeFrame = (index: number) => {
    setFrames(frames.filter((_, i) => i !== index));
  };

  const generateGif = () => {
    if (frames.length < 2) {
      alert('制作 GIF 至少需要 2 帧。');
      return;
    }

    setIsGeneratingGif(true);
    
    gifshot.createGIF({
      images: frames,
      gifWidth: fabricCanvas.current?.width || 800,
      gifHeight: fabricCanvas.current?.height || 600,
      interval: gifDelay,
      numWorkers: 2,
    }, (obj: any) => {
      setIsGeneratingGif(false);
      if (!obj.error) {
        const link = document.createElement('a');
        link.download = 'angshow-animation.gif';
        link.href = obj.image;
        link.click();
      } else {
        console.error('GIF Error:', obj.error);
        alert('生成 GIF 失败，请重试。');
      }
    });
  };

  const downloadImage = () => {
    if (!fabricCanvas.current) return;
    const dataURL = fabricCanvas.current.toDataURL({
      format: 'png',
      quality: 1,
    });
    const link = document.createElement('a');
    link.download = 'angshow-edit.png';
    link.href = dataURL;
    link.click();
  };

  const clearCanvas = () => {
    if (window.confirm('确定要清除所有修改吗？')) {
      fabricCanvas.current?.clear();
      fabricCanvas.current!.backgroundColor = '#000000';
      fabricCanvas.current?.renderAll();
      setImageLoaded(false);
      setSelectedFilter('none');
    }
  };

  const deleteSelected = () => {
    const activeObjects = fabricCanvas.current?.getActiveObjects();
    if (activeObjects) {
      activeObjects.forEach(obj => {
        if (obj.name !== 'mainImage') {
          fabricCanvas.current?.remove(obj);
        }
      });
      fabricCanvas.current?.discardActiveObject();
      fabricCanvas.current?.renderAll();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-white/10 bg-black/50 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">angshow</h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={downloadImage}
            disabled={!imageLoaded}
            className="bg-zinc-800 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-zinc-700 transition-all disabled:opacity-30 flex items-center gap-1.5 border border-white/10"
          >
            <Download size={14} />
            <span>导出图片</span>
          </button>
          <button 
            onClick={generateGif}
            disabled={frames.length < 2 || isGeneratingGif}
            className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-zinc-200 transition-all disabled:opacity-30 flex items-center gap-1.5"
          >
            <Film size={14} />
            <span>导出 GIF</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Canvas Area - Maximized */}
        <section className="flex-1 bg-[#0a0a0a] relative flex items-center justify-center p-2 md:p-6 overflow-hidden min-h-0">
          {!imageLoaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center p-8 max-w-sm"
              >
                <div className="mb-6 flex justify-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
                    <Upload className="text-black w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">开始创作</h2>
                <p className="text-zinc-500 text-sm mb-8">上传一张照片，开启您的 angshow 视觉之旅</p>
                <label className="cursor-pointer bg-white text-black px-10 py-4 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-zinc-200 transition-all shadow-xl block active:scale-95">
                  选取照片
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </motion.div>
            </div>
          )}

          <div 
            ref={containerRef}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="canvas-container shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 rounded-sm overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </section>

        {/* Controls - More compact side panel */}
        <aside className="w-full md:w-72 bg-black border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-10 shrink-0 h-[45vh] md:h-full shadow-2xl">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/5 shrink-0">
            {[
              { id: 'filters', label: '滤镜', icon: Palette },
              { id: 'text', label: '文字', icon: Type },
              { id: 'gif', label: '动画', icon: Film },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-1 transition-all border-b-2",
                  activeTab === tab.id ? "border-white text-white" : "border-transparent text-zinc-500"
                )}
              >
                <tab.icon size={18} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'filters' && (
                <motion.div 
                  key="filters"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex overflow-x-auto py-2 gap-3 no-scrollbar snap-x"
                >
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => applyFilter(filter.id)}
                      disabled={!imageLoaded}
                      className={cn(
                        "group relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center gap-1 snap-center",
                        selectedFilter === filter.id ? "border-white bg-white/10" : "border-white/5 bg-zinc-900 hover:border-white/20",
                        !imageLoaded && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      <span className="text-[8px] font-bold uppercase tracking-widest text-center px-1">
                        {filter.name}
                      </span>
                      {selectedFilter === filter.id && (
                        <motion.div 
                          layoutId="activeFilter"
                          className="w-1 h-1 bg-white rounded-full" 
                        />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}

              {activeTab === 'gif' && (
                <motion.div 
                  key="gif"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <button 
                      onClick={captureFrame}
                      disabled={!imageLoaded}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-30"
                    >
                      <Plus size={16} />
                      <span>捕捉当前帧</span>
                    </button>
                    
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">帧间隔 (秒)</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="2" 
                        step="0.1" 
                        value={gifDelay}
                        onChange={(e) => setGifDelay(parseFloat(e.target.value))}
                        className="w-24 accent-white"
                      />
                      <span className="text-[10px] font-mono text-white w-8 text-right">{gifDelay}s</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">已捕捉帧 ({frames.length})</span>
                      {frames.length > 0 && (
                        <button onClick={() => setFrames([])} className="text-[10px] text-red-500 font-bold uppercase">清空</button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {frames.map((frame, index) => (
                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                          <img src={frame} alt={`Frame ${index}`} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => removeFrame(index)}
                            className="absolute top-1 right-1 bg-black/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-[8px] px-1 rounded text-white font-mono">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                      {frames.length === 0 && (
                        <div className="col-span-3 py-8 text-center border border-dashed border-white/5 rounded-xl">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">暂无帧数据</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={generateGif}
                    disabled={frames.length < 2 || isGeneratingGif}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                  >
                    {isGeneratingGif ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>正在生成...</span>
                      </div>
                    ) : (
                      <>
                        <Play size={16} fill="currentColor" />
                        <span>生成 GIF 动画</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {activeTab === 'text' && (
                <motion.div 
                  key="text"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <button 
                    onClick={addText}
                    disabled={!imageLoaded}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all disabled:opacity-30"
                  >
                    <Type size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">添加文字</span>
                  </button>

                  <div className="space-y-4">
                    <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                      {FONTS.map(font => (
                        <button
                          key={font.value}
                          onClick={() => updateTextProperty('fontFamily', font.value)}
                          className={cn(
                            "shrink-0 px-4 py-2 rounded-lg border text-xs whitespace-nowrap transition-all",
                            currentFont === font.value ? "bg-white text-black border-white" : "bg-zinc-900 border-white/5 text-zinc-400"
                          )}
                          style={{ fontFamily: font.value }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        {['#000000', '#FFFFFF', '#FF3B30', '#FFCC00', '#4CD964', '#007AFF'].map(color => (
                          <button
                            key={color}
                            onClick={() => updateTextProperty('fill', color)}
                            className={cn(
                              "w-6 h-6 rounded-full border shrink-0 transition-all",
                              currentTextColor === color ? "border-white scale-110" : "border-white/20"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
            <button 
              onClick={clearCanvas}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
            >
              <RotateCcw size={12} />
              <span>重置</span>
            </button>
            <button 
              onClick={deleteSelected}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-900 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
            >
              <Trash2 size={12} />
              <span>删除</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
