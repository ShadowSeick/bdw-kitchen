enum OPERATION {
  UPSERT = "upsert",
  REMOVE = "remove",
}

type MealOp = OPERATION.UPSERT | OPERATION.REMOVE;

export { OPERATION, MealOp };
