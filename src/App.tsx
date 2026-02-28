import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  Maximize2, 
  Settings, 
  RefreshCw,
  Archive,
  Image as ImageIcon,
  AlertCircle
} from "lucide-react";

type PhotoStatus = "pending" | "keep" | "trash";

interface Photo {
  filename: string;
  status: PhotoStatus;
  url: string;
  thumbUrl: string;
}

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("detail");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photos");
      if (!res.ok) throw new Error("Failed to fetch photos");
      const data = await res.json();
      setPhotos(data);
      setError(null);
    } catch (err) {
      setError("Could not connect to Synology backend. Make sure the server is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const updateStatus = async (filename: string, status: PhotoStatus) => {
    try {
      // Optimistic update
      setPhotos(prev => prev.map(p => p.filename === filename ? { ...p, status } : p));
      
      const res = await fetch("/api/photos/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, status })
      });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (err) {
      console.error(err);
      // Rollback on error
      fetchPhotos();
    }
  };

  const applyChanges = async () => {
    if (!confirm("Are you sure you want to move all 'trash' photos to the .trash folder?")) return;
    setApplying(true);
    try {
      const res = await fetch("/api/photos/apply", { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply changes");
      const data = await res.json();
      alert(`Moved ${data.count} photos to .trash`);
      fetchPhotos();
    } catch (err) {
      console.error(err);
      alert("Failed to apply changes.");
    } finally {
      setApplying(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (viewMode !== "detail") return;

    switch (e.key) {
      case "ArrowLeft":
        setCurrentIndex(prev => Math.max(0, prev - 1));
        break;
      case "ArrowRight":
        setCurrentIndex(prev => Math.min(photos.length - 1, prev + 1));
        break;
      case "k":
      case "K":
        if (photos[currentIndex]) {
          updateStatus(photos[currentIndex].filename, "keep");
          setCurrentIndex(prev => Math.min(photos.length - 1, prev + 1));
        }
        break;
      case "t":
      case "T":
      case "Backspace":
        if (photos[currentIndex]) {
          updateStatus(photos[currentIndex].filename, "trash");
          setCurrentIndex(prev => Math.min(photos.length - 1, prev + 1));
        }
        break;
      case "g":
      case "G":
        setViewMode("grid");
        break;
    }
  }, [viewMode, photos, currentIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentPhoto = photos[currentIndex];
  const stats = {
    total: photos.length,
    keep: photos.filter(p => p.status === "keep").length,
    trash: photos.filter(p => p.status === "trash").length,
    pending: photos.filter(p => p.status === "pending").length,
  };

  if (loading && photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-50 text-zinc-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
        <p className="font-medium">Connecting to Synology...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <ImageIcon size={18} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">SynoPhoto Cull</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stats.keep} Keep</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{stats.trash} Trash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-zinc-300" />
              <span>{stats.pending} Pending</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === "grid" ? "detail" : "grid")}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-600"
              title={viewMode === "grid" ? "Detail View" : "Grid View"}
            >
              {viewMode === "grid" ? <Maximize2 size={20} /> : <Grid size={20} />}
            </button>
            <button 
              onClick={applyChanges}
              disabled={stats.trash === 0 || applying}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Archive size={16} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
            <p className="text-zinc-500 max-w-md mb-6">{error}</p>
            <button 
              onClick={fetchPhotos}
              className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800"
            >
              Retry Connection
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <ImageIcon className="w-12 h-12 text-zinc-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Photos Found</h2>
            <p className="text-zinc-500 max-w-md">
              Add some photos to the <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">/photos</code> directory on your NAS to get started.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.filename}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setCurrentIndex(index);
                    setViewMode("detail");
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    currentIndex === index ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-transparent"
                  }`}
                >
                  <img 
                    src={photo.thumbUrl} 
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/300x300?text=Error+Loading+Image`;
                    }}
                  />
                  {photo.status !== "pending" && (
                    <div className={`absolute top-2 right-2 p-1 rounded-full ${
                      photo.status === "keep" ? "bg-emerald-500" : "bg-rose-500"
                    } text-white shadow-lg`}>
                      {photo.status === "keep" ? <Check size={12} /> : <Trash2 size={12} />}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 relative flex items-center justify-center bg-zinc-100/50">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhoto?.filename}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="w-full h-full flex items-center justify-center p-4 md:p-8"
                >
                  <div className="relative max-w-full max-h-full shadow-2xl rounded-2xl overflow-hidden bg-white">
                    <img 
                      src={currentPhoto?.url} 
                      alt={currentPhoto?.filename}
                      className="max-w-full max-h-[70vh] object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/800x600?text=Error+Loading+Full+Image`;
                      }}
                    />
                    
                    {/* Status Overlay */}
                    {currentPhoto?.status !== "pending" && (
                      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[2px]`}>
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl ${
                          currentPhoto.status === "keep" ? "bg-emerald-500" : "bg-rose-500"
                        } text-white font-bold text-xl uppercase tracking-widest`}>
                          {currentPhoto.status === "keep" ? <Check size={28} /> : <Trash2 size={28} />}
                          <span>{currentPhoto.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows */}
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="absolute left-4 p-3 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white transition-all text-zinc-600 disabled:opacity-0"
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(photos.length - 1, prev + 1))}
                className="absolute right-4 p-3 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white transition-all text-zinc-600 disabled:opacity-0"
                disabled={currentIndex === photos.length - 1}
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Controls Footer */}
            <div className="bg-white border-t border-zinc-200 p-6">
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Filename</span>
                    <span className="text-lg font-semibold truncate max-w-[200px] md:max-w-md">{currentPhoto?.filename}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Progress</span>
                    <div className="text-lg font-semibold">{currentIndex + 1} / {photos.length}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / photos.length) * 100}%` }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      updateStatus(currentPhoto.filename, "trash");
                      if (currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
                    }}
                    className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-100 hover:border-rose-200 transition-all group"
                  >
                    <Trash2 size={32} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-xs">Trash (T)</span>
                  </button>
                  <button 
                    onClick={() => {
                      updateStatus(currentPhoto.filename, "keep");
                      if (currentIndex < photos.length - 1) setCurrentIndex(prev => prev + 1);
                    }}
                    className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl bg-emerald-50 text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 transition-all group"
                  >
                    <Check size={32} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold uppercase tracking-widest text-xs">Keep (K)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Keyboard Hint (Desktop Only) */}
      <div className="hidden lg:block fixed bottom-4 right-4 text-[10px] text-zinc-400 font-mono uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
        ← Prev · → Next · K Keep · T Trash · G Grid
      </div>
    </div>
  );
}
