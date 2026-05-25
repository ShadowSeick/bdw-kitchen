import { Recipe, RECIPES, STATUS } from "@/domain";
import { RecipesLoroAdpater } from "@/repository/recipes";

describe("Recipes RecipesLoro Adapter", () => {
  const adapter = new RecipesLoroAdpater();

  test("it should add and remove the same recipe", () => {
    const recipe = new Recipe("12345", "Pasta", STATUS.ACTIVE, "tasty");

    adapter.upsert(recipe);

    expect(adapter.doc.toJSON()[RECIPES.MANIFEST]["12345"]).toEqual({
      name: "Pasta",
      status: STATUS.ACTIVE,
      rev: 1,
    });

    adapter.remove("12345");
    expect(adapter.doc.toJSON()[RECIPES.MANIFEST]["12345"]).toBeUndefined();
  });
});
