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
      console.log('Notes fetched:', response.data);
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
    // Generate title from first 5 words of content
    const words = content.trim().split(/\s+/);
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    console.log('Adding note:', { title, content });
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content },
        { headers: { Authorization: token } }
      );
      console.log('Note added:', response.data);
      setNotes([response.data, ...notes]);
      setContent('');
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response ? axiosError.response.data : axiosError.message);
      alert('Failed to add note. Try again.');
    }
  };

  const logout = () => {
    console.log('Logging out, clearing token');
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Notefied App</h1>
      {!token ? (
        <div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            style={{ margin: '5px', padding: '5px' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ margin: '5px', padding: '5px' }}
          />
          <button onClick={login} style={{ margin: '5px', padding: '5px' }}>
            Login
          </button>
        </div>
      ) : (
        <>
          <button onClick={logout} style={{ margin: '5px', padding: '5px', float: 'right' }}>
            Logout
          </button>
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your note..."
              style={{ margin: '5px', padding: '5px', width: '300px', height: '100px' }}
            />
            <button onClick={addNote} style={{ margin: '5px', padding: '5px' }}>
              Add Note
            </button>
          </div>
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong>: {note.content}{' '}
                <em>({new Date(note.updated_at).toLocaleString()})</em>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default App;