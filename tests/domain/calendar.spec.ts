import { Calendar, DAY, MealSlot } from "@/domain";
import { OPERATION } from "@/domain";

const makeCalendar = (
  meals: Iterable<readonly [DAY, Iterable<readonly [string, string]>]> = [],
): Calendar => {
  const calendar = new Calendar();
  for (const [day, dayMeals] of meals) {
    for (const [mealName, recipeId] of dayMeals) {
      calendar.setMeal(day, mealName, recipeId);
    }
  }
  return calendar;
};

describe("Calendar", () => {
  it("should initiate with a proper calendar", () => {
    const empty = new Calendar();
    expect(empty.getMeal(DAY.MONDAY, "breakfast")).toBeUndefined();
    expect(empty.diff(new Calendar())).toEqual([]);

    const fromEmptyMap = makeCalendar();
    expect(fromEmptyMap.getMeal(DAY.MONDAY, "breakfast")).toBeUndefined();

    const calendar = makeCalendar([
      [
        DAY.MONDAY,
        [
          ["breakfast", "recipe-1"],
          ["lunch", "recipe-2"],
        ],
      ],
      [DAY.TUESDAY, [["dinner", "recipe-3"]]],
    ]);
    expect(calendar.getMeal(DAY.MONDAY, "breakfast")).toBe("recipe-1");
    expect(calendar.getMeal(DAY.MONDAY, "lunch")).toBe("recipe-2");
    expect(calendar.getMeal(DAY.TUESDAY, "dinner")).toBe("recipe-3");
    expect(calendar.getMeal(DAY.WEDNESDAY, "brunch")).toBeUndefined();

    calendar.setMeal(DAY.WEDNESDAY, "brunch", "recipe-4");
    expect(calendar.getMeal(DAY.WEDNESDAY, "brunch")).toBe("recipe-4");
  });

  it("should get the right meal recipes diff", () => {
    // empty vs empty -> no changes
    expect(makeCalendar().diff(makeCalendar())).toEqual([]);

    // empty -> populated: every meal becomes an upsert
    {
      const oldCalendar = makeCalendar();
      const newCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(DAY.MONDAY, "breakfast", "recipe-1", OPERATION.UPSERT),
          new MealSlot(DAY.MONDAY, "lunch", "recipe-2", OPERATION.UPSERT),
        ]),
      );
    }

    // populated -> empty: every meal becomes a remove
    {
      const oldCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      const newCalendar = makeCalendar();
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(DAY.MONDAY, "breakfast", "recipe-1", OPERATION.REMOVE),
          new MealSlot(DAY.MONDAY, "lunch", "recipe-2", OPERATION.REMOVE),
        ]),
      );
    }

    // identical calendars -> no changes
    {
      const buildWeekdays = (): Array<
        readonly [DAY, ReadonlyArray<readonly [string, string]>]
      > => [
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
        [DAY.TUESDAY, [["dinner", "recipe-3"]]],
      ];
      const oldCalendar = makeCalendar(buildWeekdays());
      const newCalendar = makeCalendar(buildWeekdays());
      expect(oldCalendar.diff(newCalendar)).toEqual([]);
    }

    // same meal name with a different recipe id -> upsert with new id
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      const newCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-2"]]],
      ]);
      expect(oldCalendar.diff(newCalendar)).toEqual([
        new MealSlot(DAY.MONDAY, "breakfast", "recipe-2", OPERATION.UPSERT),
      ]);
    }

    // adding a meal to an existing day leaves siblings untouched
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      const newCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      expect(oldCalendar.diff(newCalendar)).toEqual([
        new MealSlot(DAY.MONDAY, "lunch", "recipe-2", OPERATION.UPSERT),
      ]);
    }

    // removing a meal from a day leaves siblings untouched
    {
      const oldCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      const newCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      expect(oldCalendar.diff(newCalendar)).toEqual([
        new MealSlot(DAY.MONDAY, "lunch", "recipe-2", OPERATION.REMOVE),
      ]);
    }

    // mix of upsert (changed), upsert (added) and remove on the same day
    {
      const oldCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      const newCalendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1-new"],
            ["dinner", "recipe-3"],
          ],
        ],
      ]);
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(3);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(
            DAY.MONDAY,
            "breakfast",
            "recipe-1-new",
            OPERATION.UPSERT,
          ),
          new MealSlot(DAY.MONDAY, "lunch", "recipe-2", OPERATION.REMOVE),
          new MealSlot(DAY.MONDAY, "dinner", "recipe-3", OPERATION.UPSERT),
        ]),
      );
    }

    // a day that exists only in the old calendar -> its meals are removed
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
        [
          DAY.TUESDAY,
          [
            ["lunch", "recipe-2"],
            ["dinner", "recipe-3"],
          ],
        ],
      ]);
      const newCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(DAY.TUESDAY, "lunch", "recipe-2", OPERATION.REMOVE),
          new MealSlot(DAY.TUESDAY, "dinner", "recipe-3", OPERATION.REMOVE),
        ]),
      );
    }

    // a day that exists only in the new calendar -> its meals are upserted
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      const newCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
        [
          DAY.WEDNESDAY,
          [
            ["lunch", "recipe-4"],
            ["dinner", "recipe-5"],
          ],
        ],
      ]);
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(2);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(DAY.WEDNESDAY, "lunch", "recipe-4", OPERATION.UPSERT),
          new MealSlot(DAY.WEDNESDAY, "dinner", "recipe-5", OPERATION.UPSERT),
        ]),
      );
    }

    // multiple days: unchanged, changed, added and removed days all at once
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
        [DAY.TUESDAY, [["lunch", "recipe-2"]]],
        [DAY.FRIDAY, [["dinner", "recipe-3"]]],
      ]);
      const newCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]], // unchanged
        [DAY.TUESDAY, [["lunch", "recipe-2-new"]]], // changed id
        [DAY.SUNDAY, [["brunch", "recipe-4"]]], // new day
        // FRIDAY removed
      ]);
      const diff = oldCalendar.diff(newCalendar);
      expect(diff).toHaveLength(3);
      expect(diff).toEqual(
        expect.arrayContaining([
          new MealSlot(DAY.TUESDAY, "lunch", "recipe-2-new", OPERATION.UPSERT),
          new MealSlot(DAY.FRIDAY, "dinner", "recipe-3", OPERATION.REMOVE),
          new MealSlot(DAY.SUNDAY, "brunch", "recipe-4", OPERATION.UPSERT),
        ]),
      );
    }

    // self-diff -> empty
    {
      const calendar = makeCalendar([
        [
          DAY.MONDAY,
          [
            ["breakfast", "recipe-1"],
            ["lunch", "recipe-2"],
          ],
        ],
      ]);
      expect(calendar.diff(calendar)).toEqual([]);
    }

    // empty meal map on a day acts like the day was missing
    {
      const oldCalendar = makeCalendar([
        [DAY.MONDAY, [["breakfast", "recipe-1"]]],
      ]);
      const newCalendar = makeCalendar([[DAY.MONDAY, []]]);
      expect(oldCalendar.diff(newCalendar)).toEqual([
        new MealSlot(DAY.MONDAY, "breakfast", "recipe-1", OPERATION.REMOVE),
      ]);
    }
  });
});
