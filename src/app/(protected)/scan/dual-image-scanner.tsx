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
  ArrowRight,
  RotateCcw,
  Check,
  RefreshCw,
  AlertCircle,
  Pencil,
  Sparkles,
  Clock,
} from "lucide-react";
import { uploadCardImage } from "@/lib/actions/storage";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ResultForm } from "./result-form";
import { ManualEntryForm } from "./manual-entry-form";
import { ScoredCard } from "@/lib/tcg/hooks";
import {
  preprocessImage,
  validateImageFile,
  isHeicFile,
} from "@/lib/image/preprocess";
import {
  getVisionUsage,
  checkAndIncrementVisionUsage,
  type VisionUsageResult,
} from "@/lib/actions/vision-usage";
import { addToPendingQueue } from "@/lib/actions/pending";
import { useRouter } from "next/navigation";

type Step =
  | "front"
  | "back"
  | "converting"
  | "review"
  | "uploading"
  | "analyzing"
  | "done"
  | "manual"
  | "queue"; // Queued for later analysis

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
  const router = useRouter();
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
  const [_selectedCard, setSelectedCard] = useState<ScoredCard | null>(null);
  const [_uploadedPaths, setUploadedPaths] = useState<{
    front?: string;
    back?: string;
  }>({});
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  });
  const [processingError, setProcessingError] =
    useState<ProcessingError | null>(null);
  // Track which image is being converted (for future UX improvements)
  const [_convertingTarget, setConvertingTarget] = useState<
    "front" | "back" | null
  >(null);
  const pendingFileRef = useRef<File | null>(null);

  // Vision usage tracking
  const [visionUsage, setVisionUsage] = useState<VisionUsageResult | null>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(true);

  const t = useTranslations("scan");
  const tCommon = useTranslations("common");

  // Check vision usage on mount
  useEffect(() => {
    async function checkUsage() {
      const usage = await getVisionUsage();
      setVisionUsage(usage);
      setIsCheckingUsage(false);
    }
    checkUsage();
  }, []);

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

    // First check current usage without incrementing
    const currentUsage = await getVisionUsage();
    setVisionUsage(currentUsage);

    // If limit reached, upload images and add to queue
    if (!currentUsage.canUseVision) {
      setStep("uploading");
      setProcessingError(null);

      try {
        // Upload front image
        const frontResult = await uploadCardImage(
          images.front,
          images.frontMimeType
        );
        if (!frontResult.success || !frontResult.path) {
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

        // Add to pending queue
        const queueResult = await addToPendingQueue({
          front_image_path: frontResult.path,
          back_image_path: backResult.success ? backResult.path : null,
        });

        if (queueResult.success) {
          setUploadedPaths({
            front: frontResult.path,
            back: backResult.path,
          });
          setStep("queue");
        } else {
          setProcessingError({
            message: "Failed to add to queue",
            canRetry: true,
            step: "upload",
          });
          setStep("review");
        }
      } catch (error) {
        console.error("[Queue Error]", error);
        setProcessingError({
          message: error instanceof Error ? error.message : "Failed to queue card",
          canRetry: true,
          step: "upload",
        });
        setStep("review");
      }
      return;
    }

    // Has remaining uses - proceed with analysis
    const usageResult = await checkAndIncrementVisionUsage();
    setVisionUsage(usageResult);

    if (!usageResult.canUseVision) {
      // Race condition: usage was taken by another request
      setResult({
        success: false,
        error: "daily_limit_reached",
      });
      setStep("done");
      return;
    }

    setStep("uploading");
    setProcessingError(null);

    try {
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

      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: frontResult.signedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Analysis failed";

        setResult({
          success: false,
          error: errorMessage,
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

  // Switch to manual entry mode
  const switchToManualEntry = useCallback(() => {
    setStep("manual");
  }, []);

  // Handle manual entry completion
  const handleManualEntrySuccess = useCallback(() => {
    resetAll();
  }, [resetAll]);

  const retryAnalysis = useCallback(() => {
    setResult(null);
    setStep("review");
    setProcessingError(null);
  }, []);

  const handleCardSelect = useCallback((card: ScoredCard) => {
    setSelectedCard(card);
    console.log("[Card Selected]", card.id, card.name, "Score:", card.accuracyScore);
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
      case "uploading":
        return t("uploading");
      case "analyzing":
        return t("analyzing");
      case "manual":
        return t("manualEntry");
      case "queue":
        return t("queuedTitle");
      case "done":
        return result?.success ? t("analysisComplete") : t("analysisFailed");
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "front":
        return "";
      case "back":
        return "";
      case "converting":
        return t("optimizing");
      case "review":
        return "";
      case "uploading":
        return t("securelyStoring");
      case "analyzing":
        return t("aiReading");
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

      {/* Vision Usage Indicator */}
      {!isCheckingUsage && visionUsage && step !== "manual" && step !== "done" && step !== "queue" && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-muted-foreground">
            {t("visionUsage", {
              remaining: visionUsage.remainingToday,
              total: 5,
            })}
          </span>
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

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                  {t("back")}
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
                {step === "uploading" ? t("uploading") : t("analyzing")}
              </p>
              <p className="text-xs text-muted-foreground">
                {step === "uploading" ? t("securelyStoring") : t("aiReading")}
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
            <Button onClick={switchToManualEntry} variant="outline" className="flex-1">
              <Pencil className="mr-2 h-4 w-4" />
              {t("manualEntry")}
            </Button>
            <Button
              onClick={analyzeCard}
              className="flex-1"
              disabled={!visionUsage?.canUseVision}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("analyze")}
              {visionUsage && (
                <span className="ml-1 text-xs opacity-70">
                  ({visionUsage.remainingToday})
                </span>
              )}
            </Button>
          </>
        )}

        {step === "manual" && (
          <Button onClick={() => setStep("review")} variant="outline" className="flex-1">
            <ArrowRight className="mr-2 h-5 w-5" />
            {t("backToReview")}
          </Button>
        )}

        {step === "queue" && (
          <>
            <Button onClick={resetAll} variant="outline" className="flex-1">
              <Upload className="mr-2 h-5 w-5" />
              {t("scanAnother")}
            </Button>
            <Button onClick={() => router.push("/collection?tab=pending")} className="flex-1">
              {t("viewPending")}
            </Button>
          </>
        )}

        {step === "done" && (
          <Button onClick={resetAll} variant="outline" className="flex-1">
            <Upload className="mr-2 h-5 w-5" />
            {t("scanAnother")}
          </Button>
        )}
      </div>

      {/* Queue Success */}
      {step === "queue" && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{t("queuedTitle")}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {t("queuedDescription")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Form */}
      {step === "manual" && (
        <ManualEntryForm
          frontImagePath={_uploadedPaths.front}
          backImagePath={_uploadedPaths.back}
          onBack={() => setStep("review")}
          onSuccess={handleManualEntrySuccess}
        />
      )}

      {/* Result */}
      {result && step === "done" && (
        <>
          {result.success && result.data ? (
            <ResultForm
              visionResult={result.data}
              onCardSelect={handleCardSelect}
            />
          ) : result.error === "daily_limit_reached" ? (
            // Daily limit reached - suggest manual entry
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{t("dailyLimitReached")}</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {t("dailyLimitDescription")}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={switchToManualEntry}
                    className="self-start"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("manualEntry")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-red-500">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2 text-red-600">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <span>{result.error || t("analysisFailed")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retryAnalysis}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("tryAgainSameImages")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={switchToManualEntry}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("manualEntry")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
