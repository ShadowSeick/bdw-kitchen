import { useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';
import { getDatabase, getDrizzleStudioDatabase } from './db';

export function DatabaseProvider({ onReady, children }) {
  const { success, error } = useMigrations(getDatabase(), migrations);

  useDrizzleStudio(getDrizzleStudioDatabase());

  useEffect(() => {
    console.log(success);
    console.log(error);
    if (success) {
      onReady();
    }
  }, [success]);

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

  return <>{children}</>;
}
