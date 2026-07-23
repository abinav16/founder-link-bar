import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";

type Props = {
  file: File | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

const BOX = 320;
const OUTPUT = 512;

export function AvatarCropDialog({ file, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); setImg(null); return; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      // fit shortest side to BOX
      const base = BOX / Math.min(i.width, i.height);
      setZoom(base);
      setOffset({ x: 0, y: 0 });
    };
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    setOffset({ x: e.clientX - draggingRef.current.x, y: e.clientY - draggingRef.current.y });
  }
  function onPointerUp() { draggingRef.current = null; }

  async function confirm() {
    if (!img) return;
    setProcessing(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d")!;
    // scale from preview coords to output
    const scale = OUTPUT / BOX;
    const drawW = img.width * zoom * scale;
    const drawH = img.height * zoom * scale;
    const cx = OUTPUT / 2 + offset.x * scale;
    const cy = OUTPUT / 2 + offset.y * scale;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

    // compress: try 0.9, drop until <= 300KB
    let quality = 0.9;
    let blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    while (blob && blob.size > 300 * 1024 && quality > 0.5) {
      quality -= 0.1;
      blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    }
    setProcessing(false);
    if (blob) onConfirm(blob);
  }

  if (!file) return null;

  const previewW = img ? img.width * zoom : 0;
  const previewH = img ? img.height * zoom : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-black">Crop your photo</h3>
          <button type="button" onClick={onCancel} className="rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-black">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mx-auto overflow-hidden rounded-lg bg-black/5 select-none touch-none"
          style={{ width: BOX, height: BOX, cursor: draggingRef.current ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && img && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: BOX / 2 - previewW / 2 + offset.x,
                top: BOX / 2 - previewH / 2 + offset.y,
                width: previewW,
                height: previewH,
                maxWidth: "none",
                pointerEvents: "none",
              }}
            />
          )}
          {/* circular mask */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: `0 0 0 9999px rgba(255,255,255,0.75)`,
              borderRadius: "50%",
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[11px] font-medium text-black/50">Zoom</label>
          <input
            type="range"
            min={0.2}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-black"
          />
        </div>

        <p className="mt-3 text-[11px] text-black/40">Drag to reposition · scroll or use slider to zoom. We'll crop and compress for you.</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-black/60 hover:border-black/25 hover:text-black"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={processing || !img}
            onClick={confirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85 disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> {processing ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
