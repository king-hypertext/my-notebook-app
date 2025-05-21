import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{
        gestureEnabled: true,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 15,
          color: '#233'
        }
      }}>
        <Stack.Screen name="index" options={{
          title: 'My Notebook',
          headerTitleAlign: 'center',
        }} />
        <Stack.Screen name="addNote" options={{
          headerTintColor: '#233',
          headerBackButtonDisplayMode: 'generic',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 15,
            color: '#233'
          },
          title: 'New Note'
        }} />
        <Stack.Screen name="editNote" options={{
          headerTintColor: '#233',
          headerBackButtonDisplayMode: 'generic',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 15,
            color: '#233'
          },
          title: 'Edit Note',
        }} />
      </Stack>
      <StatusBar translucent={true} style="dark" />
    </>
  );
}
