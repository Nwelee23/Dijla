"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { setItemImage } from "@/app/dashboard/menu/item-actions";
import { useT } from "@/components/i18n/i18n-provider";
import { MENU_IMAGES_BUCKET } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  compressImage,
} from "@/lib/image";
import { interpolate } from "@/lib/i18n";
import { matchFilesToItems, type MatchItem } from "@/lib/photo-match";
import { createClient } from "@/lib/supabase/client";

/**
 * Bulk photo drop (§7.2): drop many images, each auto-matched to a dish by
 * filename, confirm or reassign the matches, then upload and attach. This is the
 * slowest step in onboarding, so it is made the fastest.
 *
 * Uploads reuse the same compress → storage → public-URL path as the single
 * ImageUpload, then persist through setItemImage (which cleans a replaced file).
 * Files run one at a time so a big drop can't hammer storage.
 */
export function BulkPhotoDialog({
  restaurantId,
  items,
  trigger,
}: {
  restaurantId: string;
  items: MatchItem[];
  trigger: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  // Parallel to files: the chosen item id, or "" to skip.
  const [assign, setAssign] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignedCount = useMemo(() => assign.filter(Boolean).length, [assign]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((file) =>
      ACCEPTED_TYPES.includes(file.type)
    );
    if (incoming.length === 0) return;

    const matched = matchFilesToItems(
      incoming.map((file) => file.name),
      items
    );
    setFiles((current) => [...current, ...incoming]);
    setAssign((current) => [...current, ...matched.map((id) => id ?? "")]);
  }

  function reset() {
    setFiles([]);
    setAssign([]);
    setDone(0);
  }

  async function upload() {
    setBusy(true);
    setDone(0);
    const supabase = createClient();
    let ok = 0;

    for (let i = 0; i < files.length; i++) {
      const itemId = assign[i];
      if (itemId) {
        try {
          const compressed = await compressImage(files[i]);
          if (compressed.size <= MAX_UPLOAD_BYTES) {
            const path = buildStoragePath(restaurantId, compressed);
            const { error } = await supabase.storage
              .from(MENU_IMAGES_BUCKET)
              .upload(path, compressed, {
                contentType: compressed.type,
                upsert: false,
              });
            if (!error) {
              const {
                data: { publicUrl },
              } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
              const result = await setItemImage(itemId, publicUrl);
              if (result.ok) ok += 1;
            }
          }
        } catch {
          // One bad file must not sink the whole batch.
        }
      }
      setDone((current) => current + 1);
    }

    setBusy(false);
    toast.success(interpolate(t.menu.bulkPhotoDone, { count: ok }));
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.menu.bulkPhoto}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
            className="text-muted-foreground hover:border-primary hover:text-primary flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm transition-colors"
          >
            <ImagePlus className="size-6" />
            {t.menu.bulkPhotoHint}
          </div>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm" dir="auto">
                    {file.name}
                  </span>
                  <select
                    value={assign[index]}
                    disabled={busy}
                    onChange={(event) =>
                      setAssign((current) =>
                        current.map((value, j) =>
                          j === index ? event.target.value : value
                        )
                      )
                    }
                    className="border-input bg-background max-w-[45%] rounded-md border p-1.5 text-sm"
                  >
                    <option value="">{t.menu.bulkPhotoSkip}</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={busy || assignedCount === 0}
            onClick={upload}
          >
            {busy && <Loader2 className="animate-spin" />}
            {busy
              ? interpolate(t.menu.bulkPhotoProgress, {
                  done,
                  total: files.length,
                })
              : interpolate(t.menu.bulkPhotoUpload, { count: assignedCount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
