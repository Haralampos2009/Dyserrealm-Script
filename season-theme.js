(function () {
  "use strict";
  var CACHE_KEY = "dyserrealm-season-theme-cache";
  var ALLOWED = ["default", "halloween", "winter", "summer", "easter", "newyear"];
  var IMAGES = {
    halloween: "assets/themes/halloween/halloween.jpg",
    winter: "assets/themes/winter/winter.jpg",
    summer: "assets/themes/summer/summer.jpg",
    easter: "assets/themes/easter/easter.jpg",
    newyear: "assets/themes/newyear/newyear.jpg"
  };
  var API_URL = "https://krractyhrblivsejrpdm.supabase.co/rest/v1/site_settings?key=eq.season_theme&select=value&limit=1";
  var API_KEY = "sb_publishable_tFu5Dd07GWrVAS7p6_rcFQ_rgKhNqSg";

  function apply(theme) {
    if (!ALLOWED.includes(theme)) theme = "default";
    document.documentElement.dataset.seasonTheme = theme;
    try { localStorage.setItem(CACHE_KEY, theme); } catch (e) {}

    var body = document.body;
    if (!body) {
      document.addEventListener("DOMContentLoaded", function () { apply(theme); }, { once: true });
      return;
    }

    // Apply the background as an inline !important style so legacy theme.css
    // rules cannot silently replace it with the old forest image.
    if (IMAGES[theme]) {
      var imageUrl = new URL(IMAGES[theme], document.baseURI).href;
      body.style.setProperty("background-color", "#080a0f", "important");
      body.style.setProperty(
        "background-image",
        'linear-gradient(180deg,rgba(5,5,12,.25),rgba(5,5,12,.62)),url("' + imageUrl + '")',
        "important"
      );
      body.style.setProperty("background-position", "center center", "important");
      body.style.setProperty("background-size", "cover", "important");
      body.style.setProperty("background-attachment", "fixed", "important");
      body.style.setProperty("background-repeat", "no-repeat", "important");
    } else {
      ["background-color", "background-image", "background-position", "background-size", "background-attachment", "background-repeat"]
        .forEach(function (property) { body.style.removeProperty(property); });
    }
  }

  window.DyserrealmSeasonTheme = { apply: apply, cacheKey: CACHE_KEY, allowed: ALLOWED.slice() };
  var cached = null;
  try {
    var value = localStorage.getItem(CACHE_KEY);
    if (ALLOWED.includes(value)) cached = value;
  } catch (e) {}
  if (cached) apply(cached);

  fetch(API_URL + "&_=" + Date.now(), {
    cache: "no-store",
    headers: { apikey: API_KEY, Authorization: "Bearer " + API_KEY }
  }).then(function (response) {
    if (!response.ok) throw new Error("Could not load shared theme");
    return response.json();
  }).then(function (rows) {
    if (rows && rows[0] && ALLOWED.includes(rows[0].value)) apply(rows[0].value);
    else if (!cached) apply("default");
  }).catch(function () {
    if (!cached) apply("default");
  });
})();