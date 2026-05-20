import { CALENDARS, DAY } from "@/domain/calendar";
import { WriteCalendarInterface } from "./interface";
import { LoroDoc, LoroMap } from "loro-react-native";
import { ID } from "@/domain/ids";

export class LoroAdapterRepository implements WriteCalendarInterface {
  constructor(private document: LoroDoc) {}

  upsertMeal(day: DAY, meal: string, recipeId: ID): void {
    const week = this.document.getMap(CALENDARS.WEEK);

    let dayMap = week.get(day) as LoroMap | undefined;

    if (!dayMap) {
      throw new Error("the day map should have been created at initialization");
    }

    dayMap.set(meal, recipeId);
  }

  removeMeal(day: DAY, meal: string): void {
    const week = this.document.getMap(CALENDARS.WEEK);
    const dayMap = week.get(day) as LoroMap | undefined;

    if (!dayMap) {
      throw new Error("the day map should have been created at initialization");
    }

    dayMap.delete_(meal);
  }
}
