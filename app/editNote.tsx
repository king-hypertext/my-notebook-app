import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";


export default function editNote() {
  const date = new Date().toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const { id, title: initialTitle, body: initialBody } = useLocalSearchParams<{ id: string, title: string, body: string }>();

  const [title, setTitle] = React.useState<string>(initialTitle ?? '');
  const [body, setBody] = React.useState<string>(initialBody ?? '');
  const [db, setDb] = React.useState<SQLite.SQLiteDatabase | null>(null);
  const [isDbLoading, setIsDbLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    async function setupDatabase() {
      try {
        const localDb = await SQLite.openDatabaseAsync('note_app');
        // Ensure table exists. This is idempotent.
        await localDb.execAsync(
          'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, created_at TEXT, updated_at TEXT)'
        );
        if (isMounted) {
          setDb(localDb);
          setIsDbLoading(false); // DB is ready
        }
      } catch (error) {
        console.error("Failed to initialize database in editNote:", error);
        if (isMounted) {
          setIsDbLoading(false); // DB setup failed, but stop loading
        }
        // Consider showing an alert to the user
      }
    }
    setupDatabase();
    return () => { isMounted = false; };
  }, []);

  const updateNote = React.useCallback(async () => {
    const currentTimestamp = new Date().toISOString(); // Generate timestamp at the time of update
    if (isDbLoading || !db) {
      console.warn("Database not ready or not initialized, cannot update note.");
      return;
    }
    try {
      await db.runAsync(
        'UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?',
        title,
        body,
        currentTimestamp,
        Number(id) // Ensure id is a number for the query
      );
    } catch (error) {
      console.log(error);
    }
  }, [id, title, body, db, isDbLoading]); // Dependencies for useCallback

  type NoteFromDB = {
    id: number;
    title: string;
    body: string;
    created_at: string; // ISO string from DB
    updated_at: string; // ISO string from DB
  };
  // const fetchNote = React.useCallback(async () => {
  //   if (isDbLoading || !db) {
  //     console.warn("Database not ready, skipping fetchNote.");
  //     return;
  //   }
  //   const noteId = Number(id);
  //   try {
  //     const note = await db.getFirstAsync<NoteFromDB>(
  //       'SELECT * FROM notes WHERE id = ?',
  //       noteId
  //     );

  //     if (note) {
  //       setTitle(note.title || ''); // Use empty string if title is null
  //       setBody(note.body || ''); // Use empty string if body is null
  //     } else {
  //       // console.log('Note not found with id:', noteId);
  //     }
  //   } catch (error) {
  //     // console.error('Failed to fetch note:', error);
  //   }
  // }, [id, db, isDbLoading]);

  const navigation = useNavigation();

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (e) => {
      if (isDbLoading) {
        console.warn("DB not ready, update on navigate away might be skipped.");
        // Optionally, you could prevent navigation if saving is critical and DB isn't ready
        e.preventDefault();
        // Alert.alert("Please wait", "Database is initializing...");
        return;
      }
      if (title.trim() !== '' || body.trim() !== '') {
        await updateNote();
      }
    });
    return unsubscribe; // Clean up the event listener
  }, [navigation, updateNote, title, body, isDbLoading]); // Correct dependencies

  // React.useEffect(() => {
  //   if (!isDbLoading && db) {
  //     fetchNote();
  //   }
  // }, [fetchNote, isDbLoading, db]);

  return (
    <ScrollView style={styles.main}>
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
        <TextInput autoFocus={true}
          value={title}
          onChangeText={setTitle}
          style={styles.titleInput}
          placeholderTextColor={'rgba(0, 0, 0, 0.5)'}
          placeholder="Title goes here..."
          onEndEditing={updateNote} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} // Adjust as needed
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          style={styles.bodyInput}
          multiline={true}
          placeholder="Write your notes here"
          placeholderTextColor={'rgba(0, 0, 0, 0.5)'}
          textAlignVertical="top" onEndEditing={updateNote} />
      </KeyboardAvoidingView>
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
    fontSize: 15,
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