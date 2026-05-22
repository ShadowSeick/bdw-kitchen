import { and, eq } from "drizzle-orm";

import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { calendar, mealSlot } from "@/infra/db/schema";
import { DB } from "@/infra/db/db";
import {
  CalendarBlobStore,
  CalendarReadRepository,
  CalendarWriteRepository,
} from "./interface";

export class CalendarSQLiteAdapterRepository
  implements CalendarWriteRepository, CalendarReadRepository, CalendarBlobStore
{
  constructor(private db: DB) {}

  upsertMeal(day: DAY, meal: string, recipeId: ID): void {
    this.db
      .insert(mealSlot)
      .values({ dayId: day, mealName: meal, recipeId })
      .onConflictDoUpdate({
        target: [mealSlot.dayId, mealSlot.mealName],
        set: { recipeId },
      })
      .run();
  }

  removeMeal(day: DAY, meal: string): void {
    this.db
      .delete(mealSlot)
      .where(and(eq(mealSlot.dayId, day), eq(mealSlot.mealName, meal)))
      .run();
  }

  loadBlob(): ArrayBuffer | undefined {
    const row = this.db
      .select({ blob: calendar.blob })
      .from(calendar)
      .limit(1)
      .get();
    return row?.blob;
  }

  saveBlob(bytes: Uint8Array): void {
    const row = this.db
      .select({ id: calendar.id })
      .from(calendar)
      .limit(1)
      .get();
    if (!row) return;
    this.db
      .update(calendar)
      .set({ blob: bytes.buffer })
      .where(eq(calendar.id, row.id))
      .run();
  }
}
