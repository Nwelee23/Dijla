"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { useT } from "@/components/i18n/i18n-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { interpolate } from "@/lib/i18n";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  compressImage,
} from "@/lib/image";
import { cn } from "@/lib/utils";

export const MENU_IMAGES_BUCKET = "menu-images";

type ImageUploadProps = {
  /** Current public URL, or null. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Scopes the storage path; the RLS policy rejects any other folder. */
  restaurantId: string;
  /** Falls back to the translated word for "image". */
  label?: string;
  className?: string;
  /** Square for logos, wide for dish photos. */
  aspect?: "square" | "wide";
};

export function ImageUpload({
  value,
  onChange,
  restaurantId,
  label,
  className,
  aspect = "wide",
}: ImageUploadProps) {
  const t = useT();
  const resolvedLabel = label ?? t.common.image;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);

      if (compressed.size > MAX_UPLOAD_BYTES) {
        toast.error(t.upload.tooLarge);
        return;
      }

      const supabase = createClient();
      const path = buildStoragePath(restaurantId, compressed);

      const { error } = await supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .upload(path, compressed, {
          contentType: compressed.type,
          upsert: false,
        });

      if (error) {
        toast.error(interpolate(t.upload.failedWith, { error: error.message }));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);

      onChange(publicUrl);
      toast.success(t.upload.uploaded);
    } catch (error) {
      // compressImage throws codes, not sentences.
      toast.error(
        error instanceof Error && error.message === "UNSUPPORTED_TYPE"
          ? t.upload.unsupported
          : t.upload.failed
      );
    } finally {
      setIsUploading(false);
      // Reset so picking the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {value ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border",
            aspect === "square" ? "size-28" : "aspect-[3/2] w-full max-w-xs"
          )}
        >
          <Image
            src={value}
            alt={resolvedLabel}
            fill
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={t.upload.remove}
            className="absolute end-1.5 top-1.5 size-7 shadow"
            onClick={() => onChange(null)}
            disabled={isUploading}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "text-muted-foreground hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed transition-colors disabled:opacity-60",
            aspect === "square" ? "size-28" : "aspect-[3/2] w-full max-w-xs"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs">{t.upload.uploading}</span>
            </>
          ) : (
            <>
              <ImagePlus className="size-5" />
              <span className="text-xs">
                {interpolate(t.upload.add, { label: resolvedLabel })}
              </span>
            </>
          )}
        </button>
      )}

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : null}
          {t.upload.change}
        </Button>
      )}
    </div>
  );
}
