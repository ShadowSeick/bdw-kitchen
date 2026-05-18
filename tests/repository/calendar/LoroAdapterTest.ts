import { CALENDARS } from "@/domain/calendar";
import { LoroDoc, LoroMap } from "loro-react-native";

describe("Calendar Loro Adapter", () => {
  const calendar = new LoroDoc();
  let map: LoroMap;

  beforeAll(() => {
    map = calendar.getMap(CALENDARS.WEEK);
  });

  test("Loro Adapter upsert", () => {});
});
