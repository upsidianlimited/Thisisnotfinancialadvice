import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = "feranmi06@gmail.com";

const CATEGORIES = [
  { id: "macro",       label: "Macro",       color: "#C9A96E" },
  { id: "stocks",      label: "Stocks",      color: "#6E9EC9" },
  { id: "crypto",      label: "Crypto",      color: "#9E6EC9" },
  { id: "commodities", label: "Commodities", color: "#6EC99E" },
  { id: "opinion",     label: "Opinion",     color: "#C96E6E" },
];

// ─── DB ───────────────────────────────────────────────────────────────────────
async function dbGetPosts() {
  const { data } = await supabase.from("tinfa_posts").select("*").order("created_at", { ascending: false });
  return data || [];
}
async function dbCreatePost(post) {
  const { error } = await supabase.from("tinfa_posts").insert({ ...post, upvotes: 0, downvotes: 0 });
  return !error;
}
async function dbDeletePost(id) {
  await supabase.from("tinfa_posts").delete().eq("id", id);
}
async function dbUpdatePost(id, updates) {
  await supabase.from("tinfa_posts").update(updates).eq("id", id);
}
async function dbCastVote(postId, userEmail, direction) {
  await supabase.from("tinfa_votes").upsert(
    { post_id: postId, user_email: userEmail, direction },
    { onConflict: "post_id,user_email" }
  );
}
async function dbRemoveVote(postId, userEmail) {
  await supabase.from("tinfa_votes").delete().eq("post_id", postId).eq("user_email", userEmail);
}
async function dbGetUserVotes(userEmail) {
  const { data } = await supabase.from("tinfa_votes").select("post_id, direction").eq("user_email", userEmail);
  return (data || []).reduce((acc, v) => ({ ...acc, [v.post_id]: v.direction }), {});
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#080A0F",
  surface:  "#0F1219",
  surface2: "#161B26",
  border:   "#1E2433",
  border2:  "#252D3F",
  text:     "#E8EBF0",
  textSub:  "#8892A4",
  textMute: "#3D4658",
  accent:   "#C9A96E",
  accentDim:"#7A6240",
  danger:   "#E05C5C",
  success:  "#5CE07A",
  ff:       "'Georgia', 'Times New Roman', serif",
};

// ─── Global CSS ───────────────────────────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; height: 100dvh; overflow: hidden; background: ${T.bg}; }
  body { -webkit-font-smoothing: antialiased; }
  input, textarea, select, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #252D3F; border-radius: 2px; }
  input::placeholder, textarea::placeholder { color: ${T.textMute}; }
  select option { background: ${T.surface}; }
`;

function GlobalStyle() {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = globalCSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

const shell = {
  position: "fixed", inset: 0,
  display: "flex", flexDirection: "column",
  background: T.bg, color: T.text,
  fontFamily: T.ff,
  maxWidth: 480, margin: "0 auto",
  borderLeft: `1px solid ${T.border}`,
  borderRight: `1px solid ${T.border}`,
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthInput({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: T.textMute, marginBottom: 7 }}>{label}</div>
      <input {...props} style={{ width: "100%", padding: "13px 14px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, color: T.text, outline: "none" }} />
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode]       = useState("login");
  const [form, setForm]       = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleLogin = async () => {
    setErr(""); setLoading(true);
    const email = form.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: form.password });
    if (error || !data.user) { setErr("Invalid email or password."); setLoading(false); return; }
    let { data: profile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
    if (!profile) {
      await supabase.from("tinfa_users").insert({ email, name: email.split("@")[0] });
      const res = await supabase.from("tinfa_users").select("*").eq("email", email).single();
      profile = res.data;
    }
    onLogin({ ...profile, authUser: data.user });
    setLoading(false);
  };

  const handleSignup = async () => {
    setErr(""); setLoading(true);
    if (!form.name.trim() || !form.email || !form.password) { setErr("All fields required."); setLoading(false); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match."); setLoading(false); return; }
    if (form.password.length < 6) { setErr("Min 6 characters."); setLoading(false); return; }
    const email = form.email.trim().toLowerCase();
    const { data, error: authErr } = await supabase.auth.signUp({ email, password: form.password });
    if (authErr && !authErr.message.includes("already registered")) { setErr(authErr.message); setLoading(false); return; }
    await supabase.from("tinfa_users").upsert({ email, name: form.name.trim() }, { onConflict: "email" });
    if (data?.user?.confirmed_at || data?.session) {
      const { data: profile } = await supabase.from("tinfa_users").select("*").eq("email", email).single();
      onLogin({ ...profile, authUser: data.user });
    } else {
      setMode("login"); setForm(p => ({ ...p, password: "", confirm: "" }));
      setErr("Account created — sign in now.");
    }
    setLoading(false);
  };

  const isErr = err && !err.includes("created");

  return (
    <div style={{ ...shell, justifyContent: "center", alignItems: "center", border: "none" }}>
      <div style={{ width: "100%", padding: "0 28px", maxWidth: 420 }}>
        <div style={{ marginBottom: 44, textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase", color: T.accent, marginBottom: 10 }}>TINFA</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1.2, marginBottom: 8 }}>
            This Is Not<br />Financial Advice
          </div>
          <div style={{ fontSize: 12, color: T.textMute }}>Independent research. No guarantees.</div>
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 20px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMute, marginBottom: 20 }}>
            {mode === "login" ? "Sign In" : "Create Account"}
          </div>

          {err && (
            <div style={{ fontSize: 13, color: isErr ? T.danger : T.success, background: isErr ? "#1E0A0A" : "#0A1E10", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>
              {err}
            </div>
          )}

          {mode === "signup" && <AuthInput label="Full Name" placeholder="Your name" value={form.name} onChange={set("name")} />}
          <AuthInput label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={set("email")}
            onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()} />
          <AuthInput label="Password" type="password" placeholder="••••••••" value={form.password} onChange={set("password")}
            onKeyDown={e => e.key === "Enter" && mode === "login" && handleLogin()} />
          {mode === "signup" && <AuthInput label="Confirm Password" type="password" placeholder="••••••••" value={form.confirm} onChange={set("confirm")} />}

          <button onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}
            style={{ width: "100%", padding: "15px", background: T.accent, color: "#080A0F", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setErr(""); }}
            style={{ background: "none", border: "none", color: T.textSub, fontSize: 13, cursor: "pointer" }}>
            {mode === "login" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ isAdmin }) {
  return (
    <div style={{ flexShrink: 0, padding: "16px 20px 14px", borderBottom: `1px solid ${T.border}`, background: T.bg }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: T.accent }}>TINFA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 1 }}>This Is Not Financial Advice</div>
        </div>
        {isAdmin && (
          <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.accentDim, background: "#1A1408", border: `1px solid ${T.accentDim}`, padding: "4px 10px", borderRadius: 20 }}>
            Admin
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${T.border}`, background: T.bg, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 4, padding: "12px 0", border: "none",
          background: "none", cursor: "pointer", color: active === t.id ? T.accent : T.textMute, transition: "color 0.15s",
        }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: T.ff }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Vote Button ──────────────────────────────────────────────────────────────
function VoteBtn({ direction, count, active, onClick }) {
  const isUp = direction === "up";
  const col = isUp ? T.success : T.danger;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 5,
      background: active ? (isUp ? "#0A1E10" : "#1E0A0A") : T.surface2,
      border: `1px solid ${active ? col : T.border}`,
      color: active ? col : T.textMute,
      padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 13 }}>{isUp ? "↑" : "↓"}</span>
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
  const preview = post.body.length > 280 ? post.body.substring(0, 280) + "…" : post.body;

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
        upvotes:   direction === "up"   ? post.upvotes + 1   : (wasOpposite ? post.upvotes - 1   : post.upvotes),
        downvotes: direction === "down" ? post.downvotes + 1 : (wasOpposite ? post.downvotes - 1 : post.downvotes),
      });
    }
    onVote();
  };

  const fmtDate = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ margin: "0 16px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 0" }}>
        {cat && (
          <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: cat.color, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, padding: "3px 9px", borderRadius: 20 }}>
            {cat.label}
          </div>
        )}
        <div style={{ fontSize: 11, color: T.textMute, marginLeft: "auto" }}>{fmtDate(post.created_at)}</div>
      </div>

      <div style={{ padding: "10px 16px 14px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: 8, cursor: "pointer" }}
          onClick={() => setExpanded(v => !v)}>
          {post.title}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.75, color: T.textSub }}>
          {expanded ? post.body : preview}
          {post.body.length > 280 && (
            <span onClick={() => setExpanded(v => !v)}
              style={{ color: T.accent, cursor: "pointer", marginLeft: 6, fontSize: 13 }}>
              {expanded ? " less" : " more"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <VoteBtn direction="up"   count={post.upvotes}   active={userVote === "up"}   onClick={() => handleVote("up")} />
          <VoteBtn direction="down" count={post.downvotes} active={userVote === "down"} onClick={() => handleVote("down")} />
          <span style={{ fontSize: 12, color: score >= 0 ? T.textMute : T.danger, paddingLeft: 2 }}>
            {score > 0 ? "+" : ""}{score}
          </span>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(post.id)}
            style={{ background: "none", border: `1px solid #2E1515`, color: T.danger, padding: "5px 12px", fontSize: 11, borderRadius: 6, cursor: "pointer" }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Feed Screen ──────────────────────────────────────────────────────────────
function FeedScreen({ user, posts, loading, userVotes, onVote, onDelete, isAdmin }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
      {loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: T.textMute, fontSize: 13 }}>Loading...</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>◌</div>
          <div style={{ fontSize: 14, color: T.textMute, fontStyle: "italic" }}>No dispatches yet.</div>
        </div>
      ) : (
        <div style={{ padding: "12px 0 24px" }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} userVotes={userVotes}
              onVote={onVote} isAdmin={isAdmin} onDelete={onDelete} userEmail={user.email} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Write Screen ─────────────────────────────────────────────────────────────
function FormLabel({ children }) {
  return <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: T.textMute, marginBottom: 7 }}>{children}</div>;
}

function WriteScreen({ user, onPublished }) {
  const [form, setForm]     = useState({ title: "", body: "", category: "macro" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const handlePublish = async () => {
    if (!form.title.trim() || !form.body.trim()) return setMsg("Title and body required.");
    setSaving(true);
    const ok = await dbCreatePost({ ...form, author: user.name });
    if (ok) { setForm({ title: "", body: "", category: "macro" }); onPublished(); }
    else setMsg("Failed to publish.");
    setSaving(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ padding: "24px 20px 40px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMute, marginBottom: 24 }}>New Dispatch</div>

        {msg && <div style={{ fontSize: 13, color: T.danger, background: "#1E0A0A", padding: "10px 14px", borderRadius: 8, marginBottom: 16 }}>{msg}</div>}

        <FormLabel>Category</FormLabel>
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          style={{ width: "100%", padding: "13px 14px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.text, outline: "none", marginBottom: 18 }}>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <FormLabel>Title</FormLabel>
        <input placeholder="What's your thesis?" value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          style={{ width: "100%", padding: "13px 14px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 17, color: T.text, outline: "none", marginBottom: 18, fontFamily: T.ff }} />

        <FormLabel>Body</FormLabel>
        <textarea placeholder="Write your analysis..." value={form.body}
          onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
          style={{ width: "100%", padding: "13px 14px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.text, outline: "none", resize: "none", height: 220, lineHeight: 1.75, fontFamily: T.ff, marginBottom: 24 }} />

        <button onClick={handlePublish} disabled={saving}
          style={{ width: "100%", padding: "16px", background: T.accent, color: "#080A0F", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Publishing..." : "Publish Dispatch"}
        </button>
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
    if (pwForm.newPw.length < 6) return setPwErr("Min 6 characters.");
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: pwForm.current });
    if (signInErr) return setPwErr("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    if (error) return setPwErr("Failed to update.");
    setPwOk("Password updated."); setPwForm({ current: "", newPw: "", confirm: "" }); setPwOpen(false);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ padding: "24px 20px 40px" }}>

        {/* Profile card */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.surface2, border: `2px solid ${T.border2}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 20, color: T.accent, fontWeight: 700 }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 4 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: T.textMute }}>{user.email}</div>
          {user.email === ADMIN_EMAIL && (
            <div style={{ marginTop: 12, display: "inline-block", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.accentDim, background: "#1A1408", border: `1px solid ${T.accentDim}`, padding: "4px 10px", borderRadius: 20 }}>
              Admin
            </div>
          )}
        </div>

        {/* Password */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, color: T.text }}>Password</div>
            <button onClick={() => { setPwOpen(v => !v); setPwErr(""); setPwOk(""); }}
              style={{ background: "none", border: "none", color: T.accent, fontSize: 13, cursor: "pointer" }}>
              {pwOpen ? "Cancel" : "Change"}
            </button>
          </div>
          {pwOpen && (
            <div style={{ marginTop: 16 }}>
              {pwErr && <div style={{ fontSize: 13, color: T.danger, marginBottom: 12 }}>{pwErr}</div>}
              {pwOk  && <div style={{ fontSize: 13, color: T.success, marginBottom: 12 }}>{pwOk}</div>}
              {[["current", "Current Password"], ["newPw", "New Password"], ["confirm", "Confirm New"]].map(([k, lbl]) => (
                <div key={k} style={{ marginBottom: 14 }}>
                  <FormLabel>{lbl}</FormLabel>
                  <input type="password" placeholder="••••••••" value={pwForm[k]}
                    onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))}
                    style={{ width: "100%", padding: "12px 14px", background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 15, color: T.text, outline: "none" }} />
                </div>
              ))}
              <button onClick={handleChangePw}
                style={{ width: "100%", padding: "14px", background: T.accent, color: "#080A0F", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                Update Password
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={onLogout}
          style={{ width: "100%", padding: "16px", background: "none", border: `1px solid #2E1515`, color: T.danger, borderRadius: 14, fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer" }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function MainApp({ user, onLogout }) {
  const [tab, setTab]         = useState("feed");
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});
  const isAdmin = user.email === ADMIN_EMAIL;

  const load = useCallback(async () => {
    const [p, v] = await Promise.all([dbGetPosts(), dbGetUserVotes(user.email)]);
    setPosts(p); setUserVotes(v); setLoading(false);
  }, [user.email]);

  useEffect(() => { load(); }, [load]);

  const tabs = isAdmin
    ? [{ id: "feed", label: "Feed", icon: "◈" }, { id: "write", label: "Write", icon: "✦" }, { id: "account", label: "Account", icon: "◉" }]
    : [{ id: "feed", label: "Feed", icon: "◈" }, { id: "account", label: "Account", icon: "◉" }];

  return (
    <div style={shell}>
      <Header isAdmin={isAdmin} />

      {tab === "feed" && (
        <FeedScreen user={user} posts={posts} loading={loading} userVotes={userVotes}
          onVote={load} onDelete={async id => { await dbDeletePost(id); load(); }} isAdmin={isAdmin} />
      )}
      {tab === "write" && isAdmin && (
        <WriteScreen user={user} onPublished={() => { load(); setTab("feed"); }} />
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
          const res = await supabase.from("tinfa_users").select("*").eq("email", email).single();
          profile = res.data;
        }
        if (profile) setUser({ ...profile, authUser: session.user });
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (loading) {
    return (
      <>
        <GlobalStyle />
        <div style={{ ...shell, justifyContent: "center", alignItems: "center", border: "none" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: T.textMute }}>Loading</div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      {!user ? <AuthScreen onLogin={setUser} /> : <MainApp user={user} onLogout={handleLogout} />}
    </>
  );
}