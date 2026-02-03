"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  RotateCcw,
  Upload,
  Loader2,
  XCircle,
  SwitchCamera,
} from "lucide-react";
import { uploadCardImage } from "@/lib/actions/storage";
import { VisionResponse, ScanResult } from "@/lib/types/vision";
import { ResultForm } from "./result-form";
import { TCGCard } from "@/lib/tcg/types";

type CaptureState = "idle" | "preview" | "uploading" | "analyzing" | "done";

export function WebcamScanner() {
  const webcamRef = useRef<Webcam>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  // TODO: Phase 5 - use selectedCard for saving to collection
  const [_selectedCard, setSelectedCard] = useState<TCGCard | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode,
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setState("preview");
      setResult(null);
      setSelectedCard(null);
    }
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setState("idle");
    setResult(null);
    setSelectedCard(null);
  }, []);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  const analyzeCard = useCallback(async () => {
    if (!capturedImage) return;

    setState("uploading");

    try {
      // Upload image to Supabase Storage
      const uploadResult = await uploadCardImage(capturedImage, "image/jpeg");

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
      console.error("[Scan Error]", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      });
      setState("done");
    }
  }, [capturedImage]);

  const handleCardSelect = useCallback((card: TCGCard) => {
    setSelectedCard(card);
    // TODO: Phase 5 - Save to collection
    console.log("[Card Selected]", card.id, card.name);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Camera / Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {state === "idle" ? (
            <div className="relative aspect-video bg-black">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="h-full w-full object-cover"
              />
              {/* Camera guide overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[80%] w-[60%] rounded-lg border-2 border-dashed border-white/50" />
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative aspect-video bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Captured card"
                className="h-full w-full object-cover"
              />
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
          <>
            <Button onClick={capture} className="flex-1">
              <Camera className="mr-2 h-5 w-5" />
              Capture
            </Button>
            <Button onClick={toggleCamera} variant="outline" size="icon">
              <SwitchCamera className="h-5 w-5" />
            </Button>
          </>
        )}

        {state === "preview" && (
          <>
            <Button onClick={retake} variant="outline" className="flex-1">
              <RotateCcw className="mr-2 h-5 w-5" />
              Retake
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
          <Button onClick={retake} variant="outline" className="flex-1">
            <Camera className="mr-2 h-5 w-5" />
            Scan Another
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
