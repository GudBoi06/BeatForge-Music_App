import React, { useState } from "react";
import "../styles/community.css";

/* ─── MOCK DATA ──────────────────────────────────────────────── */
const MOCK_POSTS = [
  {
    id: 1,
    user: "XVOID",
    avatar: "XV",
    handle: "@xvoid_beats",
    time: "2h ago",
    title: "Dark Trap 808 — v3",
    genre: "Trap",
    bpm: 140,
    steps: 16,
    likes: 284,
    comments: 47,
    reposts: 18,
    waveform: [4,8,14,18,10,6,16,20,12,8,18,14,6,10,16,8,12,18,10,4,14,20,8,16,10,6,18,12,4,8,14,18],
    liked: false,
  },
  {
    id: 2,
    user: "SOLARA",
    avatar: "SL",
    handle: "@solara.wav",
    time: "5h ago",
    title: "Chill Lo-Fi Kit #7",
    genre: "Lo-Fi",
    bpm: 82,
    steps: 16,
    likes: 512,
    comments: 91,
    reposts: 63,
    waveform: [6,10,8,12,6,10,14,8,12,10,6,8,14,10,6,12,8,10,12,6,10,8,14,6,12,10,8,14,6,10,12,8],
    liked: true,
  },
  {
    id: 3,
    user: "KRYZN",
    avatar: "KR",
    handle: "@kryzn",
    time: "1d ago",
    title: "Afrobeats Bounce",
    genre: "Afrobeats",
    bpm: 112,
    steps: 16,
    likes: 189,
    comments: 34,
    reposts: 22,
    waveform: [8,14,10,18,12,8,16,10,14,18,8,12,16,10,18,12,8,14,10,16,12,8,18,10,14,16,8,12,18,10,14,8],
    liked: false,
  },
  {
    id: 4,
    user: "NEONPULSE",
    avatar: "NP",
    handle: "@neonpulse",
    time: "2d ago",
    title: "Synthwave Anthem",
    genre: "Synthwave",
    bpm: 128,
    steps: 32,
    likes: 731,
    comments: 128,
    reposts: 95,
    waveform: [10,16,8,18,12,6,20,14,10,18,8,14,20,10,6,18,12,16,8,20,10,14,18,6,12,20,8,16,10,18],
    liked: false,
  },
  {
    id: 5,
    user: "AMARU",
    avatar: "AM",
    handle: "@amaru.prod",
    time: "3d ago",
    title: "Drill UK Pattern",
    genre: "Drill",
    bpm: 140,
    steps: 16,
    likes: 348,
    comments: 56,
    reposts: 41,
    waveform: [12,6,18,10,16,8,14,20,6,18,12,10,20,8,14,16,6,18,12,10,16,8,20,14,6,10,18,12,8,16,10,18],
    liked: false,
  },
];

const TRENDING_TAGS = ["Trap", "Lo-Fi", "Drill", "Afrobeats", "Synthwave", "House", "R&B", "Phonk", "Jersey", "Dancehall"];

const TOP_PRODUCERS = [
  { name: "NEONPULSE", handle: "@neonpulse", avatar: "NP", beats: 142, followers: "12.4k", color: "#a64aff" },
  { name: "SOLARA",    handle: "@solara.wav", avatar: "SL", beats: 98,  followers: "8.1k",  color: "#ff4aaa" },
  { name: "XVOID",     handle: "@xvoid_beats", avatar: "XV", beats: 76,  followers: "5.7k",  color: "#4adfff" },
  { name: "KRYZN",     handle: "@kryzn",       avatar: "KR", beats: 61,  followers: "4.2k",  color: "#ffd74a" },
];

const GENRE_COLORS = {
  Trap: "#a64aff", "Lo-Fi": "#4adfff", Drill: "#ff4a4a",
  Afrobeats: "#ffd74a", Synthwave: "#ff4aaa", House: "#4aff91",
};

/* ─── MINI WAVEFORM ─────────────────────────────────────────── */
function MiniWave({ data, playing, accent = "#a64aff" }) {
  return (
    <div className="comm-wave">
      {data.map((h, i) => (
        <span
          key={i}
          className={`comm-wave-bar ${playing ? "comm-wave-bar--playing" : ""}`}
          style={{
            height: `${h}px`,
            background: playing ? accent : "rgba(255,255,255,0.15)",
            animationDelay: playing ? `${(i * 0.04).toFixed(2)}s` : "0s",
          }}
        />
      ))}
    </div>
  );
}

/* ─── POST CARD ─────────────────────────────────────────────── */
function PostCard({ post, onLike, onPlay, playing }) {
  const genreColor = GENRE_COLORS[post.genre] || "#a64aff";

  return (
    <div className={`comm-card ${playing ? "comm-card--playing" : ""}`}>
      <div className="comm-card__head">
        <div className="comm-avatar" style={{ "--av-color": genreColor }}>
          {post.avatar}
        </div>
        <div className="comm-card__meta">
          <span className="comm-card__user">{post.user}</span>
          <span className="comm-card__handle">{post.handle} · {post.time}</span>
        </div>
        <span className="comm-genre-tag" style={{ "--g-color": genreColor }}>
          {post.genre}
        </span>
      </div>

      <div className="comm-card__title">{post.title}</div>
      <div className="comm-card__specs">
        <span>{post.bpm} BPM</span>
        <span className="comm-dot" />
        <span>{post.steps} Steps</span>
      </div>

      <div className="comm-card__player">
        <button
          className={`comm-play-btn ${playing ? "comm-play-btn--active" : ""}`}
          onClick={() => onPlay(post.id)}
          style={{ "--btn-color": genreColor }}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <MiniWave data={post.waveform} playing={playing} accent={genreColor} />
      </div>

      <div className="comm-card__actions">
        <button
          className={`comm-action-btn ${post.liked ? "comm-action-btn--liked" : ""}`}
          onClick={() => onLike(post.id)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          {post.likes}
        </button>
        <button className="comm-action-btn">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {post.comments}
        </button>
        <button className="comm-action-btn">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
            <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          {post.reposts}
        </button>
        <button className="comm-action-btn comm-action-btn--share">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMMUNITY PAGE ────────────────────────────────────── */
export default function Community({ currentUser, onNavigate }) {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [activeFilter, setActiveFilter] = useState("All");
  const [playingId, setPlayingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("hot");

  const handleLike = (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handlePlay = (id) => {
    setPlayingId((prev) => (prev === id ? null : id));
  };

  const filtered = posts.filter((p) => {
    const matchesGenre = activeFilter === "All" || p.genre === activeFilter;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "hot") return (b.likes + b.comments) - (a.likes + a.comments);
    if (sortBy === "new") return a.id < b.id ? 1 : -1;
    if (sortBy === "top") return b.likes - a.likes;
    return 0;
  });

  return (
    <div className="community-page">
      {/* ── HEADER ── */}
      <div className="comm-header">
        <div className="comm-header__left">
          
          {/* 🌟 NEW: Added a way to navigate back to Home from the standalone community page */}
          <button 
            onClick={() => onNavigate && onNavigate('landing')} 
            style={{ marginBottom: '16px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            ← Back to Home
          </button>

          <div className="comm-header__tag">
            <span className="comm-pulse" />
            LIVE COMMUNITY
          </div>
          <h1 className="comm-header__title">BEATFORGE <span className="comm-title-accent">HUB</span></h1>
          <p className="comm-header__sub">Share beats. Discover producers. Build together.</p>
        </div>
        <div className="comm-header__stats">
          {[["2,841", "Producers"], ["14.2k", "Beats Shared"], ["98k", "Plays Today"]].map(([n, l]) => (
            <div className="comm-stat" key={l}>
              <span className="comm-stat__num">{n}</span>
              <span className="comm-stat__label">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="comm-body">

        {/* ── FEED COLUMN ── */}
        <div className="comm-feed-col">

          {/* Search + Sort bar */}
          <div className="comm-toolbar">
            <div className="comm-search">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search beats or producers…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="comm-sort">
              {["hot", "new", "top"].map((s) => (
                <button
                  key={s}
                  className={`comm-sort-btn ${sortBy === s ? "comm-sort-btn--active" : ""}`}
                  onClick={() => setSortBy(s)}
                >
                  {s === "hot" ? "🔥" : s === "new" ? "⚡" : "👑"} {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Genre filters */}
          <div className="comm-filters">
            {["All", ...Object.keys(GENRE_COLORS)].map((g) => (
              <button
                key={g}
                className={`comm-filter-btn ${activeFilter === g ? "comm-filter-btn--active" : ""}`}
                onClick={() => setActiveFilter(g)}
                style={activeFilter === g && g !== "All" ? { "--f-color": GENRE_COLORS[g] } : {}}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Posts */}
          <div className="comm-feed">
            {sorted.length === 0 ? (
              <div className="comm-empty">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>No beats found for "{searchQuery}"</p>
              </div>
            ) : (
              sorted.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onPlay={handlePlay}
                  playing={playingId === post.id}
                />
              ))
            )}
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="comm-side">

          {/* Share CTA */}
          <div className="comm-share-cta">
            <h3>Drop Your Beat</h3>
            <p>Share what you've made in the studio with the community.</p>
            <button
              className="comm-cta-btn"
              onClick={() => onNavigate && onNavigate("studio")}
            >
              Open Studio →
            </button>
          </div>

          {/* Top producers */}
          <div className="comm-side-block">
            <div className="comm-side-block__title">
              <span>👑</span> Top Producers
            </div>
            <div className="comm-producers">
              {TOP_PRODUCERS.map((p, i) => (
                <div className="comm-producer" key={p.name}>
                  <span className="comm-producer__rank">#{i + 1}</span>
                  <div className="comm-avatar comm-avatar--sm" style={{ "--av-color": p.color }}>
                    {p.avatar}
                  </div>
                  <div className="comm-producer__info">
                    <span className="comm-producer__name">{p.name}</span>
                    <span className="comm-producer__meta">{p.beats} beats · {p.followers} followers</span>
                  </div>
                  <button className="comm-follow-btn">+</button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending tags */}
          <div className="comm-side-block">
            <div className="comm-side-block__title">
              <span>🔥</span> Trending Tags
            </div>
            <div className="comm-tags">
              {TRENDING_TAGS.map((t, i) => (
                <button
                  key={t}
                  className="comm-tag"
                  onClick={() => { setActiveFilter(t); }}
                  style={GENRE_COLORS[t] ? { "--t-color": GENRE_COLORS[t] } : {}}
                >
                  #{t}
                  <span className="comm-tag__count">{Math.floor(Math.random() * 900 + 100)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="comm-side-block">
            <div className="comm-side-block__title">
              <span>⚡</span> Recent Activity
            </div>
            <div className="comm-activity">
              {[
                { text: "SOLARA dropped a new Lo-Fi kit", t: "1m ago" },
                { text: "NEONPULSE hit 12k followers", t: "14m ago" },
                { text: "New challenge: 80 BPM Lo-Fi", t: "1h ago" },
                { text: "XVOID updated Dark Trap v3", t: "2h ago" },
              ].map(({ text, t }) => (
                <div className="comm-activity-item" key={text}>
                  <span className="comm-activity-dot" />
                  <div>
                    <p className="comm-activity-text">{text}</p>
                    <span className="comm-activity-time">{t}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}