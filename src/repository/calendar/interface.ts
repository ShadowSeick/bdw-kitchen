import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";

export interface CalendarWriteRepository {
  upsertMeal(day: DAY, meal: string, recipeId: ID): void;
  removeMeal(day: DAY, meal: string): void;
}

export interface CalendarReadRepository {
  loadBlob(): ArrayBuffer | undefined;
}

export interface CalendarBlobStore {
  saveBlob(bytes: Uint8Array): void;
}
