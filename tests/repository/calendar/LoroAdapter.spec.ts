import { DAY } from "@/domain/calendar";
import { CalendarLoroAdapterRepository } from "@/repository/calendar/CalendarLoroAdapter";

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
