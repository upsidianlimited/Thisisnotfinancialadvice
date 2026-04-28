import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = "feranmi06@gmail.com";

const CATEGORIES = [
  { id: "macro",       label: "Macro",       color: "#E8D5B7" },
  { id: "stocks",      label: "Stocks",      color: "#B7D5E8" },
  { id: "crypto",      label: "Crypto",      color: "#D5B7E8" },
  { id: "commodities", label: "Commodities", color: "#B7E8C8" },
  { id: "opinion",     label: "Opinion",     color: "#E8B7B7" },
];

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function dbGetPosts() {
  const { data, error } = await supabase
    .from("tinfa_posts").select("*").order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}
async function dbCreatePost(post) {
  const { error } = await supabase.from("tinfa_posts").insert({
    title: post.title, body: post.body, category: post.category,
    author: post.author, upvotes: 0, downvotes: 0,
  });
  return !error;
}
async function dbDeletePost(id) {
  const { error } = await supabase.from("tinfa_posts").delete().eq("id", id);
  return !error;
}
async function dbUpdatePost(id, updates) {
  const { error } = await supabase.from("tinfa_posts").update(updates).eq("id", id);
  return !error;
}
async function dbCastVote(postId, userEmail, direction) {
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
  app:      { fontFamily: "'Georgia','Times New Roman',serif", height: "100dvh", background: "#0C0C0C", color: "#E8E0D4", display: "flex", flexDirection: "column", overflow: "hidden" },
  screen:   { flex: 1, overflowY: "auto", paddingBottom: 80 },
  page:     { maxWidth: 680, width: "100%", margin: "0 auto", padding: "0 20px" },
  center:   { display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#0C0C0C", padding: 24 },

  // Header
  header:   { borderBottom: "1px solid #1A1A1A", padding: "16px 20px", background: "#0C0C0C", flexShrink: 0 },
  headerInner: { maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" },
  masthead: { fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E0D4" },
  disclaimer: { fontSize: 9, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 2 },

  // Bottom tab bar
  tabBar:   { position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "#0C0C0C", borderTop: "1px solid #1A1A1A", display: "flex", alignItems: "stretch", zIndex: 200, paddingBottom: "env(safe-area-inset-bottom)" },
  tabItem:  (active) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: active ? "#E8E0D4" : "#3A3530", transition: "color 0.15s" }),
  tabIcon:  { fontSize: 20, lineHeight: 1 },
  tabLabel: (active) => ({ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'Georgia',serif", color: active ? "#E8E0D4" : "#3A3530" }),

  // Auth
  authCard: { background: "#111", border: "1px solid #1E1E1E", borderRadius: 4, padding: "48px 32px", width: "100%", maxWidth: 400 },
  authTitle: { fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#666", marginBottom: 32 },

  // Inputs
  input:    { width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid #2A2A2A", fontSize: 16, color: "#E8E0D4", boxSizing: "border-box", outline: "none", marginBottom: 24, fontFamily: "'Georgia',serif" },
  textarea: { width: "100%", padding: 16, background: "#111", border: "1px solid #1E1E1E", fontSize: 15, color: "#C8BFB5", boxSizing: "border-box", outline: "none", resize: "none", height: 220, fontFamily: "'Georgia',serif", lineHeight: 1.8, borderRadius: 2 },
  select:   { width: "100%", padding: "14px 0", background: "transparent", border: "none", borderBottom: "1px solid #2A2A2A", fontSize: 15, color: "#E8E0D4", boxSizing: "border-box", outline: "none", marginBottom: 24, cursor: "pointer" },
  label:    { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#5A5248", display: "block", marginBottom: 6 },

  // Buttons
  btnPrimary: { background: "#E8E0D4", color: "#0C0C0C", border: "none", padding: "16px 28px", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", width: "100%", marginTop: 8, fontFamily: "'Georgia',serif", borderRadius: 2 },
  btnGhost:   { background: "none", border: "1px solid #2A2A2A", color: "#666", padding: "12px 20px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "'Georgia',serif", borderRadius: 2 },
  btnText:    { background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", padding: 0, fontFamily: "'Georgia',serif" },
  btnDanger:  { background: "none", border: "1px solid #3D1515", color: "#ff6b6b", padding: "8px 16px", fontSize: 11, cursor: "pointer", letterSpacing: "0.08em", borderRadius: 2 },

  // Cards
  postCard: { borderBottom: "1px solid #1A1A1A", padding: "28px 0" },
  voteBar:  { display: "flex", alignItems: "center", gap: 12, marginTop: 16 },
  divider:  { height: 1, background: "#1A1A1A", margin: "24px 0" },
  err:      { fontSize: 12, color: "#ff6b6b", marginBottom: 16, letterSpacing: "0.05em" },
  ok:       { fontSize: 12, color: "#6bff6b", marginBottom: 16, letterSpacing: "0.05em" },
  tag:      (color) => ({ display: "inline-block", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", padding: "3px 8px", border: `1px solid ${color}40`, color, marginBottom: 10, borderRadius: 2 }),
  meta:     { fontSize: 11, color: "#4A4540", letterSpacing: "0.08em", textTransform: "uppercase" },
  h2:       { fontSize: 19, lineHeight: 1.3, fontWeight: 700, color: "#E8E0D4", marginBottom: 6, fontFamily: "'Georgia',serif" },
  body:     { fontSize: 15, lineHeight: 1.8, color: "#A89E90", fontFamily: "'Georgia',serif" },
};

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
      padding: "8px 16px", borderRadius: 2, cursor: "pointer", fontSize: 13,
      fontFamily: "'Georgia',serif", transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 16 }}>{isUp ? "↑" : "↓"}</span>
      <span>{count}</span>
    </button>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, userVotes, onVote, isAdmin, onDelete, userEmail }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES.find(c => c.id === post.category);
  const userVote = userVotes[post.id] || null;
  const score = post.upvotes - post.downvotes;
  const preview = post.body.length > 300 ? post.body.substring(0, 300) + "..." : post.body;

  const handleVote = async (direction) => {
    if (userVote === direction) {
      await dbRemoveVote(post.id, userEmail);
      await dbUpdatePost(post.id, {
        upvotes:   direction === "up"   ? post.upvotes - 1   : post.upvotes,
        downvotes: direction === "down" ? post.downvotes - 1 : post.downvotes,
      });
    } else {
      const wasOpposite = userVote && userVote !== direction;
      await dbCastVote(post.id, userEmail, direction);
      await dbUpdatePost(post.id, {
        upvotes:   direction === "up"   ? post.upvotes + 1   : (wasOpposite ? post.upvotes - 1 : post.upvotes),
        downvotes: direction === "down" ? post.downvotes + 1 : (wasOpposite ? post.downvotes - 1 : post.downvotes),
      });
    }
    onVote();
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={s.postCard}>
      {cat && <div style={s.tag(cat.color)}>{cat.label}</div>}
      <div style={{ ...s.h2, cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        {post.title}
      </div>
      <div style={s.meta}>{fmtDate(post.created_at)}</div>
      <div style={{ ...s.body, marginTop: 10 }}>
        {expanded ? post.body : preview}
        {post.body.length > 300 && (
          <span onClick={() => setExpanded(v => !v)}
            style={{ color: "#5A5248", cursor: "pointer", marginLeft: 6, fontSize: 13, fontStyle: "italic" }}>
            {expanded ? " show less" : " read more"}
          </span>
        )}
      </div>
      <div style={{ ...s.voteBar, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <VoteButton direction="up" count={post.upvotes} active={userVote === "up"} onClick={() => handleVote("up")} />
          <VoteButton direction="down" count={post.downvotes} active={userVote === "down"} onClick={() => handleVote("down")} />
          <span style={{ ...s.meta, paddingLeft: 4 }}>{score > 0 ? "+" : ""}{score}</span>
        </div>
        {isAdmin && (
          <button style={s.btnDanger} onClick={() => onDelete(post.id)}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]     = useState("login");
  const [form, setForm]     = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    const email = form.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: form.password });
    if (error || !data.user) { setErr("Invalid email or password."); setLoading(false); return; }

    // Get or create profile
    let { data: profile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
    if (!profile) {
      await supabase.from("tinfa_users").insert({ email, name: email.split("@")[0] });
      const { data: newProfile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
      profile = newProfile;
    }
    onLogin({ ...profile, authUser: data.user });
    setLoading(false);
  };

  const handleSignup = async () => {
    setErr(""); setLoading(true);
    if (!form.name.trim() || !form.email || !form.password) { setErr("All fields required."); setLoading(false); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match."); setLoading(false); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters."); setLoading(false); return; }

    const email = form.email.trim().toLowerCase();
    const { data, error: authErr } = await supabase.auth.signUp({ email, password: form.password });

    if (authErr && !authErr.message.includes("already registered")) {
      setErr(authErr.message); setLoading(false); return;
    }

    // Save profile
    await supabase.from("tinfa_users").upsert({ email, name: form.name.trim() }, { onConflict: "email" });

    // If user is confirmed immediately (email confirm off), log them in
    if (data?.user && data.user.confirmed_at) {
      let { data: profile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
      onLogin({ ...profile, authUser: data.user });
    } else {
      setErr("");
      setLoading(false);
      setMode("login");
      setForm(p => ({ ...p, password: "", confirm: "" }));
      alert("Account created! You can now sign in.");
    }
    setLoading(false);
  };

  return (
    <div style={s.center}>
      <div style={s.authCard}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "#E8E0D4", fontFamily: "'Georgia',serif" }}>
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

// ─── Feed Screen ──────────────────────────────────────────────────────────────
function FeedScreen({ user, posts, loading, userVotes, onVote, onDelete, isAdmin }) {
  return (
    <div style={s.screen}>
      <div style={s.page}>
        <div style={{ paddingTop: 20 }}>
          {loading ? (
            <div style={{ ...s.meta, color: "#333", padding: "60px 0", textAlign: "center" }}>Loading...</div>
          ) : posts.length === 0 ? (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>◌</div>
              <div style={{ ...s.body, color: "#333", fontStyle: "italic" }}>No dispatches yet.</div>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} userVotes={userVotes}
                onVote={onVote} isAdmin={isAdmin} onDelete={onDelete} userEmail={user.email} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Post Screen (Admin) ──────────────────────────────────────────────────
function NewPostScreen({ user, onPublished }) {
  const [form, setForm]   = useState({ title: "", body: "", category: "macro" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) return setMsg("Title and body are required.");
    setSaving(true);
    const ok = await dbCreatePost({ ...form, author: user.name });
    if (ok) { setForm({ title: "", body: "", category: "macro" }); onPublished(); }
    else setMsg("Failed to publish.");
    setSaving(false);
  };

  return (
    <div style={s.screen}>
      <div style={s.page}>
        <div style={{ paddingTop: 24, paddingBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 28 }}>
            New Dispatch
          </div>

          {msg && <div style={s.err}>{msg}</div>}

          <label style={s.label}>Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={s.select}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <label style={s.label}>Title</label>
          <input style={{ ...s.input, fontSize: 18, marginBottom: 28 }}
            placeholder="What's your thesis?"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          <label style={s.label}>Body</label>
          <textarea style={s.textarea} placeholder="Write your analysis..."
            value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />

          <button style={{ ...s.btnPrimary, marginTop: 20 }} onClick={handlePublish} disabled={saving}>
            {saving ? "Publishing..." : "Publish Dispatch"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Account Screen ───────────────────────────────────────────────────────────
function AccountScreen({ user, onLogout }) {
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErr, setPwErr]   = useState("");
  const [pwOk, setPwOk]     = useState("");
  const [pwOpen, setPwOpen] = useState(false);

  const handleChangePw = async () => {
    setPwErr(""); setPwOk("");
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return setPwErr("All fields required.");
    if (pwForm.newPw !== pwForm.confirm) return setPwErr("Passwords do not match.");
    if (pwForm.newPw.length < 6) return setPwErr("Minimum 6 characters.");
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
    if (signInErr) return setPwErr("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) return setPwErr("Failed to update. Try again.");
    setPwOk("Password updated."); setPwForm({ current: "", newPw: "", confirm: "" }); setPwOpen(false);
  };

  return (
    <div style={s.screen}>
      <div style={s.page}>
        <div style={{ paddingTop: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#555", marginBottom: 28 }}>
            Account
          </div>

          <div style={{ borderBottom: "1px solid #1A1A1A", paddingBottom: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 20, color: "#E8E0D4", fontFamily: "'Georgia',serif", marginBottom: 4 }}>{user.name}</div>
            <div style={{ ...s.meta, color: "#3A3530" }}>{user.email}</div>
            {user.email === ADMIN_EMAIL && (
              <div style={{ ...s.tag("#E8D5B7"), marginTop: 12 }}>Admin</div>
            )}
          </div>

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
      </div>
    </div>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={s.tabBar}>
      {tabs.map(tab => (
        <button key={tab.id} style={s.tabItem(active === tab.id)} onClick={() => onChange(tab.id)}>
          <span style={s.tabIcon}>{tab.icon}</span>
          <span style={s.tabLabel(active === tab.id)}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main App (logged in) ─────────────────────────────────────────────────────
function MainApp({ user, onLogout }) {
  const [tab, setTab]       = useState("feed");
  const [posts, setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});
  const isAdmin = user.email === ADMIN_EMAIL;

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([dbGetPosts(), dbGetUserVotes(user.email)]);
    setPosts(p); setUserVotes(v); setLoading(false);
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => { await dbDeletePost(id); load(); };

  const userTabs = [
    { id: "feed",    label: "Feed",    icon: "◈" },
    { id: "account", label: "Account", icon: "◉" },
  ];
  const adminTabs = [
    { id: "feed",    label: "Feed",    icon: "◈" },
    { id: "new",     label: "Write",   icon: "✦" },
    { id: "account", label: "Account", icon: "◉" },
  ];
  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.masthead}>TINFA</div>
            <div style={s.disclaimer}>This Is Not Financial Advice</div>
          </div>
          {isAdmin && <span style={{ ...s.meta, color: "#444", fontSize: 10 }}>Admin</span>}
        </div>
      </div>

      {/* Screens */}
      {tab === "feed" && (
        <FeedScreen user={user} posts={posts} loading={loading} userVotes={userVotes}
          onVote={load} onDelete={handleDelete} isAdmin={isAdmin} />
      )}
      {tab === "new" && isAdmin && (
        <NewPostScreen user={user} onPublished={() => { load(); setTab("feed"); }} />
      )}
      {tab === "account" && (
        <AccountScreen user={user} onLogout={onLogout} />
      )}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function TINFAApp() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email;
        let { data: profile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
        if (!profile) {
          await supabase.from("tinfa_users").insert({ email, name: email.split("@")[0] });
          const { data: newProfile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
          profile = newProfile;
        }
        if (profile) setUser({ ...profile, authUser: session.user });
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (loading) {
    return (
      <div style={{ ...s.center, flexDirection: "column" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#333", fontFamily: "'Georgia',serif" }}>
          Loading
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={setUser} />;
  return <MainApp user={user} onLogout={handleLogout} />;
}