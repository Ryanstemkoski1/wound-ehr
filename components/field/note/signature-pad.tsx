"use client";

// Signature capture with clean chrome, built directly on the
// react-signature-canvas package (foundation, not legacy — no
// components/signatures imports). Two modes: draw on canvas, or
// "Type instead" which renders the typed name in a cursive face onto
// an offscreen canvas at submit time. Always a white surface so the
// exported PNG embeds correctly in the PDF regardless of app theme.

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, PenLine, Type, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CURSIVE_STACK = "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";

export interface SignaturePadHandle {
  /** Null when nothing usable has been captured in the active mode. */
  getSignature: () => { dataUrl: string; method: "draw" | "type" } | null;
}

export interface SignaturePadProps {
  onStateChange: (hasSignature: boolean) => void;
  ref?: React.Ref<SignaturePadHandle>;
}

function typedDataUrl(name: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1f2937";
    let size = 96;
    ctx.font = `italic ${size}px ${CURSIVE_STACK}`;
    while (size > 28 && ctx.measureText(name).width > canvas.width - 80) {
      size -= 8;
      ctx.font = `italic ${size}px ${CURSIVE_STACK}`;
    }
    ctx.textBaseline = "middle";
    ctx.fillText(name, 40, canvas.height / 2);
  }
  return canvas.toDataURL("image/png");
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}

export function SignaturePad({ onStateChange, ref }: SignaturePadProps) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [drawn, setDrawn] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const widthRef = useRef(0);
  const sigRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fit the canvas bitmap to its container; a resize recreates the
  // bitmap, so any in-progress drawing is cleared (and flagged as such).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const target = containerRef.current;
      if (!target) return;
      const w = Math.max(260, Math.floor(target.clientWidth) - 4);
      if (widthRef.current !== 0 && widthRef.current !== w) {
        sigRef.current?.clear();
        setDrawn(false);
      }
      widthRef.current = w;
      setCanvasWidth(w);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode]);

  const hasSignature = mode === "draw" ? drawn : typedName.trim().length >= 2;
  useEffect(() => {
    onStateChange(hasSignature);
  }, [hasSignature, onStateChange]);

  useImperativeHandle(
    ref,
    () => ({
      getSignature: () => {
        if (mode === "draw") {
          const pad = sigRef.current;
          if (!pad || pad.isEmpty()) return null;
          return { dataUrl: pad.getCanvas().toDataURL("image/png"), method: "draw" as const };
        }
        const name = typedName.trim();
        if (name.length < 2) return null;
        return { dataUrl: typedDataUrl(name), method: "type" as const };
      },
    }),
    [mode, typedName]
  );

  return (
    <div>
      <div role="tablist" aria-label="Signature method" className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
        {/* The canvas is recreated on tab switches — reset drawn so a
            Draw -> Type -> Draw round-trip can't submit an empty canvas. */}
        <TabButton
          active={mode === "draw"}
          onClick={() => {
            setMode("draw");
            setDrawn(false);
          }}
          icon={PenLine}
          label="Draw"
        />
        <TabButton active={mode === "type"} onClick={() => setMode("type")} icon={Type} label="Type instead" />
      </div>

      {mode === "draw" ? (
        <div>
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-white"
          >
            {canvasWidth > 0 && (
              <SignatureCanvas
                ref={sigRef}
                penColor="#1f2937"
                backgroundColor="rgba(255,255,255,1)"
                clearOnResize={false}
                onEnd={() => setDrawn(!(sigRef.current?.isEmpty() ?? true))}
                canvasProps={{
                  width: canvasWidth,
                  height: 180,
                  className: "block touch-none",
                  "aria-label": "Signature drawing area",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-gray-300" />
            {!drawn && (
              <p className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm text-gray-400">
                Sign here with your finger or stylus
              </p>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!drawn}
              onClick={() => {
                sigRef.current?.clear();
                setDrawn(false);
              }}
            >
              <Eraser /> Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            autoComplete="name"
            maxLength={80}
            aria-label="Typed signature name"
          />
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-white px-4">
            {typedName.trim() ? (
              <span className="truncate text-3xl text-gray-800 italic" style={{ fontFamily: CURSIVE_STACK }}>
                {typedName.trim()}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Your typed signature will appear here</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
