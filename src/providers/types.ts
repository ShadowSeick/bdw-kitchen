import { DB } from "@/infra/db/db";
import { ReactNode } from "react";

type ProviderProps = {
  onReady: () => void;
  children: ReactNode;
};

type BootstrapProviderProps = {
  onReady: () => void;
  db: DB;
  children: ReactNode;
};

enum SYNC_STATE {
  STARTED = "started",
  STOPPED = "stopped",
  ERROR = "error",
}

type SyncState =
  | { type: SYNC_STATE.STARTED }
  | { type: SYNC_STATE.STOPPED }
  | { type: SYNC_STATE.ERROR; error: Error };

type SyncAction =
  | { type: SYNC_STATE.STARTED }
  | { type: SYNC_STATE.STOPPED }
  | { type: SYNC_STATE.ERROR; error: Error };

export {
  ProviderProps,
  BootstrapProviderProps,
  SYNC_STATE,
  SyncAction,
  SyncState,
};
