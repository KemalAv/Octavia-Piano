import React, { useState, useEffect } from "react";
import { RotateCcw, X, Repeat } from "lucide-react";

interface GameOverModalProps {
  isVisible: boolean;
  reason: string;
  onClose: () => void;
  onRetry?: () => void;
  isLooping?: boolean;
  loopStartMs?: number | null;
  loopEndMs?: number | null;
  lowDetailMode?: boolean;
}

const formatTime = (ms: number | null) => {
  if (ms === null || isNaN(ms) || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const GameOverModal: React.FC<GameOverModalProps> = ({
  isVisible,
  reason,
  onClose,
  onRetry,
  isLooping = false,
  loopStartMs = null,
  loopEndMs = null,
  lowDetailMode = false,
}) => {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const isLoopActive = isLooping && loopStartMs !== null;

  return (
    <div
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out ${
        isRendered ? "bg-opacity-80" : "bg-opacity-0"
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div
        className={`p-8 md:p-10 rounded-2xl shadow-2xl text-center max-w-md w-full ring-2 ring-red-500/80 transform transition-all duration-300 ease-in-out ${
          lowDetailMode
            ? "bg-slate-900 border border-red-500/30"
            : "bg-slate-900/90 backdrop-blur-md border border-red-500/40"
        } ${isRendered ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <h2
          id="game-over-title"
          className="text-4xl md:text-5xl font-black text-red-400 mb-3 tracking-wide"
        >
          Game Over
        </h2>

        <p className="text-base text-slate-300 mb-4">
          Darah Anda habis (HP 0). Performa Anda tidak mencukupi untuk melanjutkan lagu saat ini.
        </p>

        {reason && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3 mb-5">
            <p className="text-sm text-yellow-300 italic font-medium">
              {reason}
            </p>
          </div>
        )}

        {isLoopActive && (
          <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3.5 mb-6 text-left flex items-start gap-3">
            <Repeat className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0 animate-spin" style={{ animationDuration: "4s" }} />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Mode Loop Aktif
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengulangan akan otomatis kembali ke <strong>Titik A ({formatTime(loopStartMs)})</strong> dengan darah (HP) penuh.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-xl text-lg transition-all duration-150 ease-in-out transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
              aria-label={isLoopActive ? "Ulangi dari Titik A" : "Coba Lagi"}
            >
              <RotateCcw className="w-5 h-5" />
              <span>{isLoopActive ? "Ulangi dari Titik A" : "Coba Lagi"}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-base transition-all duration-150 ease-in-out ${
              onRetry
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                : "bg-cyan-500 hover:bg-cyan-600 text-white text-lg font-bold"
            }`}
            aria-label="Tutup dan kembali"
          >
            <X className="w-4 h-4" />
            <span>{isLoopActive ? "Tutup (Tetap di Titik A)" : "Tutup"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
