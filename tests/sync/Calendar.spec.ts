import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { CalendarSync } from "@/sync/Calendar";
import { CalendarLoroAdapterRepository } from "@/repository/calendar/CalendarLoroAdapter";
import {
  CalendarBlobStore,
  CalendarWriteRepository,
} from "@/repository/calendar/interface";
import { LoroDoc } from "loro-react-native";

class FakeWriter implements CalendarWriteRepository {
  upsertCalls: Array<{ day: DAY; meal: string; recipeId: ID }> = [];
  removeCalls: Array<{ day: DAY; meal: string }> = [];

  upsertMeal(day: DAY, meal: string, recipeId: ID): void {
    this.upsertCalls.push({ day, meal, recipeId });
  }

  removeMeal(day: DAY, meal: string): void {
    this.removeCalls.push({ day, meal });
  }
}

class FakeBlobStore implements CalendarBlobStore {
  saves: Uint8Array[] = [];

  saveBlob(bytes: Uint8Array): void {
    this.saves.push(bytes);
  }
}

const BATCH_MAX_SIZE = 5;

// loro-crdt batches subscriber callbacks onto a microtask after commit.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const commitAndFlush = async (doc: LoroDoc) => {
  doc.commit();
  await flush();
};

describe("CalendarSync", () => {
  let doc: LoroDoc;
  let repo: FakeWriter;
  let blobs: FakeBlobStore;
  let writer: CalendarLoroAdapterRepository;
  let sync: CalendarSync;

  beforeEach(async () => {
    doc = CalendarLoroAdapterRepository.createCalendarDoc();
    doc.commit();

    repo = new FakeWriter();
    blobs = new FakeBlobStore();
    writer = new CalendarLoroAdapterRepository(doc);
    sync = new CalendarSync(doc, repo, blobs);
    sync.start();
    await flush();
    repo.upsertCalls = [];
    repo.removeCalls = [];
    blobs.saves = [];
  });

  afterEach(() => {
    sync.stop();
  });

  test("forwards upserts to the repository", async () => {
    writer.upsertMeal(DAY.MONDAY, "almuerzo", "recipe-1");
    await commitAndFlush(doc);

    expect(repo.upsertCalls).toEqual([
      { day: DAY.MONDAY, meal: "almuerzo", recipeId: "recipe-1" },
    ]);
    expect(repo.removeCalls).toEqual([]);
  });

  test("forwards removes to the repository", async () => {
    writer.upsertMeal(DAY.TUESDAY, "cena", "recipe-2");
    await commitAndFlush(doc);
    repo.upsertCalls = [];

    writer.removeMeal(DAY.TUESDAY, "cena");
    await commitAndFlush(doc);

    expect(repo.removeCalls).toEqual([{ day: DAY.TUESDAY, meal: "cena" }]);
  });

  test("persists a snapshot once the batch fills", async () => {
    for (let i = 0; i < BATCH_MAX_SIZE; i++) {
      writer.upsertMeal(DAY.WEDNESDAY, `meal-${i}`, `recipe-${i}`);
      await commitAndFlush(doc);
    }

    expect(blobs.saves).toHaveLength(1);
    expect(blobs.saves[0]).toBeInstanceOf(Uint8Array);
    expect(blobs.saves[0].byteLength).toBeGreaterThan(0);
  });

  test("does not persist a snapshot before the batch fills", async () => {
    for (let i = 0; i < BATCH_MAX_SIZE - 1; i++) {
      writer.upsertMeal(DAY.THURSDAY, `meal-${i}`, `recipe-${i}`);
      await commitAndFlush(doc);
    }

    expect(blobs.saves).toEqual([]);

    // Fire one more event to flush the batcher's pending timer so it does not
    // leak into other tests.
    writer.upsertMeal(DAY.THURSDAY, "drain", "recipe-drain");
    await commitAndFlush(doc);
    expect(blobs.saves).toHaveLength(1);
  });

  test("stop() detaches the subscription", async () => {
    sync.stop();

    writer.upsertMeal(DAY.FRIDAY, "desayuno", "recipe-3");
    await commitAndFlush(doc);

    expect(repo.upsertCalls).toEqual([]);
    expect(blobs.saves).toEqual([]);
  });
});
