import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';
import BackIcon from './assets/icons/back.svg';

// Interfaces for TypeScript type definitions
interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  updated_at: string;
}

interface TrashedNote extends Note {
  trashed_at: string;
  original_updated_at?: string;
}

interface ErrorResponse {
  error?: string;
}

// Main App component
const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [newContent, setNewContent] = useState('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [isTitleManual, setIsTitleManual] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number; isTrash?: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedTrashedNotes, setSelectedTrashedNotes] = useState<number[]>([]);
  const [tempDeletedNote, setTempDeletedNote] = useState<Note | null>(null); // Temporary storage for deleted note
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea to detect undo

  // Filter and sort notes based on search query
  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Filter and sort trashed notes based on search query
  const filteredTrashedNotes = trashedNotes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime());

  // Memoized event handlers for trash view
  const handleBackToNotes = useCallback(() => {
    setIsTrashView(false);
    setSelectedTrashedNotes([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTrashedNotes.length === filteredTrashedNotes.length) {
      setSelectedTrashedNotes([]);
    } else {
      setSelectedTrashedNotes(filteredTrashedNotes.map((note) => note.id));
    }
  }, [selectedTrashedNotes, filteredTrashedNotes]);

  // Fetch active notes from the backend
  const fetchNotes = async (authToken: string) => {
    try {
      const response = await axios.get<Note[]>('https://localhost:3002/notes', {
        headers: { Authorization: authToken },
      });
      const sortedNotes = response.data.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(sortedNotes);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Fetch notes error:', axiosError.response?.data || axiosError.message);
    }
  };

  // Fetch trashed notes from the backend
  const fetchTrashedNotes = async (authToken: string) => {
    try {
      const response = await axios.get<TrashedNote[]>('https://localhost:3002/trashed-notes', {
        headers: { Authorization: authToken },
      });
      const sortedTrashedNotes = response.data.sort(
        (a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime()
      );
      setTrashedNotes(sortedTrashedNotes);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Fetch trashed notes error:', axiosError.response?.data || axiosError.message);
    }
  };

  // Handle user login
  const login = async () => {
    try {
      const response = await axios.post<{ token: string }>(
        'https://localhost:3001/login',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      await fetchNotes(response.data.token);
      await fetchTrashedNotes(response.data.token);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Login failed:', axiosError.response?.data || axiosError.message);
      alert('Invalid credentials or server unavailable');
    }
  };

  // Handle user registration
  const register = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const response = await axios.post(
        'https://localhost:3001/register',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.status === 201) {
        alert('Registration successful! Please log in.');
        setIsRegistering(false);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error('Registration failed:', axiosError.response?.data || axiosError.message);
      alert('Registration failed: ' + (axiosError.response?.data?.error || 'Server error'));
    }
  };

  // Add a new note
  const addNote = useCallback(async () => {
    if (!token || !newContent.trim()) return;
    const words = newContent.trim().split(/\s+/);
    const title = currentTitle.trim() || words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content: newContent },
        { headers: { Authorization: token } }
      );
      const updatedNotes = [response.data, ...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setSelectedNoteId(response.data.id);
      setCurrentTitle(response.data.title);
      setOriginalTitle(response.data.title);
      setOriginalContent(newContent);
      setTempDeletedNote(null); // Clear any temporary deletion
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
    }
  }, [token, newContent, currentTitle, notes]);

  const resetNoteState = useCallback(() => {
    setSelectedNoteId(null);
    setNewContent('');
    setOriginalContent('');
    setCurrentTitle('');
    setOriginalTitle('');
    setIsTitleManual(false);
    setTempDeletedNote(null); // Clear temporary deletion
  }, []);

  // Move a note to trash
  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setNotes(notes.filter((note) => note.id !== id));
      await fetchTrashedNotes(token);
      if (selectedNoteId === id) resetNoteState();
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to move note to trash');
      await fetchNotes(token);
      await fetchTrashedNotes(token);
    }
  };

  // Restore a note from trash
  const restoreNote = async (id: number) => {
    if (!token) return;
    try {
      const response = await axios.post<Note>(
        `https://localhost:3002/trashed-notes/${id}/restore`,
        {},
        { headers: { Authorization: token } }
      );
      setNotes([...notes, response.data].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
      setTrashedNotes(trashedNotes.filter((note) => note.id !== id));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Restore note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to restore note');
      await fetchNotes(token);
      await fetchTrashedNotes(token);
    }
  };

  // Permanently delete a note from trash
  const permanentlyDeleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/trashed-notes/${id}`, {
        headers: { Authorization: token },
      });
      setTrashedNotes(trashedNotes.filter((note) => note.id !== id));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Permanent delete error:', axiosError.response?.data || axiosError.message);
      alert('Failed to permanently delete note');
      await fetchTrashedNotes(token);
    }
  };

  // Save edits to an existing note
  const saveEdit = useCallback(async () => {
    if (!token || selectedNoteId === null) return;

    const contentToSave = newContent.trim();
    const titleToSave = contentToSave === '' ? '' : currentTitle;

    if (contentToSave === '' && tempDeletedNote) {
      // Finalize temporary deletion if saved with empty content
      setTempDeletedNote(null);
      setSelectedNoteId(null);
      setNewContent('');
      setCurrentTitle('');
      return;
    }

    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${selectedNoteId}`,
        { title: titleToSave, content: contentToSave },
        { headers: { Authorization: token } }
      );
      const updatedNotes = notes.map((note) =>
        note.id === selectedNoteId ? response.data : note
      ).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setOriginalContent(contentToSave);
      setOriginalTitle(titleToSave);
      setCurrentTitle(titleToSave);
      setTempDeletedNote(null); // Clear temporary deletion after save
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  }, [token, newContent, currentTitle, selectedNoteId, notes, tempDeletedNote]);

  // Handle user logout
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setTrashedNotes([]);
    resetNoteState();
    setSearchQuery('');
    setIsTrashView(false);
    setSelectedTrashedNotes([]);
  };

  // Load token and fetch notes on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
      fetchTrashedNotes(storedToken);
    }
  }, []);

  // Auto-generate title from content if not manually set, or clear it if content is empty
  useEffect(() => {
    if (!isTitleManual) {
      if (newContent.trim() === '') {
        setCurrentTitle('');
      } else {
        const words = newContent.trim().split(/\s+/);
        setCurrentTitle(words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : ''));
      }
    }
  }, [newContent, isTitleManual]);

  // Add a new note when content is entered and no note is selected
  useEffect(() => {
    if (selectedNoteId === null && newContent.trim() && token) {
      addNote();
    }
  }, [newContent, token, selectedNoteId, addNote]);

  // Handle content changes and temporary deletion
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setNewContent(content);

    if (content.trim() === '' && selectedNoteId !== null && !tempDeletedNote) {
      const noteToDelete = notes.find((note) => note.id === selectedNoteId);
      if (noteToDelete) {
        setTempDeletedNote(noteToDelete); // Store in memory temporarily
        setNotes(notes.filter((note) => note.id !== selectedNoteId)); // Remove from list
        // Do not reset editor state, allowing undo to work
      }
    }
  };

  // Detect undo (Ctrl + Z) to restore the note
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && tempDeletedNote) {
        setTimeout(() => {
          if (textarea.value.trim() !== '') {
            setNotes((prevNotes) => [...prevNotes, tempDeletedNote].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            ));
            setSelectedNoteId(tempDeletedNote.id);
            setNewContent(tempDeletedNote.content);
            setCurrentTitle(tempDeletedNote.title);
            setOriginalContent(tempDeletedNote.content);
            setOriginalTitle(tempDeletedNote.title);
            setTempDeletedNote(null); // Clear temporary storage
          }
        }, 0); // Delay to allow undo to update textarea value
      }
    };

    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [tempDeletedNote]);

  // Auto-save edits after a delay
  useEffect(() => {
    if (
      selectedNoteId !== null &&
      token &&
      (newContent !== originalContent || currentTitle !== originalTitle)
    ) {
      const timer = setTimeout(() => saveEdit(), 2000);
      return () => clearTimeout(timer);
    }
  }, [newContent, currentTitle, selectedNoteId, token, originalContent, originalTitle, saveEdit]);

  return (
    <div
      className="h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D] font-inter flex flex-col"
      onClick={() => setContextMenu(null)}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
      />
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #888 transparent;
          }
          .note-tile .ring {
            display: none;
            outline: 2px solid rgb(246, 246, 246);
          }
          .note-tile:hover .ring,
          .note-tile.selected .ring {
            outline: 1px solid rgb(254, 254, 254);
            display: block;
          }
          .note-tile.selected .ring {
            background-color: #5062E7;
          }
          .note-content {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            max-height: 3em;
          }
          textarea.custom-textarea::-webkit-scrollbar {
            width: 8px;
          }
          textarea.custom-textarea::-webkit-scrollbar-track {
            background: transparent;
          }
          textarea.custom-textarea::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          textarea.custom-textarea::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
          textarea.custom-textarea {
            scrollbar-width: thin;
            scrollbar-color: #888 transparent;
          }
        `}
      </style>

      <header className="h-[30px] bg-transparent text-white p-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">Notefied</h1>
        {token && (
          <button
            onClick={logout}
            className="w-[60px] h-[30px] bg-transparent rounded hover:text-red-400 flex items-center justify-center mt-[5px]"
          >
            Logout
          </button>
        )}
      </header>

      <div className="flex-1 flex justify-center items-center px-4 overflow-hidden relative">
        {token ? (
          isTrashView ? (
            <div className="w-full max-w-[1640px] h-full flex flex-col items-center relative">
              <div className="absolute left-[40px] bg-transparent top-4 flex items-center space-x-4">
                <button
                  onClick={handleBackToNotes}
                  className="w-[45px] h-[45px] bg-transparent rounded-full flex items-center justify-center hover:text-[#5062E7] transition-all duration-200"
                >
                  <img
                    src={BackIcon}
                    alt="Back to Notes"
                    className="w-7 h-7 hover:w-8 hover:h-8 transition-all duration-200"
                  />
                </button>
              </div>
              <div className="absolute left-[120px] top-5">
                <h2 className="text-white text-[24px] font-bold">Bin</h2>
              </div>
              <div className="absolute left-[110px] top-[52px] flex justify-start items-center space-x-6 mt-5">
                <button
                  onClick={handleSelectAll}
                  className="w-[65px] h-[45px] bg-transparent text-white font-normal rounded-[25px] mr-10 transition-all duration-200 text-[12px] hover:text-[13px]"
                >
                  Select All
                </button>
                <button
                  disabled={selectedTrashedNotes.length === 0}
                  onClick={async () => {
                    await Promise.all(selectedTrashedNotes.map((id) => restoreNote(id)));
                    setSelectedTrashedNotes([]);
                  }}
                  className={`w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] ${
                    selectedTrashedNotes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838]'
                  }`}
                >
                  Restore
                </button>
                <button
                  disabled={selectedTrashedNotes.length === 0}
                  onClick={async () => {
                    await Promise.all(selectedTrashedNotes.map((id) => permanentlyDeleteNote(id)));
                    setSelectedTrashedNotes([]);
                  }}
                  className={`w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] ${
                    selectedTrashedNotes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838]'
                  }`}
                >
                  Delete
                </button>
              </div>
              <div className="flex flex-col items-center w-full">
                <input
                  type="text"
                  placeholder="Search Bin"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[35px] w-[300px] bg-[#252525] text-white text-[12px] px-4 rounded-[20px] focus:outline-none shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] placeholder-gray-400 mt-4"
                />
              </div>
              <div className="absolute left-[100px] top-[107px] w-[calc(100%-120px)] overflow-y-auto custom-scrollbar h-[calc(100%-127px)]">
                <div className="flex flex-wrap gap-x-20 gap-y-[80px] mt-10">
                  {filteredTrashedNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`note-tile relative w-[300px] h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.6)] cursor-pointer hover:bg-[#383838] transition-all duration-300 flex-shrink-0 outline-none ${
                        selectedTrashedNotes.includes(note.id) ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedTrashedNotes((prev) =>
                          prev.includes(note.id)
                            ? prev.filter((id) => id !== note.id)
                            : [...prev, note.id]
                        );
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY, isTrash: true });
                      }}
                    >
                      <div className="ring absolute top-4 right-4 w-[10px] h-[10px] rounded-full"></div>
                      <div className="ml-[7px]">
                        <strong className="text-white text-sm">{note.title}</strong>
                        <p className="text-gray-400 text-xs note-content">{note.content}</p>
                      </div>
                      <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                        Trashed: {new Date(note.trashed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-[1640px] h-full">
              <div className="w-[300px] flex flex-col flex-shrink-0 mr-[-10px]">
                <div className="flex flex-col h-full relative">
                  <input
                    type="text"
                    placeholder="Search Notes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-[35px] w-full bg-[#252525] text-white px-4 rounded-[20px] focus:outline-none shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] placeholder-gray-400 mt-[10px]"
                  />
                  <div className="h-[45px] w-full flex mt-[10px] flex justify-center items-center">
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] hover:bg-[#383838]">
                      All
                    </button>
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838]">
                      Groups
                    </button>
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838]">
                      Projects
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar mt-[10px] mb-[60px]">
                    {filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        className="relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.6)] mb-3 cursor-pointer hover:bg-[#383838] transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNoteId(note.id);
                          setNewContent(note.content);
                          setCurrentTitle(note.title);
                          setOriginalContent(note.content);
                          setOriginalTitle(note.title);
                          setTempDeletedNote(null); // Clear temporary deletion
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
                        }}
                      >
                        <div
                          className={`absolute left-1 top-[12px] h-[96px] bg-gradient-to-b from-[#2996FC] via-[#1238D4] to-[#592BFF] ${
                            note.id === selectedNoteId ? 'w-[4px]' : 'w-0'
                          } transition-all duration-300 rounded-[4px]`}
                        ></div>
                        <div
                          className={`transition-all duration-300 ${note.id === selectedNoteId ? 'ml-[7px]' : 'ml-0'}`}
                        >
                          <strong className="text-white">{note.title}</strong>
                          <p className="text-gray-400 note-content">{note.content}</p>
                        </div>
                        <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                          {new Date(note.updated_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-[-6px] left-0 w-full flex justify-end pr-4 pb-4">
                    <button
                      onClick={() => setIsTrashView(true)}
                      className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838] mr-6"
                    >
                      <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                    </button>
                    <button
                      onClick={resetNoteState}
                      className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838]"
                    >
                      <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 mt-[45px] ml-[10px]">
                <textarea
                  ref={textareaRef}
                  value={newContent}
                  onChange={handleContentChange}
                  placeholder="Start typing your note..."
                  className="w-full h-full p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none resize-none custom-textarea"
                />
              </div>
              <div className="w-[250px] h-[780px] bg-gradient-to-b from-[#191919] to-[#141414] p-2 flex-shrink-0 mt-[8px]">
                <div className="w-full h-[40px] border border-gray-300"></div>
              </div>
            </div>
          )
        ) : (
          <div className="w-[440px] h-[536px] bg-[#242424] rounded-[20px] flex justify-center items-center">
            <div className="w-[400px] h-[500px] bg-[#191919] rounded-[20px] shadow-lg p-6 flex flex-col">
              <h2 className="text-2xl font-medium text-white mb-6 text-center">
                {isRegistering ? 'Sign-up' : 'Sign-in'}
              </h2>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
              />
              {isRegistering && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
                />
              )}
              {!isRegistering && (
                <div className="text-center text-sm text-gray-400 mb-4">Forgot password?</div>
              )}
              <div className="flex justify-center mb-6">
                <button
                  onClick={isRegistering ? register : login}
                  className="w-[100px] h-[30px] bg-[#0072DB] text-white rounded-[30px] hover:bg-blue-700 text-xs mt-2"
                >
                  {isRegistering ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
              <div className="text-center text-sm text-gray-400 mb-5">
                {isRegistering ? (
                  <>
                    Have an account?{' '}
                    <span
                      className="text-purple-400 cursor-pointer"
                      onClick={() => setIsRegistering(false)}
                    >
                      Sign-in
                    </span>
                  </>
                ) : (
                  <>
                    Don’t have an account?{' '}
                    <span
                      className="text-purple-400 cursor-pointer"
                      onClick={() => setIsRegistering(true)}
                    >
                      Sign-up
                    </span>
                  </>
                )}
              </div>
              <div className="text-center text-sm text-gray-400 mb-6">or</div>
              <div className="flex justify-center space-x-5">
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="absolute bg-[#1F1F1F] text-white rounded-[10px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] w-[120px] flex flex-col justify-center py-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isTrash ? (
            <>
              <button
                onClick={() => {
                  restoreNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] transition-all duration-200 text-green-400"
              >
                Restore
              </button>
              <button
                onClick={() => {
                  permanentlyDeleteNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] text-red-400 transition-all duration-200 mt-4"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  const note = notes.find((n) => n.id === contextMenu.noteId);
                  if (note) {
                    setSelectedNoteId(note.id);
                    setNewContent(note.content);
                    setCurrentTitle(note.title);
                    setOriginalContent(note.content);
                    setOriginalTitle(note.title);
                    setIsTitleManual(false);
                    setTempDeletedNote(null); // Clear temporary deletion
                  }
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] transition-all duration-200"
              >
                Edit
              </button>
              <button
                onClick={() => setContextMenu(null)}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] transition-all duration-200 mt-2"
              >
                Pin
              </button>
              <button
                onClick={() => {
                  deleteNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] text-red-400 transition-all duration-200 mt-4"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;