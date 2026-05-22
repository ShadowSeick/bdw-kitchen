import { ReactNode, useEffect } from "react";
import { Text, View } from "react-native";
import { BootstrapProviderProps, SYNC_STATE } from "./types";
import { RepositoriesProvider } from "./RepositoriesProvider";
import { SyncsProvider, useSyncStates } from "./SyncsProvider";

type ReadyGateProps = {
  onReady: () => void;
  children: ReactNode;
};

function ReadyGate({ onReady, children }: ReadyGateProps) {
  const { calendar } = useSyncStates();
  const ready = calendar.type === SYNC_STATE.STARTED;

  useEffect(() => {
    if (ready) {
      onReady();
    }
  }, [ready, onReady]);

  if (calendar.type === SYNC_STATE.ERROR) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ color: "red" }}>Sync error: {calendar.error.message}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function BootstrapProvider({ onReady, children, db }: BootstrapProviderProps) {
  return (
    <RepositoriesProvider db={db}>
      <SyncsProvider>
        <ReadyGate onReady={onReady}>{children}</ReadyGate>
      </SyncsProvider>
    </RepositoriesProvider>
  );
}
