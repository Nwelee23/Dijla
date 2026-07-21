/**
 * Client-side image downscaling, run before every upload.
 *
 * A photo taken on a phone is routinely 4–8 MB. Uploading that over Iraqi mobile
 * data is slow enough that owners give up mid-way, and diners then pay the same
 * cost again on every menu load. Downscaling in the browser turns a typical
 * photo into ~150 KB before a single byte leaves the device.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type CompressOptions = {
  /** Longest edge, in pixels. 1200 is plenty for a full-width phone photo. */
  maxDimension?: number;
  quality?: number;
};

export async function compressImage(
  file: File,
  { maxDimension = 1200, quality = 0.82 }: CompressOptions = {}
): Promise<File> {
  // Thrown as a code, not a sentence: this module has no locale.
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error("UNSUPPORTED_TYPE");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

  // Already small enough — don't re-encode and lose quality for nothing.
  if (scale === 1 && file.size <= 400 * 1024) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: "image/jpeg",
  });
}

function replaceExtension(name: string, extension: string) {
  return `${name.replace(/\.[^.]+$/, "")}.${extension}`;
}

/** `menu-images/<restaurant_id>/<random>.<ext>` — the path the RLS policy checks. */
export function buildStoragePath(restaurantId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${restaurantId}/${crypto.randomUUID()}.${extension}`;
}
