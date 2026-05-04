"use client";

import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eraser, Pen, Type } from "lucide-react";
import { useMobile } from "@/lib/hooks/use-media-query";

type SignaturePadProps = {
  onSave: (signatureData: string, method: "draw" | "type") => void;
  onCancel: () => void;
  signerName?: string;
  title?: string;
  description?: string;
  certificationText?: string;
};

export function SignaturePad({
  onSave,
  onCancel,
  signerName = "",
  title = "Sign Below",
  description = "Please sign using your finger, stylus, or mouse",
  certificationText = "By signing, I certify that the information provided is accurate and complete.",
}: SignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [typedName, setTypedName] = useState(signerName);
  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [isEmpty, setIsEmpty] = useState(true);
  const isMobile = useMobile();

  // Resize canvas when window resizes so the internal bitmap matches
  // the CSS-rendered size (prevents blurry strokes on retina / resize).
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resize = () => {
      const canvas = signatureRef.current?.getCanvas();
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    // Small delay to let layout settle
    const id = setTimeout(resize, 50);
    window.addEventListener("resize", resize);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", resize);
    };
  }, [activeTab]);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (activeTab === "draw") {
      if (signatureRef.current && !signatureRef.current.isEmpty()) {
        const signatureData = signatureRef.current.toDataURL("image/png");
        onSave(signatureData, "draw");
      }
    } else {
      if (typedName.trim().length > 0) {
        // Generate a signature image from typed name
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 150;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.font = "48px 'Brush Script MT', cursive";
          ctx.fillStyle = "black";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

          const signatureData = canvas.toDataURL("image/png");
          onSave(signatureData, "type");
        }
      }
    }
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  const isSaveDisabled =
    activeTab === "draw" ? isEmpty : typedName.trim().length === 0;

  // Responsive canvas height: 260px on phones, 200px on desktop
  const canvasHeight = isMobile ? 260 : 200;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "draw" | "type")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="gap-2">
              <Pen className="h-4 w-4" />
              Draw Signature
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-2">
              <Type className="h-4 w-4" />
              Type Name
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            <div
              ref={containerRef}
              className="border-border bg-background rounded-lg border-2"
              style={{ height: canvasHeight }}
            >
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-full cursor-crosshair rounded-lg",
                  style: { touchAction: "none" },
                }}
                backgroundColor="transparent"
                penColor="black"
                minWidth={0.5}
                maxWidth={2.5}
                throttle={16}
                onEnd={handleSignatureEnd}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-2"
              >
                <Eraser className="h-4 w-4" />
                Clear
              </Button>
              <p className="text-muted-foreground text-xs">
                Use your mouse, finger, or stylus to sign
              </p>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="typed-name">Full Name</Label>
              <Input
                id="typed-name"
                type="text"
                placeholder="Enter your full name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="text-lg"
              />
            </div>

            {typedName.trim().length > 0 && (
              <div className="border-border bg-background flex min-h-[200px] items-center justify-center rounded-lg border-2 p-8">
                <p
                  className="text-center text-5xl"
                  style={{ fontFamily: "'Brush Script MT', cursive" }}
                >
                  {typedName}
                </p>
              </div>
            )}

            <p className="text-muted-foreground text-xs">
              Your typed name will be used as your signature
            </p>
          </TabsContent>
        </Tabs>

        {certificationText && (
          <div className="border-border/60 bg-muted/30 dark:border-border dark:bg-card rounded-lg border p-4">
            <p className="text-foreground text-sm">{certificationText}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaveDisabled}>
            Save Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
