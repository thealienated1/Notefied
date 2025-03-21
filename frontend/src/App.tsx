import React, { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';

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
  const [originalContent, setOriginalContent] = useState<string>(''); // New state for original content
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
    }
  }, []);

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
      newContent !== originalContent // Only trigger if content has changed
    ) {
      console.log('Autosave triggered for note:', selectedNoteId, 'Content:', newContent);
      const timer = setTimeout(() => {
        saveEdit();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newContent, selectedNoteId, token, originalContent]);

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
      const updatedNotes = [response.data, ...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setSelectedNoteId(response.data.id);
      setOriginalContent(newContent); // Set original content for the new note
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
      const updatedNotes = notes.filter((note) => note.id !== id).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setNewContent('');
        setOriginalContent(''); // Reset original content
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to delete note');
    }
  };

  const saveEdit = async () => {
    if (!token || !newContent.trim() || selectedNoteId === null) return;
    console.log('Saving edit for note:', selectedNoteId, 'New content:', newContent);
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
      setOriginalContent(newContent); // Update original content after save
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
    setOriginalContent(''); // Reset original content
    setSearchQuery('');
  };

  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
        <h1 className="text-2xl font-bold">Notefied</h1>
        {token && (
          <button
            onClick={logout}
            className="w-[100px] h-[30px] bg-red-600 rounded hover:bg-red-700 flex items-center justify-center mt-[5px]"
          >
            Logout
          </button>
        )}
      </header>
      <div className="flex-1 flex justify-center px-4 overflow-hidden">
        {token ? (
          <div className="flex w-full max-w-[1640px] h-full">
            {/* Left Section */}
            <div className="w-[300px] flex flex-col flex-shrink-0 mr-[-10px]">
              <div className="flex flex-col h-full relative">
                <input
                  type="text"
                  placeholder="Search Notes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[35px] w-full bg-[#252525] text-white px-4 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-[#5062E7] placeholder-gray-400 mt-[10px]"
                />
                <div className="h-[40px] w-full flex mt-[15px]">
                  <button className="w-[70px] h-[40px] bg-[#1F1F1F] text-white text-[14px] font-medium rounded-[20px] hover:bg-[#383838]">All</button>
                  <button className="w-[70px] h-[40px] bg-[#1F1F1F] text-white text-[14px] font-medium rounded-[20px] ml-[35px] hover:bg-[#383838]">Groups</button>
                  <button className="w-[70px] h-[40px] bg-[#1F1F1F] text-white text-[14px] font-medium rounded-[20px] ml-[35px] hover:bg-[#383838]">Projects</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar mt-[15px] mb-[60px]">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-lg mb-2 cursor-pointer hover:bg-[#383838]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNoteId(note.id);
                        setNewContent(note.content);
                        setOriginalContent(note.content); // Set original content when selecting a note
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
                <div className="absolute bottom-0 left-0 w-full flex justify-end pr-4 pb-4">
                  <button className="w-[40px] h-[40px] bg-transparent text-white rounded-full flex items-center justify-center hover:bg-[#383838] mr-6">
                    <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNoteId(null);
                      setNewContent('');
                      setOriginalContent(''); // Reset original content for new note
                    }}
                    className="w-[40px] h-[40px] bg-transparent text-white rounded-full flex items-center justify-center hover:bg-[#383838]"
                  >
                    <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>
            {/* Center Section */}
            <div className="flex-1 p-4 mt-[45px] ml-[0px]">
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Start typing your note..."
                className="w-full h-full p-2 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none resize-none"
              />
            </div>
            {/* Right Section */}
            <div className="w-[250px] h-[780px] bg-gradient-to-b from-[#191919] to-[#141414] p-2 flex-shrink-0 mt-[8px]">
              <div className="w-full h-[40px] border border-gray-300"></div>
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
      {contextMenu && (
        <div
          className="absolute bg-gray-800 text-white shadow-lg rounded p-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (note) {
                setSelectedNoteId(note.id);
                setNewContent(note.content);
                setOriginalContent(note.content); // Set original content for context menu edit
              }
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