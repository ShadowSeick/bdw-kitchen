import { ID } from "@/domain/ids";
import { Ingridient } from "@/domain/ingridient";

interface WriteIngridientInteface {
  upsert(ingridient: Ingridient): void;
  remove(id: ID): void;
}

interface ReadIngridientInterface {
  list(): Ingridient[];
}

export { WriteIngridientInteface, ReadIngridientInterface };
