(function () {
  "use strict";
  var mount = document.getElementById("shared-header");
  if (!mount) return;
  mount.innerHTML = '<header class="topbar"><a class="brand" href="index.html"><img class="brand-logo" src="Gemini_Generated_Image_3f7mq63f7mq63f7m.jpg" alt="Dyserrealm logo"><b>D<span>_</span></b> DYSERREALM<small>/SCRIPT</small></a><nav class="site-tabs" aria-label="Main navigation"><a href="index.html">HOME</a><a href="feed.html">FEED</a><a href="library.html">SCRIPT LIBRARY</a><a href="key-generator.html">KEY GENERATOR</a><a href="executors.html">EXECUTORS</a></nav><div class="account"><span id="user-label"></span><span id="key-user-status" class="kicker" hidden></span><a id="header-profile" class="header-profile hidden" href="profiles.html" aria-label="Your profile" title="Your profile"><span id="header-avatar-fallback">U</span><img id="header-avatar-image" alt="" hidden></a><button id="login-open" class="btn ghost" type="button">LOG IN</button><button id="signup-open" class="btn primary" type="button">SIGN UP ↗</button><button id="settings-open" class="btn ghost hidden" type="button">SETTINGS</button><button id="logout-button" class="btn ghost hidden" type="button">LOG OUT</button><button id="mobile-menu" class="btn ghost menu" type="button" aria-label="Toggle navigation">☰</button></div></header>';
  var login = document.getElementById("login-open");
  var signup = document.getElementById("signup-open");
  var settings = document.getElementById("settings-open");
  if (login) login.addEventListener("click", function () { if (!document.getElementById("auth-modal")) location.href = "index.html?auth=login"; });
  if (signup) signup.addEventListener("click", function () { if (!document.getElementById("auth-modal")) location.href = "index.html?auth=signup"; });
  if (settings) settings.addEventListener("click", function () { if (!document.getElementById("settings-modal")) location.href = "index.html#settings-profile"; });
  var menu = document.getElementById("mobile-menu");
  if (menu) menu.addEventListener("click", function () { document.querySelector(".topbar nav")?.classList.toggle("open"); });
})();