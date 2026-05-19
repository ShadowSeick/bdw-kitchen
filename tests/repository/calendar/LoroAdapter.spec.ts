import { CALENDARS, DAY } from "@/domain/calendar";
import { LoroAdapterRepository } from "@/repository/calendar/LoroAdapter";
import { LoroDoc, LoroMap } from "loro-react-native";

describe("Calendar Loro Adapter", () => {
  const calendar = new LoroDoc();
  const adapter = new LoroAdapterRepository(calendar);
  let week: LoroMap;

  beforeAll(() => {
    week = calendar.getMap(CALENDARS.WEEK);
    Object.values(DAY).forEach((day) => {
      week.setContainer(day, new LoroMap());
    });
  });

  test("it should add and remove the same meal", () => {
    adapter.upsertMeal(DAY.MONDAY, "almuerzo", "12345");

    expect(calendar.toJSON().week.monday).toEqual({ almuerzo: "12345" });

    adapter.removeMeal(DAY.MONDAY, "almuerzo");
    expect(calendar.toJSON().week.monday).toEqual({});
  });
});
