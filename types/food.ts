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
  isLoved?: boolean;
  ingredients?: string;
  createdById?: string;
  groupId?: string;
  addedBy?: EntryContributor;
  tags: string[];
  photos: FoodPhoto[];
};

export type MealSlot = "breakfast" | "lunch" | "dinner";

export type MealPlanItem = {
  id: string;
  groupId: string;
  foodEntryId: string;
  weekStart: string;
  dayOfWeek: number;
  mealSlot: MealSlot;
  portions: number;
  isLeftover: boolean;
  position: number;
};

export type GroupRole = "owner" | "member";

export type Group = {
  id: string;
  name: string;
  description?: string;
  role: GroupRole;
};

export type GroupMember = {
  userId: string;
  role: GroupRole;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
};

export type GroupInvite = {
  id: string;
  groupId: string;
  groupName?: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
};
