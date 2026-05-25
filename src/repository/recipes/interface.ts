import { ID } from "@/domain/ids";
import { Recipe } from "@/domain/recipe";

interface WriteRecipeInterface {
  upsert(recipe: Recipe): void;
  remove(id: ID): void;
}

interface ReadRecipeInterface {
  list(): Recipe[];
  get(id: ID): Recipe;
  loadManifest(): ArrayBuffer | undefined;
  loadBlobById(id: ID): ArrayBuffer | undefined;
}

interface RecipeBlobStore {
  saveBlob(id: string, bytes: ArrayBuffer): void;
}

export { WriteRecipeInterface, ReadRecipeInterface, RecipeBlobStore };
