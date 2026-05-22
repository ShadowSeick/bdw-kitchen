import {
  ContainerDiff,
  Diff_Tags,
  DiffEvent,
  Index_Tags,
  LoroDoc,
  LoroValue_Tags,
  PathItem,
  SubscriptionInterface,
} from "loro-react-native";

import { DAY, DAY_VALUES } from "@/domain/calendar";
import { ID } from "@/domain/ids";
import {
  CalendarBlobStore,
  CalendarWriteRepository,
} from "@/repository/calendar/interface";
import { SyncInterface } from "./interface";
import { Batcher } from "./Batcher";

export class CalendarSync implements SyncInterface {
  private subscriptions: SubscriptionInterface[];
  private persistSnapshotBatcher: Batcher<number>;

  constructor(
    private doc: LoroDoc,
    private writer: CalendarWriteRepository,
    private blobStore: CalendarBlobStore,
  ) {
    this.subscriptions = [];
    this.persistSnapshotBatcher = new Batcher(this.persistSnapshot.bind(this));
  }

  start(): void {
    if (this.subscriptions?.length) {
      return;
    }

    const changesSubscription = this.doc.subscribeRoot((event: DiffEvent) => {
      for (const containerDiff of event.events) {
        this.apply(containerDiff);
      }
      this.persistSnapshotBatcher.add(1);
    });
    this.subscriptions.push(changesSubscription);
  }

  stop(): void {
    this.persistSnapshotBatcher.flushNow();
    this.subscriptions.forEach((sub) => {
      sub.unsubscribe();
    });
    this.subscriptions = [];
  }

  private apply(containerDiff: ContainerDiff): void {
    if (containerDiff.diff.tag !== Diff_Tags.Map) {
      return;
    }

    const day = this.dayFromPath(containerDiff.path);
    if (!day) {
      return;
    }

    const updated = containerDiff.diff.inner.diff.updated;
    for (const [mealName, valueOrContainer] of updated) {
      if (valueOrContainer === undefined) {
        this.writer.removeMeal(day, mealName);
        continue;
      }

      const value = valueOrContainer.asValue();
      if (!value || value.tag !== LoroValue_Tags.String) {
        continue;
      }
      this.writer.upsertMeal(day, mealName, value.inner.value as ID);
    }
  }

  private persistSnapshot(updates: number[]): void {
    if (updates.length === 0) {
      return;
    }

    const snapshot = this.doc.exportSnapshot();
    this.blobStore.saveBlob(new Uint8Array(snapshot));
  }

  private dayFromPath(path: Array<PathItem>): DAY | undefined {
    if (path.length === 0) {
      return undefined;
    }

    const last = path[path.length - 1];
    if (last.index.tag !== Index_Tags.Key) {
      return undefined;
    }

    const key = last.index.inner.key;
    if (!DAY_VALUES.has(key)) {
      return undefined;
    }

    return key as DAY;
  }
}
