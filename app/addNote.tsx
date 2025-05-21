import { useNavigation } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useRef } from "react";
import { Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";


export default function addNote() {
  const date = new Date().toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const [title, setTitle] = React.useState<string>('');
  const [body, setBody] = React.useState<string>('');

  const [currentNoteId, setCurrentNoteId] = React.useState<number | null>(null);

  const [db, setDb] = React.useState<SQLite.SQLiteDatabase | null>(null);
  const [isDbLoading, setIsDbLoading] = React.useState(true);


  React.useEffect(() => {
    let isMounted = true;
    async function setupDatabase() {
      try {
        const localDb = await SQLite.openDatabaseAsync('note_app');
        // Ensure table exists. This is idempotent.
        await localDb.execAsync(
          'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NULL, body TEXT NULL, created_at TEXT, updated_at TEXT)'
        );
        if (isMounted) {
          setDb(localDb);
          setIsDbLoading(false);
        }
      } catch (error) {
        console.error("Failed to initialize database in addNote:", error);
        if (isMounted) {
          setIsDbLoading(false); // DB setup failed
        }
        // Consider showing an alert to the user
      }
    }
    setupDatabase();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveNote = React.useCallback(async () => {
    if (isDbLoading || !db) {
      console.warn("Database not ready or not initialized, cannot save note.");
      return;
    }
    // Only proceed to save if there's content or it's an existing note (even if content is cleared)
    if (!currentNoteId && !title.trim() && !body.trim()) {
      // console.log("New note with no title or body, skipping save.");
      return;
    }

    const currentTimestamp = new Date().toISOString();

    try {
      // await db.execAsync(
      //   'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NULL, body TEXT NULL, created_at TEXT, updated_at TEXT)'
      // );

      if (currentNoteId) {
        // console.log(`Updating note ID: ${currentNoteId}, Title: "${title}", Body: "${body}"`);
        await db.runAsync(
          'UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?',
          title,
          body,
          currentTimestamp,
          currentNoteId
        );
        console.log('Note updated successfully');
      } else {
        // This block is reached if it's a new note and title or body (or both) have content.
        // console.log(`Inserting new note. Title: "${title}", Body: "${body}"`);
        const result = await db.runAsync(
          'INSERT INTO notes (title, body, created_at, updated_at) VALUES (?, ?, ?, ?)',
          title,
          body,
          currentTimestamp,
          currentTimestamp
        );
        if (result.lastInsertRowId !== undefined && result.lastInsertRowId > 0) {
          // console.log('Note saved successfully, ID:', result.lastInsertRowId);
          setCurrentNoteId(result.lastInsertRowId);
        } else {
          console.warn('Note insert did not return a valid lastInsertRowId.');
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [title, body, currentNoteId, db, isDbLoading]);

  const navigation = useNavigation();
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (e) => {
      if (isDbLoading) {
        console.warn("DB not ready, save on navigate away might be skipped.");
        // Optionally, you could prevent navigation if saving is critical and DB isn't ready
        e.preventDefault();
        // Alert.alert("Please wait", "Database is initializing...");
        return;
      }
      // Save if there's content or if it's an existing note (which might be cleared)
      if (title.trim() || body.trim() || currentNoteId) {
        await saveNote();
      }
    });
    return unsubscribe;
  }, [navigation, saveNote, title, body, currentNoteId, isDbLoading]);

  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height + 20);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const bodyInput = useRef<TextInput>(null)
  return (
    <ScrollView style={[styles.main, { marginBottom: keyboardHeight }]}
      onPointerLeave={() => {
        Keyboard.dismiss();
      }}
      onPointerEnter={() => {
        if (!Keyboard.isVisible()) bodyInput.current?.focus()
      }}>
      <View style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }}>
        <Text style={{
          textAlign: 'center',
          textAlignVertical: 'bottom',
          color: '#233',
          marginVertical: 5
        }}>
          {date}
        </Text>
      </View>
      <View>
        <TextInput placeholderTextColor={'rgba(0, 0, 0, 0.5)'} autoFocus={true} value={title} onChangeText={setTitle} style={styles.titleInput} placeholder="Title goes here..." onEndEditing={saveNote} />
      </View>
      <View style={{ flex: 1 }}>
        <TextInput ref={bodyInput} placeholderTextColor={'rgba(0, 0, 0, 0.5)'} value={body} onChangeText={setBody} style={styles.bodyInput} multiline={true} placeholder="Write your notes here" textAlignVertical="top" textContentType="none" textAlign="left" inputMode="text" onEndEditing={saveNote} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingStart: 12,
    paddingEnd: 12
  },
  titleInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 10,
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 10,
    color: '#233'
  },
  bodyInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
    flex: 1,
    marginBottom: 20,
    borderRadius: 4,
    paddingVertical: 15,
    paddingHorizontal: 10,
    color: '#233'
  }
})