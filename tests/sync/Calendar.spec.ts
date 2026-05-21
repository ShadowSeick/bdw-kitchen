import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { CalendarSync } from "@/sync/Calendar";
import { CalendarLoroAdapterRepository } from "@/repository/calendar/CalendarLoroAdapter";
import { WriteCalendarInterface } from "@/repository/calendar/interface";
import { LoroDoc } from "loro-react-native";

class FakeRepository implements WriteCalendarInterface {
  upsertCalls: Array<{ day: DAY; meal: string; recipeId: ID }> = [];
  removeCalls: Array<{ day: DAY; meal: string }> = [];

  upsertMeal(day: DAY, meal: string, recipeId: ID): void {
    this.upsertCalls.push({ day, meal, recipeId });
  }

  removeMeal(day: DAY, meal: string): void {
    this.removeCalls.push({ day, meal });
  }
}

// loro-crdt batches subscriber callbacks onto a microtask after commit.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("CalendarSync", () => {
  let doc: LoroDoc;
  let repo: FakeRepository;
  let writer: CalendarLoroAdapterRepository;
  let sync: CalendarSync;

  beforeEach(async () => {
    doc = CalendarLoroAdapterRepository.createCalendarDoc();
    doc.commit();

    repo = new FakeRepository();
    writer = new CalendarLoroAdapterRepository(doc);
    sync = new CalendarSync(doc, repo);
    sync.start();
    await flush();
    repo.upsertCalls = [];
    repo.removeCalls = [];
  });

  afterEach(() => {
    sync.stop();
  });

  test("forwards upserts to the repository", async () => {
    writer.upsertMeal(DAY.MONDAY, "almuerzo", "recipe-1");
    doc.commit();
    await flush();

    expect(repo.upsertCalls).toEqual([
      { day: DAY.MONDAY, meal: "almuerzo", recipeId: "recipe-1" },
    ]);
    expect(repo.removeCalls).toEqual([]);
  });

  test("forwards removes to the repository", async () => {
    writer.upsertMeal(DAY.TUESDAY, "cena", "recipe-2");
    doc.commit();
    await flush();
    repo.upsertCalls = [];

    writer.removeMeal(DAY.TUESDAY, "cena");
    doc.commit();
    await flush();

    expect(repo.removeCalls).toEqual([{ day: DAY.TUESDAY, meal: "cena" }]);
  });

  test("stop() detaches the subscription", async () => {
    sync.stop();

    writer.upsertMeal(DAY.FRIDAY, "desayuno", "recipe-3");
    doc.commit();
    await flush();

    expect(repo.upsertCalls).toEqual([]);
  });
});
