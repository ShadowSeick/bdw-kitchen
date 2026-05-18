import { getRandomValues } from "expo-crypto";
import { v4 as uuidv4 } from "uuid";

type ID = string;

function newId() {
  const random = new Uint8Array(16);
  getRandomValues(random);

  return uuidv4({
    random,
  }) as ID;
}

export { ID, newId };
