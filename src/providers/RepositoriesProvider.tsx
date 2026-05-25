import { createContext, ReactNode, useContext, useRef } from "react";
import { DB } from "@/infra/db/db";
import {
  CalendarLoroAdapterRepository,
  CalendarLoroAdapterSubscriptor,
  CalendarSQLiteAdapterRepository,
  CalendarSubscription,
  CalendarWriteRepository,
} from "@/repository/calendar";

type CalendarRepositories = {
  query: CalendarSQLiteAdapterRepository;
  write: CalendarWriteRepository;
  subscriber: CalendarSubscription;
};

export type Repositories = {
  calendar: CalendarRepositories;
};

const RepositoriesContext = createContext<Repositories | null>(null);

const buildRepositories = (db: DB): Repositories => {
  const calendarSQLite = new CalendarSQLiteAdapterRepository(db);

  const calendarBlob = calendarSQLite.loadBlob();
  const calendarManifest = new CalendarLoroAdapterRepository(calendarBlob);
  const calendarSubscription = new CalendarLoroAdapterSubscriptor(calendarManifest);

  return {
    calendar: {
      query: calendarSQLite,
      write: calendarManifest,
      subscriber: calendarSubscription,
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
