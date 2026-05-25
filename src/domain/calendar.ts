import { ID } from "./ids";
import { MealOp, OPERATION } from "./operations";
import { Trie } from "./trie";

enum CALENDARS {
  WEEK = "week",
}

enum DAY {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

const DAY_VALUES = new Set<string>(Object.values(DAY));

class MealSlot {
  day: DAY;
  mealName: string;
  recipeId: ID;
  op: MealOp;

  constructor(day: DAY, mealName: string, recipeId: ID, op: MealOp) {
    this.day = day;
    this.mealName = mealName;
    this.recipeId = recipeId;
    this.op = op;
  }
}

type CalendarView = Record<CALENDARS.WEEK, CalendarDay>;
type CalendarDay = Record<DAY, ID[]>;

class Calendar {
  private trie: Trie<ID>;

  constructor() {
    this.trie = new Trie<ID>();
  }

  static fromJson(weekdays: CalendarView): Calendar {
    const calendar = new Calendar();
    const weekday = weekdays[CALENDARS.WEEK];
    for (const day in weekday) {
      for (const [mealName, recipeId] of weekday[day as DAY]) {
        calendar.setMeal(day as DAY, mealName, recipeId);
      }
    }
    return calendar;
  }

  setMeal(day: DAY, mealName: string, recipeId: ID): void {
    this.trie.set([day, mealName], recipeId);
  }

  getMeal(day: DAY, mealName: string): ID | undefined {
    return this.trie.get([day, mealName]);
  }

  diff(newCalendar: Calendar): MealSlot[] {
    return this.trie
      .diff(newCalendar.trie)
      .map(({ path, oldValue, newValue }) => {
        const [day, mealName] = path as [DAY, string];
        let id = newValue;
        let isRemove = false;
        let operation = OPERATION.UPSERT;
        if (!id) {
          isRemove = true;
          id = oldValue;
          operation = OPERATION.REMOVE;
        }

        return new MealSlot(day, mealName, id as ID, operation);
      });
  }
}

export { Calendar, CalendarView, MealSlot, DAY, DAY_VALUES, CALENDARS };
