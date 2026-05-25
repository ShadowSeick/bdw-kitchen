import { eq } from "drizzle-orm";

import { DB } from "@/infra/db";
import {
  manifestHistory,
  recipe as recipeTable,
  recipeHistory,
} from "@/infra/db/schema";
import { ID, Recipe, RECIPES, STATUS } from "@/domain";
import {
  ReadRecipeInterface,
  RecipeBlobStore,
  WriteRecipeInterface,
} from "./interface";

export class RecipesSQLiteAdapter
  implements WriteRecipeInterface, ReadRecipeInterface, RecipeBlobStore
{
  constructor(private db: DB) {}

  list(): Recipe[] {
    const rows = this.db
      .select({
        id: recipeTable.id,
        title: recipeTable.title,
        description: recipeTable.description,
        status: recipeTable.status,
      })
      .from(recipeTable)
      .all();

    return rows.map(
      (r) => new Recipe(r.id, r.title, r.status as STATUS, r.description ?? ""),
    );
  }

  get(id: ID): Recipe {
    const row = this.db
      .select({
        id: recipeTable.id,
        title: recipeTable.title,
        description: recipeTable.description,
        status: recipeTable.status,
      })
      .from(recipeTable)
      .where(eq(recipeTable.id, id))
      .get();

    if (!row) {
      throw new Error(`Recipe ${id} not found`);
    }

    return new Recipe(
      row.id,
      row.title,
      row.status as STATUS,
      row.description ?? "",
    );
  }

  upsert(r: Recipe): void {
    this.db
      .insert(recipeTable)
      .values({
        id: r.id,
        title: r.name,
        description: r.description,
        status: r.status,
      })
      .onConflictDoUpdate({
        target: [recipeTable.id],
        set: {
          title: r.name,
          description: r.description,
          status: r.status,
        },
      })
      .run();
  }

  remove(id: ID): void {
    this.db.delete(recipeTable).where(eq(recipeTable.id, id)).run();
  }

  loadManifest(): ArrayBuffer | undefined {
    const row = this.db
      .select({ blob: manifestHistory.blob })
      .from(manifestHistory)
      .where(eq(manifestHistory.kind, RECIPES.MANIFEST))
      .limit(1)
      .get();
    return row?.blob;
  }

  loadBlobById(id: ID): ArrayBuffer | undefined {
    const row = this.db
      .select({ blob: recipeHistory.blob })
      .from(recipeHistory)
      .where(eq(recipeHistory.id, id))
      .get();
    return row?.blob;
  }

  saveBlob(id: string, bytes: ArrayBuffer): void {
    this.db
      .insert(recipeHistory)
      .values({ id, blob: bytes })
      .onConflictDoUpdate({
        target: [recipeHistory.id],
        set: { blob: bytes },
      })
      .run();
  }
}
