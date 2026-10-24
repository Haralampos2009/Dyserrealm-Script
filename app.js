(()=>{"use strict";const URL="https://krractyhrblivsejrpdm.supabase.co",KEY="sb_publishable_tFu5Dd07GWrVAS7p6_rcFQ_rgKhNqSg",$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];let db,user=null,postsFilter="All",scriptFilter="All",scripts=[],saved=new Set(),activeScript=null,mode="signup",timer,avatarLookupToken=0,profileAvatarData="",avatarSaving=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),date=v=>{let d=new Date(v);return isNaN(d)? "":d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})},name=u=>u?.user_metadata?.display_name||u?.email?.split("@")[0]||"Realm member",roblox=()=>user?.user_metadata?.roblox_username||"";
function toast(s){let e=$("#toast");e.textContent=s;e.classList.remove("hidden");clearTimeout(timer);timer=setTimeout(()=>e.classList.add("hidden"),3500)}function notice(s){$("#notice").textContent=s;$("#notice").classList.toggle("hidden",!s)}function errMsg(e){let m=e?.message||"Something went wrong.";if(/Invalid login credentials/i.test(m))return"Email or password is incorrect.";if(/Email not confirmed/i.test(m))return"Confirm your email using the link we sent.";if(/User already registered/i.test(m))return"That email already has an account. Log in instead.";if(/column .* does not exist|Could not find the .* column/i.test(m))return"Script image/price fields are not set up yet. Run script-image-upload-migration.sql and script-price-migration.sql in Supabase SQL Editor.";if(/Bucket not found|bucket.*not found|storage.objects/i.test(m))return"Image storage is not set up yet. Run script-image-upload-migration.sql in Supabase SQL Editor.";if(/row-level security|permission denied/i.test(m))return"Database permissions missing. Run script-image-upload-migration.sql in Supabase SQL Editor, then retry.";if(/Failed to fetch|NetworkError/i.test(m))return"Cannot reach Supabase. Check the project URL, public key and internet.";if(/relation .* does not exist|Could not find the table/i.test(m))return"Database table missing. Run supabase-setup.sql in Supabase SQL Editor.";return m}
function open(id){$("#"+id).classList.remove("hidden");document.body.style.overflow="hidden"}function close(id){$("#"+id).classList.add("hidden");if($$(".modal:not(.hidden)").length===0)document.body.style.overflow=""}function requireUser(){if(user)return true;setMode("signup");open("auth-modal");toast("Log in or create an account to continue.");return false}
function setMode(m){mode=m;let up=m==="signup";$("#auth-title").textContent=up?"JOIN THE REALM.":"WELCOME BACK.";$("#auth-subtitle").textContent=up?"Create an account to publish and save.":"Log in to continue where you left off.";$("#name-label").classList.toggle("hidden",!up);$("#auth-name").required=up;$("#roblox-label").classList.toggle("hidden",!up);$("#auth-message").textContent="";$("#auth-submit").textContent=up?"CREATE ACCOUNT ↗":"LOG IN ↗";$("#auth-switch").textContent=up?"LOG IN":"CREATE ACCOUNT";$("#switch-copy").textContent=up?"Already connected?":"New to the realm?"}
async function lookupRobloxAvatar(username,userId,token,label){try{const r=await fetch("https://users.roblox.com/v1/usernames/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernames:[username],excludeBannedUsers:true})});if(!r.ok)throw new Error("Roblox lookup failed");const j=await r.json(),profile=j.data?.[0];if(!profile?.id)return;const t=await fetch("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds="+encodeURIComponent(profile.id)+"&size=150x150&format=Png&isCircular=true");if(!t.ok)throw new Error("Roblox avatar unavailable");const thumbs=await t.json(),url=thumbs.data?.[0]?.imageUrl;if(!url||token!==avatarLookupToken||user?.id!==userId)return;const img=label.querySelector(".roblox-avatar");if(!img)return;img.onload=()=>{if(token===avatarLookupToken&&user?.id===userId){img.classList.add("loaded");const fallback=label.querySelector(".roblox-avatar-fallback");if(fallback)fallback.classList.add("hidden")}};img.onerror=()=>{};img.src=url}catch(e){/* Keep the profile initials visible if Roblox is unavailable. */}}
function header(u){user=u;$("#settings-open").classList.toggle("hidden",!u);const label=$("#user-label");label.replaceChildren();const token=++avatarLookupToken;if(u){const wrap=document.createElement("span");wrap.className="user-profile";const avatar=document.createElement("span");avatar.className="roblox-avatar-wrap";const fallback=document.createElement("span");fallback.className="roblox-avatar-fallback";fallback.textContent=(name(u).trim()[0]||"R").toUpperCase();const img=document.createElement("img");img.className="roblox-avatar";img.alt="Profile avatar";img.width=36;img.height=36;avatar.append(fallback,img);const savedAvatar=String(u.user_metadata?.avatar_url||"");img.onload=()=>{img.classList.add("loaded");fallback.classList.add("hidden")};img.onerror=()=>{img.removeAttribute("src");img.classList.remove("loaded");fallback.classList.remove("hidden")};if(savedAvatar.startsWith("data:image/")||savedAvatar.startsWith("https://"))img.src=savedAvatar;const text=document.createElement("span");text.className="user-profile-name";text.textContent=name(u);wrap.append(avatar,text);label.append(wrap);const username=String(u.user_metadata?.roblox_username||"").trim();/* Roblox username lookup is skipped: Roblox blocks browser requests from GitHub Pages via CORS. */}$("#login-open").classList.toggle("hidden",!!u);$("#signup-open").classList.toggle("hidden",!!u);$("#logout-button").classList.toggle("hidden",!u)}
async function loadHeaderAvatar(u){if(!u?.id||!db)return;try{const{data,error}=await db.from("realm_profiles").select("avatar_url").eq("user_id",u.id).maybeSingle();if(error||user?.id!==u.id||!data)return;const current={...user,user_metadata:{...(user.user_metadata||{}),avatar_url:data.avatar_url||""}};user=current;header(current)}catch(e){/* Keep initials available if avatar lookup fails. */}}
function postCard(p){let n=p.author_name||"Realm member",body=p.body||"";return'<article class="post-card"><div class="post-meta"><span class="category-tag">'+esc(p.category)+'</span><span class="post-date">'+esc(date(p.created_at))+'</span></div><h3>'+esc(p.title)+'</h3><p class="post-excerpt">'+esc(body.length>210?body.slice(0,210).trimEnd()+"…":body)+'</p><div class="post-footer"><span class="author"><span class="author-avatar">'+esc(n[0]?.toUpperCase())+'</span> '+esc(n)+'</span><span class="read-label">TRANSMISSION ↗</span></div></article>'}
async function loadPosts(){let g=$("#posts-grid");g.innerHTML='<p class="loading">CONNECTING TO NETWORK...</p>';let q=db.from("posts").select("id,title,body,category,author_name,created_at").order("created_at",{ascending:false}).limit(60);if(postsFilter!=="All")q=q.eq("category",postsFilter);let{data,error}=await q;if(error){g.innerHTML="";notice(errMsg(error));$("#empty-state").classList.add("hidden");return}notice("");g.innerHTML=(data||[]).map(postCard).join("");$("#empty-state").classList.toggle("hidden",!!data?.length)}
function scriptImages(s){return Array.isArray(s?.images)?s.images.filter(x=>x&&typeof x.url==="string"&&x.url.startsWith("https://")):[]}
function displayPriceData(s){const meta=Array.isArray(s?.images)?s.images.find(x=>x&&x._displayPrice)?. _displayPrice:null;const amount=s?.price??meta?.amount??0,currency=s?.price_currency||meta?.currency||"Robux";return{amount:Number(amount)||0,currency}}
function formatPrice(s){const d=displayPriceData(s),amount=d.amount,currency=d.currency;if(!Number.isFinite(amount)||amount<=0)return"FREE";if(currency==="Robux")return"R$ "+Math.round(amount).toLocaleString("en-US");if(currency==="USD")return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount);if(currency==="EUR")return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(amount);return amount.toFixed(2)+" "+currency}
function isMissingSchemaColumns(error){const m=String(error?.message||error||"");return /column .* does not exist|could not find (?:the )?.*column|schema cache.*column|price_currency|images.*column/i.test(m)}
function displayPriceData(s){const meta=Array.isArray(s?.images)?s.images.find(x=>x&&x._displayPrice)?._displayPrice:null;const amount=s?.price??meta?.amount??0,currency=s?.price_currency||meta?.currency||"Robux";return{amount:Number(amount)||0,currency}}
function formatPrice(s){const d=displayPriceData(s),amount=d.amount,currency=d.currency;if(!Number.isFinite(amount)||amount<=0)return"FREE";if(currency==="Robux")return"R$ "+Math.round(amount).toLocaleString("en-US");if(currency==="USD")return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount);if(currency==="EUR")return new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(amount)}
function scriptCard(s){let is=saved.has(s.id),pics=scriptImages(s),photo=pics.length?'<div class="script-card-image"><img src="'+esc(pics[0].url)+'" alt="'+esc(s.title+" screenshot")+'" loading="lazy">'+(pics.length>1?'<span class="image-count">+'+(pics.length-1)+' photos</span>':"")+"</div>":"";return '<article class="script-card">'+photo+'<div class="script-card-content"><div class="script-meta"><span class="category-tag">'+esc(s.category)+'</span><span class="post-date">'+esc(date(s.created_at))+'</span></div><div class="script-price '+(Number(s.price||0)===0?'is-free':'')+'">'+esc(formatPrice(s))+'</div><h3>'+esc(s.title)+'</h3><p class="script-description">'+esc((s.description||"").slice(0,180))+'</p><span class="script-code-badge">⌘ CODE FILE</span><div class="script-footer"><span>'+esc(s.author_name||"Realm member")+'</span><div class="script-actions"><button class="mini-btn" data-view="'+s.id+'">OPEN ↗</button><button class="mini-btn '+(is?"saved":"")+'" data-save="'+s.id+'">'+(is?"★ SAVED":"☆ SAVE")+'</button>'+(s.author_id===user?.id?'<button class="mini-btn delete-script-btn" data-delete-script="'+s.id+'" title="Delete your script">DELETE</button>':"")+'</div></div></div></article>'}
async function loadSaved(){saved=new Set();if(!user)return;let{data,error}=await db.from("script_favorites").select("script_id").eq("user_id",user.id);if(!error)(data||[]).forEach(x=>saved.add(Number(x.script_id)))}
async function loadScripts(){
 const queries=[
  "id,title,description,code,category,author_id,author_name,roblox_username,images,price,price_currency,created_at",
  "id,title,description,code,category,author_id,author_name,roblox_username,images,created_at",
  "id,title,description,code,category,author_id,author_name,created_at",
  "id,title,description,code,category,author_id,created_at",
  "id,title,description,code,category,created_at"
 ];
 let result;
 for(const columns of queries){
  result=await db.from("scripts").select(columns).order("created_at",{ascending:false}).limit(100);
  if(!result.error)break;
  if(!isMissingSchemaColumns(result.error))break;
 }
 const{data,error}=result;
 if(error){$("#scripts-grid").innerHTML="";$("#scripts-empty").classList.remove("hidden");notice(errMsg(error));return}
 scripts=(data||[]).map(s=>({...s,author_name:s.author_name||"Realm member",roblox_username:s.roblox_username||"",images:Array.isArray(s.images)?s.images:[],price:Number(s.price||0),price_currency:s.price_currency||"Robux"}));
 renderScripts()
}
function renderScripts(){let q=$("#script-search").value.trim().toLowerCase(),list=scripts.filter(s=>(scriptFilter==="All"||(scriptFilter==="Saved"?saved.has(s.id):scriptFilter==="Mine"?s.author_id===user?.id:s.category===scriptFilter))&&(!q||[s.title,s.description,s.author_name,s.category,s.code].join(" ").toLowerCase().includes(q)));$("#scripts-grid").innerHTML=list.map(scriptCard).join("");$("#script-result-count").textContent=list.length+" FILE"+(list.length===1?"":"S");$("#scripts-empty").classList.toggle("hidden",!!list.length)}
async function refresh(){await loadPosts();await loadSaved();await loadScripts()}
function showScript(id){let s=scripts.find(x=>Number(x.id)===Number(id));if(!s)return;activeScript=s;$("#detail-title").textContent=s.title;$("#detail-price").textContent=formatPrice(s);$("#detail-price").classList.toggle("is-free",Number(s.price||0)===0);$("#detail-description").textContent=(s.category||"Other")+" // by "+(s.author_name||"Realm member")+" — "+s.description;$("#detail-images").innerHTML=scriptImages(s).map((p,i)=>'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(p.url)+'" alt="'+esc(s.title+" image "+(i+1))+'" loading="lazy"></a>').join("");$("#detail-code").textContent=s.code||"";$("#detail-delete").classList.toggle("hidden",s.author_id!==user?.id);$("#comment-form").classList.toggle("hidden",!user);$("#comments-signin").classList.toggle("hidden",!!user);$("#comment-message").textContent="";$("#comment-body").value="";open("detail-modal");loadComments(s.id)}

async function loadComments(scriptId){
 const list=$("#comments-list");list.innerHTML='<p class="loading">LOADING COMMENTS…</p>';
 const{data,error}=await db.from("script_comments").select("id,script_id,user_id,author_name,body,created_at").eq("script_id",scriptId).order("created_at",{ascending:true}).limit(100);
 if(error){list.innerHTML='<p class="comment-error">Comments are not configured yet. The site owner needs to run <code>script-comments-settings.sql</code> in Supabase SQL Editor.</p>';return}
 if(!data?.length){list.innerHTML='<p class="comments-empty">NO COMMENTS YET — START THE CONVERSATION.</p>';return}
 list.innerHTML=data.map(c=>'<article class="comment-item"><div class="comment-top"><strong>'+esc(c.author_name||"Realm member")+'</strong><time>'+esc(date(c.created_at))+'</time>'+(user&&c.user_id===user.id?'<button type="button" class="mini-btn comment-delete" data-delete-comment="'+esc(c.id)+'">DELETE</button>':"")+'</div><p>'+esc(c.body)+'</p></article>').join("");
}
function renderSettingsAvatar(){const preview=$("#settings-avatar-preview");if(!preview)return;preview.replaceChildren();if(profileAvatarData){const img=document.createElement("img");img.src=profileAvatarData;img.alt="Profile avatar preview";preview.append(img)}else{const fallback=document.createElement("span");fallback.textContent=(($("#settings-profile-display-name")?.value||name()).trim()[0]||"R").toUpperCase();preview.append(fallback)}}
async function prepareAvatar(file){
 if(!file)throw new Error("Choose an image first.");
 if(file.size>10*1024*1024)throw new Error("Image must be 10 MB or smaller.");
 const allowed=["image/png","image/jpeg","image/webp","image/gif"];
 if(!allowed.includes(file.type))throw new Error("Choose a PNG, JPG, WEBP or GIF image.");
 // Preserve animated GIFs. Static formats are centered and resized to a square JPEG thumbnail.
 if(file.type==="image/gif"){
  const header=new Uint8Array(await file.slice(0,6).arrayBuffer());
  if(String.fromCharCode(...header)!=="GIF87a"&&String.fromCharCode(...header)!=="GIF89a")throw new Error("This GIF file is invalid.");
  return {blob:file,extension:"gif",contentType:"image/gif",animated:true};
 }
 const img=new Image(),url=URL.createObjectURL(file);
 try{
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Could not read this image."));img.src=url});
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>12000||img.naturalHeight>12000)throw new Error("Image dimensions are invalid or too large.");
  const size=512,canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Could not process this image.");
  const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
  ctx.drawImage(img,sx,sy,side,side,0,0,size,size);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.88));
  if(!blob)throw new Error("Could not create the avatar thumbnail.");
  return {blob,extension:"jpg",contentType:"image/jpeg",animated:false};
 }finally{URL.revokeObjectURL(url)}
}

async function loadSettingsProfile(){if(!user)return;if(!db?.auth){$("#settings-profile-message").textContent="Supabase is still loading. Refresh the page and try again.";return;}const msg=$("#settings-profile-message");msg.textContent="LOADING PROFILE…";const{data,error}=await db.from("realm_profiles").select("display_name,roblox_username,favorite_game,games,bio,avatar_url").eq("user_id",user.id).maybeSingle();if(error){msg.textContent=/avatar_url|column/i.test(error.message||"")?"Run the updated profiles-setup.sql in Supabase SQL Editor to enable avatar storage.":"Run profiles-setup.sql in Supabase SQL Editor if the profile table is not installed.";return}profileAvatarData=data?.avatar_url||user.user_metadata?.avatar_url||"";$("#settings-profile-display-name").value=data?.display_name||name();$("#settings-profile-roblox").value=data?.roblox_username||roblox();$("#settings-profile-favorite-game").value=data?.favorite_game||"";$("#settings-profile-games").value=data?.games||"";$("#settings-profile-bio").value=data?.bio||"";renderSettingsAvatar();msg.textContent=""}
async function persistAvatarImmediately(prepared){if(avatarSaving)throw new Error("An avatar update is already in progress. Please wait.");avatarSaving=true;const saveButton=$("#settings-profile-save"),fileInput=$("#settings-avatar-file"),removeButton=$("#settings-avatar-remove");if(saveButton)saveButton.disabled=true;if(fileInput)fileInput.disabled=true;if(removeButton)removeButton.disabled=true;try{
 if(!requireUser())throw new Error("Log in to save your avatar.");
 if(!db?.auth)throw new Error("Supabase is not ready. Refresh and try again.");
 const msg=$("#settings-profile-message");
 let avatarUrl="";
 if(prepared){
  msg.textContent="UPLOADING AVATAR…";
  const path=user.id+"/avatar-"+Date.now()+"."+prepared.extension;
  const{error:uploadError}=await db.storage.from("profile-avatars").upload(path,prepared.blob,{upsert:false,contentType:prepared.contentType,cacheControl:"3600"});
  if(uploadError)throw new Error("Avatar upload failed: "+uploadError.message);
  const publicResult=db.storage.from("profile-avatars").getPublicUrl(path);
  avatarUrl=publicResult.data?.publicUrl||"";
  if(!avatarUrl)throw new Error("Supabase did not return a public avatar URL.");
 }else{
  // Keep the previous image only if the user explicitly cancelled; remove button intentionally clears it.
  avatarUrl="";
 }
 const row={user_id:user.id,display_name:($("#settings-profile-display-name")?.value.trim()||name()),roblox_username:$("#settings-profile-roblox")?.value.trim()||roblox(),favorite_game:$("#settings-profile-favorite-game")?.value.trim()||"",games:$("#settings-profile-games")?.value.trim()||"",bio:$("#settings-profile-bio")?.value.trim()||"",avatar_url:avatarUrl,updated_at:new Date().toISOString()};
 const{data:savedRow,error}=await db.from("realm_profiles").upsert(row,{onConflict:"user_id"}).select("user_id,avatar_url").single();
 if(error)throw new Error("Avatar uploaded but profile database update failed: "+error.message);
 if(!savedRow||savedRow.user_id!==user.id)throw new Error("Supabase did not confirm saving the avatar.");
 profileAvatarData=savedRow.avatar_url||"";
 const{data,error:metaError}=await db.auth.updateUser({data:{...(user.user_metadata||{}),display_name:row.display_name,roblox_username:row.roblox_username,avatar_url:profileAvatarData}});
 if(data?.user){user=data.user;header(user)}else{user={...user,user_metadata:{...(user.user_metadata||{}),display_name:row.display_name,roblox_username:row.roblox_username,avatar_url:profileAvatarData}};header(user)}
 renderSettingsAvatar();
 if(metaError)msg.textContent="AVATAR SAVED TO PROFILE. Account display sync warning: "+metaError.message;
 else msg.textContent=prepared?"AVATAR UPDATED AND SAVED AUTOMATICALLY.":"AVATAR REMOVED AND SAVED AUTOMATICALLY.";
 // Re-render current site data so avatar/name changes appear without a reload.
 await refresh();
}finally{avatarSaving=false;if(saveButton)saveButton.disabled=false;if(fileInput)fileInput.disabled=false;if(removeButton)removeButton.disabled=false;}
}
async function saveSettingsProfile(){
 if(avatarSaving){$("#settings-profile-message").textContent="Please wait until the avatar upload finishes.";return;}
 if(!requireUser())return;
 if(!db?.auth){$("#settings-profile-message").textContent="Supabase is not ready. Refresh and try again.";return}
 const btn=$("#settings-profile-save"),msg=$("#settings-profile-message");
 const displayName=$("#settings-profile-display-name").value.trim();
 if(displayName.length<2){msg.textContent="Display name must contain at least 2 characters.";return}
 btn.disabled=true;msg.textContent="SAVING PROFILE…";
 try{
  const row={user_id:user.id,display_name:displayName,roblox_username:$("#settings-profile-roblox").value.trim(),favorite_game:$("#settings-profile-favorite-game").value.trim(),games:$("#settings-profile-games").value.trim(),bio:$("#settings-profile-bio").value.trim(),avatar_url:profileAvatarData||"",updated_at:new Date().toISOString()};
  const{data:savedRow,error}=await db.from("realm_profiles").upsert(row,{onConflict:"user_id"}).select("user_id,avatar_url").single();
  if(error)throw error;if(!savedRow||savedRow.user_id!==user.id)throw new Error("Supabase did not confirm saving the profile.");
  profileAvatarData=savedRow.avatar_url||"";
  const{data,error:metaError}=await db.auth.updateUser({data:{...(user.user_metadata||{}),display_name:row.display_name,roblox_username:row.roblox_username,avatar_url:profileAvatarData}});
  if(data?.user){user=data.user;header(user)}else{user={...user,user_metadata:{...(user.user_metadata||{}),display_name:row.display_name,roblox_username:row.roblox_username,avatar_url:profileAvatarData}};header(user)}
  renderSettingsAvatar();await refresh();
  msg.textContent=metaError?"PROFILE SAVED. Account display sync warning: "+metaError.message:"PUBLIC PROFILE SAVED SUCCESSFULLY.";
  toast("Profile saved.");
 }catch(e){const m=String(e?.message||"");msg.textContent=/row-level security|permission denied|42501/i.test(m)?"SAVE FAILED: Supabase is blocking this write. Run profiles-setup.sql in Supabase SQL Editor and retry.":"SAVE FAILED: "+(e?.message||errMsg(e))}
 finally{btn.disabled=false}
}
async function saveDisplayName(){
 if(!requireUser())return;
 const value=$("#settings-name").value.trim(),msg=$("#settings-name-message"),btn=$("#settings-name-save");
 if(value.length<2){msg.textContent="Use at least 2 characters.";return}
 btn.disabled=true;msg.textContent="SAVING PROFILE…";
 try{
  const{data,error}=await db.auth.updateUser({data:{...user.user_metadata,display_name:value}});
  if(error)throw error;
  user=data.user;header(user);
  const changes=await Promise.all([
   db.from("scripts").update({author_name:value}).eq("author_id",user.id),
   db.from("posts").update({author_name:value}).eq("author_id",user.id),
   db.from("script_comments").update({author_name:value}).eq("user_id",user.id)
  ]);
  const failed=changes.find(x=>x.error);
  await refresh();
  if(activeScript){activeScript=scripts.find(x=>Number(x.id)===Number(activeScript.id))||activeScript;$("#detail-description").textContent=(activeScript.category||"Other")+" // by "+(activeScript.author_name||"Realm member")+" — "+activeScript.description;await loadComments(activeScript.id)}
  msg.textContent=failed?"Name saved to your account. Some older content may need database permissions to update.":"DISPLAY NAME UPDATED.";
  toast(failed?"Profile saved; some older author labels could not be updated.":"Display name updated.");
 }catch(e){msg.textContent=errMsg(e)}finally{btn.disabled=false}
}
async function savePassword(){
 if(!requireUser())return;
 const p=$("#settings-password").value,c=$("#settings-password-confirm").value,msg=$("#settings-password-message"),btn=$("#settings-password-save");
 if(p.length<6){msg.textContent="Password must be at least 6 characters.";return}
 if(p!==c){msg.textContent="The passwords do not match.";return}
 btn.disabled=true;msg.textContent="UPDATING PASSWORD…";
 try{const{error}=await db.auth.updateUser({password:p});if(error)throw error;$("#settings-password").value="";$("#settings-password-confirm").value="";msg.textContent="PASSWORD UPDATED.";toast("Password changed successfully.")}catch(e){msg.textContent=errMsg(e)}finally{btn.disabled=false}
}

 async function loadRoleSettings(){
  const area=$("#settings-role-area"),status=$("#settings-role-status"),manager=$("#settings-role-manager");
  if(!user){area.hidden=true;return}
  area.hidden=false;manager.hidden=true;status.textContent="CHECKING YOUR ROLE…";
  const{data,error}=await db.from("site_roles").select("role").eq("user_id",user.id).maybeSingle();
  if(error){status.textContent="ROLE CHECK UNAVAILABLE. Run role-management-setup.sql in Supabase SQL Editor.";return}
  const role=data?.role||"user";
  status.textContent="YOUR ROLE: "+(role==="creator"?"✦ CREATOR":role==="admin"?"ADMIN":"MEMBER / NO SPECIAL ROLE");status.dataset.role=role;
  if(!["creator","admin"].includes(role))return;manager.hidden=false;
  if(role==="admin"){$("#role-assign-button").hidden=true;$("#role-target-email").disabled=true;$("#role-target-role").disabled=true;$("#settings-role-list").hidden=true}else await loadRoleAccounts();
  await Promise.all([loadBanList(),loadWarningList()]);
 }
 async function loadRoleAccounts(){
  const list=$("#settings-role-list");list.innerHTML='<p class="loading">LOADING ACCOUNTS…</p>';
  const{data,error}=await db.rpc("creator_list_site_roles");
  if(error){list.textContent="Could not load accounts. Run role-management-setup.sql in Supabase SQL Editor. "+error.message;return}
  if(!data?.length){list.textContent="No registered accounts found.";return}
  list.innerHTML=data.map(row=>{const role=row.role||"user",isSelf=row.user_id===user?.id;return '<article class="settings-role-row"><div class="settings-role-account"><strong>'+esc(row.email||"Unknown email")+'</strong><span class="settings-role-chip '+esc(role)+'">'+esc(role.toUpperCase())+'</span></div><div class="settings-role-actions"><button type="button" class="mini-btn" data-role-target="'+esc(row.email||"")+'" data-role-value="admin" '+(isSelf||role==="admin"?'disabled':'')+'>MAKE ADMIN</button><button type="button" class="mini-btn" data-role-target="'+esc(row.email||"")+'" data-role-value="creator" '+(isSelf||role==="creator"?'disabled':'')+'>MAKE CREATOR</button><button type="button" class="mini-btn delete-script-btn" data-role-target="'+esc(row.email||"")+'" data-role-value="user" '+(isSelf||role==="user"?'disabled':'')+'>REMOVE</button></div></article>'}).join("");
 }
 async function loadBanList(){
  const list=$("#settings-ban-list");list.innerHTML='<p class="loading">LOADING BANS…</p>';
  const{data,error}=await db.rpc("creator_list_site_bans");
  if(error){list.textContent="Ban tools not installed. Run ban-management-setup.sql in Supabase SQL Editor. "+error.message;return}
  const bans=(data||[]).filter(row=>row.ban_until===null||new Date(row.ban_until)>new Date());
  if(!bans.length){list.innerHTML='<p class="loading">NO ACTIVE BANS.</p>';return}
  list.innerHTML=bans.map(row=>'<article class="settings-role-row"><div class="settings-role-account"><strong>'+esc(row.email||"Unknown email")+'</strong><span class="settings-role-chip admin">'+(row.ban_until===null?"PERMANENT":"UNTIL "+esc(new Date(row.ban_until).toLocaleString()))+'</span><small>'+esc(row.reason||"No reason provided")+'</small></div><div class="settings-role-actions"><button type="button" class="mini-btn" data-unban-email="'+esc(row.email||"")+'">UNBAN</button></div></article>').join("");
 }
 async function loadWarningList(){
  const list=$("#settings-warning-list");list.innerHTML='<p class="loading">LOADING WARNINGS…</p>';
  const{data,error}=await db.rpc("creator_list_site_warnings");
  if(error){list.textContent="Warning tools not installed. Run the updated ban-management-setup.sql in Supabase SQL Editor. "+error.message;return}
  if(!data?.length){list.innerHTML='<p class="loading">NO WARNINGS RECORDED.</p>';return}
  list.innerHTML=data.map(row=>'<article class="settings-role-row"><div class="settings-role-account"><strong>'+esc(row.email||"Unknown email")+'</strong><span class="settings-role-chip admin">'+Number(row.warning_count||0)+' / 3 WARNINGS</span><small>Next automatic ban: '+esc(row.next_ban_label||"1 DAY")+(row.ban_level>0?' · escalation level '+Number(row.ban_level+1):'')+'</small>'+(row.latest_reason?'<small>Last warning: '+esc(row.latest_reason)+'</small>':'')+'</div></article>').join("");
 }
 async function issueSiteWarning(){
  const email=$("#warning-target-email").value.trim(),reason=$("#warning-reason").value.trim(),msg=$("#settings-warning-message"),button=$("#warning-issue-button");
  if(!email||!email.includes("@")){msg.textContent="Enter the account email.";return}
  if(!reason){msg.textContent="Enter a reason for the warning.";return}
  if(email.toLowerCase()===user?.email?.toLowerCase()){msg.textContent="You cannot warn your own account.";return}
  button.disabled=true;msg.textContent="ISSUING WARNING…";
  try{
   const{data,error}=await db.rpc("creator_issue_site_warning",{target_email:email,warning_reason:reason});
   if(error)throw error;
   const result=Array.isArray(data)?data[0]:data;
   if(result?.auto_banned)msg.textContent="3 WARNINGS REACHED. AUTOMATIC BAN APPLIED: "+(result.ban_until?new Date(result.ban_until).toLocaleString():"PERMANENT BAN")+".";
   else msg.textContent="WARNING ISSUED. ACCOUNT NOW HAS "+Number(result?.warning_count||0)+" / 3 WARNINGS.";
   $("#warning-target-email").value="";$("#warning-reason").value="";
   await Promise.all([loadWarningList(),loadBanList()]);
   toast(result?.auto_banned?"Three warnings reached; automatic ban applied.":"Warning issued.");
  }catch(e){msg.textContent=/function .* does not exist|schema cache/i.test(e.message||"")?"Run the updated ban-management-setup.sql in Supabase SQL Editor.":e.message||"Could not issue warning."}
  finally{button.disabled=false}
 }
 async function applySiteBan(){
  const email=$("#ban-target-email").value.trim(),duration=$("#ban-duration").value,reason=$("#ban-reason").value.trim(),msg=$("#settings-ban-message"),button=$("#ban-apply-button");
  if(!email||!email.includes("@")){msg.textContent="Enter the account email.";return}
  if(email.toLowerCase()===user?.email?.toLowerCase()){msg.textContent="You cannot ban your own account.";return}
  button.disabled=true;msg.textContent="APPLYING BAN…";
  try{const{error}=await db.rpc("creator_set_site_ban",{target_email:email,duration_minutes:duration==="permanent"?null:Number(duration),ban_reason:reason||null});if(error)throw error;msg.textContent="BAN APPLIED TO "+email.toUpperCase()+".";$("#ban-target-email").value="";$("#ban-reason").value="";await loadBanList();toast("Account ban updated.")}
  catch(e){msg.textContent=/function .* does not exist|schema cache/i.test(e.message||"")?"Run ban-management-setup.sql in Supabase SQL Editor.":e.message||"Could not apply ban."}
  finally{button.disabled=false}
 }
 async function removeSiteBan(email){
  const msg=$("#settings-ban-message");if(!confirm("Remove the ban for "+email+"?"))return;msg.textContent="REMOVING BAN…";
  const{error}=await db.rpc("creator_set_site_ban",{target_email:email,duration_minutes:0,ban_reason:null});
  if(error){msg.textContent=error.message||"Could not remove ban.";return}
  msg.textContent="BAN REMOVED FOR "+email.toUpperCase()+".";await loadBanList();toast("Account unbanned.");
 }
 async function assignSiteRole(email,role){
  const msg=$("#settings-role-message"),button=$("#role-assign-button");
  email=email.trim();
  if(!email||!email.includes("@")){msg.textContent="Enter the account email.";return}
  if(!["creator","admin","user"].includes(role)){msg.textContent="Choose a valid role.";return}
  button.disabled=true;msg.textContent="UPDATING ROLE…";
  try{
   const{error}=await db.rpc("creator_set_site_role",{target_email:email,target_role:role});
   if(error)throw error;
   msg.textContent="ROLE UPDATED FOR "+email.toUpperCase()+".";
   $("#role-target-email").value="";
   await loadRoleAccounts();
   toast("Account role updated.");
  }catch(e){msg.textContent=/function .* does not exist|schema cache/i.test(e.message||"")?"Role tools are not installed yet. Run role-management-setup.sql in Supabase SQL Editor.":e.message||"Could not update role."}
  finally{button.disabled=false}
 }
 async function toggleSaved(id){if(!requireUser())return;id=Number(id);if(saved.has(id)){let{error}=await db.from("script_favorites").delete().eq("user_id",user.id).eq("script_id",id);if(error)return toast(errMsg(error));saved.delete(id);toast("Removed from saved scripts.")}else{let{error}=await db.from("script_favorites").insert({user_id:user.id,script_id:id});if(error)return toast(errMsg(error));saved.add(id);toast("Script saved to your account.")}renderScripts()}
async function deleteScript(id){if(!requireUser())return;const item=scripts.find(x=>Number(x.id)===Number(id));if(!item||item.author_id!==user.id)return toast("You can delete only scripts you published.");if(!confirm('Delete "'+item.title+'" and its images? This cannot be undone.'))return;const{data,error}=await db.from("scripts").delete().eq("id",item.id).eq("author_id",user.id).select("id");if(error)return toast(errMsg(error));if(!data?.length)return toast("Script was not deleted. Log in as its author and try again.");const paths=scriptImages(item).map(p=>p.path).filter(p=>typeof p==="string"&&p.startsWith(user.id+"/"));let cleanupFailed=false;if(paths.length){const{error:imageError}=await db.storage.from("script-images").remove(paths);cleanupFailed=!!imageError}if(activeScript&&Number(activeScript.id)===Number(item.id)){close("detail-modal");activeScript=null}await loadSaved();await loadScripts();toast(cleanupFailed?"Script deleted, but some images could not be removed.":"Your script was deleted.")}
function genKey(){let n=Math.max(3,Math.min(6,Number($("#key-groups").value)||4)),prefix=$("#key-prefix").value.replace(/[^a-z0-9]/gi,"").slice(0,10).toUpperCase(),alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",bytes=new Uint8Array(n*4);if(!crypto?.getRandomValues)return toast("Secure random generator unavailable.");crypto.getRandomValues(bytes);let parts=[];for(let i=0;i<bytes.length;i+=4)parts.push([...bytes.slice(i,i+4)].map(b=>alphabet[b%alphabet.length]).join(""));$("#key-output").textContent=(prefix?prefix+"-":"")+parts.join("-");$("#key-message").textContent="GENERATED LOCALLY // NOT SERVER-VALIDATED"}
const MAX_SCRIPT_IMAGES=4,MAX_SCRIPT_IMAGE_BYTES=5*1024*1024;let imagePreviewUrls=[];
function clearImagePreviews(){imagePreviewUrls.forEach(u=>URL.revokeObjectURL(u));imagePreviewUrls=[];const p=$("#script-image-preview");if(p)p.innerHTML=""}
function validateScriptImages(files){if(files.length>MAX_SCRIPT_IMAGES)return"Choose up to 4 images.";for(const file of files){if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type))return"Use JPG, PNG, WEBP or GIF images only.";if(file.size>MAX_SCRIPT_IMAGE_BYTES)return"Each image must be 5 MB or smaller."}return""}
function renderImagePreviews(){clearImagePreviews();const input=$("#script-images"),preview=$("#script-image-preview"),files=[...input.files],problem=validateScriptImages(files);if(problem){input.value="";preview.textContent=problem;return}files.forEach(file=>{const url=URL.createObjectURL(file);imagePreviewUrls.push(url);const item=document.createElement("div");item.className="image-preview-item";const img=document.createElement("img");img.src=url;img.alt=file.name;const caption=document.createElement("span");caption.textContent=file.name;item.append(img,caption);preview.append(item)})}
function setActiveTab(){const current=location.pathname.split("/").pop()||"index.html";$$(".site-tabs a").forEach(a=>{const active=(a.getAttribute("href")||"").split("#")[0]===current;a.classList.toggle("active-tab",active);if(active)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});document.querySelector(".topbar nav")?.classList.remove("open")}
function initButtonColorSettings(){
 const defaults={primary:"#b5ff3b",secondary:"#c7a0ff"};
 const root=document.documentElement;
 const primary=$("#button-primary-color"),secondary=$("#button-secondary-color"),message=$("#button-colors-message");
 const read=()=>{try{return JSON.parse(localStorage.getItem("dyserrealm-button-colors")||"{}")}catch{return {}}};
 const apply=(values)=>{const p=/^#[0-9a-f]{6}$/i.test(values.primary||"")?values.primary:defaults.primary;const s=/^#[0-9a-f]{6}$/i.test(values.secondary||"")?values.secondary:defaults.secondary;root.style.setProperty("--button-primary-color",p);root.style.setProperty("--button-secondary-color",s);root.style.setProperty("--button-secondary-border",s+"88");if(primary)primary.value=p;if(secondary)secondary.value=s};
 const save=()=>{const values={primary:primary?.value||defaults.primary,secondary:secondary?.value||defaults.secondary};apply(values);try{localStorage.setItem("dyserrealm-button-colors",JSON.stringify(values));if(message)message.textContent="BUTTON COLORS SAVED IN THIS BROWSER."}catch{if(message)message.textContent="COLORS APPLIED, BUT THIS BROWSER BLOCKED LOCAL SAVING."}};
 apply(read());
 primary?.addEventListener("input",save);secondary?.addEventListener("input",save);
 $("#button-colors-reset")?.addEventListener("click",()=>{apply(defaults);try{localStorage.removeItem("dyserrealm-button-colors");if(message)message.textContent="DEFAULT COLORS RESTORED."}catch{save()}});
}
function initSeasonThemeSettings(){
 const allowed=["default","halloween","winter","summer"],key="dyserrealm-season-theme";
 const radios=Array.from(document.querySelectorAll('input[name="season-theme"]'));
 const message=$("#season-theme-message");
 const current=()=>{let value="default";try{value=localStorage.getItem(key)||"default"}catch{}return allowed.includes(value)?value:"default"};
 const apply=value=>{const theme=allowed.includes(value)?value:"default";document.documentElement.dataset.seasonTheme=theme;radios.forEach(r=>r.checked=r.value===theme);try{localStorage.setItem(key,theme)}catch{}if(message)message.textContent=theme==="halloween"?"HALLOWEEN THEME ACTIVE — COBWEBS AND PUMPKINS ENABLED.":theme==="winter"?"WINTER THEME ACTIVE — SNOWFLAKES AND ICE COLORS ENABLED.":theme==="summer"?"SUMMER THEME ACTIVE — SUNNY COLORS ENABLED.":"ORIGINAL DYSERREALM THEME ACTIVE."};
 apply(current());radios.forEach(r=>r.addEventListener("change",()=>{if(r.checked)apply(r.value)}));
}
function events(){const avatarInput=$("#settings-avatar-file"),avatarFileName=$("#settings-avatar-file-name");if(avatarInput){avatarInput.addEventListener("click",()=>{avatarInput.value=""});avatarInput.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;const msg=$("#settings-profile-message");const previousAvatar=profileAvatarData;if(avatarFileName)avatarFileName.textContent=file.name;let instantUrl="";try{instantUrl=URL.createObjectURL(file);profileAvatarData=instantUrl;renderSettingsAvatar();msg.textContent="AVATAR PREVIEW UPDATED — CHECKING AND SAVING…";const prepared=await prepareAvatar(file);await persistAvatarImmediately(prepared);if(instantUrl)URL.revokeObjectURL(instantUrl);toast("Avatar updated.")}catch(error){msg.textContent="AVATAR SHOWN IN PREVIEW, BUT NOT SAVED: "+(error.message||"Could not save avatar.");if(avatarFileName)avatarFileName.textContent=file.name;/* Keep the selected local preview visible so image processing or cloud errors do not make the avatar appear unselected. */}})}$("#settings-avatar-remove").onclick=async()=>{const previousAvatar=profileAvatarData;profileAvatarData="";if(avatarFileName)avatarFileName.textContent="No image selected";if(avatarInput)avatarInput.value="";renderSettingsAvatar();try{await persistAvatarImmediately(null);toast("Avatar removed.")}catch(error){profileAvatarData=previousAvatar;renderSettingsAvatar();$("#settings-profile-message").textContent="AVATAR NOT REMOVED: "+(error.message||"Could not save change.")}};
initButtonColorSettings();initSeasonThemeSettings();
/* Register close controls first so they still work if a later page-specific handler fails. */
document.addEventListener("click",e=>{const button=e.target.closest("[data-close]");if(!button)return;const id=button.dataset.close;if(!id||!$("#"+id))return;e.preventDefault();e.stopImmediatePropagation();close(id)},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal:not(.hidden)").forEach(m=>close(m.id))});
$("#login-open").onclick=()=>{setMode("login");open("auth-modal")};$("#signup-open").onclick=()=>{setMode("signup");open("auth-modal")};$("#footer-signup").onclick=()=>{if(user)return toast("You're already connected.");setMode("signup");open("auth-modal")};
$("#logout-button").onclick=async()=>{let{error}=await db.auth.signOut();if(error)return toast(errMsg(error));header(null);await refresh();toast("Disconnected from the realm.")};
$("#auth-switch").onclick=()=>setMode(mode==="signup"?"login":"signup");
$("#auth-form").onsubmit=async e=>{e.preventDefault();let btn=$("#auth-submit"),msg=$("#auth-message");btn.disabled=true;msg.textContent="CONTACTING AUTH SERVER…";try{let r=mode==="signup"?await db.auth.signUp({email:$("#auth-email").value.trim(),password:$("#auth-password").value,options:{data:{display_name:$("#auth-name").value.trim(),roblox_username:$("#auth-roblox").value.trim()}}}):await db.auth.signInWithPassword({email:$("#auth-email").value.trim(),password:$("#auth-password").value});if(r.error)throw r.error;if(mode==="signup"&&!r.data.session){msg.textContent="Account created. Check email to confirm, then log in.";return}if(r.data.session){const ban=await db.rpc("check_my_site_ban");const b=Array.isArray(ban.data)?ban.data[0]:ban.data;const isBanned=b?.is_banned===true||b?.is_banned==="true";if(!ban.error&&isBanned){await db.auth.signOut();throw new Error("ACCOUNT BANNED"+(b.ban_until?" until "+new Date(b.ban_until).toLocaleString():" permanently")+(b.reason?": "+b.reason:""))}}header(r.data.user);close("auth-modal");toast(mode==="signup"?"Welcome to the realm.":"You're logged in.");refresh().catch(e=>notice("You are signed in, but some content could not load: "+(e?.message||"network error")))}catch(e){msg.textContent=errMsg(e)}finally{btn.disabled=false}};
["write-open","hero-write","empty-write"].forEach(id=>$("#"+id).onclick=()=>{if(!requireUser())return;$("#post-form").reset();$("#post-message").textContent="";open("post-modal")});
$("#post-form").onsubmit=async e=>{e.preventDefault();if(!requireUser())return;let b=e.submitter;b.disabled=true;$("#post-message").textContent="TRANSMITTING…";let{error}=await db.from("posts").insert({title:$("#post-name").value.trim(),category:$("#post-category").value,body:$("#post-body").value.trim(),author_id:user.id,author_name:name()});b.disabled=false;if(error){$("#post-message").textContent=errMsg(error);return}close("post-modal");await loadPosts();toast("Post published.")};
$("#script-open").onclick=()=>{if(!requireUser())return;$("#script-form").reset();$("#script-price").step="1";clearImagePreviews();$("#script-message").textContent="";open("script-modal")};
$("#script-images").onchange=renderImagePreviews;$("#script-price-currency").onchange=()=>{$("#script-price").step=$("#script-price-currency").value==="Robux"?"1":"0.01";if($("#script-price-currency").value==="Robux"&&!Number.isInteger(Number($("#script-price").value)))$("#script-price").value=Math.round(Number($("#script-price").value)||0)};
$("#script-form").onsubmit=async e=>{
 e.preventDefault();if(!requireUser())return;
 const b=e.submitter,input=$("#script-images"),files=[...input.files],message=$("#script-message"),problem=validateScriptImages(files),price=Number($("#script-price").value),priceCurrency=$("#script-price-currency").value;
 if(problem){message.textContent=problem;return}
 if(!Number.isFinite(price)||price<0||price>100000000||(priceCurrency==="Robux"&&!Number.isInteger(price))){message.textContent=priceCurrency==="Robux"?"Enter a whole-number Robux price of 0 or more.":"Enter a valid price of 0 or more.";return}
 b.disabled=true;let uploaded=[],saved=false,imagesStored=true;
 try{
  message.textContent="UPLOADING SCRIPT…";
  for(let i=0;i<files.length;i++){
   const file=files[i],ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"})[file.type],random=crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2),path=user.id+"/"+random+"."+ext;
   message.textContent="UPLOADING IMAGE "+(i+1)+" / "+files.length+"…";
   const{error:uploadError}=await db.storage.from("script-images").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
   if(uploadError)throw new Error("Image upload failed. Run script-image-upload-migration.sql in Supabase SQL Editor, then retry. "+uploadError.message);
   const pub=db.storage.from("script-images").getPublicUrl(path);if(!pub.data?.publicUrl)throw new Error("Could not create a public image URL.");uploaded.push({url:pub.data.publicUrl,path})
  }
  const base={title:$("#script-name").value.trim(),category:$("#script-category").value,description:$("#script-description").value.trim(),code:$("#script-code").value,author_id:user.id,author_name:name(),roblox_username:roblox()};
  message.textContent="PUBLISHING SCRIPT…";
  let{error}=await db.from("scripts").insert({...base,images:uploaded,price,price_currency:priceCurrency});
  if(error&&isMissingSchemaColumns(error)){
   const fallbackImages=[...uploaded,{_displayPrice:{amount:price,currency:priceCurrency}}];
   let fallback=await db.from("scripts").insert({...base,images:fallbackImages});
   if(!fallback.error){error=null}
   else if(isMissingSchemaColumns(fallback.error)){
    fallback=await db.from("scripts").insert({...base,price,price_currency:priceCurrency});
    if(!fallback.error){error=null;imagesStored=false}
    else if(isMissingSchemaColumns(fallback.error)){
     fallback=await db.from("scripts").insert(base);
     if(!fallback.error){error=null;imagesStored=false}else error=fallback.error
    }else error=fallback.error
   }else error=fallback.error
  }
  if(error)throw error;saved=true
 }catch(error){
  if(uploaded.length&&!saved)await db.storage.from("script-images").remove(uploaded.map(x=>x.path));
  message.textContent=errMsg(error);b.disabled=false;return
 }
 if(!imagesStored&&uploaded.length)await db.storage.from("script-images").remove(uploaded.map(x=>x.path));
 b.disabled=false;close("script-modal");$("#script-form").reset();$("#script-price").step="1";clearImagePreviews();await loadScripts();
 toast(imagesStored?"Script published.":"Script published, but photos need the image migration to appear. Run script-image-upload-migration.sql in Supabase SQL Editor.")
};
$("#post-filters").onclick=e=>{let b=e.target.closest("[data-category]");if(!b)return;postsFilter=b.dataset.category;$$("[data-category]").forEach(x=>x.classList.toggle("active",x===b));loadPosts()};
$("#script-filters").onclick=e=>{let b=e.target.closest("[data-script-filter]");if(!b)return;scriptFilter=b.dataset.scriptFilter;$$("[data-script-filter]").forEach(x=>x.classList.toggle("active",x===b));renderScripts()};
$("#script-search").oninput=renderScripts;$("#scripts-grid").onclick=e=>{let d=e.target.closest("[data-delete-script]"),v=e.target.closest("[data-view]"),s=e.target.closest("[data-save]");if(d){deleteScript(d.dataset.deleteScript);return}if(v)showScript(v.dataset.view);if(s)toggleSaved(s.dataset.save)};
$("#detail-copy").onclick=async()=>{try{await navigator.clipboard.writeText(activeScript.code);toast("Code copied.")}catch{toast("Clipboard access denied by browser.")}};$("#detail-delete").onclick=()=>{if(activeScript)deleteScript(activeScript.id)};$("#settings-open").onclick=()=>{if(!requireUser())return;$("#settings-name").value=name();$("#settings-name-message").textContent="";$("#settings-profile-message").textContent="";$("#settings-password-message").textContent="";$("#settings-password").value="";$("#settings-password-confirm").value="";$("#settings-role-message").textContent="";$("#settings-ban-message").textContent="";open("settings-modal");loadSettingsProfile();loadRoleSettings()};$("#settings-profile-save").onclick=saveSettingsProfile;$("#settings-profile-display-name").addEventListener("input",()=>{if(!profileAvatarData)renderSettingsAvatar()});$$(".settings-nav-item").forEach(b=>b.onclick=()=>{const targetId=b.dataset.settingsJump;const target=document.getElementById(targetId);if(!target)return;$$(".settings-tab-panel").forEach(p=>p.classList.toggle("active",p.id===targetId));$$(".settings-nav-item").forEach(x=>x.classList.toggle("active",x===b));const workspace=$("#settings-form .settings-workspace");if(workspace)workspace.scrollTop=0;});$("#settings-name-save").onclick=saveDisplayName;$("#settings-password-save").onclick=savePassword;$("#role-assign-button").onclick=()=>assignSiteRole($("#role-target-email").value,$("#role-target-role").value);$("#settings-role-list").onclick=e=>{const b=e.target.closest("[data-role-target]");if(!b||b.disabled)return;const role=b.dataset.roleValue,email=b.dataset.roleTarget;if(confirm("Set "+email+" role to "+role.toUpperCase()+"?"))assignSiteRole(email,role)};$("#warning-issue-button").onclick=issueSiteWarning;$("#ban-apply-button").onclick=applySiteBan;$("#settings-ban-list").onclick=e=>{const b=e.target.closest("[data-unban-email]");if(b)removeSiteBan(b.dataset.unbanEmail)};$("#comments-login").onclick=()=>{close("detail-modal");setMode("login");open("auth-modal")};$("#comment-form").onsubmit=async e=>{e.preventDefault();if(!requireUser()||!activeScript)return;const btn=$("#comment-submit"),msg=$("#comment-message"),body=$("#comment-body").value.trim();if(!body){msg.textContent="Write a comment first.";return}btn.disabled=true;msg.textContent="POSTING…";try{const{error}=await db.from("script_comments").insert({script_id:activeScript.id,user_id:user.id,author_name:name(),body});if(error)throw error;$("#comment-body").value="";msg.textContent="";await loadComments(activeScript.id);toast("Comment posted.")}catch(e){msg.textContent=/relation .* does not exist|Could not find the table/i.test(e.message||"")?"Run script-comments-settings.sql in Supabase SQL Editor first.":errMsg(e)}finally{btn.disabled=false}};$("#comments-list").onclick=async e=>{const b=e.target.closest("[data-delete-comment]");if(!b||!requireUser())return;if(!confirm("Delete your comment?"))return;const{error}=await db.from("script_comments").delete().eq("id",b.dataset.deleteComment).eq("user_id",user.id);if(error)return toast(errMsg(error));await loadComments(activeScript.id);toast("Comment deleted.")};
$("#generate-key").onclick=genKey;$("#copy-key").onclick=async()=>{try{await navigator.clipboard.writeText($("#key-output").textContent);$("#key-message").textContent="COPIED TO CLIPBOARD"}catch{$("#key-message").textContent="CLIPBOARD ACCESS DENIED"}};
$$("[data-close]").forEach(button=>button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const id=button.dataset.close;if(id&&$("#"+id))close(id)}));document.addEventListener("click",e=>{const tabLink=e.target.closest("a[data-tab]");if(tabLink){const id=tabLink.dataset.tab;if(["home","feed","library"].includes(id)){return}}const closeButton=e.target.closest("[data-close]");if(closeButton){e.preventDefault();close(closeButton.dataset.close);return}const openButton=e.target.closest("[data-open]");if(openButton){e.preventDefault();open(openButton.dataset.open)}});document.addEventListener("keydown",e=>{if(e.key==="Escape")$$(".modal:not(.hidden)").forEach(m=>close(m.id))});$("#mobile-menu").onclick=()=>document.querySelector(".topbar nav").classList.toggle("open");$$(".topbar nav a").forEach(a=>a.onclick=()=>document.querySelector(".topbar nav").classList.remove("open"))}
async function init(){events();genKey();if(!window.supabase?.createClient){notice("Supabase client failed to load. Check connection and refresh.");$("#posts-grid").innerHTML="";$("#scripts-grid").innerHTML="";return}try{db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});let{data,error}=await db.auth.getSession();if(error)throw error;let initialUser=data.session?.user||null;header(initialUser);if(initialUser){loadHeaderAvatar(initialUser);try{const ban=await db.rpc("check_my_site_ban");if(!ban.error){const b=Array.isArray(ban.data)?ban.data[0]:ban.data;const isBanned=b?.is_banned===true||b?.is_banned==="true";if(isBanned){await db.auth.signOut();initialUser=null;header(null);toast("ACCOUNT BANNED"+(b.ban_until?" until "+new Date(b.ban_until).toLocaleString():" permanently")+(b.reason?": "+b.reason:""))}}}catch(banError){console.warn("Ban status check failed; keeping restored session active.",banError)}}await refresh()}catch(e){notice(errMsg(e));$("#posts-grid").innerHTML="";$("#scripts-grid").innerHTML=""}if(db?.auth){db.auth.onAuthStateChange((_event,session)=>{let next=session?.user||null,changed=user?.id!==next?.id;header(next);if(next)loadHeaderAvatar(next);if(changed)refresh().catch(e=>notice(errMsg(e)))})}}
document.addEventListener("DOMContentLoaded",()=>{setActiveTab();init().then(()=>{if(location.hash==="#settings-profile"&&user){$("#settings-name").value=name();open("settings-modal");loadSettingsProfile();loadRoleSettings()}})})})();