import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { CalendarSync, SyncInterface } from "@/sync";
import { SYNC_STATE, SyncAction, SyncState } from "./types";
import { useRepositories } from "./RepositoriesProvider";

type Syncs = {
  calendar: SyncInterface;
};

type SyncStates = { [K in keyof Syncs]: SyncState };

const SyncsContext = createContext<SyncStates | null>(null);

const syncStateReducer = (state: SyncState, action: SyncAction): SyncState => {
  switch (action.type) {
    case SYNC_STATE.STARTED:
      return { type: SYNC_STATE.STARTED };
    case SYNC_STATE.STOPPED:
      return { type: SYNC_STATE.STOPPED };
    case SYNC_STATE.ERROR:
      return { type: SYNC_STATE.ERROR, error: action.error };
  }
};

type SyncsAction = { key: keyof Syncs; action: SyncAction };

const syncsReducer = (state: SyncStates, { key, action }: SyncsAction): SyncStates => ({
  ...state,
  [key]: syncStateReducer(state[key], action),
});

const initialStates: SyncStates = {
  calendar: { type: SYNC_STATE.STOPPED },
};

type Props = {
  children: ReactNode;
};

export function SyncsProvider({ children }: Props) {
  const repos = useRepositories();
  const syncsRef = useRef<Syncs>(null);
  if (!syncsRef.current) {
    syncsRef.current = {
      calendar: new CalendarSync(
        repos.calendar.doc,
        repos.calendar.persistent,
        repos.calendar.persistent,
      ),
    };
  }

  const [states, dispatch] = useReducer(syncsReducer, initialStates);

  useEffect(() => {
    const syncs = syncsRef.current!;
    const entries = Object.entries(syncs) as [keyof Syncs, SyncInterface][];

    for (const [key, sync] of entries) {
      try {
        sync.start();
        dispatch({ key, action: { type: SYNC_STATE.STARTED } });
      } catch (e) {
        dispatch({ key, action: { type: SYNC_STATE.ERROR, error: e as Error } });
      }
    }

    return () => {
      for (const [, sync] of entries) {
        sync.stop();
      }
    };
  }, []);

  return <SyncsContext.Provider value={states}>{children}</SyncsContext.Provider>;
}

export const useSyncStates = () => {
  const ctx = useContext(SyncsContext);
  if (!ctx) {
    throw new Error("useSyncStates must be used inside SyncsProvider");
  }
  return ctx;
};
