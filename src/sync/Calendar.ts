import { LoroDoc } from "loro-react-native";

export class CalendarSync {
  constructor(
    private doc: LoroDoc,
    private repository: WriteSQLiteRepository,
  ) {}
}
