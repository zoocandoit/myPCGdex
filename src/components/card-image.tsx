"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CardImageProps {
  tcgImageUrl?: string | null;
  storagePath?: string | null;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Card image component that handles both TCG API images and Supabase storage images.
 * Priority: tcgImageUrl > storagePath > placeholder
 */
export function CardImage({
  tcgImageUrl,
  storagePath,
  alt,
  fill = true,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className = "object-cover",
  priority = false,
}: CardImageProps) {
  const [storageUrl, setStorageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function getStorageUrl() {
      if (tcgImageUrl || !storagePath) return;

      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase.storage
          .from("card-images")
          .createSignedUrl(storagePath, 3600); // 1 hour

        if (data?.signedUrl) {
          setStorageUrl(data.signedUrl);
        }
      } catch (err) {
        console.error("[CardImage] Error getting signed URL:", err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    getStorageUrl();
  }, [tcgImageUrl, storagePath]);

  // Show TCG image if available
  if (tcgImageUrl) {
    return (
      <Image
        src={tcgImageUrl}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={className}
        priority={priority}
      />
    );
  }

  // Show storage image if available
  if (storageUrl) {
    return (
      <Image
        src={storageUrl}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={className}
        priority={priority}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Placeholder
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground" />
    </div>
  );
}
