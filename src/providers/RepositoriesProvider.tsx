import { createContext, ReactNode, useContext, useRef } from "react";
import { LoroDoc } from "loro-react-native";
import { DB } from "@/infra/db/db";
import {
  CalendarLoroAdapterRepository,
  CalendarSQLiteAdapterRepository,
  CalendarWriteRepository,
} from "@/repository/calendar";

type CalendarRepositories = {
  persistent: CalendarSQLiteAdapterRepository;
  crdt: CalendarWriteRepository;
  doc: LoroDoc;
};

export type Repositories = {
  calendar: CalendarRepositories;
};

const RepositoriesContext = createContext<Repositories | null>(null);

// Here I will initialize all repositories and build the expected documents
const buildRepositories = (db: DB): Repositories => {
  const calendarSQLite = new CalendarSQLiteAdapterRepository(db);

  const calendarDoc = CalendarLoroAdapterRepository.createCalendarDoc();
  const calendarBlob = calendarSQLite.loadBlob();
  if (calendarBlob) {
    calendarDoc.importBatch([calendarBlob]);
  }

  return {
    calendar: {
      persistent: calendarSQLite,
      crdt: new CalendarLoroAdapterRepository(calendarDoc),
      doc: calendarDoc,
    },
  };
};

type Props = {
  db: DB;
  children: ReactNode;
};

export function RepositoriesProvider({ db, children }: Props) {
  const ref = useRef<Repositories>(null);
  if (!ref.current) {
    ref.current = buildRepositories(db);
  }

  return (
    <RepositoriesContext.Provider value={ref.current}>
      {children}
    </RepositoriesContext.Provider>
  );
}

export const useRepositories = () => {
  const ctx = useContext(RepositoriesContext);
  if (!ctx) {
    throw new Error("useRepositories must be used inside RepositoriesProvider");
  }
  return ctx;
};
