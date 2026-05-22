import { DAY } from "@/domain";
import { CalendarLoroAdapterRepository } from "@/repository/calendar";

describe("Calendar CalendarLoro Adapter", () => {
  const calendar = CalendarLoroAdapterRepository.createCalendarDoc();
  const adapter = new CalendarLoroAdapterRepository(calendar);

  test("it should add and remove the same meal", () => {
    adapter.upsertMeal(DAY.MONDAY, "almuerzo", "12345");

    expect(calendar.toJSON().week.monday).toEqual({ almuerzo: "12345" });

    adapter.removeMeal(DAY.MONDAY, "almuerzo");
    expect(calendar.toJSON().week.monday).toEqual({});
  });
});
