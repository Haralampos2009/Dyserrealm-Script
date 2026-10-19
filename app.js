/* Dyserrealm Script — frontend configuration */
const SUPABASE_URL = "https://krractyhrblivsejrpdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tFu5Dd07GWrVAS7p6_rcFQ_rgKhNqSg";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let authMode = "signup";
let activeCategory = "All";
let currentUser = null;
let toastTimer;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function niceDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}
function displayName(user) {
  return user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Realm member";
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3600);
}
function setNotice(message) {
  const el = $("#notice");
  el.textContent = message;
  el.classList.toggle("hidden", !message);
}
function friendlyError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/Invalid login credentials/i.test(message)) return "That email and password don't match. Try again.";
  if (/Email not confirmed/i.test(message)) return "Please confirm your email using the link we sent you.";
  if (/User already registered/i.test(message)) return "An account with this email already exists. Try logging in.";
  if (/row-level security|permission denied/i.test(message)) return "The database permissions are not set up yet. Run supabase-setup.sql in the Supabase SQL Editor.";
  if (/Failed to fetch|NetworkError/i.test(message)) return "Couldn't connect. Check your internet and Supabase project settings.";
  return message;
}
function openModal(id) { $(id).classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeModal(id) {
  $(id).classList.add("hidden");
  if ($$(".modal:not(.hidden)").length === 0) document.body.style.overflow = "";
}
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("#auth-title").textContent = signup ? "Join the realm." : "Welcome back.";
  $("#auth-subtitle").textContent = signup ? "Create an account to share your ideas." : "Log in to continue where you left off.";
  $("#name-label").classList.toggle("hidden", !signup);
  $("#auth-name").classList.toggle("hidden", !signup);
  $("#auth-name").required = signup;
  $("#auth-submit").innerHTML = signup ? 'Create account <span>↗</span>' : 'Log in <span>↗</span>';
  $("#switch-copy").textContent = signup ? "Already have an account?" : "New to the realm?";
  $("#auth-switch").textContent = signup ? "Log in" : "Create an account";
  $("#auth-message").textContent = "";
  $("#auth-message").classList.remove("error");
}
function updateHeader(user) {
  currentUser = user;
  $("#user-label").textContent = user ? "Hi, " + displayName(user) : "";
  $("#login-open").classList.toggle("hidden", !!user);
  $("#signup-open").classList.toggle("hidden", !!user);
  $("#logout-button").classList.toggle("hidden", !user);
}
function postCard(post) {
  const name = post.author_name || "Realm member";
  const excerpt = (post.body || "").length > 190 ? post.body.slice(0, 190).trimEnd() + "…" : (post.body || "");
  return `<article class="post-card">
    <div class="post-meta"><span class="category-tag">${escapeHTML(post.category)}</span><span class="post-date">${escapeHTML(niceDate(post.created_at))}</span></div>
    <h3>${escapeHTML(post.title)}</h3><p class="post-excerpt">${escapeHTML(excerpt)}</p>
    <div class="post-footer"><div class="author"><span class="author-avatar">${escapeHTML(name.slice(0,1).toUpperCase())}</span><span>${escapeHTML(name)}</span></div><span class="read-label">Realm post ↗</span></div>
  </article>`;
}
async function loadPosts() {
  const grid = $("#posts-grid");
  grid.innerHTML = '<article class="post-card skeleton"><div class="skeleton-line short"></div><div class="skeleton-line"></div><div class="skeleton-line medium"></div></article>'.repeat(3);
  const {data, error} = await db.from("posts").select("id,title,body,category,author_name,created_at").order("created_at", {ascending:false}).limit(60);
  if (error) {
    grid.innerHTML = "";
    $("#empty-state").classList.remove("hidden");
    $("#empty-state").querySelector("h3").textContent = "Almost ready.";
    $("#empty-state").querySelector("p").textContent = "Run the database setup SQL in Supabase to activate the community feed.";
    setNotice(friendlyError(error));
    $("#all-count").textContent = "0";
    return;
  }
  setNotice("");
  const posts = (data || []).filter(p => activeCategory === "All" || p.category === activeCategory);
  $("#all-count").textContent = String(data?.length || 0);
  grid.innerHTML = posts.map(postCard).join("");
  grid.classList.toggle("hidden", posts.length === 0);
  $("#empty-state").classList.toggle("hidden", posts.length !== 0);
  if (!posts.length) {
    $("#empty-state").querySelector("h3").textContent = activeCategory === "All" ? "It's quiet in here." : "No posts in this category yet.";
    $("#empty-state").querySelector("p").textContent = "Be the first to share something with the realm.";
  }
}
function openWrite() {
  if (!currentUser) {
    setAuthMode("signup");
    openModal("#auth-modal");
    $("#auth-message").textContent = "Create an account or log in to publish a post.";
    return;
  }
  $("#post-message").textContent = "";
  openModal("#post-modal");
}
$("#login-open").addEventListener("click", () => { setAuthMode("login"); openModal("#auth-modal"); });
$("#signup-open").addEventListener("click", () => { setAuthMode("signup"); openModal("#auth-modal"); });
$("#hero-write").addEventListener("click", openWrite);
$("#write-open").addEventListener("click", openWrite);
$("#empty-write").addEventListener("click", openWrite);
$("#auth-switch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "login" : "signup"));
$$("[data-close]").forEach(el => el.addEventListener("click", () => closeModal(el.dataset.close === "auth" ? "#auth-modal" : "#post-modal")));
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal("#auth-modal"); closeModal("#post-modal"); } });
$$(".filter").forEach(button => button.addEventListener("click", () => {
  $$(".filter").forEach(b => b.classList.toggle("active", b === button));
  activeCategory = button.dataset.category;
  loadPosts();
}));
$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = $("#auth-submit"), message = $("#auth-message");
  submit.disabled = true; submit.textContent = authMode === "signup" ? "Creating account…" : "Logging in…";
  message.textContent = ""; message.classList.remove("error");
  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  let result;
  if (authMode === "signup") {
    const name = $("#auth-name").value.trim();
    result = await db.auth.signUp({email, password, options:{data:{display_name:name}, emailRedirectTo: location.origin + location.pathname}});
  } else {
    result = await db.auth.signInWithPassword({email, password});
  }
  submit.disabled = false;
  submit.innerHTML = authMode === "signup" ? 'Create account <span>↗</span>' : 'Log in <span>↗</span>';
  if (result.error) {
    message.textContent = friendlyError(result.error); message.classList.add("error"); return;
  }
  if (authMode === "signup" && !result.data.session) {
    message.textContent = "Account created! Check your email for a confirmation link, then come back and log in.";
    return;
  }
  updateHeader(result.data.user);
  closeModal("#auth-modal");
  $("#auth-form").reset();
  showToast(authMode === "signup" ? "Welcome to the realm!" : "You're logged in.");
});
$("#logout-button").addEventListener("click", async () => {
  const {error} = await db.auth.signOut();
  if (error) showToast(friendlyError(error)); else showToast("You have logged out.");
});
$("#post-form").addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) { closeModal("#post-modal"); openWrite(); return; }
  const button = $("#post-submit"), message = $("#post-message");
  button.disabled = true; button.textContent = "Publishing…"; message.textContent = ""; message.classList.remove("error");
  const title = $("#post-heading").value.trim();
  const body = $("#post-body").value.trim();
  const category = $("#post-category").value;
  const {error} = await db.from("posts").insert({title, body, category, author_id:currentUser.id, author_name:displayName(currentUser)});
  button.disabled = false; button.innerHTML = 'Publish post <span>↗</span>';
  if (error) { message.textContent = friendlyError(error); message.classList.add("error"); return; }
  $("#post-form").reset(); closeModal("#post-modal"); activeCategory = "All";
  $$(".filter").forEach(b => b.classList.toggle("active", b.dataset.category === "All"));
  await loadPosts(); showToast("Your post is live.");
});
(async function init() {
  const {data} = await db.auth.getSession();
  updateHeader(data.session?.user || null);
  db.auth.onAuthStateChange((_event, session) => updateHeader(session?.user || null));
  await loadPosts();
})();