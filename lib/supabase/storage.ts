import type { SupabaseClient } from "@supabase/supabase-js";

type CompressionOptions = {
  maxWidth?: number;
  targetMaxBytes?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not compress this image."));
        }
      },
      type,
      quality
    );
  });
}

function extensionForType(type: string) {
  return type === "image/webp" ? "webp" : "jpg";
}

export async function compressImageFile(file: File, options: CompressionOptions = {}) {
  const maxWidth = options.maxWidth ?? 1600;
  const targetMaxBytes = options.targetMaxBytes ?? 800 * 1024;
  const mimeType = options.mimeType ?? "image/jpeg";

  const image = await loadImage(file);
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not available in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const qualities = [0.82, 0.74, 0.66, 0.58, 0.5];
  let bestBlob: Blob | null = null;

  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, mimeType, quality);
    bestBlob = blob;

    if (blob.size <= targetMaxBytes) {
      break;
    }
  }

  if (!bestBlob) {
    throw new Error("Could not compress this image.");
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "") || "table-photo";

  return new File([bestBlob], `${baseName}.${extensionForType(mimeType)}`, {
    type: mimeType,
    lastModified: Date.now()
  });
}

export async function uploadFoodPhotos({
  supabase,
  entryId,
  files
}: {
  supabase: SupabaseClient;
  entryId: string;
  files: File[];
}) {
  const uploaded = [];

  for (const file of files) {
    const compressed = await compressImageFile(file);
    const extension = compressed.name.split(".").pop() || "jpg";
    const path = `${entryId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("food-photos").upload(path, compressed, {
      contentType: compressed.type,
      cacheControl: "31536000",
      upsert: false
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("food-photos").getPublicUrl(path);
    uploaded.push({
      image_url: data.publicUrl,
      thumbnail_url: data.publicUrl,
      storage_path: path
    });
  }

  return uploaded;
}

export function photoFromUpload({
  entryId,
  title,
  upload,
  index
}: {
  entryId: string;
  title: string;
  upload: Awaited<ReturnType<typeof uploadFoodPhotos>>[number];
  index: number;
}) {
  return {
    id: `${entryId}-photo-${index + 1}-${crypto.randomUUID()}`,
    imageUrl: upload.image_url,
    thumbnailUrl: upload.thumbnail_url ?? undefined,
    storagePath: upload.storage_path,
    alt: title
  };
}
