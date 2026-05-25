import { DAY } from "@/domain";
import { CalendarLoroAdapterRepository } from "@/repository/calendar";

describe("Calendar CalendarLoro Adapter", () => {
  const adapter = new CalendarLoroAdapterRepository();

  test("it should add and remove the same meal", () => {
    adapter.upsertMeal(DAY.MONDAY, "almuerzo", "12345");

    expect(adapter.doc.toJSON().week.monday).toEqual({ almuerzo: "12345" });

    adapter.removeMeal(DAY.MONDAY, "almuerzo");
    expect(adapter.doc.toJSON().week.monday).toEqual({});
  });
});
