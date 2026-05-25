import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  blob,
} from "drizzle-orm/sqlite-core";

// --- Histories: CRDT blobs, source of truth ---

export const calendarHistory = sqliteTable("calendar_history", {
  id: text("id").primaryKey(),
  blob: blob("blob", { mode: "buffer" }).notNull(),
});

export const manifestHistory = sqliteTable("manifest_history", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  blob: blob("blob", { mode: "buffer" }).notNull(),
});

export const recipeHistory = sqliteTable("recipe_history", {
  id: text("id").primaryKey(),
  blob: blob("blob", { mode: "buffer" }),
});

// --- Projections: SQLite views derived from histories ---

export const calendar = sqliteTable("calendar", {
  id: text("id")
    .primaryKey()
    .references(() => calendarHistory.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(),
});

export const day = sqliteTable(
  "day",
  {
    id: text("id").primaryKey(),
    calendarId: text("calendar_id")
      .notNull()
      .references(() => calendar.id),
    name: text("name").notNull(),
  },
  (table) => ({
    calendarIdx: index("idx_day_calendar").on(table.calendarId),
  }),
);

export const recipe = sqliteTable("recipe", {
  id: text("id")
    .primaryKey()
    .references(() => recipeHistory.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: integer("status").notNull().default(0),
  manifestRev: integer("manifest_rev").notNull().default(0),
  localRev: integer("local_rev").notNull().default(0),
});

export const mealSlot = sqliteTable(
  "meal_slot",
  {
    dayId: text("day_id")
      .notNull()
      .references(() => day.id),
    mealName: text("meal_name").notNull(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipe.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.dayId, table.mealName] }),
    recipeIdx: index("idx_meal_slot_recipe").on(table.recipeId),
  }),
);

export const ingridient = sqliteTable("ingridient", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});
