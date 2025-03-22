import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';

// Interfaces for TypeScript type definitions
interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  updated_at: string;
}

interface ErrorResponse {
  error?: string;
}

// Main App component
const App: React.FC = () => {
  // State declarations
  const [notes, setNotes] = useState<Note[]>([]); // List of all notes
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null); // ID of the currently selected note
  const [newContent, setNewContent] = useState(''); // Content of the note being edited or created
  const [originalContent, setOriginalContent] = useState<string>(''); // Original content for comparison in autosave
  const [token, setToken] = useState<string | null>(null); // Authentication token
  const [username, setUsername] = useState(''); // Username for login/register
  const [password, setPassword] = useState(''); // Password for login/register
  const [confirmPassword, setConfirmPassword] = useState(''); // Confirm password for registration
  const [isRegistering, setIsRegistering] = useState(false); // Toggle between login and register forms
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null); // Context menu state for right-click actions
  const [searchQuery, setSearchQuery] = useState(''); // Search query for filtering notes

  // --- Functions (API calls and logic) ---

  // Fetch all notes for the authenticated user
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
      fetchNotes(response.data.token);
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
  const addNote = async () => {
    if (!token || !newContent.trim()) return;
    const words = newContent.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
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
      setOriginalContent(newContent);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
    }
  };

  // Delete a note
  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      const updatedNotes = notes.filter((note) => note.id !== id).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setNewContent('');
        setOriginalContent('');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to delete note');
    }
  };

  // Save edits to an existing note
  const saveEdit = async () => {
    if (!token || !newContent.trim() || selectedNoteId === null) return;
    console.log('saveEdit called for note:', selectedNoteId, 'New content:', newContent);
    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${selectedNoteId}`,
        { content: newContent },
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
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  };

  // Logout user and clear state
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setSelectedNoteId(null);
    setNewContent('');
    setOriginalContent('');
    setSearchQuery('');
  };

  // --- useEffect Hooks ---

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
    }
  }, []);

  // Auto-add note when typing in an empty textarea
  useEffect(() => {
    if (selectedNoteId === null && newContent.trim() && token) {
      addNote();
    }
  }, [newContent, token]);

  // Autosave edits after 2 seconds of inactivity
  useEffect(() => {
    if (selectedNoteId !== null && newContent.trim() && token && newContent !== originalContent) {
      console.log('Content changed, scheduling autosave for note:', selectedNoteId, 'Content:', newContent);
      const timer = setTimeout(() => {
        console.log('Executing autosave after 2 seconds');
        saveEdit();
      }, 2000);
      return () => {
        console.log('Clearing timer for note:', selectedNoteId);
        clearTimeout(timer);
      };
    }
  }, [newContent, selectedNoteId, token, originalContent, saveEdit]);

  // Filter notes based on search query
  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // --- UI Rendering ---

  return (
    // Main container with gradient background and full height
    <div className="h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D] font-inter flex flex-col" onClick={() => setContextMenu(null)}>
      {/* Google Fonts import for Inter */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" />
      
      {/* Custom scrollbar CSS */}
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

      {/* Header with title and logout button */}
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

      {/* Main content area */}
      <div className={`flex-1 flex justify-center items-center px-4 overflow-hidden ${token ? '' : 'bg-gradient-to-br from-[#0D0D0D] to-[#191919]'}`}>
        {token ? (
          // Logged-in view: Notes interface
          <div className="flex w-full max-w-[1640px] h-full">
            {/* Left sidebar: Note list and controls */}
            <div className="w-[300px] flex flex-col flex-shrink-0 mr-[-10px]">
              <div className="flex flex-col h-full relative">
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Search Notes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[35px] w-full bg-[#252525] text-white px-4 rounded-[20px] focus:outline-none shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] placeholder-gray-400 mt-[10px]"
                />

                {/* Tab buttons: All, Groups, Projects */}
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

                {/* Note list with scrollbar */}
                <div className="flex-1 overflow-y-auto custom-scrollbar mt-[10px] mb-[60px]">
                  {filteredNotes.map((note) => (
                    // Individual note card
                    <div
                      key={note.id}
                      className="relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.6)] mb-3 cursor-pointer hover:bg-[#383838] transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNoteId(note.id);
                        setNewContent(note.content);
                        setOriginalContent(note.content);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
                      }}
                    >
                      {/* Selection indicator bar */}
                      <div
                        className={`absolute left-1 top-[12px] h-[96px] bg-gradient-to-b from-[#2996FC] via-[#1238D4] to-[#592BFF] ${
                          note.id === selectedNoteId ? 'w-[4px]' : 'w-0'
                        } transition-all duration-300 rounded-[4px]`}
                      ></div>
                      {/* Note title and content */}
                      <div
                        className={`transition-all duration-300 ${note.id === selectedNoteId ? 'ml-[7px]' : 'ml-0'}`}
                      >
                        <strong className="text-white">{note.title}</strong>
                        <p className="text-gray-400">{note.content}</p>
                      </div>
                      {/* Timestamp */}
                      <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                        {new Date(note.updated_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bottom action buttons: Trash and Add */}
                <div className="absolute bottom-[-3px] left-0 w-full flex justify-end pr-4 pb-4">
                  <button className="w-[40px] h-[40px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838] mr-6">
                    <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNoteId(null);
                      setNewContent('');
                      setOriginalContent('');
                    }}
                    className="w-[40px] h-[40px] bg-[#1F1F1F] text-white rounded-full flex items-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] justify-center hover:bg-[#383838]"
                  >
                    <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle section: Textarea for note editing */}
            <div className="flex-1 p-4 mt-[45px] ml-[0px]">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Start typing your note..."
                className="w-full h-full p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none resize-none"
              />
            </div>

            {/* Right sidebar: Placeholder for future content */}
            <div className="w-[250px] h-[780px] bg-gradient-to-b from-[#191919] to-[#141414] p-2 flex-shrink-0 mt-[8px]">
              <div className="w-full h-[40px] border border-gray-300"></div>
            </div>
          </div>
        ) : (
          // Logged-out view: Login/Register form
          <div className="w-[440px] h-[536px] bg-[#242424] rounded-[20px] flex justify-center items-center">
            <div className="w-[400px] h-[500px] bg-[#191919] rounded-[20px] shadow-lg p-6 flex flex-col">
              {/* Form title */}
              <h2 className="text-2xl font-medium text-white mb-6 text-center">
                {isRegistering ? 'Sign-up' : 'Sign-in'}
              </h2>
              {/* Username input */}
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
              />
              {/* Password input */}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
              />
              {/* Confirm password input (only for registration) */}
              {isRegistering && (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full p-2 bg-[#121212] font-thin rounded-[20px] text-white placeholder-gray-400 placeholder:text-sm mb-7 text-base focus:outline-none focus:bg-[#121212]"
                />
              )}
              {/* Forgot password link (only for login) */}
              {!isRegistering && (
                <div className="text-center text-sm text-gray-400 mb-4">Forgot password?</div>
              )}
              {/* Submit button */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={isRegistering ? register : login}
                  className="w-[100px] h-[30px] bg-[#0072DB] text-white rounded-[30px] hover:bg-blue-700 text-xs mt-2"
                >
                  {isRegistering ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
              {/* Toggle between login and register */}
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
              {/* Separator */}
              <div className="text-center text-sm text-gray-400 mb-6">or</div>
              {/* Social login placeholders */}
              <div className="flex justify-center space-x-5">
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600"></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context menu for note actions */}
      {contextMenu && (
        <div
          className="absolute bg-gray-800 text-white shadow-lg rounded p-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit option */}
          <button
            onClick={() => {
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (note) {
                setSelectedNoteId(note.id);
                setNewContent(note.content);
                setOriginalContent(note.content);
              }
              setContextMenu(null);
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-700"
          >
            Edit
          </button>
          {/* Delete option */}
          <button
            onClick={() => {
              deleteNote(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-700 text-red-400"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default App;