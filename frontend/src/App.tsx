import React, { useState, useEffect } from 'react';
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
  trashed_at: string; // Timestamp when moved to trash
}

interface ErrorResponse {
  error?: string;
}

// Main App component
const App: React.FC = () => {
  // State declarations
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
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrashView, setIsTrashView] = useState(false);

  // --- Functions (API calls and logic) ---

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

  const login = async () => {
    try {
      const response = await axios.post<{ token: string }>(
        'https://localhost:3001/login',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      fetchNotes(response.data.token);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Login failed:', axiosError.response?.data || axiosError.message);
      alert('Invalid credentials or server unavailable');
    }
  };

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

  const addNote = async () => {
    if (!token || !newContent.trim()) return;
    const words = newContent.trim().split(/\s+/);
    const title = currentTitle.trim() || words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    console.log('Creating note with title:', title, 'content:', newContent);
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
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
    }
  };

  const deleteNote = (id: number) => {
    if (!token) return;
    const noteToTrash = notes.find((note) => note.id === id);
    if (noteToTrash) {
      const trashedNote: TrashedNote = {
        ...noteToTrash,
        trashed_at: new Date().toISOString(),
      };
      setTrashedNotes([trashedNote, ...trashedNotes]);
      setNotes(notes.filter((note) => note.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setNewContent('');
        setOriginalContent('');
        setCurrentTitle('');
        setOriginalTitle('');
        setIsTitleManual(false);
      }
    }
  };

  const restoreNote = (id: number) => {
    const noteToRestore = trashedNotes.find((note) => note.id === id);
    if (noteToRestore) {
      setNotes([noteToRestore, ...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
      setTrashedNotes(trashedNotes.filter((note) => note.id !== id));
    }
  };

  const permanentlyDeleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setTrashedNotes(trashedNotes.filter((note) => note.id !== id));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Permanent delete error:', axiosError.response?.data || axiosError.message);
      alert('Failed to permanently delete note');
    }
  };

  const saveEdit = async () => {
    if (!token || !newContent.trim() || selectedNoteId === null) return;
    console.log('saveEdit called for note:', selectedNoteId, 'New content:', newContent);
    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${selectedNoteId}`,
        { title: currentTitle, content: newContent },
        { headers: { Authorization: token } }
      );
      console.log('Update successful:', response.data);
      const updatedNotes = notes.map((note) =>
        note.id === selectedNoteId ? response.data : note
      ).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setOriginalContent(newContent);
      setOriginalTitle(currentTitle);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  };
  
  const [isSelectAllActive, setIsSelectAllActive] = useState(false);

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setTrashedNotes([]);
    setSelectedNoteId(null);
    setNewContent('');
    setOriginalContent('');
    setCurrentTitle('');
    setOriginalTitle('');
    setIsTitleManual(false);
    setSearchQuery('');
    setIsTrashView(false);
  };

  // --- useEffect Hooks ---

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
    }
  }, []);

  useEffect(() => {
    if (!isTitleManual && newContent.trim()) {
      const words = newContent.trim().split(/\s+/);
      setCurrentTitle(words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : ''));
    }
  }, [newContent, isTitleManual]);

  useEffect(() => {
    if (selectedNoteId === null && newContent.trim() && token) {
      addNote();
    }
  }, [newContent, token]);

  useEffect(() => {
    if (
      selectedNoteId !== null &&
      newContent.trim() &&
      token &&
      (newContent !== originalContent || currentTitle !== originalTitle)
    ) {
      console.log('Content or title changed, scheduling autosave for note:', selectedNoteId);
      const timer = setTimeout(() => {
        console.log('Executing autosave after 2 seconds');
        saveEdit();
      }, 2000);
      return () => {
        console.log('Clearing timer for note:', selectedNoteId);
        clearTimeout(timer);
      };
    }
  }, [newContent, currentTitle, selectedNoteId, token, originalContent, originalTitle]);

  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const filteredTrashedNotes = trashedNotes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime());

  // --- UI Rendering ---

  return (
    <div className="h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D] font-inter flex flex-col" onClick={() => setContextMenu(null)}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" />
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
        // Trash view
        <div className="w-full max-w-[1640px] h-full flex flex-col items-center relative">
          {/* Header section with back button */}
          <div className="absolute left-[40px] bg-transparent top-4 flex items-center space-x-4">
            <button
              onClick={() => setIsTrashView(false)}
              className="w-[45px] h-[45px] bg-transparent rounded-full flex items-center justify-center hover:text-[#5062E7] transition-all duration-200"
            >
              <img
                src={BackIcon}
                alt="Back to Notes"
                className="w-7 h-7 hover:w-8 hover:h-8 transition-all duration-200"
              />
            </button>
          </div>
          {/* Separate container for Trash title */}
          <div className="absolute left-[120px] top-5">
            <h2 className="text-white text-[24px] font-bold">Bin</h2>
          </div>
              {/* Trash action buttons */}
              <div className="absolute left-[110px] top-[52px] flex justify-start items-center space-x-6 mt-5">
                <button
                  onClick={() => setIsSelectAllActive((prev) => !prev)} // Toggle state on click
                  className={`w-[65px] h-[45px] bg-transparent text-white font-normal rounded-[25px] mr-10 transition-all duration-200 ${
                    isSelectAllActive ? 'text-[11px]' : 'text-[12px]'
                  } hover:text-[13px]`}
                >
                  Select All
                </button>
                {/* Rest of the buttons remain unchanged */}
                <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838]">
                  Restore
                </button>
                <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] font-normal rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838]">
                  Delete
                </button>
              </div>

              {/* Search bar */}
              <div className="flex flex-col items-center w-full">
                <input
                  type="text"
                  placeholder="Search Bin"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[35px] w-[300px] bg-[#252525] text-white text-[12px] px-4 rounded-[20px] focus:outline-none shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] placeholder-gray-400 mt-4"
                />
              </div>

              {/* Trashed notes list */}
              <div className="w-[300px] flex-1 overflow-y-auto custom-scrollbar mt-4 mb-[60px]">
                {filteredTrashedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.6)] mb-3 cursor-pointer hover:bg-[#383838] transition-all duration-300"
                  >
                    <div className="ml-[7px]">
                      <strong className="text-white">{note.title}</strong>
                      <p className="text-gray-400">{note.content.slice(0, 50)}...</p>
                    </div>
                    <div className="absolute bottom-1 left-2 flex space-x-2">
                      <button
                        onClick={() => restoreNote(note.id)}
                        className="text-green-400 text-[10px]"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDeleteNote(note.id)}
                        className="text-red-400 text-[10px]"
                      >
                        Delete Permanently
                      </button>
                    </div>
                    <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                      Trashed: {new Date(note.trashed_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Main notes view
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
                          <p className="text-gray-400">{note.content}</p>
                        </div>
                        <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                          {new Date(note.updated_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-[-3px] left-0 w-full flex justify-end pr-4 pb-4">
                    <button
                      onClick={() => setIsTrashView(true)}
                      className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838] mr-6"
                    >
                      <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedNoteId(null);
                        setNewContent('');
                        setOriginalContent('');
                        setCurrentTitle('');
                        setOriginalTitle('');
                        setIsTitleManual(false);
                      }}
                      className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838]"
                    >
                      <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 mt-[45px] ml-[0px]">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Start typing your note..."
                  className="w-full h-full p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none resize-none"
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
                    <span className="text-purple-400 cursor-pointer" onClick={() => setIsRegistering(false)}>
                      Sign-in
                    </span>
                  </>
                ) : (
                  <>
                    Don’t have an account?{' '}
                    <span className="text-purple-400 cursor-pointer" onClick={() => setIsRegistering(true)}>
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
          className="absolute bg-[#1F1F1F] text-white rounded-[10px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] w-[120px] h-[130px] flex flex-col justify-center py-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      )}
    </div>
  );
};

export default App;