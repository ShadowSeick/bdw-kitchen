import { LoroCounter, LoroDoc, LoroMap } from "loro-react-native";
import { WriteRecipeInterface } from "./interface";
import { ID, Recipe, RECIPES, STATUS } from "@/domain";

export class RecipesLoroAdpater implements WriteRecipeInterface {
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

  upsert(recipe: Recipe): void {
    const recipes = this.history.getMap(RECIPES.MANIFEST);

    let historyRecipe = recipes.get(recipe.id) as LoroMap | undefined;
    if (!historyRecipe) {
      historyRecipe = recipes.setContainer(recipe.id, new LoroMap()) as LoroMap;
      historyRecipe.set("name", recipe.name);
      historyRecipe.set("status", STATUS.ACTIVE);
    }

    const rev = historyRecipe.getOrCreateContainer("rev", new LoroCounter());
    rev.increment(1);
  }

  remove(id: ID): void {
    const recipes = this.history.getMap(RECIPES.MANIFEST);

    const historyRecipe = recipes.get(id) as LoroMap | undefined;
    if (!historyRecipe) {
      return;
    }

    recipes.delete_(id);
  }

  private createHistory() {
    const history = new LoroDoc();
    history.getMap(RECIPES.MANIFEST);
    return history;
  }
}
