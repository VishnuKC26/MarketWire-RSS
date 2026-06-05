import React, { useState, useMemo } from 'react';
import { Search, BookOpen, ExternalLink, Calendar, RefreshCw, Star, Bookmark } from 'lucide-react';

// Format relative time helper
function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Logic to determine if article is published since the previous check slot
function isNewArticle(isoDate) {
  const now = new Date();
  const hours = now.getHours();
  const SCHEDULED_HOURS = [11, 17, 23]; // 11 AM, 5 PM, 11 PM
  
  let prevCheckDate = new Date(now);
  let prevCheckHour = SCHEDULED_HOURS[SCHEDULED_HOURS.length - 1];
  let prevFound = false;

  for (let i = SCHEDULED_HOURS.length - 1; i >= 0; i--) {
    if (hours >= SCHEDULED_HOURS[i]) {
      prevCheckHour = SCHEDULED_HOURS[i];
      prevFound = true;
      break;
    }
  }

  if (!prevFound) {
    prevCheckHour = SCHEDULED_HOURS[SCHEDULED_HOURS.length - 1];
    prevCheckDate.setDate(now.getDate() - 1);
  }
  
  prevCheckDate.setHours(prevCheckHour, 0, 0, 0);
  return isoDate > prevCheckDate.getTime();
}

export default function Feed({ 
  articles, 
  isLoading, 
  error, 
  onArticleClick, 
  regionName,
  starredArticles = {},
  readLaterArticles = {},
  toggleStar,
  toggleReadLater
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [activeSavedFilter, setActiveSavedFilter] = useState('All Saved');
  const [readArticles, setReadArticles] = useState(() => {
    const stored = localStorage.getItem('readArticles');
    return stored ? JSON.parse(stored) : {};
  });

  const isSavedTab = regionName === 'Starred & Read Later';

  // Tag filter logic
  const tagKeywords = {
    All: [],
    Macro: ['fed', 'rate', 'central bank', 'gdp', 'inflation', 'monetary', 'ecb', 'boj', 'pboc', 'rbi', 'jobs report', 'payrolls', 'cpi', 'ppi', 'economy', 'interest rate'],
    Geopolitics: ['tariff', 'trade', 'geopolitics', 'sanctions', 'conflict', 'election', 'china', 'tensions', 'tariffs', 'foreign policy'],
    Yields: ['yield', 'bond', 'treasury', 'yields', 'bonds', 'treasuries', 'debt', 'fixed income']
  };

  const savedFilters = ['All Saved', 'Starred', 'Read Later'];

  // Reset search and tag on region change
  React.useEffect(() => {
    setSearchQuery('');
    setActiveTag('All');
    setActiveSavedFilter('All Saved');
  }, [regionName]);

  // Filter articles based on search and tag selection
  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    const filtered = articles.filter(article => {
      // 1. Search Query Filter
      const titleMatches = article.title.toLowerCase().includes(searchQuery.toLowerCase());
      const summaryMatches = article.summary.toLowerCase().includes(searchQuery.toLowerCase());
      const sourceMatches = article.source.toLowerCase().includes(searchQuery.toLowerCase());
      const searchMatches = titleMatches || summaryMatches || sourceMatches;
      
      // 2. Saved/Tag Filtering
      if (isSavedTab) {
        if (activeSavedFilter === 'All Saved') return searchMatches;
        if (activeSavedFilter === 'Starred') {
          return searchMatches && !!starredArticles[article.id];
        }
        if (activeSavedFilter === 'Read Later') {
          return searchMatches && !!readLaterArticles[article.id];
        }
        return searchMatches;
      } else {
        if (activeTag === 'All') return searchMatches;
        const keywords = tagKeywords[activeTag];
        const textToSearch = `${article.title} ${article.summary}`.toLowerCase();
        const tagMatches = keywords.some(keyword => textToSearch.includes(keyword));
        return searchMatches && tagMatches;
      }
    });

    // Sort by publication date (newest first)
    const sorted = [...filtered].sort((a, b) => b.isoDate - a.isoDate);
    return isSavedTab ? sorted : sorted.slice(0, 60);
  }, [articles, searchQuery, activeTag, activeSavedFilter, isSavedTab, starredArticles, readLaterArticles]);

  if (error) {
    return (
      <div className="error-view">
        <p className="error-title">Failed to load news feed</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="feed-viewport">
      {/* Search and filter row */}
      <div className="search-filter-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder={`Search ${regionName} market news...`}
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="tag-filters">
          {isSavedTab ? (
            savedFilters.map(filter => (
              <button
                key={filter}
                className={`filter-tag ${activeSavedFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveSavedFilter(filter)}
              >
                {filter}
              </button>
            ))
          ) : (
            Object.keys(tagKeywords).map(tag => (
              <button
                key={tag}
                className={`filter-tag ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main listing */}
      {isLoading ? (
        <div className="articles-list">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton skeleton-card">
              <div className="skeleton skeleton-meta"></div>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text"></div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No matching news articles found</p>
          <p>Try resetting filters or adjusting search queries.</p>
        </div>
      ) : (
        <div className="articles-list">
          {filteredArticles.map(article => {
            const isRead = !!readArticles[article.id];
            const isNew = isNewArticle(article.isoDate);
            return (
             <div
  key={article.id}
  className={`article-card ${
    isRead ? 'article-card-read' : ''
  }`}
  onClick={() => {
    markAsRead(article.id);
    onArticleClick(article);
  }}
>
                <div className="article-card-main">
                  <div className="article-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="article-source">{article.source}</span>
                      <span className="article-time">
                        <Calendar size={12} />
                        {formatRelativeTime(article.isoDate)}
                      </span>
                      {isNew && <span className="article-badge-new">New</span>}
                      {isRead && <span className="article-badge-read">✓ Read</span>}
                    </div>
                    
                    <div className="article-bookmark-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(article);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: starredArticles[article.id] ? '#fbbf24' : 'var(--text-muted)',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, transform 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title={starredArticles[article.id] ? "Unstar article" : "Star article"}
                      >
                        <Star size={16} fill={starredArticles[article.id] ? '#fbbf24' : 'none'} />
                      </button>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReadLater(article);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: readLaterArticles[article.id] ? '#10b981' : 'var(--text-muted)',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s, transform 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        title={readLaterArticles[article.id] ? "Remove from Read Later" : "Add to Read Later"}
                      >
                        <Bookmark size={16} fill={readLaterArticles[article.id] ? '#10b981' : 'none'} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="article-title">{article.title}</h3>
                  {article.summary && (
                    <p className="article-excerpt">
                      {article.summary.replace(/<[^>]*>/g, '') /* Strip html tags */}
                    </p>
                  )}
                </div>
                
                <div className="article-card-actions">
                  <button className="read-btn">
                    <BookOpen size={16} />
                    <span>Read</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
  function markAsRead(articleId) {
  setReadArticles(prev => {
    const updated = {
      ...prev,
      [articleId]: Date.now()
    };

    localStorage.setItem(
      'readArticles',
      JSON.stringify(updated)
    );

    return updated;
  });
}
}
