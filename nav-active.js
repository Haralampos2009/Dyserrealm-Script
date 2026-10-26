(function () {
  "use strict";
  function syncActiveTab() {
    var current = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (!current || current === "/") current = "index.html";
    document.querySelectorAll(".topbar .site-tabs a").forEach(function (link) {
      var target = (link.getAttribute("href") || "").split("#")[0].split("?")[0].toLowerCase();
      var active = target === current || (current === "" && target === "index.html");
      link.classList.toggle("active-tab", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncActiveTab);
  else syncActiveTab();
})();