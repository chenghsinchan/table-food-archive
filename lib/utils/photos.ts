import type { FoodPhoto } from "@/types/food";

export function thumbnailSrc(photo: FoodPhoto) {
  return photo.thumbnailUrl ?? photo.imageUrl;
}

export function fullImageSrc(photo: FoodPhoto) {
  return photo.imageUrl;
}
