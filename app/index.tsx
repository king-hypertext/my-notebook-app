import { toSingleLine, truncateText } from "@/utils";
import { DropUpView, FadeInView } from "@/utils/animation";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from "expo-router";
import * as SQLite from 'expo-sqlite';
import React from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Share, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from "react-native";


export default function Index() {
  const dimension = useWindowDimensions();
  const router = useRouter();


  type ItemProps = {
    id: number,
    title: string | null,
    body: string | null,
    created_at: Date,
    updated_at: Date
  };

  type NoteFromDB = {
    id: number;
    title: string | null;
    body: string | null;
    created_at: string; // ISO string from DB
    updated_at: string; // ISO string from DB
  };
  const [showDropDown, setShowDropDown] = React.useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState<ItemProps[]>([]);
  const [originalNotes, setOriginalNotes] = React.useState<ItemProps[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [showToolTip, setShowToolTip] = React.useState<boolean>(false);
  const [showToast, setShowToast] = React.useState<boolean>(false);
  const [db, setDb] = React.useState<SQLite.SQLiteDatabase | null>(null);


  const handleAddNote = () => {
    return router.push({ pathname: '/addNote' });
  }

  const viewNote = (id: number, title: string | null, body: string | null) => {
    if (!id) {
      return;
    }
    return router.push({
      pathname: '/editNote',
      params: { id, title, body },
    });
  }

  const toggleDropUpMenu = (noteId: number) => {
    if (showDropDown && selectedNoteId === noteId) {
      setShowDropDown(false);
      setSelectedNoteId(null);
    } else {
      setShowDropDown(true);
      setSelectedNoteId(noteId);
    }
  };

  const deleteNote = async (noteId: number | null) => {
    if (!noteId || !db) {
      console.log("Note ID is null or DB not initialized, skipping delete.");
      return;
    }
    // const db = await SQLite.openDatabaseAsync('note_app');
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setShowDropDown(false);
            setSelectedNoteId(null);
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(`DELETE FROM notes WHERE id = ?`, noteId);
              setNotes(notes.filter(note => note.id !== noteId));
              setOriginalNotes(originalNotes.filter(note => note.id !== noteId))
            } catch (error) {
              console.log(error);
            } finally {
              setShowDropDown(false);
              setSelectedNoteId(null);
              // await fetchNotes();
            }
          },
        },
      ],
      {
        cancelable: false,
        userInterfaceStyle: 'light'
      }
    )
  }

  const Item = (item: ItemProps) => (
    <>
      <TouchableOpacity style={styles.list} onPress={(e) => {
        e.stopPropagation();
        setShowDropDown(false);
        setSelectedNoteId(null);
        viewNote(item.id, item.title, item.body);
      }}
        onPressIn={() => {
          setShowDropDown(false);
          setSelectedNoteId(null);
        }}
        onLongPress={() => {
          setShowDropDown(false);
          setSelectedNoteId(item.id);
          toggleDropUpMenu(item.id);
        }}>
        <View>
          <Text style={styles.itemTitle}>{truncateText(item.title ?? '')}</Text>
          <Text style={{
            fontSize: 12,
            ...Platform.select({
              ios: {
                fontSize: 16
              }
            }),
            opacity: 0.8,
            marginTop: 4
          }}>{truncateText(toSingleLine(item.body ?? ''))}</Text>
          <Text style={{
            opacity: 0.5,
            fontStyle: 'normal',
            fontSize: 12,
            marginTop: 8
          }}>{item.updated_at.toLocaleString()}</Text>
        </View>
        <View>
          <TouchableOpacity activeOpacity={0.5} style={styles.options} onPress={() => { toggleDropUpMenu(item.id) }} >
            <FontAwesome size={15} name="ellipsis-v" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );

  const fetchNotes = React.useCallback(async () => {
    if (!db) {
      console.log("Database not initialized yet, skipping fetchNotes.");
      // If db is not ready, we might still want to set loading to false
      // or handle this state more explicitly depending on UX requirements.
      // For now, if fetchNotes is called before db is ready, it will simply return.
      // The useFocusEffect logic ensures it's called when db is ready.
      return;
    }
    setIsLoading(true);
    // const db = await SQLite.openDatabaseAsync('note_app');
    try {
      await db.execAsync(
        'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, created_at TEXT, updated_at TEXT)'
      );

      const allRows = await db.getAllAsync<NoteFromDB>('SELECT * FROM notes ORDER BY updated_at DESC');
      const formattedNotes: ItemProps[] = allRows.map(row => ({
        ...row,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
      setOriginalNotes(formattedNotes); // Store the original full list
      setNotes(formattedNotes);         // Set the display list (initially all notes)
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      // Alert.alert("Error", "Could not load notes.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);
  React.useEffect(() => {
    async function setupDatabase() {
      setIsLoading(true);
      try {
        const openedDb = await SQLite.openDatabaseAsync('note_app');
        await openedDb.execAsync(
          'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, body TEXT, created_at TEXT, updated_at TEXT)'
        );
        setDb(openedDb);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        Alert.alert("Database Error", "Could not initialize the database.");
        setIsLoading(false); // Ensure loading is stopped on error
      }
      // setIsLoading(false) will be handled by fetchNotes after db is set and notes are fetched
    }
    setupDatabase();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (db) {
        fetchNotes();
      }
    }, [db, fetchNotes])
  );


  const filterNotes = (query: string) => {
    if (!query.trim()) {
      setNotes(originalNotes);
    } else {
      const filtered = originalNotes.filter(note =>
        note.title && note.title.toLowerCase().includes(query.toLowerCase())
      );
      setNotes(filtered);
    }
  };

  const onShare = async (note: any) => {
    if (!note) {
      return;
    }
    const message: string = `${note.title}\n${note.body}`;
    try {
      await Share.share({
        message,
      });
    } catch (error: any) {
      // Alert.alert(error.message);
    } finally {
      setShowDropDown(false);
      setSelectedNoteId(null);
    }
  }
  const onCopy = async (note: any) => {

    if (!note) {
      return;
    }
    console.log(note);
    const message: string = `${note.title}\n${note.body}`;
    try {
      await Clipboard.setStringAsync(message).then(() => {
        setShowToast(true);
      })
    } catch (error) {
      console.log(error);
    } finally {
      setShowDropDown(false);
      setSelectedNoteId(null);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={(e) => {
        e.stopPropagation();
        setShowDropDown(false);
        setSelectedNoteId(null);
      }}>
        <View style={styles.main}>
          {!isLoading && originalNotes.length > 0 &&
            <TextInput onFocus={() => {
              setShowToolTip(false);
              setShowDropDown(false);
              setSelectedNoteId(null)
            }} onChangeText={filterNotes} style={styles.searchInput} placeholderTextColor={'#233'} inputMode="search" placeholder="Search notes...." />
          }
          {isLoading ? (
            <ActivityIndicator size="large" color="#233" style={styles.loader} />
          ) : (
            originalNotes.length > 0 ?
              (<FlatList showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} data={notes} renderItem={({ item }: { item: ItemProps }) => <Item {...item} />} keyExtractor={(item) => item.id.toString()} />) : (
                <View style={styles.noNotes}>
                  <Text style={styles.noNotesText}>
                    Note book is empty
                  </Text>
                </View>
              )
          )
          }

          {showToolTip &&
            <View style={styles.tooltip}>
              <Text style={styles.tooltipText}>
                add note
              </Text>
            </View>
          }
          <View style={styles.addButtonContainer}>
            <TouchableOpacity activeOpacity={0.8} onLongPress={() => setShowToolTip(true)}
              onPressOut={() => setTimeout(() => {
                setShowToolTip(false);
                setShowDropDown(false);
                setSelectedNoteId(null)
              }, 500)
              } style={styles.addButton} onPress={handleAddNote}>
              <Text style={styles.btnText}>
                <FontAwesome name="plus" size={18} color={'#fff'} />
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </TouchableWithoutFeedback>
      {showDropDown && selectedNoteId &&
        <Pressable onPress={() => {
          setShowDropDown(false);
          setSelectedNoteId(null);
        }} style={styles.popUpMenu}>
          <DropUpView style={{
            flex: 1,
            width: '100%',
            // height: 85,
            bottom: 0,
            left: 0,
            right: 0,
            position: 'absolute',
            ...Platform.select({
              ios: {
                top: dimension.height - 275,
              },
              android: {
                top: dimension.height - 205,
              }
            }),
            borderTopRightRadius: 8,
            borderTopLeftRadius: 8,
            backgroundColor: '#fff',
            paddingVertical: 8
          }}>
            <TouchableOpacity style={styles.popUpMenuOption} activeOpacity={0.5} onPress={async () => { deleteNote(selectedNoteId) }}>
              <Text>
                <FontAwesome size={15} style={{
                  marginRight: 8,
                  color: '#233'
                }} name="trash" />
              </Text>
              <Text style={{
                marginLeft: 8,
                color: '#233'
              }}>
                Delete Note
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.popUpMenuOption} activeOpacity={0.5} onPress={
                async () => onCopy(notes.find(note => note.id === selectedNoteId))}>
              <Text>
                <FontAwesome size={15} style={{
                  marginRight: 8,
                  color: '#233'
                }} name="copy" />
              </Text>
              <Text style={{
                marginLeft: 8,
                color: '#233'
              }}>
                Copy Note
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.popUpMenuOption} activeOpacity={0.5}
              onPress={async () => onShare(notes.find(note => note.id === selectedNoteId))}>
              <Text>
                <FontAwesome size={15} style={{
                  marginRight: 8,
                  color: '#233'
                }} name="share" />
              </Text>
              <Text style={{
                marginLeft: 8,
                color: '#233'
              }}>
                Share Note
              </Text>
            </TouchableOpacity>
          </DropUpView>
        </Pressable>
      }
      {
        showToast &&
        <FadeInView style={styles.toastContainer}>
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastText}>
              Note copied to clipboard
            </Text>
          </View>
        </FadeInView>

      }
    </>
  );
}
const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    maxHeight: 55,
  },
  toastTextContainer: {
    zIndex: 100000,
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgb(22, 32, 39)',
    pointerEvents: 'none',
    marginRight: 'auto',
    marginLeft: 'auto',
    maxWidth: '50%',
  },
  toastText: {
    color: '#f2f2f2',
    textAlign: 'center',
  },
  popUpMenuOption: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 15,
    maxHeight: 55,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.4,
    borderBottomColor: 'rgba(0,0,0,0.3)'
  },
  popUpMenu: {
    flex: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    width: '100%',
    zIndex: 100005,
    backgroundColor: 'rgba(0,0,0)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 2,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  options: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 'auto',
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'transparent'
  },
  main: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingStart: 12,
    paddingEnd: 12
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  addButton: {
    marginStart: 'auto',
    marginEnd: 'auto',
    borderRadius: 8,
    zIndex: 10000,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  btnText: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: '#233',
    borderRadius: 8,
    color: '#ffffff',
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'transparent'
  },
  tooltipText: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    marginStart: 'auto',
    marginEnd: 'auto',
    zIndex: 10000,
    paddingStart: 10,
    paddingEnd: 10,
    paddingBottom: 5,
    paddingTop: 5,
    borderRadius: 5,
    color: '#fff',
  },
  listContainer: {
  },
  list: {
    flex: 1,
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
    borderRadius: 5,
    backgroundColor: '#fff',
    padding: 8,
  },
  itemTitle: {
    fontSize: 16,
    textTransform: 'none',
    fontWeight: '500',
    color: '#233'
  },
  noNotes: {
    marginVertical: 20,
    flex: 1,
    alignContent: 'center',
    alignItems: 'center'
  },
  noNotesText: {
    textAlign: 'center',
    fontWeight: 400,
    fontSize: 15
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    color: '#233',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 15,
    borderRadius: 5,
    paddingLeft: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
  }
})