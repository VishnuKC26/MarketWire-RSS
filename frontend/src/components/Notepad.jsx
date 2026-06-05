import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Pin, 
  Copy, 
  Trash2, 
  Download, 
  Clipboard, 
  Save, 
  FileText, 
  AlertCircle, 
  Check 
} from 'lucide-react';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Notepad({
  notes = {},
  activeDate,
  setActiveDate,
  onSaveManualNote,
  onPasteFromClipboard,
  onDeleteNote,
  onTogglePinNote,
  onCopyNoteText,
  showToast
}) {
  const [manualText, setManualText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Format date display (e.g. Saturday, Jun 6, 2026)
  const formattedDateDisplay = useMemo(() => {
    if (!activeDate) return '';
    const dateObj = new Date(activeDate + 'T00:00:00');
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, [activeDate]);

  // Navigate dates
  const handlePrevDay = () => {
    const current = new Date(activeDate + 'T00:00:00');
    current.setDate(current.getDate() - 1);
    setActiveDate(getLocalDateString(current));
  };

  const handleNextDay = () => {
    const current = new Date(activeDate + 'T00:00:00');
    current.setDate(current.getDate() + 1);
    setActiveDate(getLocalDateString(current));
  };

  const handleToday = () => {
    setActiveDate(getLocalDateString(new Date()));
  };

  const handleDateChange = (e) => {
    if (e.target.value) {
      setActiveDate(e.target.value);
    }
  };

  // Submit manual note
  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    onSaveManualNote(manualText.trim(), activeDate);
    setManualText('');
  };

  // Notes list for current date, sorted (pinned notes first)
  const currentNotes = useMemo(() => {
    const list = notes[activeDate] || [];
    // Sort: pinned first, then normal order
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0; // maintain relative chronological order
    });
  }, [notes, activeDate]);

  // Global search results across all dates
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results = [];
    const query = searchQuery.toLowerCase();

    Object.keys(notes).forEach(dateStr => {
      const list = notes[dateStr] || [];
      list.forEach(note => {
        if (note.content.toLowerCase().includes(query)) {
          results.push({
            date: dateStr,
            ...note
          });
        }
      });
    });

    // Sort by timestamp/date newest first
    return results.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
      return timeB - timeA;
    });
  }, [notes, searchQuery]);

  // Export handlers
  const handleExportTxt = () => {
    const list = notes[activeDate] || [];
    if (list.length === 0) {
      showToast('No notes to export for this date', 'error');
      return;
    }

    const heading = `NOTEPAD JOURNAL - ${formattedDateDisplay}\n${'='.repeat(40)}\n\n`;
    const content = list
      .map(n => `[${n.time}]${n.pinned ? ' [PINNED]' : ''}\n${n.content}`)
      .join('\n\n');

    const blob = new Blob([heading + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notepad_${activeDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('TXT file downloaded successfully', 'success');
  };

  const handleExportMd = () => {
    const list = notes[activeDate] || [];
    if (list.length === 0) {
      showToast('No notes to export for this date', 'error');
      return;
    }

    const heading = `# Notepad Journal - ${formattedDateDisplay}\n\n`;
    const content = list
      .map(n => `### **[${n.time}]** ${n.pinned ? '📌 *Pinned*' : ''}\n\n${n.content}\n\n---`)
      .join('\n\n');

    const blob = new Blob([heading + content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notepad_${activeDate}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Markdown file downloaded successfully', 'success');
  };

  return (
    <div className="notepad-container">
      {/* Search Header */}
      <div className="notepad-search-row">
        <div className="notepad-search-wrapper">
          <Search size={16} className="notepad-search-icon" />
          <input
            type="text"
            placeholder="Search notes across all dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="notepad-search-input"
          />
        </div>
      </div>

      {searchQuery.trim() ? (
        /* Search Results View */
        <div className="notepad-search-results">
          <div className="notepad-section-header">
            <h3>Search Results ({searchResults.length})</h3>
            <button className="btn-link" onClick={() => setSearchQuery('')}>Clear Search</button>
          </div>

          {searchResults.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={24} />
              <p className="empty-title">No matching entries found</p>
              <p>Try searching for different keywords or abbreviations.</p>
            </div>
          ) : (
            <div className="notepad-entries-list">
              {searchResults.map((entry, index) => (
                <div key={`${entry.date}-${entry.id || index}`} className="notepad-entry-card search-match">
                  <div className="entry-header">
                    <span className="entry-time">
                      {entry.date} at {entry.time}
                    </span>
                    <button 
                      className="btn-link-action"
                      onClick={() => {
                        setActiveDate(entry.date);
                        setSearchQuery('');
                      }}
                    >
                      Jump to Date
                    </button>
                  </div>
                  <p className="entry-content">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Regular Day View */
        <div className="notepad-day-view">
          {/* Date Selector Row */}
          <div className="notepad-date-navigation">
            <div className="navigation-buttons">
              <button onClick={handlePrevDay} className="btn-nav" title="Previous Day">
                <ChevronLeft size={16} />
              </button>
              
              <div className="date-input-wrapper">
                <Calendar size={16} className="calendar-icon" />
                <input 
                  type="date" 
                  value={activeDate}
                  onChange={handleDateChange}
                  className="date-picker-input"
                />
              </div>

              <button onClick={handleNextDay} className="btn-nav" title="Next Day">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="action-buttons-group">
              <button onClick={handleToday} className="btn-action-outline">
                Today
              </button>

              <div className="notepad-export-actions">
                <button 
                  onClick={handleExportTxt} 
                  className="btn-action-icon-only" 
                  title="Export as TXT"
                  disabled={currentNotes.length === 0}
                >
                  <FileText size={16} />
                </button>
                <button 
                  onClick={handleExportMd} 
                  className="btn-action-icon-only" 
                  title="Export as Markdown"
                  disabled={currentNotes.length === 0}
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="notepad-date-display">
            <h2>{formattedDateDisplay}</h2>
          </div>

          {/* Note Form & Clipboard paste */}
          <form onSubmit={handleSaveNote} className="notepad-input-form">
            <textarea
              className="notepad-textarea"
              placeholder="Type a trade idea, market observation, or research note..."
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={3}
            />
            <div className="notepad-form-actions">
              <button 
                type="button" 
                onClick={() => onPasteFromClipboard(activeDate)} 
                className="btn-clipboard-paste"
              >
                <Clipboard size={16} />
                <span>Paste from Clipboard</span>
              </button>
              
              <button 
                type="submit" 
                className="btn-save-note" 
                disabled={!manualText.trim()}
              >
                <Save size={16} />
                <span>Save Note</span>
              </button>
            </div>
          </form>

          {/* List of notes for activeDate */}
          <div className="notepad-notes-section">
            <div className="notepad-section-header">
              <h3>Captured Notes ({currentNotes.length})</h3>
            </div>

            {currentNotes.length === 0 ? (
              <div className="notepad-empty-state">
                <Clipboard size={32} className="empty-icon" />
                <p className="empty-title">Notepad is empty</p>
                <p>Click "Paste from Clipboard" or save a manual note to store observations for this day.</p>
              </div>
            ) : (
              <div className="notepad-entries-list">
                {currentNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className={`notepad-entry-card ${note.pinned ? 'pinned' : ''}`}
                  >
                    <div className="entry-header">
                      <div className="entry-meta">
                        <span className="entry-time">[{note.time}]</span>
                        {note.pinned && (
                          <span className="pinned-badge">
                            <Pin size={10} fill="currentColor" /> Pinned
                          </span>
                        )}
                      </div>
                      
                      <div className="entry-actions">
                        <button 
                          type="button"
                          onClick={() => onTogglePinNote(note.id, activeDate)}
                          className={`btn-entry-action ${note.pinned ? 'active-pin' : ''}`}
                          title={note.pinned ? "Unpin Note" : "Pin Note"}
                        >
                          <Pin size={14} fill={note.pinned ? "currentColor" : "none"} />
                        </button>
                        
                        <button 
                          type="button"
                          onClick={() => onCopyNoteText(note.content)}
                          className="btn-entry-action"
                          title="Copy Content"
                        >
                          <Copy size={14} />
                        </button>

                        <button 
                          type="button"
                          onClick={() => onDeleteNote(note.id, activeDate)}
                          className="btn-entry-action hover-danger"
                          title="Delete Note"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="entry-content">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
