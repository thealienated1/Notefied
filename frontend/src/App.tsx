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
  const [content, setContent] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    console.log('Checking stored token on load:', storedToken);
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
    }
  }, []);

  const fetchNotes = async (authToken: string) => {
    console.log('Fetching notes with token:', authToken);
    try {
      const response = await axios.get<Note[]>('https://localhost:3002/notes', {
        headers: { Authorization: authToken },
      });
      console.log('Raw fetched notes:', response.data);
      setNotes(response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Fetch notes error:', axiosError.response ? axiosError.response.data : axiosError.message);
    }
  };

  const login = async () => {
    console.log('Attempting login:', { username, password });
    try {
      const response = await axios.post<{ token: string }>(
        'https://localhost:3001/login',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('Login successful, token:', response.data.token);
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
    if (!token) {
      console.log('No token, login required');
      return alert('Please log in first');
    }
    if (!content.trim()) {
      console.log('Empty content');
      return alert('Content required');
    }
    const words = content.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    console.log('Step 1 - Raw input content:', content);
    console.log('Step 2 - Generated title:', title);
    console.log('Step 3 - Data to send:', JSON.stringify({ title, content }));
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content },
        { headers: { Authorization: token } }
      );
      console.log('Step 4 - Raw server response:', response.data);
      setNotes([response.data, ...notes]);
      setContent('');
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Failed to add note. Try again.');
    }
  };

  const deleteNote = async (id: number) => {
    if (!token) return;
    console.log('Deleting note with id:', id);
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setNotes(notes.filter((note) => note.id !== id));
      console.log('Note deleted:', id);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Failed to delete note');
    }
  };

  const startEditing = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = async (id: number) => {
    if (!token || !editContent.trim()) {
      console.log('No token or empty edit content');
      return alert('Content required');
    }
    console.log('Saving edited note:', { id, content: editContent });
    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${id}`,
        { content: editContent },
        { headers: { Authorization: token } }
      );
      setNotes(notes.map((note) => (note.id === id ? response.data : note)));
      setEditingNoteId(null);
      setEditContent('');
      console.log('Note updated:', response.data);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Failed to update note');
    }
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const logout = () => {
    console.log('Logging out, clearing token');
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#141414] to-[#1D1D1D] p-5 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-100 mb-5">Notes App</h1>
        {!token ? (
          <div className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={login}
              className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
            >
              Login
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={logout}
              className="float-right bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
            >
              Logout
            </button>
            <div className="space-y-3 mt-10">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your note..."
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
              <button
                onClick={addNote}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
              >
                Add Note
              </button>
            </div>
            <ul className="mt-5 space-y-3">
              {notes.map((note) => {
                console.log('Step 5 - Rendering note:', note);
                return (
                  <li
                    key={note.id}
                    className="bg-white p-3 rounded shadow flex justify-between items-start"
                  >
                    {editingNoteId === note.id ? (
                      <div className="w-full space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={4}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveEdit(note.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          {note.title !== note.content && (
                            <strong className="text-gray-800">{note.title}</strong>
                          )}
                          <p className="text-gray-600">{note.content}</p>
                          <em className="text-sm text-gray-400">
                            {new Date(note.updated_at).toLocaleString()}
                          </em>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => startEditing(note)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default App;