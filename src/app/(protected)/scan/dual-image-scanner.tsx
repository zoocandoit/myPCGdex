"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Upload,
  Loader2,
  XCircle,
  ImageIcon,
  X,
  RotateCcw,
  RotateCw,
  Check,
  RefreshCw,
  AlertCircle,
  Edit3,
} from "lucide-react";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ConfirmSaveForm } from "./confirm-save-form";
import { ManualEntryForm } from "./manual-entry-form";
import {
  preprocessImage,
  validateImageFile,
  isHeicFile,
  rotateImage,
} from "@/lib/image/preprocess";
import { ocrCardFront, type OcrProgress } from "@/lib/ocr/card-ocr";

type Step =
  | "front"
  | "back"
  | "converting"
  | "review"
  | "analyzing"
  | "done"
  | "manual";

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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  });
  const [processingError, setProcessingError] =
    useState<ProcessingError | null>(null);
  const [_convertingTarget, setConvertingTarget] = useState<
    "front" | "back" | null
  >(null);
  const pendingFileRef = useRef<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);

  const t = useTranslations("scan");
  const tCommon = useTranslations("common");

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
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setProcessingError({
          message: validation.error || "Invalid file",
          canRetry: true,
          step: target,
        });
        return;
      }

      const needsConversion =
        isHeicFile(file) ||
        file.size > 2 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type);

      if (needsConversion) {
        setConvertingTarget(target);
        setStep("converting");
      }

      try {
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

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      const target =
        step === "front" || step === "converting" ? "front" : "back";
      pendingFileRef.current = file;

      await processFile(file, target);
    },
    [step, processFile]
  );

  const retryProcessing = useCallback(async () => {
    if (!pendingFileRef.current || !processingError) return;

    setProcessingError(null);
    await processFile(
      pendingFileRef.current,
      processingError.step as "front" | "back"
    );
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
    setProcessingError(null);
    setOcrProgress(null);
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

  const [isRotating, setIsRotating] = useState<"front" | "back" | null>(null);

  const handleRotate = useCallback(async (target: "front" | "back") => {
    const currentImage = target === "front" ? images.front : images.back;
    const currentMimeType = target === "front" ? images.frontMimeType : images.backMimeType;

    if (!currentImage) return;

    setIsRotating(target);
    try {
      const rotated = await rotateImage(currentImage, 90, currentMimeType);
      setImages((prev) => ({
        ...prev,
        [target]: rotated.dataUrl,
        [`${target}MimeType`]: rotated.mimeType,
      }));
    } catch (error) {
      console.error("[Rotate Error]", error);
    } finally {
      setIsRotating(null);
    }
  }, [images]);

  const scanCard = useCallback(async () => {
    if (!images.front) return;

    setStep("analyzing");
    setProcessingError(null);
    setOcrProgress(null);

    try {
      const data: VisionResponse = await ocrCardFront(
        images.front,
        (p: OcrProgress) => setOcrProgress(p)
      );
      setResult({ success: true, data });
      setStep("done");
    } catch (error) {
      console.error("[OCR Error]", error);
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "OCR failed. Please try again.",
      });
      setStep("done");
    }
  }, [images.front]);

  const retryAnalysis = useCallback(() => {
    setResult(null);
    setOcrProgress(null);
    setStep("review");
    setProcessingError(null);
  }, []);

  const getStepTitle = () => {
    switch (step) {
      case "front":
        return t("step1");
      case "back":
        return t("step2");
      case "converting":
        return t("converting");
      case "review":
        return t("step3");
      case "analyzing":
        return t("analyzing");
      case "manual":
        return t("manualEntry");
      case "done":
        return result?.success ? t("analysisComplete") : t("analysisFailed");
    }
  };

  const goToManualEntry = useCallback(() => {
    setStep("manual");
  }, []);

  const backToReview = useCallback(() => {
    setStep("review");
  }, []);

  const getStepDescription = () => {
    switch (step) {
      case "converting":
        return t("optimizing");
      case "analyzing":
        return ocrProgress
          ? `${ocrProgress.status} (${Math.round(ocrProgress.progress * 100)}%)`
          : t("aiReading");
      default:
        return "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture={isMobile ? "environment" : undefined}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Step indicator - hidden during manual entry */}
      {step !== "manual" && (
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
              step === "review" || step === "analyzing"
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
      )}

      {/* Title - hidden during manual entry */}
      {step !== "manual" && (
        <div className="text-center">
          <h3 className="font-medium">{getStepTitle()}</h3>
          {getStepDescription() && (
            <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
          )}
        </div>
      )}

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
                    {tCommon("retry")}
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
                {t("converting")}
              </p>
              <p className="text-xs text-muted-foreground">{t("optimizing")}</p>
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
                      ? t("takeFrontPhoto")
                      : t("takeBackPhoto")
                    : step === "front"
                      ? t("uploadFront")
                      : t("uploadBack")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isMobile ? t("tapToOpenCamera") : t("supportedFormats")}
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Review both images */}
      {step === "review" && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  {t("front")}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    onClick={() => handleRotate("front")}
                    disabled={isRotating === "front"}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70 disabled:opacity-50"
                    title={t("rotate")}
                  >
                    {isRotating === "front" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={retakeFront}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    title={t("retake")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images.front!}
                  alt="Card front"
                  className="aspect-[2.5/3.5] w-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  {t("back")}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    onClick={() => handleRotate("back")}
                    disabled={isRotating === "back"}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70 disabled:opacity-50"
                    title={t("rotate")}
                  >
                    {isRotating === "back" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={retakeBack}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    title={t("retake")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
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

      {/* OCR analyzing state */}
      {step === "analyzing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-muted-foreground">
                {t("analyzing")}
              </p>
              {ocrProgress && (
                <p className="text-xs text-muted-foreground">
                  {ocrProgress.status} ({Math.round(ocrProgress.progress * 100)}%)
                </p>
              )}
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
            {isMobile ? t("takeFrontPhoto") : t("uploadFront")}
          </Button>
        )}

        {step === "back" && (
          <>
            <Button onClick={retakeFront} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-5 w-5" />
              {t("retakeFront")}
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
              {isMobile ? t("takeBackPhoto") : t("uploadBack")}
            </Button>
          </>
        )}

        {step === "review" && (
          <>
            <Button onClick={resetAll} variant="outline" size="sm">
              <X className="mr-1 h-4 w-4" />
              {t("startOver")}
            </Button>
            <Button onClick={goToManualEntry} variant="outline" size="sm">
              <Edit3 className="mr-1 h-4 w-4" />
              {t("manualEntry")}
            </Button>
            <Button onClick={scanCard} className="flex-1">
              {t("analyze")}
            </Button>
          </>
        )}

        {step === "done" && !result?.success && (
          <Button onClick={resetAll} variant="outline" className="flex-1">
            <Upload className="mr-2 h-5 w-5" />
            {t("scanAnother")}
          </Button>
        )}
      </div>

      {/* Manual Entry Form */}
      {step === "manual" && (
        <ManualEntryForm
          frontImage={images.front}
          backImage={images.back}
          frontMimeType={images.frontMimeType}
          backMimeType={images.backMimeType}
          onBack={backToReview}
        />
      )}

      {/* Result */}
      {result && step === "done" && (
        <>
          {result.success && result.data ? (
            <ConfirmSaveForm
              visionResult={result.data}
              frontImageData={images.front ?? undefined}
              frontMimeType={images.frontMimeType}
              frontImagePreview={images.front ?? undefined}
              onRetake={retryAnalysis}
            />
          ) : (
            <Card className="border-red-500">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-red-600">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>{result.error || t("analysisFailed")}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryAnalysis}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("tryAgainSameImages")}
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
