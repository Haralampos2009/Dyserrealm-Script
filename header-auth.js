(()=>{"use strict";
const URL="https://krractyhrblivsejrpdm.supabase.co",KEY="sb_publishable_tFu5Dd07GWrVAS7p6_rcFQ_rgKhNqSg";
const $=id=>document.getElementById(id);let db;
function paint(user){
 const signed=!!user,name=user?.user_metadata?.display_name||user?.user_metadata?.username||user?.email?.split("@")[0]||"";
 const label=$("user-label"),profile=$("header-profile"),settings=$("settings-open"),login=$("login-open"),signup=$("signup-open"),logout=$("logout-button"),avatar=$("header-avatar-image"),fallback=$("header-avatar-fallback");
 if(label)label.textContent=signed?name.toUpperCase():"";
 if(profile)profile.classList.toggle("hidden",!signed);
 if(settings)settings.classList.toggle("hidden",!signed);
 if(login)login.classList.toggle("hidden",signed);
 if(signup)signup.classList.toggle("hidden",signed);
 if(logout)logout.classList.toggle("hidden",!signed);
 const url=user?.user_metadata?.avatar_url||user?.user_metadata?.picture||"";
 if(avatar){avatar.hidden=!signed||!url;avatar.src=url||""}
 if(fallback){fallback.hidden=!!url&&signed;fallback.textContent=(name.trim()[0]||"U").toUpperCase()}
}
async function init(){
 if(!window.supabase?.createClient)return;
 db=window.dyserrealmSupabaseClient||(window.dyserrealmSupabaseClient=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
 try{const{data}=await db.auth.getSession();paint(data?.session?.user||null)}catch{paint(null)}
 db.auth.onAuthStateChange((_event,session)=>paint(session?.user||null));
 const logout=$("logout-button");if(logout)logout.addEventListener("click",async()=>{await db.auth.signOut();paint(null);location.href="index.html"});
 window.addEventListener("dyserrealm:header-user",event=>paint(event.detail?.user||null));
 document.querySelectorAll(".topbar nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".topbar nav")?.classList.remove("open")));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();