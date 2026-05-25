import { MealSlot } from "@/domain/calendar";
import {
  CalendarBlobStore,
  CalendarSubscription,
  CalendarWriteRepository,
} from "@/repository/calendar/interface";
import { SyncInterface } from "./interface";
import { Batcher } from "./Batcher";
import { OPERATION } from "@/domain";

export class CalendarSync implements SyncInterface {
  private persistSnapshotBatcher: Batcher<number>;

  constructor(
    private writer: CalendarWriteRepository,
    private history: CalendarSubscription,
    private blobStore: CalendarBlobStore,
  ) {
    this.persistSnapshotBatcher = new Batcher(this.persistSnapshot.bind(this));
  }

  start(): void {
    this.history.subscribe((mealSlots: MealSlot[]) => {
      for (const mealSlot of mealSlots) {
        if (mealSlot.op === OPERATION.REMOVE) {
          this.writer.removeMeal(mealSlot.day, mealSlot.mealName);
        } else {
          this.writer.upsertMeal(
            mealSlot.day,
            mealSlot.mealName,
            mealSlot.recipeId,
          );
        }
      }
      this.persistSnapshotBatcher.add(1);
    });
  }

  stop(): void {
    this.history.unsubscribe(() => this.persistSnapshotBatcher.flushNow());
  }

  private persistSnapshot(updates: number[]): void {
    if (updates.length === 0) {
      return;
    }

    const snapshot = this.history.export();
    this.blobStore.saveBlob(new Uint8Array(snapshot));
  }
}
