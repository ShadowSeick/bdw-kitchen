import { and, eq } from "drizzle-orm";

import { Calendar, CALENDARS, DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { calendar, calendarHistory, day, mealSlot } from "@/infra/db/schema";
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

  // Pretty much sure this can be performed in a much straightforward way
  get(): Calendar {
    const rows = this.db
      .select({
        dayName: day.name,
        mealName: mealSlot.mealName,
        recipeId: mealSlot.recipeId,
      })
      .from(calendar)
      .innerJoin(day, eq(day.calendarId, calendar.id))
      .innerJoin(mealSlot, eq(mealSlot.dayId, day.id))
      .where(eq(calendar.name, CALENDARS.WEEK))
      .orderBy(day.name)
      .all();

    const weekdaysCalendar: Calendar = new Calendar();
    for (const row of rows) {
      const dayKey = row.dayName as DAY;
      weekdaysCalendar.setMeal(dayKey, row.mealName, row.recipeId);
    }

    return weekdaysCalendar;
  }

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
      .select({ blob: calendarHistory.blob })
      .from(calendarHistory)
      .limit(1)
      .get();
    return row?.blob;
  }

  saveBlob(id: string, bytes: ArrayBuffer): void {
    this.db
      .insert(calendarHistory)
      .values({ id: id, blob: bytes })
      .onConflictDoUpdate({
        target: [calendarHistory.id],
        set: { blob: bytes },
      });
  }
}
