import {
  CALENDARS,
  DAY,
  DAY_VALUES,
  MealSlot,
} from "@/domain/calendar";
import { CalendarSubscription, CalendarWriteRepository } from "./interface";
import {
  ContainerDiff,
  Diff_Tags,
  DiffEvent,
  Index_Tags,
  LoroDoc,
  LoroMap,
  LoroValue_Tags,
  PathItem,
  SubscriptionInterface,
} from "loro-react-native";
import { ID } from "@/domain/ids";
import { OPERATION } from "@/domain/operations";

export class CalendarLoroAdapterRepository implements CalendarWriteRepository {
  private history: LoroDoc;

  constructor(history?: ArrayBuffer) {
    this.history = this.createHistory();
    if (history) {
      this.history.import_(history);
    }
  }

  get doc(): LoroDoc {
    return this.history;
  }

  upsertMeal(day: DAY, meal: string, recipeId: ID): void {
    const week = this.history.getMap(CALENDARS.WEEK);

    let dayMap = week.get(day) as LoroMap | undefined;

    if (!dayMap) {
      throw new Error("the day map should have been created at initialization");
    }

    dayMap.set(meal, recipeId);
  }

  removeMeal(day: DAY, meal: string): void {
    const week = this.history.getMap(CALENDARS.WEEK);
    const dayMap = week.get(day) as LoroMap | undefined;

    if (!dayMap) {
      throw new Error("the day map should have been created at initialization");
    }

    dayMap.delete_(meal);
  }

  private createHistory() {
    const doc = new LoroDoc();
    const week = doc.getMap(CALENDARS.WEEK);
    Object.values(DAY).forEach((day) => {
      week.setContainer(day, new LoroMap());
    });
    return doc;
  }
}

export class CalendarLoroAdapterSubscriptor implements CalendarSubscription {
  private history: CalendarLoroAdapterRepository;
  private subscription: SubscriptionInterface | null;

  constructor(history: CalendarLoroAdapterRepository) {
    this.history = history;
    this.subscription = null;
  }

  subscribe(onSubscribe: (mealSlots: MealSlot[]) => void): void {
    this.subscription = this.history.doc.subscribeRoot((event: DiffEvent) => {
      const mealSlots: MealSlot[] = [];
      for (const containerDiff of event.events) {
        this.collectMealSlots(containerDiff, mealSlots);
      }
      if (mealSlots.length === 0) {
        return;
      }
      onSubscribe(mealSlots);
    });
  }

  unsubscribe(onUnsubscribe: () => void): void {
    onUnsubscribe();
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  export(): ArrayBuffer {
    return this.history.doc.exportSnapshot();
  }

  private collectMealSlots(
    containerDiff: ContainerDiff,
    out: MealSlot[],
  ): void {
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
        out.push(new MealSlot(day, mealName, "" as ID, OPERATION.REMOVE));
        continue;
      }

      const value = valueOrContainer.asValue();
      if (!value || value.tag !== LoroValue_Tags.String) {
        continue;
      }
      out.push(
        new MealSlot(
          day,
          mealName,
          value.inner.value as ID,
          OPERATION.UPSERT,
        ),
      );
    }
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
