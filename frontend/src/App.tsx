import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg'; // Import as image
import PlusIcon from './assets/icons/plus.svg';   // Import as image

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
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // For search functionality

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
  }, [newContent, token]);

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
      // Sort notes by updated_at in descending order
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

  const addNote = async () => {
    if (!token || !newContent.trim()) return;
    const words = newContent.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content: newContent },
        { headers: { Authorization: token } }
      );
      // Add new note and sort by updated_at
      const updatedNotes = [response.data, ...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setSelectedNoteId(response.data.id);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
    }
  };

  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      // Remove note and maintain sorted order
      const updatedNotes = notes.filter((note) => note.id !== id).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setNewContent('');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
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
      // Update note and sort by updated_at
      const updatedNotes = notes.map((note) =>
        note.id === selectedNoteId ? response.data : note
      ).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setSelectedNoteId(null);
    setNewContent('');
    setSearchQuery('');
  };

  // Filter and sort notes based on search query
  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D] font-inter" onClick={() => setContextMenu(null)}>
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
              <div className="flex-grow relative">
                {/* Widget 2: Search Notes Input */}
                <input
                  type="text"
                  placeholder="Search Notes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[40px] w-full bg-[#252525] text-white px-4 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-[#5062E7] placeholder-gray-400"
                />
                {/* Widget 1: Three Buttons */}
                <div className="h-[30px] flex mt-[15px]">
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px] hover:bg-[#383838]">All</button>
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px] ml-[35px] hover:bg-[#383838]">Groups</button>
                  <button className="w-[80px] h-[30px] bg-[#1F1F1F] text-white rounded-[15px] ml-[35px] hover:bg-[#383838]">Projects</button>
                </div>
                {/* Scrollable Note Tiles */}
                <div className="h-[640px] overflow-y-auto custom-scrollbar mt-[15px]">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-lg mb-2 cursor-pointer hover:bg-[#383838]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNoteId(note.id);
                        setNewContent(note.content);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ noteId: note.id, x: e.clientX, y: e.clientY });
                      }}
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
                {/* Buttons Container */}
                <div className="absolute bottom-0 right-4 flex space-x-6">
                  <button className="w-[40px] h-[40px] bg-transparent text-white rounded-full flex items-center justify-center hover:bg-[#383838]">
                    <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNoteId(null);
                      setNewContent('');
                    }}
                    className="w-[40px] h-[40px] bg-transparent text-white rounded-full flex items-center justify-center hover:bg-[#383838]"
                  >
                    <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>
            {/* Center Section */}
            <div className="w-[1100px] h-[800px] p-4">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Start typing your note..."
                className="w-full h-[700px] p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded text-white rounded-[15px] focus:border-[#5062E7] focus:outline-none resize-none"
              />
            </div>
            {/* Right Section */}
            <div className="w-[240px] h-[750px] bg-gradient-to-b from-[#191919] to-[#141414] p-2">
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
              setNewContent(notes.find((n) => n.id === contextMenu.noteId)?.content || '');
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