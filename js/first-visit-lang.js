// First visit only: a visitor whose browser prefers French or Spanish and who arrives on the English home page
// from outside the site is sent to the French or Spanish home page. Never on later visits, never after
// navigating within the site (e.g. clicking EN), never on other pages or for crawlers.
// Loaded only on the English home page, from <head>, so the redirect happens before the page renders.
(function () {
    try {
        if (localStorage.getItem('gd-visited')) return;
        localStorage.setItem('gd-visited', '1');
        if (document.referrer && document.referrer.indexOf(location.origin) === 0) return;
        if (navigator.webdriver || /bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)) return;
        var l = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
        var to = l.indexOf('fr') === 0 ? '/fr/' : l.indexOf('es') === 0 ? '/es/' : null;
        if (to) location.replace(to + location.search + location.hash);
    } catch (e) {}
})();
