const RECIPES = {
  MANIFEST: "recipes",
};

enum STATUS {
  ACTIVE,
  ARCHIVED,
}

class Recipe {
  id: string;
  name: string;
  description: string;
  status: STATUS;

  constructor(id: string, name: string, status: STATUS, description: string) {
    this.id = id;
    this.name = name;
    this.status = status;
    this.description = description;
  }
}

export { Recipe, RECIPES, STATUS };
