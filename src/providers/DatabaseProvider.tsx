import { useEffect } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "@/infra/db/drizzle/migrations"
import { getDatabase, getDrizzleStudioDatabase } from "@/infra/db/db"
import { ProviderProps } from "./types";
import { BootstrapProvider } from "./BootstrapProvider";

export function DatabaseProvider({ onReady, children }: ProviderProps) {
  const db = getDatabase()
  const { success, error } = useMigrations(db, migrations);

  useDrizzleStudio(getDrizzleStudioDatabase());

  useEffect(() => {
    if (error) {
      console.error(error);
    }

  }, [error]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ color: "red" }}>
          Migration error: {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Running migrations...</Text>
      </View>
    );
  }

  return <BootstrapProvider onReady={onReady} db={db}>{children}</BootstrapProvider>;
}
