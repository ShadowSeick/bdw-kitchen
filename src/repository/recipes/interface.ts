import { ID } from "@/domain/ids";
import { Recipe } from "@/domain/recipe";

interface WriteRecipeInterface {
  upsert(recipe: Recipe): void;
  remove(id: ID): void;
}

interface ReadRecipeInterface {
  list(): Recipe[];
  get(id: ID): void;
}

export { WriteRecipeInterface, ReadRecipeInterface };
