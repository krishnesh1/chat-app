import { useEffect } from "react";
import { X, Download, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { downloadImage } from "../lib/utils";

const ImageLightbox = ({ isOpen, onClose, imageUrl, onForward }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadImage(imageUrl);
  };

  const handleForward = (e) => {
    e.stopPropagation();
    onForward({ image: imageUrl, text: "" });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn"
    >
      {/* Top Floating Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 bg-base-100/20 backdrop-blur-lg border border-white/10 rounded-2xl p-1.5 shadow-2xl z-20"
      >
        <button
          onClick={handleForward}
          className="btn btn-sm btn-ghost text-white hover:bg-white/20 gap-1.5 rounded-xl"
          title="Forward to contact"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline text-xs">Forward</span>
        </button>

        <button
          onClick={handleDownload}
          className="btn btn-sm btn-primary gap-1.5 rounded-xl shadow-lg shadow-primary/30"
          title="Save image to device"
        >
          <Download className="size-4" />
          <span className="hidden sm:inline text-xs">Download</span>
        </button>

        <div className="w-[1px] h-6 bg-white/20 my-auto mx-1" />

        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20"
          title="Close (Esc)"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Image Container with high-res display */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[88vh] flex items-center justify-center p-2"
      >
        <img
          src={imageUrl}
          alt="Full screen preview"
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10"
        />
      </div>
    </div>
  );
};

export default ImageLightbox;
