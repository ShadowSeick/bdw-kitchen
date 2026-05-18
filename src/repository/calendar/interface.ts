import { Calendar, DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";

// Need to think this through
interface WriteCalendarInterface {
  upsertMeal(day: DAY, meal: string, recipeId: ID): void; // Add and or update a meal
  removeMeal(day: DAY, meal: string): void;
}

interface ReadCalendarInterface {
  get(id: ID): Calendar;
}

export { WriteCalendarInterface, ReadCalendarInterface };
