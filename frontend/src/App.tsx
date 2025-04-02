import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';
import BackIcon from './assets/icons/back.svg';
import FirstCapIcon from './assets/icons/FirstCap.svg';
import AllCapIcon from './assets/icons/AllCap.svg';
import BoldIcon from './assets/icons/Bold.svg';
import ItalicIcon from './assets/icons/Italic.svg';
import UnderlineIcon from './assets/icons/Underline.svg';
import StrikeThroughIcon from './assets/icons/StrikeThrough.svg';
import ChecklistIcon from './assets/icons/Checklist.svg';
import BulletPointsIcon from './assets/icons/BulletPoint.svg';

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
  // State for notes management
  const [notes, setNotes] = useState<Note[]>([]); // Array of active notes
  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>([]); // Array of trashed notes
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null); // ID of currently selected note
  const [newContent, setNewContent] = useState(''); // Content of the textarea
  const [originalContent, setOriginalContent] = useState<string>(''); // Original content for comparison
  const [currentTitle, setCurrentTitle] = useState(''); // Current title of the note
  const [originalTitle, setOriginalTitle] = useState(''); // Original title for comparison
  const [isTitleManual, setIsTitleManual] = useState(false); // Flag to indicate if title is manually set

  // Authentication state
  const [token, setToken] = useState<string | null>(null); // Authentication token
  const [username, setUsername] = useState(''); // Login/Signup username
  const [password, setPassword] = useState(''); // Login/Signup password
  const [confirmPassword, setConfirmPassword] = useState(''); // Confirm password for signup
  const [isRegistering, setIsRegistering] = useState(false); // Toggle between login and signup
  const [loginError, setLoginError] = useState<string>(''); // Login error message
  const [registerError, setRegisterError] = useState<string>(''); // Registration error message

  // UI interaction state
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number; isTrash?: boolean } | null>(null); // Context menu position and data
  const [searchQuery, setSearchQuery] = useState(''); // Search query for filtering notes
  const [isTrashView, setIsTrashView] = useState(false); // Toggle trash view
  const [selectedTrashedNotes, setSelectedTrashedNotes] = useState<number[]>([]); // IDs of selected trashed notes
  const [tempDeletedNote, setTempDeletedNote] = useState<Note | null>(null); // Temporarily deleted note for undo
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false); // Show permanent delete confirmation
  const [notesToDeletePermanently, setNotesToDeletePermanently] = useState<number[]>([]); // IDs of notes to delete permanently

  // Refs and textarea state
  const [textareaKey, setTextareaKey] = useState(Date.now()); // Key to force textarea re-render
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Reference to textarea element
  const taskbarRef = useRef<HTMLDivElement>(null); // Reference to taskbar element
  const containerRef = useRef<HTMLDivElement>(null); // Reference to textarea's container

  // Taskbar dragging state
  const [taskbarPosition, setTaskbarPosition] = useState({ x: 0, y: 0 }); // Position of the draggable taskbar
  const [isDragging, setIsDragging] = useState(false); // Flag for dragging state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Offset for dragging calculations

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time}, ${dateStr}`;
  };

  // Filter and sort notes based on search query
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

  // Utility functions for trash view
  const handleBackToNotes = useCallback(() => {
    setIsTrashView(false);
    setSelectedTrashedNotes([]);
    setSearchQuery('');
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTrashedNotes.length === filteredTrashedNotes.length && filteredTrashedNotes.length > 0) {
      setSelectedTrashedNotes([]);
    } else {
      setSelectedTrashedNotes(filteredTrashedNotes.map((note) => note.id));
    }
  }, [selectedTrashedNotes, filteredTrashedNotes]);

  // Fetch notes from the server
  const fetchNotes = async (authToken: string) => {
    try {
      const response = await axios.get<Note[]>('https://localhost:3002/notes', {
        headers: { Authorization: authToken },
      });
      setNotes(response.data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Fetch notes error:', axiosError.response?.data || axiosError.message);
    }
  };

  // Fetch trashed notes from the server
  const fetchTrashedNotes = async (authToken: string) => {
    try {
      const response = await axios.get<TrashedNote[]>('https://localhost:3002/trashed-notes', {
        headers: { Authorization: authToken },
      });
      setTrashedNotes(response.data.sort((a, b) => new Date(b.trashed_at).getTime() - new Date(a.trashed_at).getTime()));
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
      setLoginError('');
      await fetchNotes(response.data.token);
      await fetchTrashedNotes(response.data.token);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Login failed:', axiosError.response?.data || axiosError.message);
      setLoginError('Incorrect Username or Password');
    }
  };

  // Handle user registration
  const register = async () => {
    if (password !== confirmPassword) {
      setRegisterError("Password Doesn't Match");
      return;
    }
    try {
      const response = await axios.post(
        'https://localhost:3001/register',
        { username, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.status === 201) {
        setRegisterError('');
        setIsRegistering(false);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error('Registration failed:', axiosError.response?.data || axiosError.message);
      const errorMsg = axiosError.response?.data?.error;
      if (errorMsg && errorMsg.toLowerCase().includes('username')) {
        setRegisterError('Username Already Exists');
      } else {
        setRegisterError('Registration Failed');
      }
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
      setTempDeletedNote(null);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to add note');
    }
  }, [token, newContent, currentTitle, notes]);

  // Reset note-related state
  const resetNoteState = useCallback(() => {
    setSelectedNoteId(null);
    setNewContent('');
    setOriginalContent('');
    setCurrentTitle('');
    setOriginalTitle('');
    setIsTitleManual(false);
    setTempDeletedNote(null);
  }, []);

  // Delete a note (move to trash)
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
  const restoreNote = async (id: number): Promise<Note | null> => {
    if (!token) return null;
    try {
      const response = await axios.post<Note>(
        `https://localhost:3002/trashed-notes/${id}/restore`,
        {},
        { headers: { Authorization: token } }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Restore note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to restore note');
      await fetchNotes(token);
      await fetchTrashedNotes(token);
      return null;
    }
  };

  // Permanently delete notes from trash
  const executePermanentDeletion = async () => {
    if (!token || notesToDeletePermanently.length === 0) return;
    try {
      await Promise.all(
        notesToDeletePermanently.map((id) =>
          axios.delete(`https://localhost:3002/trashed-notes/${id}`, {
            headers: { Authorization: token },
          })
        )
      );
      setTrashedNotes((prev) => prev.filter((note) => !notesToDeletePermanently.includes(note.id)));
      setSelectedTrashedNotes((prev) => prev.filter((id) => !notesToDeletePermanently.includes(id)));
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Permanent delete error:', axiosError.response?.data || axiosError.message);
      alert('Failed to permanently delete notes');
      await fetchTrashedNotes(token);
    }
  };

  // Trigger confirmation for permanent deletion
  const triggerPermanentDeleteConfirmation = useCallback(
    (ids: number[]) => {
      if (ids.length === 0) return;
      setNotesToDeletePermanently(ids);
      setShowDeleteConfirmModal(true);
    },
    []
  );

  // Save edits to an existing note
  const saveEdit = useCallback(async () => {
    if (!token || typeof selectedNoteId !== 'number') return;
    const contentToSave = newContent.trim();
    const titleToSave = contentToSave === '' ? '' : currentTitle;
    if (contentToSave === '' && tempDeletedNote) {
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
      const updatedNotes = notes
        .map((note) => (note.id === selectedNoteId ? response.data : note))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setNotes(updatedNotes);
      setOriginalContent(contentToSave);
      setOriginalTitle(titleToSave);
      setCurrentTitle(titleToSave);
      setTempDeletedNote(null);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  }, [token, newContent, currentTitle, selectedNoteId, notes, tempDeletedNote]);

  // Logout user and clear state
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setNotes([]);
    setTrashedNotes([]);
    resetNoteState();
    setSearchQuery('');
    setIsTrashView(false);
    setSelectedTrashedNotes([]);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setIsRegistering(false);
    setShowDeleteConfirmModal(false);
    setLoginError('');
    setRegisterError('');
  };

  // Handle context menu positioning
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, noteId: number, isTrash?: boolean) => {
    e.preventDefault();
    const tile = e.currentTarget;
    const rect = tile.getBoundingClientRect();
    const x = rect.right - 2;
    let y = rect.top + 10;
    const menuHeight = 100;
    if (rect.top + menuHeight > window.innerHeight) {
      y = rect.top - menuHeight;
    }
    setContextMenu({ noteId, x, y, isTrash });
  };

  // Set initial taskbar position to top-right corner inside textarea's container
  useLayoutEffect(() => {
    const updateTaskbarPosition = () => {
      if (containerRef.current && taskbarRef.current && token && !isTrashView) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const styles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(styles.paddingLeft);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingRight = parseFloat(styles.paddingRight);
        const paddingBottom = parseFloat(styles.paddingBottom);
        const taskbarWidth = 374;
        const taskbarHeight = 32;
        const boundaryOffset = 5;

        const minX = boundaryOffset;
        const minY = boundaryOffset;
        const maxX = containerRect.width - taskbarWidth - paddingRight - boundaryOffset;
        const maxY = containerRect.height - taskbarHeight - paddingBottom - boundaryOffset;

        const initialX = maxX;
        const initialY = minY;

        setTaskbarPosition({
          x: Math.max(minX, Math.min(initialX, maxX)),
          y: Math.max(minY, Math.min(initialY, maxY)),
        });
      }
    };

    updateTaskbarPosition();
    window.addEventListener('resize', updateTaskbarPosition);

    return () => {
      window.removeEventListener('resize', updateTaskbarPosition);
    };
  }, [token, isTrashView]);

  // Handle mouse down to start dragging the taskbar
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (taskbarRef.current) {
      const rect = taskbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  // Handle taskbar dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current && taskbarRef.current) {
        e.preventDefault();
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const styles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(styles.paddingLeft);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingRight = parseFloat(styles.paddingRight);
        const paddingBottom = parseFloat(styles.paddingBottom);
        const taskbarWidth = 375;
        const taskbarHeight = 32;
        const boundaryOffset = 10;

        const minX = boundaryOffset;
        const minY = boundaryOffset;
        const maxX = containerRect.width - taskbarWidth - paddingRight - boundaryOffset;
        const maxY = containerRect.height - taskbarHeight - paddingBottom - boundaryOffset;

        const newX = e.clientX - dragOffset.x - containerRect.left;
        const newY = e.clientY - dragOffset.y - containerRect.top;

        setTaskbarPosition({
          x: Math.max(minX, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Reset textarea key on mount
  useEffect(() => {
    setTextareaKey(Date.now());
  }, []);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchNotes(storedToken);
      fetchTrashedNotes(storedToken);
    }
  }, []);

  // Auto-generate title from content if not manually set
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

  // Auto-save note changes after 2 seconds
  useEffect(() => {
    if (!token || !newContent.trim()) return;
    const timer = setTimeout(() => {
      if (selectedNoteId === null) {
        addNote();
      } else if (typeof selectedNoteId === 'number' && (newContent !== originalContent || currentTitle !== originalTitle)) {
        saveEdit();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [newContent, currentTitle, selectedNoteId, token, originalContent, originalTitle, addNote, saveEdit]);

  // Handle textarea content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setNewContent(content);
    if (content.trim() === '' && typeof selectedNoteId === 'number' && !tempDeletedNote) {
      const noteToDelete = notes.find((note) => note.id === selectedNoteId);
      if (noteToDelete) {
        setTempDeletedNote(noteToDelete);
        setNotes(notes.filter((note) => note.id !== selectedNoteId));
        setSelectedNoteId(null);
      }
    } else if (content.trim() !== '' && tempDeletedNote) {
      setTempDeletedNote(null);
    }
  };

  // Handle undo (Ctrl+Z) for temporarily deleted notes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !tempDeletedNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        setNotes((prevNotes) =>
          [...prevNotes, tempDeletedNote].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        );
        setSelectedNoteId(tempDeletedNote.id);
        setNewContent(tempDeletedNote.content);
        setCurrentTitle(tempDeletedNote.title);
        setOriginalContent(tempDeletedNote.content);
        setOriginalTitle(tempDeletedNote.title);
        setTempDeletedNote(null);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(tempDeletedNote.content.length, tempDeletedNote.content.length);
        }, 0);
      }
    };
    textarea.addEventListener('keydown', handleKeyDown);
    return () => textarea.removeEventListener('keydown', handleKeyDown);
  }, [tempDeletedNote]);

  return (
    // Main app container with gradient background
    <div
      className="h-screen bg-gradient-to-br from-[#141414] to-[#1D1D1D] font-inter flex flex-col text-gray-200"
      onClick={() => setContextMenu(null)}
    >
      {/* Import Inter font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
      />
      {/* Custom CSS styles */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
          .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #888 transparent; }
          .note-tile .ring { display: none; outline: 2px solid #f6f6f6; }
          .note-tile:hover .ring, .note-tile.selected .ring { outline: 1px solid #fefefe; display: block; }
          .note-tile.selected .ring { background-color: #5062e7; }
          .note-content { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; max-height: 3em; }
          textarea.custom-textarea::-webkit-scrollbar { width: 8px; }
          textarea.custom-textarea::-webkit-scrollbar-track { background: transparent; }
          textarea.custom-textarea::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
          textarea.custom-textarea::-webkit-scrollbar-thumb:hover { background: #555; }
          textarea.custom-textarea { scrollbar-width: thin; scrollbar-color: #888 transparent; }
          select.no-arrow { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
        `}
      </style>

      {/* Header with app title and logout button */}
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
      <div className="flex-1 flex justify-center items-center px-4 overflow-hidden relative">
        {token ? (
          isTrashView ? (
            // Trash view layout
            <div className="w-full max-w-[1640px] h-full flex flex-col items-center relative">
              {/* Back button */}
              <div className="absolute left-[40px] bg-transparent top-4">
                <button
                  onClick={handleBackToNotes}
                  className="w-[45px] h-[45px] bg-transparent rounded-full flex items-center justify-center hover:text-[#5062E7] transition-all duration-300"
                >
                  <img
                    src={BackIcon}
                    alt="Back"
                    className="w-7 h-7 hover:w-8 hover:h-8 transition-all"
                  />
                </button>
              </div>
              {/* Trash title */}
              <div className="absolute left-[120px] top-5">
                <h2 className="text-white text-[24px] font-bold">Bin</h2>
              </div>
              {/* Trash action buttons */}
              <div className="absolute left-[110px] top-[52px] flex items-center space-x-6 mt-5">
                <button
                  onClick={handleSelectAll}
                  className="w-[65px] h-[45px] bg-transparent text-white text-[12px] rounded-[25px] mr-10 hover:text-[13px]"
                >
                  Select All
                </button>
                <button
                  disabled={!selectedTrashedNotes.length}
                  onClick={async () => {
                    const restoredNotes = await Promise.all(selectedTrashedNotes.map((id) => restoreNote(id)));
                    const validRestoredNotes = restoredNotes.filter((note): note is Note => note !== null);
                    if (validRestoredNotes.length > 0) {
                      setNotes((prev) =>
                        [...prev, ...validRestoredNotes].sort(
                          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                        )
                      );
                      setTrashedNotes((prev) => prev.filter((note) => !selectedTrashedNotes.includes(note.id)));
                      setSelectedTrashedNotes([]);
                    }
                  }}
                  className={`w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] ${
                    !selectedTrashedNotes.length ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838]'
                  }`}
                >
                  Restore
                </button>
                <button
                  disabled={!selectedTrashedNotes.length}
                  onClick={() => triggerPermanentDeleteConfirmation(selectedTrashedNotes)}
                  className={`w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] ${
                    !selectedTrashedNotes.length ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838]'
                  }`}
                >
                  Delete
                </button>
              </div>
              {/* Search bar for trash */}
              <div className="flex flex-col items-center w-full">
                <input
                  type="text"
                  placeholder="Search Bin"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-[35px] w-[300px] bg-[#252525] text-white text-[12px] px-4 rounded-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-[0.5px] focus:ring-[#5062E7] mt-4"
                />
              </div>
              {/* Trashed notes list */}
              <div className="absolute left-[100px] top-[107px] w-[calc(100%-120px)] h-[calc(100%-127px)] overflow-y-auto custom-scrollbar">
                <div className="flex flex-wrap gap-x-20 gap-y-[80px] mt-10">
                  {!filteredTrashedNotes.length && (
                    <p className="w-full text-center text-gray-500">Trash is empty.</p>
                  )}
                  {filteredTrashedNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`note-tile relative w-[300px] h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] cursor-pointer hover:bg-[#383838] transition-all duration-300 outline-none ${
                        selectedTrashedNotes.includes(note.id) ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setSelectedTrashedNotes((prev) =>
                          prev.includes(note.id) ? prev.filter((id) => id !== note.id) : [...prev, note.id]
                        )
                      }
                      onContextMenu={(e) => handleContextMenu(e, note.id, true)}
                    >
                      <div className="ring absolute top-4 right-4 w-[10px] h-[10px] rounded-full"></div>
                      <div className="ml-[7px]">
                        <strong className="text-white text-sm">{note.title}</strong>
                        <p className="text-gray-400 text-xs note-content">{note.content}</p>
                      </div>
                      <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                        Trashed: {formatDate(note.trashed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Main notes view layout
            <div className="flex w-full max-w-[1640px] h-full">
              {/* Sidebar with notes list */}
              <div className="w-[300px] flex flex-col flex-shrink-0 h-full relative ">
                <div className="flex-shrink-0">
                  {/* Search bar for notes */}
                  <input
                    type="text"
                    placeholder="Search Notes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-[35px] w-full bg-[#252525] text-white px-4 rounded-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-[0.5px] focus:ring-[#5062E7] transition-all duration-300 mt-[10px]"
                  />
                  {/* Filter buttons */}
                  <div className="h-[45px] w-full flex mt-[10px] justify-center items-center">
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] hover:bg-[#383838] transition-all duration-300">
                      All
                    </button>
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838] transition-all duration-300">
                      Groups
                    </button>
                    <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838] transition-all duration-300">
                      Projects
                    </button>
                  </div>
                </div>
                {/* Notes list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar mt-[10px] pb-20 pr-1">
                  {!filteredNotes.length && !tempDeletedNote && (
                    <p className="text-center text-gray-500 mt-10">No notes yet.</p>
                  )}
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`note-tile relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] mb-3 cursor-pointer hover:bg-[#383838] transition-all duration-300 ${
                        note.id === selectedNoteId ? 'bg-[#2a2a2a]' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (note.id !== selectedNoteId) {
                          setSelectedNoteId(note.id);
                          setNewContent(note.content);
                          setCurrentTitle(note.title);
                          setOriginalContent(note.content);
                          setOriginalTitle(note.title);
                          setTempDeletedNote(null);
                          textareaRef.current?.focus();
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, note.id)}
                    >
                      <div
                        className={`absolute left-1 top-[12px] h-[96px] bg-gradient-to-b from-[#2996FC] via-[#1238D4] to-[#592BFF] ${
                          note.id === selectedNoteId ? 'w-[4px]' : 'w-0'
                        } transition-all duration-300 rounded-[4px]`}
                      ></div>
                      <div
                        className={`transition-all duration-300 ${note.id === selectedNoteId ? 'ml-[7px]' : 'ml-0'}`}
                      >
                        <strong className="text-white">{note.title || '(Untitled)'}</strong>
                        <p className="text-gray-400 note-content">{note.content}</p>
                      </div>
                      <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                        {formatDate(note.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Bottom action buttons */}
                <div className="absolute bottom-[5px] left-0 right-2 h-18 flex items-center justify-end pr-4 z-10 backdrop-blur-sm rounded-[30px]">
                  <button
                    onClick={() => {
                      setIsTrashView(true);
                      setSearchQuery('');
                    }}
                    className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] mr-6 transition-all duration-300"
                  >
                    <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
                  </button>
                  <button
                    onClick={resetNoteState}
                    className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] transition-all duration-300"
                  >
                    <img src={PlusIcon} alt="Add" className="w-7 h-7" />
                  </button>
                </div>
              </div>
              {/* Right section with textarea and future buttons */}
              <div className="flex-1 flex flex-col ml-[5px]">
                {/* Empty container for future buttons, matching the height of search bar + filter buttons */}
                <div className="h-[55px] w-full flex-shrink-0">
                  {/* Placeholder for future buttons */}
                </div>
                {/* Textarea container */}
                <div ref={containerRef} className="flex-1 relative">
                  <textarea
                    key={textareaKey}
                    ref={textareaRef}
                    value={newContent}
                    onChange={handleContentChange}
                    placeholder="Start typing..."
                    className="w-full h-full pt-10 pl-10 bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none resize-none custom-textarea"
                    disabled={!token}
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  {/* Draggable taskbar */}
                  {token && !isTrashView && (
                    <div
                      ref={taskbarRef}
                      style={{
                        position: 'absolute',
                        left: `${taskbarPosition.x}px`,
                        top: `${taskbarPosition.y}px`,
                        width: '374px',
                        height: '32px',
                        borderRadius: '15px',
                        backgroundColor: '#252525',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
                        zIndex: 10,
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        paddingLeft: '25px',
                        gap: '15px',
                      }}
                      onMouseDown={handleMouseDown}
                    >
                      <img
                        src={FirstCapIcon}
                        alt="First Cap"
                        style={{ width: '25px', height: '25px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={AllCapIcon}
                        alt="All Cap"
                        style={{ width: '25px', height: '25px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={BoldIcon}
                        alt="Bold"
                        style={{ width: '20px', height: '15px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={ItalicIcon}
                        alt="Italic"
                        style={{ width: '20px', height: '15px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={UnderlineIcon}
                        alt="Underline"
                        style={{ width: '25px', height: '15px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={StrikeThroughIcon}
                        alt="Strike Through"
                        style={{ width: '30px', height: '18px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={BulletPointsIcon}
                        alt="Bullet Points"
                        style={{ width: '18px', height: '18px', pointerEvents: 'auto'  }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <img
                        src={ChecklistIcon}
                        alt="Checklist"
                        style={{ width: '18px', height: '18px', pointerEvents: 'auto' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <select
                        className="no-arrow"
                        style={{
                          width: '28px',
                          height: '22px',
                          backgroundColor: '#171717',
                          borderRadius: '6px',
                          pointerEvents: 'auto',
                          color: '#FFFFFF',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {/* Empty dropdown; add options later as needed */}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              {/* Right sidebar */}
              <div className="w-[250px] h-[780px] bg-gradient-to-b from-[#191919] to-[#141414] p-2 flex-shrink-0 mt-[8px]">
                <div className="w-full h-[40px] border border-gray-300"></div>
              </div>
            </div>
          )
        ) : (
          // Login/Signup form
          <div className="w-[440px] h-[536px] bg-[#242424] rounded-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] flex justify-center items-center">
            <div className="w-[400px] h-[500px] bg-[#191919] rounded-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] p-6 flex flex-col">
              <h2 className="text-2xl font-small text-white mb-6 text-center">
                {isRegistering ? 'Sign-up' : 'Sign-in'}
              </h2>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-3 bg-[#121212] text-white text-xs rounded-[20px] mb-6 focus:outline-none"
                onFocus={() => {
                  setLoginError('');
                  setRegisterError('');
                }}
              />
              {isRegistering ? (
                <>
                  <div className="relative mb-6">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full p-3 bg-[#121212] text-white text-xs rounded-[20px] focus:outline-none"
                      onFocus={() => setRegisterError('')}
                    />
                  </div>
                  <div className="relative mb-6">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full p-3 bg-[#121212] text-white text-xs rounded-[20px] focus:outline-none"
                      onFocus={() => setRegisterError('')}
                    />
                    {registerError && (
                      <div className="absolute left-0 bottom-[-20px] text-red-500 text-[10px]">{registerError}</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full p-3 bg-[#121212] text-white text-xs rounded-[20px] focus:outline-none"
                      onFocus={() => {
                        setLoginError('');
                        setRegisterError('');
                      }}
                    />
                    {loginError && (
                      <div className="absolute left-0 bottom-[-20px] text-red-500 text-[10px]">{loginError}</div>
                    )}
                  </div>
                  <div className="text-center text-sm text-gray-400 mb-6">Forgot password?</div>
                </>
              )}
              <div className="flex justify-center mb-6">
                <button
                  onClick={isRegistering ? register : login}
                  className="w-[100px] h-[30px] bg-[#0072DB] text-white rounded-[30px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-blue-700 text-xs mt-2"
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
                      onClick={() => {
                        setIsRegistering(false);
                        setLoginError('');
                        setRegisterError('');
                      }}
                    >
                      Sign-in
                    </span>
                  </>
                ) : (
                  <>
                    Don’t have an account?{' '}
                    <span
                      className="text-purple-400 cursor-pointer"
                      onClick={() => {
                        setIsRegistering(true);
                        setLoginError('');
                        setRegisterError('');
                      }}
                    >
                      Sign-up
                    </span>
                  </>
                )}
              </div>
              <div className="text-center text-sm text-gray-400 mb-6">or</div>
              <div className="flex justify-center space-x-5">
                <button className="w-10 h-10 rounded-full border border-gray-600 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]"></button>
                <button className="w-10 h-10 rounded-full border border-gray-600 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]"></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute bg-[#1F1F1F] text-white rounded-[10px] shadow-xl w-[120px] flex flex-col py-2 z-50 transition-all duration-300"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isTrash ? (
            <>
              <button
                onClick={async () => {
                  const restoredNote = await restoreNote(contextMenu.noteId);
                  if (restoredNote) {
                    setNotes((prev) =>
                      [...prev, restoredNote].sort(
                        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                      )
                    );
                    setTrashedNotes((prev) => prev.filter((note) => note.id !== contextMenu.noteId));
                    setSelectedTrashedNotes((prev) => prev.filter((id) => id !== contextMenu.noteId));
                  }
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] text-green-400"
              >
                Restore
              </button>
              <button
                onClick={() => {
                  triggerPermanentDeleteConfirmation([contextMenu.noteId]);
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:bg-[#383838] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] text-red-400 mt-4"
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
                    setTempDeletedNote(null);
                    textareaRef.current?.focus();
                  }
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838]"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  alert('Pin not implemented.');
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] mt-2"
              >
                Pin
              </button>
              <button
                onClick={() => {
                  deleteNote(contextMenu.noteId);
                  setContextMenu(null);
                }}
                className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] text-red-400 mt-4"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Permanent delete confirmation modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#1F1F1F] rounded-[20px] w-[260px] h-[130px] p-4 flex flex-col items-center justify-between shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)]">
            <div className="text-center">
              <p className="text-white text-[15px] mb-1">Are You Sure?</p>
              <p className="text-gray-400 text-[10px]">This will remove permanently</p>
            </div>
            <div className="flex justify-center space-x-4 w-full">
              <button
                onClick={async () => {
                  await executePermanentDeletion();
                  setShowDeleteConfirmModal(false);
                  setNotesToDeletePermanently([]);
                }}
                className="w-[60px] h-[23px] bg-red-500 hover:bg-red-400 text-white text-xs shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] rounded-[20px]"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setNotesToDeletePermanently([]);
                }}
                className="w-[60px] h-[23px] bg-[#5062E7] hover:bg-[#677FF6] text-white text-xs shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] rounded-[20px]"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;