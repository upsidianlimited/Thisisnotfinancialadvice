import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Admin email — only this account sees the admin dashboard ─────────────────
const ADMIN_EMAIL = "feranmi06@gmail.com";

// ─── Category colours ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "macro",   label: "Macro",   color: "#E8D5B7" },
  { id: "stocks",  label: "Stocks",  color: "#B7D5E8" },
  { id: "crypto",  label: "Crypto",  color: "#D5B7E8" },
  { id: "commodities", label: "Commodities", color: "#B7E8C8" },
  { id: "opinion", label: "Opinion", color: "#E8B7B7" },
];

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function dbGetPosts() {
  const { data, error } = await supabase
    .from("tinfa_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

async function dbCreatePost(post) {
  const { error } = await supabase.from("tinfa_posts").insert({
    title: post.title,
    body: post.body,
    category: post.category,
    author: post.author,
    upvotes: 0,
    downvotes: 0,
  });
  if (error) { console.error(error); return false; }
  return true;
}

async function dbDeletePost(id) {
  const { error } = await supabase.from("tinfa_posts").delete().eq("id", id);
  if (error) { console.error(error); return false; }
  return true;
}

async function dbUpdatePost(id, updates) {
  const { error } = await supabase.from("tinfa_posts").update(updates).eq("id", id);
  if (error) { console.error(error); return false; }
  return true;
}

async function dbGetVote(postId, userEmail) {
  const { data } = await supabase.from("tinfa_votes")
    .select("*").eq("post_id", postId).eq("user_email", userEmail).single();
  return data || null;
}

async function dbCastVote(postId, userEmail, direction) {
  // Upsert vote
  const { error } = await supabase.from("tinfa_votes").upsert(
    { post_id: postId, user_email: userEmail, direction },
    { onConflict: "post_id,user_email" }
  );
  return !error;
}

async function dbRemoveVote(postId, userEmail) {
  await supabase.from("tinfa_votes").delete()
    .eq("post_id", postId).eq("user_email", userEmail);
}

async function dbGetUserVotes(userEmail) {
  const { data } = await supabase.from("tinfa_votes")
    .select("post_id, direction").eq("user_email", userEmail);
  return (data || []).reduce((acc, v) => ({ ...acc, [v.post_id]: v.direction }), {});
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  // Layout
  app:     { fontFamily: "'Georgia', 'Times New Roman', serif", minHeight: "100dvh", background: "#0C0C0C", color: "#E8E0D4", display: "flex", flexDirection: "column" },
  page:    { flex: 1, maxWidth: 680, width: "100%", margin: "0 auto", padding: "0 20px 80px" },
  center:  { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#0C0C0C", padding: 24 },

  // Header
  header:  { borderBottom: "1px solid #1E1E1E", padding: "20px", background: "#0C0C0C", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)" },
  headerInner: { maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" },

  // Typography
  masthead: { fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E0D4", fontFamily: "'Georgia', serif" },
  disclaimer: { fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 },
  h1:      { fontSize: 26, lineHeight: 1.25, fontWeight: 700, color: "#E8E0D4", marginBottom: 12, fontFamily: "'Georgia', serif" },
  h2:      { fontSize: 20, lineHeight: 1.3, fontWeight: 700, color: "#E8E0D4", marginBottom: 8, fontFamily: "'Georgia', serif" },
  body:    { fontSize: 15, lineHeight: 1.8, color: "#A89E90", fontFamily: "'Georgia', serif" },
  meta:    { fontSize: 11, color: "#4A4540", letterSpacing: "0.08em", textTransform: "uppercase" },
  label:   { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5A5248", display: "block", marginBottom: 6 },

  // Auth card
  authCard: { background: "#111", border: "1px solid #1E1E1E", borderRadius: 4, padding: "48px 40px", width: "100%", maxWidth: 400 },
  authTitle: { fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: 32 },

  // Inputs
  input:   { width: "100%", padding: "12px 0", background: "transparent", border: "none", borderBottom: "1px solid #2A2A2A", fontSize: 15, color: "#E8E0D4", boxSizing: "border-box", outline: "none", marginBottom: 24, fontFamily: "'Georgia', serif", transition: "border-color 0.2s" },
  textarea: { width: "100%", padding: 16, background: "#111", border: "1px solid #1E1E1E", fontSize: 14, color: "#C8BFB5", boxSizing: "border-box", outline: "none", resize: "vertical", minHeight: 200, fontFamily: "'Georgia', serif", lineHeight: 1.8, borderRadius: 2 },
  select:  { width: "100%", padding: "12px 0", background: "transparent", border: "none", borderBottom: "1px solid #2A2A2A", fontSize: 14, color: "#E8E0D4", boxSizing: "border-box", outline: "none", marginBottom: 24, cursor: "pointer" },

  // Buttons
  btnPrimary: { background: "#E8E0D4", color: "#0C0C0C", border: "none", padding: "14px 28px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", width: "100%", marginTop: 8, fontFamily: "'Georgia', serif" },
  btnGhost:  { background: "none", border: "1px solid #2A2A2A", color: "#666", padding: "8px 16px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Georgia', serif" },
  btnText:   { background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", padding: 0, fontFamily: "'Georgia', serif" },
  btnDanger: { background: "none", border: "1px solid #3D1515", color: "#ff6b6b", padding: "6px 14px", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em" },

  // Cards
  postCard: { borderBottom: "1px solid #1A1A1A", padding: "32px 0" },
  postFull: { background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 2, padding: 32, marginBottom: 16 },

  // Vote bar
  voteBar: { display: "flex", alignItems: "center", gap: 16, marginTop: 20 },

  // Misc
  divider: { height: 1, background: "#1A1A1A", margin: "24px 0" },
  err:     { fontSize: 12, color: "#ff6b6b", marginBottom: 16, letterSpacing: "0.05em" },
  ok:      { fontSize: 12, color: "#6bff6b", marginBottom: 16, letterSpacing: "0.05em" },
  tag:     (color) => ({ display: "inline-block", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${color}40`, color: color, marginBottom: 12, borderRadius: 2 }),
};

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]   = useState("login");
  const [form, setForm]   = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(), password: form.password,
    });
    if (error || !data.user) { setErr("Invalid email or password."); setLoading(false); return; }
    const { data: profile } = await supabase.from("tinfa_users").select("*")
      .eq("email", form.email.trim().toLowerCase()).single();
    onLogin({ ...profile, authUser: data.user });
    setLoading(false);
  };

  const handleSignup = async () => {
    setErr(""); setLoading(true);
    if (!form.name.trim() || !form.email || !form.password) { setErr("All fields are required."); setLoading(false); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match."); setLoading(false); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    const { error: authErr } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(), password: form.password,
    });
    if (authErr && !authErr.message.includes("already registered")) {
      setErr(authErr.message); setLoading(false); return;
    }
    await supabase.from("tinfa_users").upsert({
      email: form.email.trim().toLowerCase(), name: form.name.trim(),
    }, { onConflict: "email" });
    setErr(""); setLoading(false);
    setMode("login");
    setForm(p => ({ ...p, password: "", confirm: "" }));
  };

  return (
    <div style={s.center}>
      <div style={s.authCard}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "#E8E0D4", fontFamily: "'Georgia', serif" }}>
            This Is Not Financial Advice
          </div>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 4 }}>
            Independent research. No guarantees.
          </div>
        </div>

        <div style={s.authTitle}>{mode === "login" ? "Sign In" : "Create Account"}</div>

        {err && <div style={s.err}>{err}</div>}

        {mode === "signup" && (
          <>
            <label style={s.label}>Your Name</label>
            <input style={s.input} placeholder="Full name" value={form.name} onChange={set("name")} />
          </>
        )}

        <label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="you@email.com" value={form.email}
          onChange={set("email")} onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()} />

        <label style={s.label}>Password</label>
        <input style={s.input} type="password" placeholder="••••••••" value={form.password}
          onChange={set("password")} onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()} />

        {mode === "signup" && (
          <>
            <label style={s.label}>Confirm Password</label>
            <input style={s.input} type="password" placeholder="••••••••" value={form.confirm} onChange={set("confirm")} />
          </>
        )}

        <button style={s.btnPrimary} onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button style={s.btnText} onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setErr(""); }}>
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vote Button ──────────────────────────────────────────────────────────────
function VoteButton({ direction, count, active, onClick }) {
  const isUp = direction === "up";
  const activeColor = isUp ? "#6bff6b" : "#ff6b6b";
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: active ? (isUp ? "#0A1E0A" : "#1E0A0A") : "transparent",
      border: `1px solid ${active ? (isUp ? "#1A3D1A" : "#3D1A1A") : "#2A2A2A"}`,
      color: active ? activeColor : "#4A4540",
      padding: "6px 14px", borderRadius: 2, cursor: "pointer", fontSize: 12,
      fontFamily: "'Georgia', serif", letterSpacing: "0.05em", transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 14 }}>{isUp ? "↑" : "↓"}</span>
      <span>{count}</span>
    </button>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, userVotes, onVote, onOpen, isAdmin, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES.find(c => c.id === post.category);
  const userVote = userVotes[post.id] || null;
  const score = post.upvotes - post.downvotes;
  const preview = post.body.length > 280 ? post.body.substring(0, 280) + "..." : post.body;

  const handleVote = async (direction) => {
    if (userVote === direction) {
      await dbRemoveVote(post.id, "current");
      await dbUpdatePost(post.id, {
        upvotes: direction === "up" ? post.upvotes - 1 : post.upvotes,
        downvotes: direction === "down" ? post.downvotes - 1 : post.downvotes,
      });
    } else {
      const wasOpposite = userVote && userVote !== direction;
      await dbCastVote(post.id, "current", direction);
      await dbUpdatePost(post.id, {
        upvotes: direction === "up" ? post.upvotes + 1 : (wasOpposite ? post.upvotes - 1 : post.upvotes),
        downvotes: direction === "down" ? post.downvotes + 1 : (wasOpposite ? post.downvotes - 1 : post.downvotes),
      });
    }
    onVote();
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={s.postCard}>
      {cat && <div style={s.tag(cat.color)}>{cat.label}</div>}
      <div style={{ ...s.h2, cursor: "pointer", transition: "color 0.15s" }}
        onClick={() => setExpanded(v => !v)}
        onMouseOver={e => e.currentTarget.style.color = "#C8BFB5"}
        onMouseOut={e => e.currentTarget.style.color = "#E8E0D4"}>
        {post.title}
      </div>
      <div style={s.meta}>{fmtDate(post.created_at)}</div>

      <div style={{ ...s.body, marginTop: 12 }}>
        {expanded ? post.body : preview}
        {post.body.length > 280 && (
          <span onClick={() => setExpanded(v => !v)}
            style={{ color: "#5A5248", cursor: "pointer", marginLeft: 6, fontSize: 13, fontStyle: "italic" }}>
            {expanded ? "show less" : "read more"}
          </span>
        )}
      </div>

      <div style={{ ...s.voteBar, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <VoteButton direction="up" count={post.upvotes} active={userVote === "up"}
            onClick={() => handleVote("up")} />
          <VoteButton direction="down" count={post.downvotes} active={userVote === "down"}
            onClick={() => handleVote("down")} />
          <span style={{ ...s.meta, display: "flex", alignItems: "center", paddingLeft: 4 }}>
            {score > 0 ? "+" : ""}{score}
          </span>
        </div>
        {isAdmin && (
          <button style={s.btnDanger} onClick={() => onDelete(post.id)}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("feed"); // feed | new | profile
  const [form, setForm]       = useState({ title: "", body: "", category: "macro" });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState("");
  const [userVotes, setUserVotes] = useState({});

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([dbGetPosts(), dbGetUserVotes(user.email)]);
    setPosts(p); setUserVotes(v); setLoading(false);
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) return setMsg("Title and body are required.");
    setSaving(true);
    const ok = await dbCreatePost({ ...form, author: user.name });
    if (ok) { setMsg("Published."); setForm({ title: "", body: "", category: "macro" }); setView("feed"); load(); }
    else setMsg("Failed to publish.");
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await dbDeletePost(id); load();
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.masthead}>TINFA</div>
            <div style={s.disclaimer}>This Is Not Financial Advice</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ ...s.meta, color: "#333" }}>Admin</span>
            <button style={s.btnGhost} onClick={() => setView("new")}>+ New Post</button>
            <button style={s.btnText} onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={s.page}>

        {/* Nav */}
        <div style={{ display: "flex", gap: 24, padding: "24px 0 8px", borderBottom: "1px solid #1A1A1A", marginBottom: 8 }}>
          {[["feed", "All Posts"], ["new", "New Post"], ["profile", "Account"]].map(([id, label]) => (
            <button key={id} onClick={() => { setView(id); setMsg(""); }} style={{
              background: "none", border: "none", fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", cursor: "pointer", fontFamily: "'Georgia', serif",
              color: view === id ? "#E8E0D4" : "#4A4540",
              borderBottom: view === id ? "1px solid #E8E0D4" : "1px solid transparent",
              paddingBottom: 8, transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* Feed */}
        {view === "feed" && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ ...s.meta, padding: "16px 0", color: "#333" }}>
              {posts.length} {posts.length === 1 ? "dispatch" : "dispatches"} published
            </div>
            {loading ? (
              <div style={{ ...s.meta, color: "#333", padding: "40px 0" }}>Loading...</div>
            ) : posts.length === 0 ? (
              <div style={{ ...s.body, color: "#333", padding: "40px 0", fontStyle: "italic" }}>
                No posts yet. Write your first dispatch.
              </div>
            ) : (
              posts.map(post => (
                <PostCard key={post.id} post={post} userVotes={userVotes}
                  onVote={load} isAdmin={true} onDelete={handleDelete} />
              ))
            )}
          </div>
        )}

        {/* New Post */}
        {view === "new" && (
          <div style={{ paddingTop: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 32 }}>
              New Dispatch
            </div>

            {msg && <div style={msg === "Published." ? s.ok : s.err}>{msg}</div>}

            <label style={s.label}>Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ ...s.select, marginBottom: 24 }}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            <label style={s.label}>Title</label>
            <input style={{ ...s.input, fontSize: 18, marginBottom: 32 }}
              placeholder="What's your thesis?"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

            <label style={s.label}>Body</label>
            <textarea style={s.textarea} placeholder="Write your analysis..."
              value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={{ ...s.btnPrimary, width: "auto", flex: 1 }}
                onClick={handlePublish} disabled={saving}>
                {saving ? "Publishing..." : "Publish Dispatch"}
              </button>
              <button style={s.btnGhost} onClick={() => setView("feed")}>Cancel</button>
            </div>
          </div>
        )}

        {/* Profile */}
        {view === "profile" && (
          <ProfileView user={user} onLogout={onLogout} />
        )}

      </div>
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────
function UserDashboard({ user, onLogout }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState("feed");
  const [userVotes, setUserVotes] = useState({});

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([dbGetPosts(), dbGetUserVotes(user.email)]);
    setPosts(p); setUserVotes(v); setLoading(false);
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  // Override vote handlers to use actual email
  const handleVote = async (post, direction) => {
    const userVote = userVotes[post.id] || null;
    if (userVote === direction) {
      await dbRemoveVote(post.id, user.email);
      await dbUpdatePost(post.id, {
        upvotes:   direction === "up"   ? post.upvotes - 1   : post.upvotes,
        downvotes: direction === "down" ? post.downvotes - 1 : post.downvotes,
      });
    } else {
      const wasOpposite = userVote && userVote !== direction;
      await dbCastVote(post.id, user.email, direction);
      await dbUpdatePost(post.id, {
        upvotes:   direction === "up"   ? post.upvotes + 1   : (wasOpposite ? post.upvotes - 1   : post.upvotes),
        downvotes: direction === "down" ? post.downvotes + 1 : (wasOpposite ? post.downvotes - 1 : post.downvotes),
      });
    }
    load();
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const cat = (id) => CATEGORIES.find(c => c.id === id);

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.masthead}>TINFA</div>
            <div style={s.disclaimer}>This Is Not Financial Advice</div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button style={s.btnText} onClick={() => setView("profile")}>
              {user.name.split(" ")[0]}
            </button>
            <button style={s.btnText} onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={s.page}>

        {/* Nav */}
        <div style={{ display: "flex", gap: 24, padding: "24px 0 8px", borderBottom: "1px solid #1A1A1A", marginBottom: 8 }}>
          {[["feed", "Research Feed"], ["profile", "Account"]].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{
              background: "none", border: "none", fontSize: 11, letterSpacing: "0.12em",
              textTransform: "uppercase", cursor: "pointer", fontFamily: "'Georgia', serif",
              color: view === id ? "#E8E0D4" : "#4A4540",
              borderBottom: view === id ? "1px solid #E8E0D4" : "1px solid transparent",
              paddingBottom: 8, transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        {/* Feed */}
        {view === "feed" && (
          <div style={{ paddingTop: 8 }}>
            {loading ? (
              <div style={{ ...s.meta, color: "#333", padding: "40px 0" }}>Loading research...</div>
            ) : posts.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>◌</div>
                <div style={{ ...s.body, color: "#333", fontStyle: "italic" }}>
                  No dispatches yet. Check back soon.
                </div>
              </div>
            ) : (
              posts.map(post => {
                const c = cat(post.category);
                const userVote = userVotes[post.id] || null;
                const score = post.upvotes - post.downvotes;
                const preview = post.body.length > 320 ? post.body.substring(0, 320) + "..." : post.body;
                const [expanded, setExpanded] = useState(false);

                return (
                  <div key={post.id} style={s.postCard}>
                    {c && <div style={s.tag(c.color)}>{c.label}</div>}
                    <div style={{ ...s.h2, cursor: "pointer", transition: "color 0.15s" }}
                      onClick={() => setExpanded(v => !v)}>
                      {post.title}
                    </div>
                    <div style={s.meta}>{fmtDate(post.created_at)}</div>
                    <div style={{ ...s.body, marginTop: 12 }}>
                      {expanded ? post.body : preview}
                      {post.body.length > 320 && (
                        <span onClick={() => setExpanded(v => !v)}
                          style={{ color: "#5A5248", cursor: "pointer", marginLeft: 6, fontSize: 13, fontStyle: "italic" }}>
                          {expanded ? " show less" : " read more"}
                        </span>
                      )}
                    </div>
                    <div style={s.voteBar}>
                      <VoteButton direction="up" count={post.upvotes} active={userVote === "up"}
                        onClick={() => handleVote(post, "up")} />
                      <VoteButton direction="down" count={post.downvotes} active={userVote === "down"}
                        onClick={() => handleVote(post, "down")} />
                      <span style={{ ...s.meta, paddingLeft: 4 }}>
                        {score > 0 ? "+" : ""}{score}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Profile */}
        {view === "profile" && (
          <ProfileView user={user} onLogout={onLogout} />
        )}

      </div>
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────
function ProfileView({ user, onLogout }) {
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErr, setPwErr]   = useState("");
  const [pwOk, setPwOk]     = useState("");
  const [pwOpen, setPwOpen] = useState(false);

  const handleChangePw = async () => {
    setPwErr(""); setPwOk("");
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return setPwErr("All fields are required.");
    if (pwForm.newPw !== pwForm.confirm) return setPwErr("Passwords do not match.");
    if (pwForm.newPw.length < 6) return setPwErr("Minimum 6 characters.");
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
    if (signInErr) return setPwErr("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) return setPwErr("Failed to update. Try again.");
    setPwOk("Password updated.");
    setPwForm({ current: "", newPw: "", confirm: "" });
    setPwOpen(false);
  };

  return (
    <div style={{ paddingTop: 32 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 32 }}>
        Account
      </div>

      {/* Info */}
      <div style={{ borderBottom: "1px solid #1A1A1A", paddingBottom: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 20, color: "#E8E0D4", fontFamily: "'Georgia', serif", marginBottom: 4 }}>{user.name}</div>
        <div style={{ ...s.meta, color: "#3A3530" }}>{user.email}</div>
        {user.email === ADMIN_EMAIL && (
          <div style={{ ...s.tag("#E8D5B7"), marginTop: 12 }}>Admin</div>
        )}
      </div>

      {/* Change password */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4A4540" }}>Password</div>
          <button style={s.btnText} onClick={() => { setPwOpen(v => !v); setPwErr(""); setPwOk(""); }}>
            {pwOpen ? "Cancel" : "Change"}
          </button>
        </div>
        {pwOpen && (
          <div>
            {pwErr && <div style={s.err}>{pwErr}</div>}
            {pwOk  && <div style={s.ok}>{pwOk}</div>}
            <label style={s.label}>Current Password</label>
            <input style={s.input} type="password" value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
            <label style={s.label}>New Password</label>
            <input style={s.input} type="password" value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} placeholder="••••••••" />
            <label style={s.label}>Confirm</label>
            <input style={s.input} type="password" value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
            <button style={{ ...s.btnPrimary, width: "auto" }} onClick={handleChangePw}>Update Password</button>
          </div>
        )}
      </div>

      <div style={s.divider} />
      <button style={{ ...s.btnText, color: "#ff6b6b" }} onClick={onLogout}>Sign Out</button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TINFAApp() {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase.from("tinfa_users")
          .select("*").eq("email", session.user.email).single();
        if (profile) setUser({ ...profile, authUser: session.user });
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = (userData) => setUser(userData);
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (loading) {
    return (
      <div style={{ ...s.center, flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#333", fontFamily: "'Georgia', serif" }}>
          Loading
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (user.email === ADMIN_EMAIL) {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return <UserDashboard user={user} onLogout={handleLogout} />;
}