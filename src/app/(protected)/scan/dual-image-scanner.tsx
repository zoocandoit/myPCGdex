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
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { uploadCardImage } from "@/lib/actions/storage";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ResultForm } from "./result-form";
import { TCGCard } from "@/lib/tcg/types";
import {
  preprocessImage,
  validateImageFile,
  isHeicFile,
} from "@/lib/image/preprocess";

type Step =
  | "front"
  | "back"
  | "converting"
  | "review"
  | "uploading"
  | "analyzing"
  | "done";

interface CardImages {
  front: string | null;
  back: string | null;
  frontMimeType: string;
  backMimeType: string;
}

interface ProcessingError {
  message: string;
  canRetry: boolean;
  step: "front" | "back" | "upload" | "analyze";
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
  // TODO: Phase 5 - use selectedCard and uploadedPaths for saving to collection
  const [_selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [_uploadedPaths, setUploadedPaths] = useState<{
    front?: string;
    back?: string;
  }>({});
  const [isMobile, setIsMobile] = useState(() => {
    // Initial value from SSR-safe check
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  });
  const [processingError, setProcessingError] =
    useState<ProcessingError | null>(null);
  const [convertingTarget, setConvertingTarget] = useState<
    "front" | "back" | null
  >(null);
  const pendingFileRef = useRef<File | null>(null);

  // Re-check on mount in case SSR value was wrong
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice !== isMobile) {
      setIsMobile(isTouchDevice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback(
    async (file: File, target: "front" | "back") => {
      // Validate file first
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setProcessingError({
          message: validation.error || "Invalid file",
          canRetry: true,
          step: target,
        });
        return;
      }

      // Check if we need to convert (HEIC or large file)
      const needsConversion =
        isHeicFile(file) ||
        file.size > 2 * 1024 * 1024 || // > 2MB
        !["image/jpeg", "image/png", "image/webp"].includes(file.type);

      if (needsConversion) {
        setConvertingTarget(target);
        setStep("converting");
      }

      try {
        // Preprocess the image (convert HEIC, resize, fix orientation)
        const processed = await preprocessImage(file, {
          maxDimension: 1400,
          quality: 0.85,
          targetFormat: "image/jpeg",
        });

        if (target === "front") {
          setImages((prev) => ({
            ...prev,
            front: processed.dataUrl,
            frontMimeType: processed.mimeType,
          }));
          setStep("back");
        } else {
          setImages((prev) => ({
            ...prev,
            back: processed.dataUrl,
            backMimeType: processed.mimeType,
          }));
          setStep("review");
        }

        setProcessingError(null);
        setConvertingTarget(null);
      } catch (error) {
        console.error("[Image Processing Error]", error);
        setProcessingError({
          message:
            error instanceof Error
              ? error.message
              : "Failed to process image. Please try a different photo.",
          canRetry: true,
          step: target,
        });
        setStep(target);
        setConvertingTarget(null);
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input for next selection
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      // Determine target based on current step
      const target = step === "front" || step === "converting" ? "front" : "back";
      pendingFileRef.current = file;

      await processFile(file, target);
    },
    [step, processFile]
  );

  const retryProcessing = useCallback(async () => {
    if (!pendingFileRef.current || !processingError) return;

    setProcessingError(null);
    await processFile(pendingFileRef.current, processingError.step as "front" | "back");
  }, [processingError, processFile]);

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
    setProcessingError(null);
    pendingFileRef.current = null;
  }, []);

  const retakeFront = useCallback(() => {
    setImages((prev) => ({ ...prev, front: null }));
    setStep("front");
    setProcessingError(null);
  }, []);

  const retakeBack = useCallback(() => {
    setImages((prev) => ({ ...prev, back: null }));
    setStep("back");
    setProcessingError(null);
  }, []);

  const analyzeCard = useCallback(async () => {
    if (!images.front || !images.back) return;

    setStep("uploading");
    setProcessingError(null);

    try {
      // Upload front image
      const frontResult = await uploadCardImage(
        images.front,
        images.frontMimeType
      );
      if (!frontResult.success || !frontResult.signedUrl) {
        setProcessingError({
          message: frontResult.error || "Failed to upload front image",
          canRetry: true,
          step: "upload",
        });
        setStep("review");
        return;
      }

      // Upload back image
      const backResult = await uploadCardImage(
        images.back,
        images.backMimeType
      );
      if (!backResult.success) {
        setProcessingError({
          message: backResult.error || "Failed to upload back image",
          canRetry: true,
          step: "upload",
        });
        setStep("review");
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
        const errorMessage = errorData.error || "Analysis failed";

        // Provide actionable error messages
        let actionableMessage = errorMessage;
        if (errorMessage.includes("card number")) {
          actionableMessage = "Could not read card number. Try taking a clearer photo with better lighting.";
        } else if (errorMessage.includes("not a Pokemon card")) {
          actionableMessage = "This doesn't appear to be a Pokemon card. Please scan a valid card.";
        }

        setResult({
          success: false,
          error: actionableMessage,
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
        error:
          error instanceof Error
            ? error.message
            : "Scan failed. Please check your connection and try again.",
      });
      setStep("done");
    }
  }, [images]);

  const retryAnalysis = useCallback(() => {
    setResult(null);
    setStep("review");
    setProcessingError(null);
  }, []);

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
      case "converting":
        return "Processing Image...";
      case "review":
        return "Review Images";
      case "uploading":
        return "Uploading Images...";
      case "analyzing":
        return "Analyzing Card...";
      case "done":
        return result?.success ? "Analysis Complete" : "Analysis Failed";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "front":
        return "Upload a clear photo of the front of your Pokemon card";
      case "back":
        return "Now upload a photo of the back of the same card";
      case "converting":
        return convertingTarget === "front"
          ? "Converting front image..."
          : "Converting back image...";
      case "review":
        return "Check both images before analyzing";
      case "uploading":
        return "Securely uploading your images...";
      case "analyzing":
        return "AI is reading the card details...";
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
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture={isMobile ? "environment" : undefined}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            step === "front" || step === "converting"
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
                ? result?.success
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {step === "done" ? (
            result?.success ? (
              <Check className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )
          ) : (
            "3"
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="font-medium">{getStepTitle()}</h3>
        {getStepDescription() && (
          <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
        )}
      </div>

      {/* Processing Error Banner */}
      {processingError && step !== "done" && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {processingError.message}
                </p>
                {processingError.canRetry && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-amber-700"
                    onClick={retryProcessing}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Try again
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Converting state */}
      {step === "converting" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-muted-foreground">
                Converting image...
              </p>
              <p className="text-xs text-muted-foreground">
                Optimizing for best results
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                  {isMobile
                    ? "Tap to open camera"
                    : "JPEG, PNG, WebP, or HEIC (max 10MB)"}
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
            <div className="text-center">
              <p className="font-medium text-muted-foreground">
                {step === "uploading" ? "Uploading images..." : "Analyzing card..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {step === "uploading"
                  ? "Securely storing your photos"
                  : "AI is reading card details"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {step === "front" && (
          <Button onClick={() => inputRef.current?.click()} className="flex-1">
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
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-red-600">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>{result.error || "Analysis failed"}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryAnalysis}
                    className="self-start"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again with Same Images
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
