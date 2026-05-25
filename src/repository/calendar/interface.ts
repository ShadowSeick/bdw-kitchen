import { Calendar, DAY, MealSlot } from "@/domain/calendar";
import { ID } from "@/domain/ids";

interface CalendarWriteRepository {
  upsertMeal(day: DAY, meal: string, recipeId: ID): void;
  removeMeal(day: DAY, meal: string): void;
}

interface CalendarSubscription {
  subscribe(onSubscribe: (mealSlots: MealSlot[]) => void): void;
  unsubscribe(onUnsubscribe: () => void): void;
  export(): ArrayBuffer;
}

interface CalendarReadRepository {
  get(): Calendar;
  loadBlob(): ArrayBuffer | undefined;
}

interface CalendarBlobStore {
  saveBlob(id: string, bytes: ArrayBuffer): void;
}

export {
  CalendarBlobStore,
  CalendarReadRepository,
  CalendarWriteRepository,
  CalendarSubscription,
};
