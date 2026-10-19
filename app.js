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
function robloxName(user) { return user?.user_metadata?.roblox_username || ""; }
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
  if (/Bucket not found/i.test(message)) return "Image storage is not set up yet. Run the latest supabase-setup.sql file in Supabase SQL Editor.";
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
  $("#roblox-label").classList.toggle("hidden", !signup);
  $("#auth-roblox").classList.toggle("hidden", !signup);
  $("#auth-roblox").required = signup;
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
function safeFileName(name) { return String(name).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-90) || "image"; }
function randomKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(Number($("#key-groups").value) * 4);
  crypto.getRandomValues(bytes);
  const chars = [...bytes].map(b => alphabet[b % alphabet.length]);
  const groups = [];
  for (let i=0; i<chars.length; i+=4) groups.push(chars.slice(i,i+4).join(""));
  return "DS-" + groups.join("-");
}
function makeSaleCard(item) {
  const seller = item.seller_name || "Realm seller";
  const image = item.image_url ? `<img class="sale-image" src="${escapeHTML(item.image_url)}" alt="${escapeHTML(item.title)}" loading="lazy">` : '<div class="sale-image-placeholder">◇</div>';
  return `<article class="post-card sale-card">${image}<div class="sale-card-content"><div class="post-meta"><span class="category-tag">FOR SALE</span><span class="post-date">${escapeHTML(niceDate(item.created_at))}</span></div><h3>${escapeHTML(item.title)}</h3><p class="post-excerpt">${escapeHTML(item.description)}</p><div class="sale-price">${escapeHTML(item.price)}</div><div class="post-footer"><div class="author"><span class="author-avatar">${escapeHTML(seller.slice(0,1).toUpperCase())}</span><span>${escapeHTML(seller)}</span></div><span class="read-label">Marketplace</span></div></div></article>`;
}
async function loadSales() {
 const grid=$("#sales-grid");
 const {data,error}=await db.from("sales").select("id,title,description,price,image_url,seller_name,created_at").order("created_at",{ascending:false}).limit(40);
 if(error){grid.innerHTML="";$("#sales-empty").classList.remove("hidden");$("#sales-empty").querySelector("h3").textContent="Marketplace setup needed";$("#sales-empty").querySelector("p").textContent="Run supabase-setup.sql in Supabase SQL Editor to enable listings and image uploads.";$("#sales-notice").textContent=friendlyError(error);$("#sales-notice").classList.remove("hidden");return;}
 $("#sales-notice").classList.add("hidden");
 grid.innerHTML=(data||[]).map(makeSaleCard).join("");
 grid.classList.toggle("hidden",!data?.length);
 $("#sales-empty").classList.toggle("hidden",!!data?.length);
}
let activeScriptFilter = "All";
let favouriteScriptIds = new Set();
let activeAuthorId = null;
let activeDetailScript = null;
let cachedScripts = [];
function scriptCard(item) {
 const author = item.author_name || "Realm member";
 const fav = favouriteScriptIds.has(String(item.id));
 const code = escapeHTML(item.code || "");
 return `<article class="post-card script-card"><div class="post-meta"><span class="category-tag">${escapeHTML(item.category || "Other")}</span><span class="post-date">${escapeHTML(niceDate(item.created_at))}</span></div><button class="script-card-title" data-open-script="${escapeHTML(item.id)}">${escapeHTML(item.title)} <span>↗</span></button><p class="post-excerpt">${escapeHTML(item.description)}</p><div class="script-code-preview"><code>${code.slice(0,260)}${code.length>260?"…":""}</code></div><div class="post-footer"><button class="author script-author-link" data-author-id="${escapeHTML(item.author_id)}" data-author-name="${escapeHTML(author)}"><span class="author-avatar">${escapeHTML(author.slice(0,1).toUpperCase())}</span><span>${escapeHTML(author)}${item.roblox_username ? " · @" + escapeHTML(item.roblox_username) : ""}</span></button><button class="favorite-button ${fav?"is-favorite":""}" data-favorite-script="${escapeHTML(item.id)}" aria-label="${fav?"Remove from":"Add to"} favourites" title="${fav?"Remove from":"Add to"} favourites">${fav?"♥":"♡"} <span>${fav?"Saved":"Save"}</span></button></div><button class="script-view-button" data-open-script="${escapeHTML(item.id)}">View script details <span>→</span></button></article>`;
}
async function loadScripts() {
 const grid=$("#scripts-grid"), empty=$("#scripts-empty");
 if(activeScriptFilter==="Favorites" && !currentUser){grid.innerHTML="";grid.classList.add("hidden");empty.classList.remove("hidden");empty.querySelector("h3").textContent="Log in to see favourites.";empty.querySelector("p").textContent="Your saved scripts are linked to your account.";return;}
 if(currentUser){
  const {data,error}=await db.from("script_favorites").select("script_id").eq("user_id",currentUser.id);
  if(!error) favouriteScriptIds=new Set((data||[]).map(row=>String(row.script_id)));
 }
 const {data,error}=await db.from("scripts").select("id,title,description,code,category,author_id,author_name,roblox_username,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){grid.innerHTML="";grid.classList.add("hidden");empty.classList.remove("hidden");empty.querySelector("h3").textContent="Script library setup needed";empty.querySelector("p").textContent="Run the latest supabase-setup.sql in Supabase SQL Editor to enable scripts and favourites.";$("#scripts-notice").textContent=friendlyError(error);$("#scripts-notice").classList.remove("hidden");return;}
 $("#scripts-notice").classList.add("hidden");
 cachedScripts=data||[];
 let rows=cachedScripts;
 if(activeScriptFilter==="Favorites") rows=rows.filter(item=>favouriteScriptIds.has(String(item.id)));
 else if(activeScriptFilter!=="All") rows=rows.filter(item=>item.category===activeScriptFilter);
 if(activeAuthorId) rows=rows.filter(item=>String(item.author_id)===String(activeAuthorId));
 const search=($("#script-search")?.value||"").trim().toLowerCase();
 if(search) rows=rows.filter(item=>[item.title,item.description,item.author_name,item.roblox_username,item.category].some(value=>(value||"").toLowerCase().includes(search)));
 $("#script-result-count").textContent=rows.length+" script"+(rows.length===1?"":"s");
 grid.innerHTML=rows.map(scriptCard).join("");grid.classList.toggle("hidden",!rows.length);empty.classList.toggle("hidden",!!rows.length);
 if(!rows.length){empty.querySelector("h3").textContent=activeAuthorId?"This creator has no scripts yet.":activeScriptFilter==="Favorites"?"No favourites saved yet.":search?"No matching scripts.":"No scripts published yet.";empty.querySelector("p").textContent=activeAuthorId?"Check back later for new releases.":activeScriptFilter==="Favorites"?"Tap the heart on a script to keep it here.":search?"Try another search phrase.":"Be the first to publish a script for the community.";}
 if(activeAuthorId){$("#scripts .section-heading h2").innerHTML=`Creator profile<span class="green-period">.</span>`;$("#scripts .section-copy").textContent="Scripts published by "+(cachedScripts.find(item=>String(item.author_id)===String(activeAuthorId))?.author_name||"this creator");}else{$("#scripts .section-heading h2").innerHTML=`Script library<span class="green-period">.</span>`;$("#scripts .section-copy").textContent="Browse community scripts, save favourites, and publish your own."}
}
async function toggleFavourite(scriptId) {
 if(!currentUser){setAuthMode("signup");openModal("#auth-modal");$("#auth-message").textContent="Create an account or log in to save favourites.";return;}
 const id=Number(scriptId);
 if(favouriteScriptIds.has(String(id))){
  const {error}=await db.from("script_favorites").delete().eq("script_id",id).eq("user_id",currentUser.id);
  if(error){showToast(friendlyError(error));return;}
  favouriteScriptIds.delete(String(id));showToast("Removed from favourites.");
 } else {
  const {error}=await db.from("script_favorites").insert({script_id:id,user_id:currentUser.id});
  if(error){showToast(friendlyError(error));return;}
  favouriteScriptIds.add(String(id));showToast("Added to favourites.");
 }
 await loadScripts();
}
function openScriptDetails(scriptId) {
 const item=cachedScripts.find(script=>String(script.id)===String(scriptId));if(!item)return;activeDetailScript=item;
 $("#script-detail-title").textContent=item.title;$("#script-detail-description").textContent=item.description;$("#script-detail-code").textContent=item.code;$("#script-detail-meta").innerHTML=`<span class="category-tag">${escapeHTML(item.category)}</span><span class="post-date">${escapeHTML(niceDate(item.created_at))}</span>`;$("#script-detail-date").textContent=niceDate(item.created_at);$("#script-detail-author").textContent=(item.author_name||"Realm member")+(item.roblox_username?" · @"+item.roblox_username:"");
 const fav=favouriteScriptIds.has(String(item.id));$("#detail-favourite").textContent=fav?"♥ Saved to favourites":"♡ Save to favourites";openModal("#script-detail-modal");
}
async function copyActiveScript(){if(!activeDetailScript)return;try{await navigator.clipboard.writeText(activeDetailScript.code);$("#script-detail-message").textContent="Code copied to clipboard.";}catch{$("#script-detail-message").textContent="Clipboard access is blocked by your browser. Select the code and copy it manually.";}}
function openAuthorProfile(authorId){activeAuthorId=String(authorId);activeScriptFilter="All";$("#script-search").value="";$(".script-filters .filter").forEach(b=>b.classList.toggle("active",b.dataset.scriptFilter==="All"));loadScripts();location.hash="#scripts";}
function openScript() {
 if(!currentUser){setAuthMode("signup");openModal("#auth-modal");$("#auth-message").textContent="Create an account or log in to publish a script.";return;}
 $("#script-message").textContent="";openModal("#script-modal");
}
function openSale() {
 if(!currentUser){setAuthMode("signup");openModal("#auth-modal");$("#auth-message").textContent="Create an account or log in to publish a listing.";return;}
 $("#sale-message").textContent="";openModal("#sale-modal");
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
$("#sale-open").addEventListener("click", openSale);
$("#script-open").addEventListener("click", openScript);
$("#scripts-empty-open").addEventListener("click", openScript);
$("#scripts-grid").addEventListener("click", event => { const fav=event.target.closest("[data-favorite-script]");if(fav){toggleFavourite(fav.dataset.favoriteScript);return;}const script=event.target.closest("[data-open-script]");if(script){openScriptDetails(script.dataset.openScript);return;}const author=event.target.closest("[data-author-id]");if(author)openAuthorProfile(author.dataset.authorId); });
$("#script-search").addEventListener("input",()=>loadScripts());
$("#copy-script-code").addEventListener("click",copyActiveScript);
$("#detail-favourite").addEventListener("click",()=>{if(activeDetailScript)toggleFavourite(activeDetailScript.id);});
$("#script-detail-author").addEventListener("click",()=>{if(activeDetailScript){closeModal("#script-detail-modal");openAuthorProfile(activeDetailScript.author_id);}});
$("#nav-store-placeholder");
$("[data-script-filter]").forEach(button=>button.addEventListener("click",()=>{ $(".script-filters .filter").forEach(b=>b.classList.toggle("active",b===button)); activeScriptFilter=button.dataset.scriptFilter; loadScripts(); }));

$("#generate-key").addEventListener("click", () => { $("#generated-key").textContent=randomKey(); $("#key-message").textContent="New random key generated."; });
$("#copy-key").addEventListener("click", async () => {
 const value=$("#generated-key").textContent;
 if(value.includes("•")) { $("#key-message").textContent="Generate a key first."; return; }
 try { await navigator.clipboard.writeText(value); $("#key-message").textContent="Copied to clipboard."; }
 catch { $("#key-message").textContent="Select and copy the key manually."; }
});
$("#key-groups").addEventListener("change", () => { $("#key-message").textContent="Press Generate key to create a key in this format."; });

$("#auth-switch").addEventListener("click", () => setAuthMode(authMode === "signup" ? "login" : "signup"));
$("[data-close]").forEach(el => el.addEventListener("click", () => closeModal(el.dataset.close === "auth" ? "#auth-modal" : el.dataset.close === "sale" ? "#sale-modal" : el.dataset.close === "script" ? "#script-modal" : el.dataset.close === "script-detail" ? "#script-detail-modal" : "#post-modal")));
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal("#auth-modal"); closeModal("#post-modal"); closeModal("#sale-modal"); closeModal("#script-modal"); closeModal("#script-detail-modal"); } });
$("[data-category]").forEach(button => button.addEventListener("click", () => {
  $("[data-category]").forEach(b => b.classList.toggle("active", b === button));
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
    const robloxUsername = $("#auth-roblox").value.trim();
    if(!/^[A-Za-z0-9_]{3,32}$/.test(robloxUsername)){submit.disabled=false;submit.innerHTML='Create account <span>↗</span>';message.textContent="Enter a Roblox username of 3–32 letters, numbers, or underscores.";message.classList.add("error");return;}
    result = await db.auth.signUp({email, password, options:{data:{display_name:name,roblox_username:robloxUsername}, emailRedirectTo: location.origin + location.pathname}});
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
$("#sale-form").addEventListener("submit", async event => {
 event.preventDefault();
 if(!currentUser){closeModal("#sale-modal");openSale();return;}
 const file=$("#sale-image").files[0], message=$("#sale-message"), button=$("#sale-submit");
 message.textContent="";message.classList.remove("error");
 if(!file){message.textContent="Choose an image first.";message.classList.add("error");return;}
 if(file.size>5*1024*1024){message.textContent="Image must be 5 MB or smaller.";message.classList.add("error");return;}
 button.disabled=true;button.textContent="Uploading…";
 const objectPath=currentUser.id+"/"+Date.now()+"-"+safeFileName(file.name);
 const upload=await db.storage.from("product-images").upload(objectPath,file,{cacheControl:"3600",upsert:false,contentType:file.type});
 if(upload.error){button.disabled=false;button.textContent="Publish listing ↗";message.textContent=friendlyError(upload.error);message.classList.add("error");return;}
 const {data:publicData}=db.storage.from("product-images").getPublicUrl(objectPath);
 const {error}=await db.from("sales").insert({title:$("#sale-name").value.trim(),price:$("#sale-price").value.trim(),description:$("#sale-description").value.trim(),image_url:publicData.publicUrl,image_path:objectPath,seller_id:currentUser.id,seller_name:displayName(currentUser)});
 button.disabled=false;button.textContent="Publish listing ↗";
 if(error){message.textContent=friendlyError(error);message.classList.add("error");return;}
 $("#sale-form").reset();closeModal("#sale-modal");await loadSales();showToast("Your listing is published.");
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
  $("[data-category]").forEach(b => b.classList.toggle("active", b.dataset.category === "All"));
  await loadPosts(); showToast("Your post is live.");
});
(async function init() {
  const {data} = await db.auth.getSession();
  updateHeader(data.session?.user || null);
  db.auth.onAuthStateChange((_event, session) => updateHeader(session?.user || null));
  await loadPosts();
  await loadSales();
  await loadScripts();
})();
$("#script-form").addEventListener("submit",async event=>{
 event.preventDefault();
 if(!currentUser){closeModal("#script-modal");openScript();return;}
 const button=$("#script-submit"),message=$("#script-message");button.disabled=true;button.textContent="Publishing…";message.textContent="";message.classList.remove("error");
 const payload={title:$("#script-name").value.trim(),category:$("#script-category").value,description:$("#script-description").value.trim(),code:$("#script-code").value.trim(),author_id:currentUser.id,author_name:displayName(currentUser),roblox_username:robloxName(currentUser)};
 const {error}=await db.from("scripts").insert(payload);
 button.disabled=false;button.textContent="Publish script ↗";
 if(error){message.textContent=friendlyError(error);message.classList.add("error");return;}
 $("#script-form").reset();closeModal("#script-modal");activeScriptFilter="All";activeAuthorId=null;$("#script-search").value="";$("[data-script-filter]").forEach(b=>b.classList.toggle("active",b.dataset.scriptFilter==="All"));await loadScripts();showToast("Your script is published.");
});