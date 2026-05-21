import { and, eq } from "drizzle-orm";

import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { mealSlot } from "@/infra/db/schema";
import { DB } from "@/infra/db/db";
import { WriteCalendarInterface } from "./interface";

export class CalendarSQLiteAdapterRepository implements WriteCalendarInterface {
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
}
