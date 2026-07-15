import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "../icons";

export function useLightbox(images: string[]) {
  const [index, setIndex] = useState<number | null>(null);
  return {
    open: (i: number) => setIndex(i),
    close: () => setIndex(null),
    node:
      index !== null ? (
        <Lightbox images={images} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} />
      ) : null,
  };
}

function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, images.length]);

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] bg-black/85 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="დახურვა"
        className="absolute top-4 right-4 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
      >
        <X size={22} />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
          aria-label="წინა"
          className="absolute left-2 sm:left-6 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
        >
          <ChevronLeft size={26} />
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[86vh] object-contain rounded-lg shadow-2xl"
      />

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
          aria-label="შემდეგი"
          className="absolute right-2 sm:right-6 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
        >
          <ChevronRight size={26} />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 text-white/80 text-sm">
          {index + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  );
}
