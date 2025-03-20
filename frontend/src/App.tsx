import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';

interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  updated_at: string;
}

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [newContent, setNewContent] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contextMenu, setContextMenu] = useState<{ noteId: number, x: number, y: number } | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
    }
  }, []);

  // Auto-save for new notes (runs once when content is first entered)
  useEffect(() => {
    if (selectedNoteId === null && newContent.trim() && token) {
      addNote();
    }
  }, [newContent, token]); // Runs when newContent changes, but addNote handles the one-time save

  // Auto-save for editing existing notes (2-second debounce)
  useEffect(() => {
    if (selectedNoteId !== null && newContent.trim() && token) {
      const timer = setTimeout(() => {
        saveEdit();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newContent, selectedNoteId, token]);

  const fetchNotes = async (authToken: string) => {
    try {
      const response = await axios.get<Note[]>('https://localhost:3002/notes', {
        headers: { Authorization: authToken },
      });
      setNotes(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Fetch notes error:', axiosError.response ? axiosError.response.data : axiosError.message);
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
      console.error('Login failed:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Invalid credentials or server unavailable');
    }
  };

  const addNote = async () => {
    if (!token || !newContent.trim()) return; // Skip if no token or content
    const words = newContent.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content: newContent },
        { headers: { Authorization: token } }
      );
      setNotes([response.data, ...notes]);
      setSelectedNoteId(response.data.id); // Switch to edit mode after saving
      // Don’t clear newContent here; let the user continue typing
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      // Optionally notify user: alert('Failed to add note');
    }
  };

  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setNotes(notes.filter((note) => note.id !== id));
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setNewContent('');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Failed to delete note');
    }
  };

  const saveEdit = async () => {
    if (!token || !newContent.trim() || selectedNoteId === null) return;
    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${selectedNoteId}`,
        { content: newContent },
        { headers: { Authorization: token } }
      );
      setNotes(notes.map((note) => (note.id === selectedNoteId ? response.data : note)));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      // Optionally notify user: alert('Failed to update note');
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setSelectedNoteId(null);
    setNewContent('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D]" onClick={() => setContextMenu(null)}>
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
      <header className="h-[30px] bg-transparent text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notefied</h1>
        {token && (
          <button
            onClick={logout}
            className="w-[100px] h-[30px] bg-red-600 rounded hover:bg-red-700 flex items-center justify-center"
          >
            Logout
          </button>
        )}
      </header>
      <div className="flex justify-center mt-4">
        {token ? (
          <div className="flex w-[1640px]">
            {/* Left Section */}
            <div className="w-[300px] h-[780px] flex flex-col">
              {/* Container for Widget 1, Widget 2, and Note Tiles */}
              <div className="flex-grow">
                {/* Widget 2: Search Notes */}
                <div className="h-[40px] bg-[#252525] text-white flex items-center justify-center rounded-[20px]">
                  Search Notes
                </div>
                {/* Widget 1: Three Buttons */}
                <div className="h-[30px] flex mt-[15px]">
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px]">All</button>
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px] ml-[35px]">Groups</button>
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px] ml-[35px]">Projects</button>
                </div>
                {/* Scrollable Note Tiles */}
                <div className="h-[645px] overflow-y-auto custom-scrollbar mt-[15px]">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="relative w-full h-[100px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-lg mb-2 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setSelectedNoteId(note.id); setNewContent(note.content); }}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY }); }}
                    >
                      <div>
                        <strong className="text-white">{note.title}</strong>
                        <p className="text-gray-400 truncate">{note.content}</p>
                      </div>
                      <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                        {new Date(note.updated_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* New Note Button */}
              <div className="h-[40px] flex items-center">
                <button
                  onClick={() => { setSelectedNoteId(null); setNewContent(''); }}
                  className="w-[35px] h-[35px] bg-purple-600 text-white rounded-full flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            {/* Center Section */}
            <div className="w-[1200px] h-[800px] p-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Start typing your note..."
                className="w-full h-[700px] p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded text-white rounded-[15px]"
              />
            </div>
            {/* Right Section */}
            <div className="w-[200px] h-[750px] bg-gradient-to-b from-[#191919] to-[#141414] p-2">
              <div className="w-full h-[100px] border border-gray-300"></div>
            </div>
          </div>
        ) : (
          <div className="w-[400px] bg-gray-800 p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Login</h2>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded mb-2 text-white placeholder-gray-400"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded mb-4 text-white placeholder-gray-400"
            />
            <button onClick={login} className="w-full bg-purple-600 text-white p-2 rounded hover:bg-purple-700">Login</button>
          </div>
        )}
      </div>
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-gray-800 text-white shadow-lg rounded p-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setSelectedNoteId(contextMenu.noteId);
              setNewContent(notes.find(n => n.id === contextMenu.noteId)?.content || '');
              setContextMenu(null);
            }}
            className="block w-full text-left px-2 py-1 hover:bg-gray-700"
          >
            Edit
          </button>
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