import { DAY } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import { CalendarSync } from "@/sync/Calendar";
import {
  CalendarLoroAdapterRepository,
  CalendarLoroAdapterSubscriptor,
} from "@/repository/calendar/CalendarLoroAdapter";
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
  let loroWriter: CalendarLoroAdapterRepository;
  let subscription: CalendarLoroAdapterSubscriptor;
  let writer: FakeWriter;
  let blobs: FakeBlobStore;
  let sync: CalendarSync;

  beforeEach(async () => {
    loroWriter = new CalendarLoroAdapterRepository();
    doc = loroWriter.doc;
    doc.commit();

    subscription = new CalendarLoroAdapterSubscriptor(loroWriter);
    writer = new FakeWriter();
    blobs = new FakeBlobStore();
    sync = new CalendarSync(writer, subscription, blobs);
    sync.start();
    await flush();
    writer.upsertCalls = [];
    writer.removeCalls = [];
    blobs.saves = [];
  });

  afterEach(() => {
    sync.stop();
  });

  test("forwards upserts to the writer", async () => {
    loroWriter.upsertMeal(DAY.MONDAY, "almuerzo", "recipe-1");
    await commitAndFlush(doc);

    expect(writer.upsertCalls).toEqual([
      { day: DAY.MONDAY, meal: "almuerzo", recipeId: "recipe-1" },
    ]);
    expect(writer.removeCalls).toEqual([]);
  });

  test("forwards removes to the writer", async () => {
    loroWriter.upsertMeal(DAY.TUESDAY, "cena", "recipe-2");
    await commitAndFlush(doc);
    writer.upsertCalls = [];

    loroWriter.removeMeal(DAY.TUESDAY, "cena");
    await commitAndFlush(doc);

    expect(writer.removeCalls).toEqual([{ day: DAY.TUESDAY, meal: "cena" }]);
  });

  test("persists a snapshot once the batch fills", async () => {
    for (let i = 0; i < BATCH_MAX_SIZE; i++) {
      loroWriter.upsertMeal(DAY.WEDNESDAY, `meal-${i}`, `recipe-${i}`);
      await commitAndFlush(doc);
    }

    expect(blobs.saves).toHaveLength(1);
    expect(blobs.saves[0]).toBeInstanceOf(Uint8Array);
    expect(blobs.saves[0].byteLength).toBeGreaterThan(0);
  });

  test("does not persist a snapshot before the batch fills", async () => {
    for (let i = 0; i < BATCH_MAX_SIZE - 1; i++) {
      loroWriter.upsertMeal(DAY.THURSDAY, `meal-${i}`, `recipe-${i}`);
      await commitAndFlush(doc);
    }

    expect(blobs.saves).toEqual([]);

    // Fire one more event to flush the batcher's pending timer so it does not
    // leak into other tests.
    loroWriter.upsertMeal(DAY.THURSDAY, "drain", "recipe-drain");
    await commitAndFlush(doc);
    expect(blobs.saves).toHaveLength(1);
  });

  test("stop() detaches the subscription", async () => {
    sync.stop();

    loroWriter.upsertMeal(DAY.FRIDAY, "desayuno", "recipe-3");
    await commitAndFlush(doc);

    expect(writer.upsertCalls).toEqual([]);
    expect(blobs.saves).toEqual([]);
  });
});
