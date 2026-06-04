import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, Globe, Compass, Newspaper, AlertTriangle, X, Sun, Moon, Star } from 'lucide-react';
import ScheduleTracker from './components/ScheduleTracker';
import Feed from './components/Feed';

const REGION_COLORS = {
  americas: {
    accent: '#4a72ff',
    glow: 'rgba(74, 114, 255, 0.08)',
    border: 'rgba(74, 114, 255, 0.25)',
    shadow: 'rgba(74, 114, 255, 0.15)'
  },
  europe: {
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    shadow: 'rgba(245, 158, 11, 0.15)'
  },
  mideast: {
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    shadow: 'rgba(239, 68, 68, 0.15)'
  },
  asia: {
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.25)',
    shadow: 'rgba(16, 185, 129, 0.15)'
  },
  saved: {
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.08)',
    border: 'rgba(236, 72, 153, 0.25)',
    shadow: 'rgba(236, 72, 153, 0.15)'
  }
};

export default function App() {
  const [activeRegion, setActiveRegion] = useState('americas'); // 'americas', 'europe', 'mideast', 'asia'
  const [newsData, setNewsData] = useState({
    americas: { regionName: 'AMERICAS', performance: [], mainDriver: '', confidence: 'Low', articles: [] },
    europe: { regionName: 'EUROPE', performance: [], mainDriver: '', confidence: 'Low', articles: [] },
    mideast: { regionName: 'MIDDLE EAST', performance: [], mainDriver: '', confidence: 'Low', articles: [] },
    asia: { regionName: 'ASIA PACIFIC', performance: [], mainDriver: '', confidence: 'Low', articles: [] }
  });
  const [checkpoint, setCheckpoint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('market_pulse_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [starredArticles, setStarredArticles] = useState(() => {
    const stored = localStorage.getItem('starredArticles');
    return stored ? JSON.parse(stored) : {};
  });

  const [readLaterArticles, setReadLaterArticles] = useState(() => {
    const stored = localStorage.getItem('readLaterArticles');
    return stored ? JSON.parse(stored) : {};
  });

  // Fetch saved articles from backend
  const fetchSavedArticles = async (userId) => {
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api/saved' : '/api/saved';
      const res = await fetch(API_URL, {
        headers: {
          'X-User-Id': userId
        }
      });
      const result = await res.json();
      if (result.success && result.data) {
        setStarredArticles(result.data.starred || {});
        setReadLaterArticles(result.data.readLater || {});
      }
    } catch (err) {
      console.error('Failed to fetch saved articles:', err);
    }
  };

  // Sync saved articles to backend
  const syncSavedArticles = async (userId, starredMap, readLaterMap) => {
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api/saved' : '/api/saved';
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          starred: starredMap,
          readLater: readLaterMap
        })
      });
    } catch (err) {
      console.error('Failed to sync saved articles with backend:', err);
    }
  };

  const handleLoginSuccess = (userObj) => {
    setUser(userObj);
    localStorage.setItem('market_pulse_user', JSON.stringify(userObj));
    fetchSavedArticles(userObj.id);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('market_pulse_user');
    setStarredArticles({});
    setReadLaterArticles({});
    localStorage.removeItem('starredArticles');
    localStorage.removeItem('readLaterArticles');
  };

  // Load saved articles on user change
  useEffect(() => {
    if (user) {
      fetchSavedArticles(user.id);
    }
  }, [user]);

  // Handle Google Login Response
  const handleCredentialResponse = async (response) => {
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api/auth/google' : '/api/auth/google';
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: response.credential })
      });
      const result = await res.json();
      if (result.success && result.user) {
        handleLoginSuccess(result.user);
      } else {
        alert(result.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Authentication error. See console for details.');
    }
  };

  // Developer Mock Login
  const handleMockLogin = async () => {
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api/auth/mock' : '/api/auth/mock';
      const res = await fetch(API_URL, { method: 'POST' });
      const result = await res.json();
      if (result.success && result.user) {
        handleLoginSuccess(result.user);
      }
    } catch (err) {
      console.error('Mock login error:', err);
    }
  };

  // Google identity services init
  useEffect(() => {
    if (typeof window.google !== 'undefined' && !user) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "738465611181-xxxxxxxx.apps.googleusercontent.com",
          callback: handleCredentialResponse
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          { theme: "filled_blue", size: "large", width: 220 }
        );
      } catch (err) {
        console.error('Google Identity button render error:', err);
      }
    }
  }, [user]);

  const toggleStar = async (article) => {
    let updatedStarred = {};
    setStarredArticles(prev => {
      const updated = { ...prev };
      if (updated[article.id]) {
        delete updated[article.id];
      } else {
        updated[article.id] = article;
      }
      updatedStarred = updated;
      if (!user) {
        localStorage.setItem('starredArticles', JSON.stringify(updated));
      }
      return updated;
    });

    if (user) {
      await syncSavedArticles(user.id, updatedStarred, readLaterArticles);
    }
  };

  const toggleReadLater = async (article) => {
    let updatedReadLater = {};
    setReadLaterArticles(prev => {
      const updated = { ...prev };
      if (updated[article.id]) {
        delete updated[article.id];
      } else {
        updated[article.id] = article;
      }
      updatedReadLater = updated;
      if (!user) {
        localStorage.setItem('readLaterArticles', JSON.stringify(updated));
      }
      return updated;
    });

    if (user) {
      await syncSavedArticles(user.id, starredArticles, updatedReadLater);
    }
  };

  const savedArticlesList = React.useMemo(() => {
    const merged = {};
    Object.values(starredArticles).forEach(art => {
      merged[art.id] = { ...art };
    });
    Object.values(readLaterArticles).forEach(art => {
      if (merged[art.id]) {
        merged[art.id] = { ...merged[art.id] };
      } else {
        merged[art.id] = { ...art };
      }
    });
    return Object.values(merged).sort((a, b) => b.isoDate - a.isoDate);
  }, [starredArticles, readLaterArticles]);
  
  // Selected article
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [popupBlockerDetected, setPopupBlockerDetected] = useState(false);
  const articleWindowRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('market_pulse_theme') || 'dark'; // 'dark' or 'sepia'
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'sepia' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('market_pulse_theme', nextTheme);
  };

  useEffect(() => {
    document.body.className = theme === 'sepia' ? 'theme-sepia' : '';
    return () => {
      document.body.className = '';
    };
  }, [theme]);

  // Fetch news aggregated by backend
  const fetchNews = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setError(null);
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api/news' : '/api/news';
      const response = await fetch(API_URL);
      const result = await response.json();
      
      if (result.success && result.data) {
        setNewsData(result.data);
        setCheckpoint(result.checkpoint);
        setLastUpdated(result.timestamp);
      } else {
        throw new Error(result.message || 'API returned an unsuccessful state.');
      }
    } catch (err) {
      console.error('Fetch news error:', err);
      setError('Could not connect to the local aggregator backend. Make sure the Node server is running on port 3001.');
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchNews(true);

    // Setup polling every 5 minutes for real-time updates
    const pollInterval = setInterval(() => {
      fetchNews(false); // poll silently without full page loader
    }, 300000); // 300,000 ms = 5 mins

    return () => clearInterval(pollInterval);
  }, []);

  // Automatically select the first article when active region or news data changes
  useEffect(() => {
    const regionArticles = activeRegion === 'saved'
      ? savedArticlesList
      : (newsData[activeRegion]?.articles || []);
    if (regionArticles && regionArticles.length > 0) {
      // Keep the current selection if it still exists in the new data, otherwise select the first
      const exists = regionArticles.some(art => art.id === selectedArticle?.id);
      if (!exists) {
        setSelectedArticle(regionArticles[0]);
      }
    } else {
      setSelectedArticle(null);
    }
  }, [activeRegion, newsData, savedArticlesList]);

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
    
    const w = Math.floor(window.screen.availWidth / 2 - 10);
    const h = window.screen.availHeight;
    const rightSideLeft = Math.floor(window.screen.availWidth / 2);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isDashboard = urlParams.get('mode') === 'dashboard';
    
    if (!isDashboard && window.opener === null) {
      // 1. Try to open the dashboard window on the left side
      let dashWin = null;
      try {
        dashWin = window.open(
          window.location.origin + window.location.pathname + '?mode=dashboard',
          'news_dashboard',
          `width=${w},height=${h},left=0,top=0,menubar=yes,status=yes,toolbar=yes,location=yes,resizable=yes`
        );
      } catch (e) {
        console.error("Dashboard popup blocked:", e);
      }
      
      // 2. Try to open the article window on the right side
      let artWin = null;
      try {
        artWin = window.open(
          article.link,
          'news_article',
          `width=${w},height=${h},left=${rightSideLeft},top=0,menubar=yes,status=yes,toolbar=yes,location=yes,resizable=yes`
        );
      } catch (e) {
        console.error("Article popup blocked:", e);
      }
      
      // 3. Check if either popup was blocked
      if (!dashWin || dashWin.closed || typeof dashWin === 'undefined' || !artWin || artWin.closed || typeof artWin === 'undefined') {
        // Close whichever might have partially opened to maintain clean state
        if (dashWin && !dashWin.closed) dashWin.close();
        if (artWin && !artWin.closed) artWin.close();
        
        // Show the banner warning to prompt popups permission
        setPopupBlockerDetected(true);
      } else {
        // Both opened successfully! Redirect current tab to tiled-active splash page
        window.location.href = window.location.origin + window.location.pathname + '?mode=tiled-active';
      }
      return;
    }
    
    // If we are already in the dashboard window, update/open the article window
    if (articleWindowRef.current && !articleWindowRef.current.closed) {
      articleWindowRef.current.close();
    }
    
    // Dynamically calculate the opposite side for the article window
    const currentLeft = window.screenX !== undefined ? window.screenX : window.screenLeft || 0;
    const currentWidth = window.outerWidth || window.innerWidth || rightSideLeft;
    const centerX = currentLeft + Math.floor(currentWidth / 2);
    
    let targetLeft = rightSideLeft;
    if (centerX >= rightSideLeft) {
      // Dashboard is on the right side of the screen, open article on the left side
      targetLeft = 0;
    } else {
      // Dashboard is on the left side of the screen, open article on the right side
      targetLeft = rightSideLeft;
    }
    
    articleWindowRef.current = window.open(
      article.link, 
      'news_article', 
      `width=${w},height=${h},left=${targetLeft},top=0,menubar=yes,status=yes,toolbar=yes,location=yes,resizable=yes`
    );
  };

  const getRegionDisplayName = (region) => {
    if (region === 'americas') return 'Americas Market';
    if (region === 'europe') return 'Europe';
    if (region === 'mideast') return 'Middle East';
    if (region === 'asia') return 'Asia Pacific';
    if (region === 'saved') return 'Starred & Read Later';
    return region;
  };

  const getRegionIcon = (region) => {
    if (region === 'americas') return <Compass size={18} />;
    if (region === 'europe') return <Globe size={18} />;
    if (region === 'mideast') return <Newspaper size={18} />;
    if (region === 'asia') return <TrendingUp size={18} />;
    if (region === 'saved') return <Star size={18} />;
    return <Newspaper size={18} />;
  };

  const urlParams = new URLSearchParams(window.location.search);
  const isTiledActive = urlParams.get('mode') === 'tiled-active';

  if (isTiledActive) {
    return (
      <div style={{
        background: 'var(--bg-dark)',
        color: 'var(--text-primary)',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'var(--font-sans)',
        textAlign: 'center',
        padding: '24px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '2px',
          padding: '40px',
          maxWidth: '500px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div style={{
            background: 'var(--accent-color)',
            borderRadius: '2px',
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={32} style={{ color: 'var(--bg-dark)' }} />
          </div>
          
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', fontFamily: 'var(--font-serif)' }}>Tiled Workspace Active</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Your side-by-side workspace is now active in two separate windows (Dashboard on the left, Article on the right).
            </p>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'var(--border-color)' }}></div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            You can close this main browser tab now. To relaunch the workspace or return to the main tab, click the buttons below.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            <button 
              onClick={() => {
                const w = Math.floor(window.screen.availWidth / 2 - 10);
                const h = window.screen.availHeight;
                window.open(window.location.origin + window.location.pathname + '?mode=dashboard', 'news_dashboard', `width=${w},height=${h},left=0,top=0,menubar=yes,status=yes,toolbar=yes,location=yes,resizable=yes`);
              }}
              style={{
                background: 'var(--accent-color)',
                color: 'var(--bg-dark)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '2px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                width: '100%',
                transition: 'var(--transition-fast)'
              }}
            >
              Relaunch Tiled Workspace
            </button>
            <button 
              onClick={() => {
                window.location.href = window.location.origin + window.location.pathname;
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '12px 24px',
                borderRadius: '2px',
                fontWeight: '600',
                fontSize: '0.95rem',
                cursor: 'pointer',
                width: '100%',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
            >
              Return to Standard View
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeColor = REGION_COLORS[activeRegion] || REGION_COLORS.americas;

  const getBtnStyle = (region) => {
    const col = REGION_COLORS[region];
    return {
      '--btn-accent': col.accent,
      '--btn-glow': col.glow,
      '--btn-border': col.border,
      '--btn-shadow': col.shadow
    };
  };

  return (
    <div 
      className={`app-container theme-${theme}`}
      style={{
        backgroundColor: 'var(--bg-dark)',
        '--accent-color': activeColor.accent,
        '--accent-glow': activeColor.glow,
        '--accent-border': activeColor.border,
        '--accent-shadow': activeColor.shadow
      }}
    >
      <div className="ambient-glow-bg"></div>
      <div className="grid-texture"></div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* User Profile / Login Widget */}
        <div className="sidebar-profile-widget" style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          width: '100%'
        }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
              <img 
                src={user.picture} 
                alt={user.name} 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '2px solid var(--accent-color)',
                  objectFit: 'cover'
                }} 
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
              </div>
              <button 
                onClick={handleSignOut}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '8px',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
              <div id="google-signin-button" style={{ minHeight: '40px' }}></div>
              <button 
                onClick={handleMockLogin}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Developer Mock Login
              </button>
            </div>
          )}
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item-btn ${activeRegion === 'americas' ? 'active' : ''}`}
            onClick={() => setActiveRegion('americas')}
            style={getBtnStyle('americas')}
          >
            {getRegionIcon('americas')}
            <span>Americas Feed</span>
          </button>
          
          <button 
            className={`nav-item-btn ${activeRegion === 'europe' ? 'active' : ''}`}
            onClick={() => setActiveRegion('europe')}
            style={getBtnStyle('europe')}
          >
            {getRegionIcon('europe')}
            <span>Europe Feed</span>
          </button>
          
          <button 
            className={`nav-item-btn ${activeRegion === 'mideast' ? 'active' : ''}`}
            onClick={() => setActiveRegion('mideast')}
            style={getBtnStyle('mideast')}
          >
            {getRegionIcon('mideast')}
            <span>Middle East Feed</span>
          </button>
          
          <button 
            className={`nav-item-btn ${activeRegion === 'asia' ? 'active' : ''}`}
            onClick={() => setActiveRegion('asia')}
            style={getBtnStyle('asia')}
          >
            {getRegionIcon('asia')}
            <span>Asia Pacific Feed</span>
          </button>

          <button 
            className={`nav-item-btn ${activeRegion === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveRegion('saved')}
            style={getBtnStyle('saved')}
          >
            {getRegionIcon('saved')}
            <span>Saved Articles</span>
          </button>
        </nav>

        {/* Schedule countdown tracker */}
        <ScheduleTracker lastUpdated={lastUpdated} />
      </aside>

      {/* Main Dashboard Split Viewport */}
      <main className="main-content-split full-width">
        
        {/* Left Column: News Feed list */}
        <div className="feed-column">
          {/* Sticky Header Bar */}
          <header className="header-bar">
            <div className="header-title-area">
              <h1>{getRegionDisplayName(activeRegion)}</h1>
              <p>
                {isLoading 
                  ? 'Syncing with international market desks...' 
                  : `${newsData[activeRegion]?.articles?.length || 0} active equity market articles compiled`
                }
              </p>
            </div>

            <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Compact Region Selector for Split/Mobile View */}
              <div className="header-region-selector">
                <button 
                  className={`region-pill-btn ${activeRegion === 'americas' ? 'active' : ''}`}
                  onClick={() => setActiveRegion('americas')}
                  style={getBtnStyle('americas')}
                  title="Americas Feed"
                >
                  Americas
                </button>
                <button 
                  className={`region-pill-btn ${activeRegion === 'europe' ? 'active' : ''}`}
                  onClick={() => setActiveRegion('europe')}
                  style={getBtnStyle('europe')}
                  title="Europe Feed"
                >
                  Europe
                </button>
                <button 
                  className={`region-pill-btn ${activeRegion === 'mideast' ? 'active' : ''}`}
                  onClick={() => setActiveRegion('mideast')}
                  style={getBtnStyle('mideast')}
                  title="Middle East Feed"
                >
                  Mid East
                </button>
                <button 
                  className={`region-pill-btn ${activeRegion === 'asia' ? 'active' : ''}`}
                  onClick={() => setActiveRegion('asia')}
                  style={getBtnStyle('asia')}
                  title="Asia Pacific Feed"
                >
                  Asia Pacific
                </button>
              </div>

              <button 
                className="btn-icon" 
                onClick={toggleTheme}
                title={theme === 'dark' ? "Switch to Sepia Mode" : "Switch to Dark Mode"}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-fast)'
                }}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              <button 
                className="btn-icon" 
                onClick={() => fetchNews(true)}
                disabled={isLoading}
                title="Sync Feeds Now"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-fast)'
                }}
              >
                <RefreshCw size={14} className={isLoading ? 'loading-shimmer' : ''} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>
          </header>

          {/* Popup Blocker Warning Banner */}
          {popupBlockerDetected && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--accent-red)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              margin: '20px 40px 0 40px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: '1.5',
              position: 'relative',
              zIndex: 100
            }}>
              <AlertTriangle size={24} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
              <div style={{ flexGrow: 1 }}>
                <strong style={{ color: 'var(--accent-red)' }}>Popup Blocker Active:</strong> To enable the side-by-side split workspace, please click the **Popup Blocked** icon in your browser's address bar (top right) and select **"Always allow popups from localhost"**, then try clicking the article again.
              </div>
              <button 
                onClick={() => setPopupBlockerDetected(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Macro Dashboard Cards */}
          {!isLoading && !error && (
            <div className="macro-dashboard-container">
              {checkpoint && (
                <div className="checkpoint-card">
                  <div className="checkpoint-header">
                    <span className="checkpoint-time-badge">
                      <TrendingUp size={12} />
                      Checkpoint Focus: {checkpoint.time}
                    </span>
                  </div>
                  <h2 className="checkpoint-question">{checkpoint.question}</h2>
                  <p className="checkpoint-analysis">{checkpoint.analysis}</p>
                </div>
              )}

              {/* Index Performance Grid */}
              {newsData[activeRegion]?.performance && newsData[activeRegion].performance.length > 0 && (
                <div className="index-performance-grid">
                  {newsData[activeRegion].performance.map((idx, index) => {
                    const isPositive = idx.change.startsWith('+');
                    const isNegative = idx.change.startsWith('-');
                    const isFlat = !isPositive && !isNegative;
                    return (
                      <div key={index} className="index-card">
                        <span className="index-name">{idx.name}</span>
                        <span className={`index-change ${isPositive ? 'positive' : isNegative ? 'negative' : 'flat'}`}>
                          {isPositive && '▲ '}
                          {isNegative && '▼ '}
                          {idx.change}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Driver & Confidence section */}
              <div className="macro-meta-grid">
                {newsData[activeRegion]?.mainDriver && (
                  <div className="main-driver-card">
                    <span className="main-driver-title">Dominant Macro Driver</span>
                    <p className="main-driver-text">{newsData[activeRegion].mainDriver}</p>
                  </div>
                )}
                {newsData[activeRegion]?.confidence && (
                  <div className="confidence-card">
                    <span className="confidence-title">Signal Confidence</span>
                    <span className={`confidence-badge ${newsData[activeRegion].confidence.toLowerCase()}`}>
                      {newsData[activeRegion].confidence}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feed Viewport */}
          <Feed 
            articles={activeRegion === 'saved' ? savedArticlesList : (newsData[activeRegion]?.articles || [])} 
            isLoading={activeRegion === 'saved' ? false : isLoading} 
            error={activeRegion === 'saved' ? null : error} 
            onArticleClick={handleArticleClick}
            regionName={getRegionDisplayName(activeRegion)}
            starredArticles={starredArticles}
            readLaterArticles={readLaterArticles}
            toggleStar={toggleStar}
            toggleReadLater={toggleReadLater}
          />
        </div>

        
      </main>

      {/* Add spin animation locally for loader */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
