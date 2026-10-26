(function () {
  "use strict";

  function syncActiveTab() {
    var path = window.location.pathname || "/";
    var cleanPath = path.replace(/\/+$/, "");
    var current = cleanPath.split("/").pop().toLowerCase();

    // GitHub Pages serves this project from /Dyserrealm-Script/, not from the domain root.
    // Treat the project root and /index.html as the same HOME page.
    if (!current || current === "dyserrealmscript" || current === "index.html") {
      current = "index.html";
    }

    document.querySelectorAll("nav.site-tabs a").forEach(function (link) {
      var href = (link.getAttribute("href") || "").split("#")[0].split("?")[0];
      var target = href.replace(/\/+$/, "").split("/").pop().toLowerCase();
      if (!target) target = "index.html";

      var active = target === current;
      link.classList.toggle("active-tab", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncActiveTab);
  } else {
    syncActiveTab();
  }

  // Re-check after navigation scripts have finished modifying the header.
  window.addEventListener("pageshow", syncActiveTab);
})();
