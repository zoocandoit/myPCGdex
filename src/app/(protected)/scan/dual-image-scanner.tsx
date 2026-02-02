"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Loader2,
  XCircle,
  ImageIcon,
  X,
  ArrowRight,
  RotateCcw,
  Check,
} from "lucide-react";
import { uploadCardImage } from "@/lib/actions/storage";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ResultForm } from "./result-form";
import { TCGCard } from "@/lib/tcg/types";

type Step = "front" | "back" | "review" | "uploading" | "analyzing" | "done";

interface CardImages {
  front: string | null;
  back: string | null;
  frontMimeType: string;
  backMimeType: string;
}

export function DualImageScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("front");
  const [images, setImages] = useState<CardImages>({
    front: null,
    back: null,
    frontMimeType: "image/jpeg",
    backMimeType: "image/jpeg",
  });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<{
    front?: string;
    back?: string;
  }>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile (touch device)
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsMobile(isTouchDevice);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, WebP, or HEIC)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;

        if (step === "front") {
          setImages((prev) => ({
            ...prev,
            front: imageData,
            frontMimeType: file.type,
          }));
          setStep("back");
        } else if (step === "back") {
          setImages((prev) => ({
            ...prev,
            back: imageData,
            backMimeType: file.type,
          }));
          setStep("review");
        }
      };
      reader.readAsDataURL(file);

      // Reset input for next selection
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [step]
  );

  const resetAll = useCallback(() => {
    setImages({
      front: null,
      back: null,
      frontMimeType: "image/jpeg",
      backMimeType: "image/jpeg",
    });
    setStep("front");
    setResult(null);
    setSelectedCard(null);
    setUploadedPaths({});
  }, []);

  const retakeFront = useCallback(() => {
    setImages((prev) => ({ ...prev, front: null }));
    setStep("front");
  }, []);

  const retakeBack = useCallback(() => {
    setImages((prev) => ({ ...prev, back: null }));
    setStep("back");
  }, []);

  const analyzeCard = useCallback(async () => {
    if (!images.front || !images.back) return;

    setStep("uploading");

    try {
      // Upload front image
      const frontResult = await uploadCardImage(
        images.front,
        images.frontMimeType
      );
      if (!frontResult.success || !frontResult.signedUrl) {
        setResult({
          success: false,
          error: `Front image upload failed: ${frontResult.error}`,
        });
        setStep("done");
        return;
      }

      // Upload back image
      const backResult = await uploadCardImage(
        images.back,
        images.backMimeType
      );
      if (!backResult.success) {
        setResult({
          success: false,
          error: `Back image upload failed: ${backResult.error}`,
        });
        setStep("done");
        return;
      }

      setUploadedPaths({
        front: frontResult.path,
        back: backResult.path,
      });

      setStep("analyzing");

      // Analyze front image with Vision API
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: frontResult.signedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setResult({
          success: false,
          error: errorData.error || "Analysis failed",
          imageUrl: frontResult.signedUrl,
        });
        setStep("done");
        return;
      }

      const data: VisionResponse = await response.json();
      setResult({
        success: true,
        data,
        imageUrl: frontResult.signedUrl,
      });
      setStep("done");
    } catch (error) {
      console.error("[Dual Scan Error]", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      });
      setStep("done");
    }
  }, [images]);

  const handleCardSelect = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    // TODO: Phase 5 - Save to collection with front/back paths
    console.log("[Card Selected]", card.id, card.name);
  }, []);

  const getStepTitle = () => {
    switch (step) {
      case "front":
        return "Step 1: Upload Front of Card";
      case "back":
        return "Step 2: Upload Back of Card";
      case "review":
        return "Review Images";
      case "uploading":
        return "Uploading...";
      case "analyzing":
        return "Analyzing...";
      case "done":
        return "Analysis Complete";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "front":
        return "Upload a clear photo of the front of your Pokemon card";
      case "back":
        return "Now upload a photo of the back of the same card";
      case "review":
        return "Check both images before analyzing";
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input - uses camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture={isMobile ? "environment" : undefined}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            step === "front"
              ? "bg-primary text-primary-foreground"
              : images.front
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {images.front ? <Check className="h-4 w-4" /> : "1"}
        </div>
        <div className="h-px w-8 bg-muted" />
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            step === "back"
              ? "bg-primary text-primary-foreground"
              : images.back
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {images.back ? <Check className="h-4 w-4" /> : "2"}
        </div>
        <div className="h-px w-8 bg-muted" />
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            step === "review" || step === "uploading" || step === "analyzing"
              ? "bg-primary text-primary-foreground"
              : step === "done"
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {step === "done" ? <Check className="h-4 w-4" /> : "3"}
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="font-medium">{getStepTitle()}</h3>
        {getStepDescription() && (
          <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
        )}
      </div>

      {/* Upload area for front/back */}
      {(step === "front" || step === "back") && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 bg-muted/50 transition-colors hover:bg-muted"
            >
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">
                  {isMobile
                    ? step === "front"
                      ? "Take Photo of Front"
                      : "Take Photo of Back"
                    : step === "front"
                      ? "Upload Front Image"
                      : "Upload Back Image"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMobile ? "Tap to open camera" : "JPEG, PNG, WebP, or HEIC (max 10MB)"}
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Review both images */}
      {step === "review" && (
        <div className="grid grid-cols-2 gap-3">
          {/* Front */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  Front
                </div>
                <button
                  onClick={retakeFront}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images.front!}
                  alt="Card front"
                  className="aspect-[2.5/3.5] w-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  Back
                </div>
                <button
                  onClick={retakeBack}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images.back!}
                  alt="Card back"
                  className="aspect-[2.5/3.5] w-full object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading state */}
      {(step === "uploading" || step === "analyzing") && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {step === "uploading" ? "Uploading images..." : "Analyzing card..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {step === "front" && (
          <Button
            onClick={() => inputRef.current?.click()}
            className="flex-1"
          >
            {isMobile ? (
              <Camera className="mr-2 h-5 w-5" />
            ) : (
              <Upload className="mr-2 h-5 w-5" />
            )}
            {isMobile ? "Take Front Photo" : "Select Front Image"}
          </Button>
        )}

        {step === "back" && (
          <>
            <Button onClick={retakeFront} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-5 w-5" />
              Retake Front
            </Button>
            <Button
              onClick={() => inputRef.current?.click()}
              className="flex-1"
            >
              {isMobile ? (
                <Camera className="mr-2 h-5 w-5" />
              ) : (
                <Upload className="mr-2 h-5 w-5" />
              )}
              {isMobile ? "Take Back Photo" : "Select Back Image"}
            </Button>
          </>
        )}

        {step === "review" && (
          <>
            <Button onClick={resetAll} variant="outline" className="flex-1">
              <X className="mr-2 h-5 w-5" />
              Start Over
            </Button>
            <Button onClick={analyzeCard} className="flex-1">
              <ArrowRight className="mr-2 h-5 w-5" />
              Analyze Card
            </Button>
          </>
        )}

        {step === "done" && (
          <Button onClick={resetAll} variant="outline" className="flex-1">
            <Upload className="mr-2 h-5 w-5" />
            Scan Another Card
          </Button>
        )}
      </div>

      {/* Result */}
      {result && step === "done" && (
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
