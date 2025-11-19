"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eraser, Pen, Type } from "lucide-react";

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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "draw" | "type")}>
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
            <div className="border-2 border-zinc-300 rounded-lg bg-white dark:bg-zinc-950">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-[200px] cursor-crosshair rounded-lg",
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

            <div className="flex justify-between items-center">
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
              <p className="text-xs text-zinc-500">
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
              <div className="border-2 border-zinc-300 rounded-lg bg-white dark:bg-zinc-950 p-8 min-h-[200px] flex items-center justify-center">
                <p
                  className="text-5xl text-center"
                  style={{ fontFamily: "'Brush Script MT', cursive" }}
                >
                  {typedName}
                </p>
              </div>
            )}

            <p className="text-xs text-zinc-500">
              Your typed name will be used as your signature
            </p>
          </TabsContent>
        </Tabs>

        {certificationText && (
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {certificationText}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            Save Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
