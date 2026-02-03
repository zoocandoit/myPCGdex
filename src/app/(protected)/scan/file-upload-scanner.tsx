"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Loader2,
  XCircle,
  ImageIcon,
  X,
} from "lucide-react";
import { uploadCardImage } from "@/lib/actions/storage";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ResultForm } from "./result-form";
import { TCGCard } from "@/lib/tcg/types";

type UploadState = "idle" | "preview" | "uploading" | "analyzing" | "done";

export function FileUploadScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [state, setState] = useState<UploadState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  // TODO: Phase 5 - use selectedCard for saving to collection
  const [_selectedCard, setSelectedCard] = useState<TCGCard | null>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, WebP, or HEIC)");
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      setMimeType(file.type);

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImage(result);
        setState("preview");
        setResult(null);
        setSelectedCard(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedImage(null);
    setState("idle");
    setResult(null);
    setSelectedCard(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const analyzeCard = useCallback(async () => {
    if (!selectedImage) return;

    setState("uploading");

    try {
      // Upload image to Supabase Storage
      const uploadResult = await uploadCardImage(selectedImage, mimeType);

      if (!uploadResult.success || !uploadResult.signedUrl) {
        setResult({
          success: false,
          error: uploadResult.error || "Upload failed",
        });
        setState("done");
        return;
      }

      setState("analyzing");

      // Call Vision API
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadResult.signedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setResult({
          success: false,
          error: errorData.error || "Analysis failed",
          imageUrl: uploadResult.signedUrl,
        });
        setState("done");
        return;
      }

      const data: VisionResponse = await response.json();
      setResult({
        success: true,
        data,
        imageUrl: uploadResult.signedUrl,
      });
      setState("done");
    } catch (error) {
      console.error("[Upload Scan Error]", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      });
      setState("done");
    }
  }, [selectedImage, mimeType]);

  const handleCardSelect = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    // TODO: Phase 5 - Save to collection
    console.log("[Card Selected]", card.id, card.name);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload area / Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {state === "idle" ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-muted/50 transition-colors hover:bg-muted"
            >
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Click to upload image</p>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG, WebP, or HEIC (max 10MB)
                </p>
              </div>
            </button>
          ) : selectedImage ? (
            <div className="relative aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Selected card"
                className="h-full w-full object-contain"
              />
              {state === "preview" && (
                <button
                  onClick={clearSelection}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              {(state === "uploading" || state === "analyzing") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span>
                      {state === "uploading" ? "Uploading..." : "Analyzing..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex gap-2">
        {state === "idle" && (
          <Button
            onClick={() => inputRef.current?.click()}
            variant="outline"
            className="flex-1"
          >
            <Upload className="mr-2 h-5 w-5" />
            Select Image
          </Button>
        )}

        {state === "preview" && (
          <>
            <Button onClick={clearSelection} variant="outline" className="flex-1">
              <X className="mr-2 h-5 w-5" />
              Cancel
            </Button>
            <Button onClick={analyzeCard} className="flex-1">
              <Upload className="mr-2 h-5 w-5" />
              Analyze
            </Button>
          </>
        )}

        {(state === "uploading" || state === "analyzing") && (
          <Button disabled className="flex-1">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {state === "uploading" ? "Uploading..." : "Analyzing..."}
          </Button>
        )}

        {state === "done" && (
          <Button onClick={clearSelection} variant="outline" className="flex-1">
            <Upload className="mr-2 h-5 w-5" />
            Upload Another
          </Button>
        )}
      </div>

      {/* Result */}
      {result && state === "done" && (
        <>
          {result.success && result.data ? (
            <ResultForm
              visionResult={result.data}
              onCardSelect={handleCardSelect}
            />
          ) : (
            <Card className="border-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>{result.error || "Analysis failed"}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
