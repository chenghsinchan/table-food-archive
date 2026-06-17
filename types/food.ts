export type EntryType = "home" | "restaurant" | "travel" | "recipe";

export type EntryContributor = {
  name: string;
  initials: string;
  avatarUrl?: string;
};

export type FoodPhoto = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  storagePath?: string;
  alt: string;
};

export type FoodEntry = {
  id: string;
  title: string;
  type: EntryType;
  rating?: number;
  notes?: string;
  recipe?: string;
  timeMinutes?: number;
  restaurantName?: string;
  city?: string;
  country?: string;
  entryDate: string;
  wantToRecreate?: boolean;
  createdById?: string;
  addedBy?: EntryContributor;
  tags: string[];
  photos: FoodPhoto[];
};
