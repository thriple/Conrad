/* Conrad – semi-functional demo. Mock data only; state lives in localStorage on this device. */
(function () {
  'use strict';
  var C = window.CONRAD, CATS = C.CATS, PT = C.PLACES;
  var KEY = 'conrad.demo.v1';
  var DAY = 86400000, WEEK = 7 * DAY;
  var S = load();
  var UI = { q: '', quick: 'all', filterOpen: false, editing: null, expanded: {}, importOpen: false, camTarget: null, stat: 'road', ts: 'idle', su: { u: '', p: '', photo: null, show: false }, si: { u: '', p: '', err: '' }, returnTo: '' };
  var draft = null;
  var route = { name: '', arg: '' }, lastRouteKey = null;
  var ME = { lat: 13.4745, lng: 144.7525, real: false };

  // ---------- storage ----------
  function hash(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function fixAccounts(s) { (s.accounts || []).forEach(function (a) { if (a.p) { a.h = hash(a.p); delete a.p; } }); return s; }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.v === 2) return fixAccounts(s);
        if (s && s.v === 1) { // keep earlier demo posts, add the new fields
          s.v = 2; s.accounts = [{ u: 'cougot', p: 'demo1234', role: 'omega' }]; s.account = { u: 'cougot' }; s.me = 'cougot'; s.relevant = {};
          s.settings.tiles = 'osmdark'; s.settings.bannerMin = false; s.settings.drawer = 'peek';
          return fixAccounts(s);
        }
      }
    } catch (e) {}
    return fixAccounts(C.seed());
  }
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 200); }

  // ---------- utilities ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return Date.now(); }
  function rel(t) {
    if (!t) return '—';
    var m = Math.round((now() - t) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  }
  function fdate(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2); }
  function dist(a, b) {
    var R = 6371000, toR = Math.PI / 180, dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function miles(m) { var mi = m / 1609; return mi < 0.1 ? Math.round(m * 3.28) + ' ft' : mi.toFixed(1) + ' mi'; }
  function nearestVillage(p) { var best = null, bd = 1e12; C.VILLAGES.forEach(function (v) { var d = dist(p, { lat: v[1], lng: v[2] }); if (d < bd) { bd = d; best = v[0]; } }); return best; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function role() { return S.account ? S.settings.role : 'guest'; }
  function isAdmin() { return role() === 'admin' || role() === 'omega'; }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  function acct(u) { for (var i = 0; i < S.accounts.length; i++) if (S.accounts[i].u.toLowerCase() === String(u).toLowerCase()) return S.accounts[i]; return null; }

  var toastT = null, toastFn = null;
  function toast(msg, actionLabel, fn) {
    var el = $('#toast'); toastFn = fn || null;
    el.innerHTML = '<div class="t"><span class="grow">' + esc(msg) + '</span>' + (actionLabel ? '<button data-act="toastAction">' + esc(actionLabel) + '</button>' : '') + '</div>';
    clearTimeout(toastT); toastT = setTimeout(function () { el.innerHTML = ''; }, 4200);
  }

  // ---------- icons ----------
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', close: '<path d="M6 6l12 12M18 6 6 18"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M5 12l7 7 7-7"/>', send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    bellOff: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/>',
    merge: '<path d="M6 3v6a6 6 0 0 0 6 6 6 6 0 0 1 6 6M18 3v6a6 6 0 0 1-3 5.2"/>',
    chev: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>', chevD: '<path d="M5 9l7 7 7-7"/>', chevU: '<path d="M5 15l7-7 7 7"/>',
    check: '<path d="M5 12l5 5L20 7"/>', shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  function ic(name, size, color, sw, fill) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
  }
  // Multi-colour glyphs for map pins and pickers (drawn to read on the dark pin disc).
  var RICH = {
    road: '<rect x="2" y="6" width="20" height="7" rx="1" fill="#F5F5F4"/><path d="M6 6h3l-3 7H3zM12 6h3l-3 7H9zM18 6h3l-3 7h-3z" fill="#F97316"/><rect x="5" y="13" width="2" height="8" fill="#71717A"/><rect x="17" y="13" width="2" height="8" fill="#71717A"/><circle cx="12" cy="3.5" r="1.8" fill="#FDE047"/>',
    light: '<rect x="8" y="1.5" width="8" height="21" rx="3" fill="#0B0B0C" stroke="#FACC15" stroke-width="1.2"/><circle cx="12" cy="6.5" r="2.2" fill="#EF4444"/><circle cx="12" cy="12" r="2.2" fill="#FACC15"/><circle cx="12" cy="17.5" r="2.2" fill="#22C55E"/>',
    pole: '<path d="M2 7.5c3 2.5 6 2.5 8 .5M14 8c2 2 5 2 8-.5" stroke="#9CA3AF" stroke-width="1.2" fill="none"/><path d="M11 2h2v20h-2z" fill="#B45309"/><path d="M5 6h14v1.8H5zM7 10h10v1.6H7z" fill="#D97706"/><path d="M18 12l-3.5 4.5h2.7L15.5 21l4.5-5.6h-2.7L19 12z" fill="#FDE047"/>',
    power: '<path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" fill="#FDE047" fill-opacity=".35" stroke="#FDE047" stroke-width="1.2"/><rect x="9" y="17" width="6" height="3.5" rx="1" fill="#9CA3AF"/><path d="M4 4l16 16" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/>',
    water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="#3B82F6"/><path d="M9 14a3 3 0 0 0 3 3" stroke="#BFDBFE" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M4 4l16 16" stroke="#EF4444" stroke-width="2.4" stroke-linecap="round"/>',
    gas: '<rect x="4" y="3" width="10" height="17" rx="2" fill="#22C55E"/><rect x="6" y="5" width="6" height="5" rx="1" fill="#DCFCE7"/><rect x="3" y="19.5" width="12" height="2.5" rx="1" fill="#9CA3AF"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3" stroke="#E5E7EB" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    store: '<path d="M5 8h14l-1 13H6L5 8z" fill="#22D3EE"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="#FDE68A" stroke-width="2" fill="none"/><circle cx="9" cy="11" r="1" fill="#0E7490"/><circle cx="15" cy="11" r="1" fill="#0E7490"/>',
    supply: '<path d="M3 7l9-4 9 4-9 4-9-4z" fill="#FCD34D"/><path d="M3 7v10l9 4V11z" fill="#D97706"/><path d="M21 7v10l-9 4V11z" fill="#B45309"/><path d="M7.5 5l9 4" stroke="#FEF3C7" stroke-width="1.4"/>',
    shelter: '<path d="M2 11.5 12 3l10 8.5z" fill="#F43F5E"/><rect x="5" y="11" width="14" height="10" fill="#F5F5F4"/><rect x="10" y="14.5" width="4" height="6.5" fill="#9F1239"/>',
    muster: '<circle cx="8" cy="7" r="3" fill="#E5E7EB"/><path d="M2 20.5c.5-4 3-6 6-6s5.5 2 6 6z" fill="#E5E7EB"/><circle cx="17" cy="8" r="2.5" fill="#94A3B8"/><path d="M13 20.5c.3-3 2-5 4-5s3.7 2 4 5z" fill="#94A3B8"/>',
    tsunami: '<path d="M2 18c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2v4H2z" fill="#3B82F6"/><path d="M12 14V3M8 7l4-4 4 4" stroke="#4ADE80" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function rich(name, size) { return '<svg width="' + (size || 24) + '" height="' + (size || 24) + '" viewBox="0 0 24 24" aria-hidden="true">' + RICH[name] + '</svg>'; }
  var PIN_SVG = '<svg width="30" height="30" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 46 C18 46 3 28 3 17 a15 15 0 0 1 30 0 C33 28 18 46 18 46z" fill="#191414"/><circle cx="18" cy="17" r="6" fill="#FF4632"/></svg>';
  function avatar(by) {
    var a = acct(by), u = C.USERS[by];
    var color = u ? u.color : '#' + hash(by).slice(0, 6);
    if (a && a.photo) return '<div class="av" style="background-image:url(' + a.photo + ')"></div>';
    return '<div class="av" style="background:' + color + '">' + esc(by.slice(0, 2).toUpperCase()) + '</div>';
  }
  function roleTag(by) {
    var r = (S.roles && S.roles[by]) || (C.USERS[by] && C.USERS[by].role) || (acct(by) && acct(by).role);
    if (S.account && by === S.me) r = role();
    return r === 'admin' ? '<span class="tag dark">Admin</span>' : r === 'omega' ? '<span class="tag official">Omega</span>' : '';
  }

  // ---------- guest gate ----------
  function guard(why) {
    if (S.account) return true;
    UI.returnTo = location.hash.replace(/^#/, '');
    go('join/' + encodeURIComponent(why));
    return false;
  }
  function signIn(u, isNew) {
    var a = acct(u);
    S.account = { u: a.u }; S.me = a.u;
    S.settings.role = a.role || 'user';
    if (isNew) S.follows = { places: [], villages: [], feeders: [], muted: {} };
    save();
  }

  // ---------- map ----------
  var map = L.map('map', {
    zoomControl: false, attributionControl: true, tap: false, minZoom: 10, maxZoom: 18,
    rotate: true, touchRotate: true, rotateControl: false, compassBearing: false, bearing: 0
  }).setView([13.479, 144.775], 13);
  var TILESETS = {
    osmdark: { name: 'Dark (OpenStreetMap)', dark: true, url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
    osm: { name: 'Light (OpenStreetMap)', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
    topo: { name: 'OpenTopoMap', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', opts: { subdomains: 'abc', maxZoom: 17, attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; OpenTopoMap (CC-BY-SA)' } },
    none: { name: 'No background', url: null }
  };
  var tiles = null, tileErrors = 0;
  function setTiles(k) {
    if (!TILESETS[k]) k = 'osmdark';
    if (tiles) { map.removeLayer(tiles); tiles = null; }
    document.body.classList.remove('nomap'); document.body.classList.toggle('dark-tiles', !!TILESETS[k].dark); tileErrors = 0;
    var t = TILESETS[k]; if (!t.url) { document.body.classList.add('nomap'); return; }
    tiles = L.tileLayer(t.url, t.opts).addTo(map); tiles.bringToBack();
    tiles.on('tileerror', function () { tileErrors++; if (tileErrors > 6) document.body.classList.add('nomap'); });
    tiles.on('tileload', function () { tileErrors = 0; document.body.classList.remove('nomap'); });
  }
  setTiles(S.settings.tiles || 'osmdark');
  var outageLayer = L.layerGroup().addTo(map), feederLayer = L.layerGroup().addTo(map), zoneLayer = L.layerGroup().addTo(map), markerLayer = L.layerGroup().addTo(map);
  var meMarker = L.marker([ME.lat, ME.lng], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, keyboard: false }).addTo(map);
  var dropMarker = null, lastDrop = 0;
  function recentDrop() { return now() - lastDrop < 800; }

  if (navigator.geolocation) {
    try {
      navigator.geolocation.watchPosition(function (p) {
        var la = p.coords.latitude, ln = p.coords.longitude;
        if (la > 13.2 && la < 13.7 && ln > 144.6 && ln < 145.0) { var first = !ME.real; ME = { lat: la, lng: ln, real: true }; meMarker.setLatLng([la, ln]); if (first) renderChrome(); }
      }, function () {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 });
    } catch (e) {}
  }
  function bearing() { return map.getBearing ? map.getBearing() : 0; }
  map.on('rotate', function () { var c = $('.compass'); if (!c) return; var b = bearing(); c.classList.toggle('hidden', Math.abs(b % 360) < 0.5); var s = c.querySelector('svg'); if (s) s.style.transform = 'rotate(' + (-b) + 'deg)'; });

  // ---------- visibility and stacking ----------
  function reportVisible(r) {
    if (!S.filters[r.cat]) return false;
    if (UI.quick !== 'all' && UI.quick !== r.cat) return false;
    if (now() - r.last <= S.filters.windowH * 3600000) return 'yes';
    if (S.filters.older) {
      var from = S.filters.from ? new Date(S.filters.from).getTime() : 0, to = S.filters.to ? new Date(S.filters.to).getTime() + DAY : Infinity;
      if (r.t >= from && r.t <= to) return 'old';
    }
    return false;
  }
  function placeVisible(p) {
    if (S.tsunami) return p.type === 'tsunami' || p.type === 'muster';
    if (!S.filters[p.type]) return false;
    if (p.official && !S.filters.official && p.type !== 'gas' && p.type !== 'store') return false;
    if (UI.quick !== 'all' && UI.quick !== 'places') return false;
    return true;
  }
  function visibleItems() {
    var out = [];
    if (!S.tsunami) S.reports.forEach(function (r) { var v = reportVisible(r); if (v) out.push({ k: 'r', o: r, faded: v === 'old', rank: r.score + (now() - r.last < 3600000 ? 3 : 0) }); });
    S.places.forEach(function (p) { if (placeVisible(p)) out.push({ k: 'p', o: p, rank: (S.account && S.follows.places.indexOf(p.id) >= 0 ? 100 : 0) + (p.official ? 5 : 0) + 4 }); });
    return out;
  }
  function itemIcon(it) {
    var o = it.o;
    if (it.k === 'r') { var c = CATS[o.cat]; return '<div class="pin' + (it.faded ? ' faded' : '') + '" style="--c:' + c.color + '">' + rich(o.cat) + (it.faded ? '<span class="ago">' + fdate(o.t) + '</span>' : '') + '</div>'; }
    var t = PT[o.type];
    if (o.type === 'gas') {
      var lbl = o.open ? (o.prices.unleaded.v ? '$' + o.prices.unleaded.v.toFixed(2) : 'OPEN') : 'CLOSED';
      return '<div class="pin square pill" style="--c:' + (o.open ? t.color : '#9CA3AF') + '">' + rich('gas', 20) + lbl + '</div>';
    }
    var flagged = o.type === 'store' && o.prices && o.prices.some(function (x) { return x.flags >= 3; });
    return '<div class="pin square' + (o.official ? ' off' : '') + '" style="--c:' + t.color + '">' + rich(o.type) + (flagged ? '<span class="count warn">!</span>' : '') + '</div>';
  }
  function renderMarkers() {
    markerLayer.clearLayers();
    var items = visibleItems();
    items.forEach(function (it) { it.pt = map.latLngToContainerPoint([it.o.lat, it.o.lng]); });
    items.sort(function (a, b) { return b.rank - a.rank; });
    var used = {}, groups = [];
    for (var i = 0; i < items.length; i++) {
      if (used[i]) continue; var g = [items[i]]; used[i] = 1;
      for (var j = i + 1; j < items.length; j++) { if (used[j]) continue; var dx = items[i].pt.x - items[j].pt.x, dy = items[i].pt.y - items[j].pt.y; if (dx * dx + dy * dy < 36 * 36) { g.push(items[j]); used[j] = 1; } }
      groups.push(g);
    }
    groups.forEach(function (g) {
      var top = g[0], html = itemIcon(top);
      if (g.length > 1) html = html.replace('class="pin', 'class="pin stack').replace(/<\/div>$/, '<span class="count">' + g.length + '</span></div>');
      var m = L.marker([top.o.lat, top.o.lng], { icon: L.divIcon({ className: '', html: html, iconSize: [38, 38], iconAnchor: [19, 19] }), keyboard: false, riseOnHover: true });
      if (g.length === 1) m.on('click', function () { openItem(top); });
      else m.on('add', function () { attachStack(m.getElement(), g); });
      m.addTo(markerLayer);
    });
  }
  function openItem(it) { go(it.k === 'r' ? 'pin/' + it.o.id : 'place/' + it.o.id); }
  function swatch(it) {
    var o = it.o, isR = it.k === 'r', c = isR ? CATS[o.cat] : PT[o.type];
    var col = !isR && o.type === 'gas' && !o.open ? '#9CA3AF' : c.color;
    return '<span class="sw' + (isR ? '' : ' sq2') + '" style="--c:' + col + '">' + rich(isR ? o.cat : o.type, 20) + '</span>';
  }

  // Stack gesture: hold to expand, drag over rows, lift to select. A quick tap opens the top pin.
  function attachStack(el, group) {
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    var holdT = null, open = false, hl = -1, menu = null, downAt = 0;
    function rows() { return menu ? menu.querySelectorAll('.srow') : []; }
    function setHl(i) { if (i === hl) return; hl = i; Array.prototype.forEach.call(rows(), function (r, k) { r.classList.toggle('hl', k === i); }); if (i >= 0) vibrate(8); }
    function openMenu() {
      open = true; vibrate(15);
      var r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
      menu = document.createElement('div'); menu.className = 'stackmenu';
      menu.innerHTML = group.map(function (it, k) {
        var o = it.o, isR = it.k === 'r', c = isR ? CATS[o.cat] : PT[o.type];
        var sub = isR ? c.label + ' · ' + rel(o.t) : c.label + (o.type === 'gas' ? (o.open ? ' · open' : ' · closed') : '');
        return '<button class="srow" data-k="' + k + '">' + swatch(it) + '<span class="grow col" style="gap:0"><b style="font-size:15px">' + esc(isR ? o.title : o.name) + '</b><span class="small muted">' + esc(sub) + '</span></span>' + (isR ? '<b>' + (o.score > 0 ? '+' : '') + o.score + '</b>' : '') + '</button>';
      }).join('');
      document.getElementById('app').appendChild(menu);
      var left = Math.min(Math.max(12, r.left + r.width / 2 - 150), W - 312), top = r.bottom + 10;
      if (top + 330 > H) top = Math.max(12, r.top - 10 - Math.min(320, group.length * 58 + 12));
      menu.style.left = left + 'px'; menu.style.top = top + 'px';
      menu.addEventListener('click', function (e) { var b = e.target.closest('.srow'); if (b) { var it = group[+b.dataset.k]; closeMenu(); openItem(it); } });
      setTimeout(function () { document.addEventListener('pointerdown', outside, true); }, 0);
    }
    function outside(e) { if (menu && !menu.contains(e.target) && !el.contains(e.target)) closeMenu(); }
    function closeMenu() { if (menu) menu.remove(); menu = null; open = false; hl = -1; document.removeEventListener('pointerdown', outside, true); }
    el.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) return; e.preventDefault(); e.stopPropagation(); downAt = now();
      map.dragging.disable();
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
      holdT = setTimeout(openMenu, 330);
    });
    el.addEventListener('pointermove', function (e) {
      if (!open || !menu) return;
      var t = document.elementFromPoint(e.clientX, e.clientY), row = t && t.closest ? t.closest('.srow') : null;
      setHl(row && menu.contains(row) ? +row.dataset.k : -1);
      var mr = menu.getBoundingClientRect();
      if (e.clientY > mr.bottom - 24) menu.scrollTop += 10; else if (e.clientY < mr.top + 24) menu.scrollTop -= 10;
    });
    el.addEventListener('pointerup', function () {
      clearTimeout(holdT); map.dragging.enable();
      if (!open) { if (now() - downAt < 330) openItem(group[0]); return; }
      if (hl >= 0) { var it = group[hl]; closeMenu(); openItem(it); }
    });
    el.addEventListener('pointercancel', function () { clearTimeout(holdT); map.dragging.enable(); });
  }

  // ---------- outages, feeders, tsunami zone ----------
  function hull(points) {
    var p = points.map(function (q) { return [q.lng, q.lat]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p.map(function (q) { return [q[1], q[0]]; });
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    up.pop(); lo.pop(); var h = lo.concat(up);
    var cx = 0, cy = 0; h.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= h.length; cy /= h.length;
    return h.map(function (q) { return [cy + (q[1] - cy) * 1.12, cx + (q[0] - cx) * 1.12]; });
  }
  var C_ZONE = [[13.528, 144.792], [13.515, 144.788], [13.498, 144.768], [13.484, 144.742], [13.479, 144.712], [13.471, 144.688], [13.452, 144.660], [13.420, 144.648], [13.392, 144.644], [13.370, 144.645],
    [13.368, 144.662], [13.388, 144.663], [13.418, 144.662], [13.446, 144.672], [13.462, 144.697], [13.468, 144.718], [13.472, 144.746], [13.486, 144.773], [13.506, 144.797], [13.522, 144.805]];
  function inPoly(p, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
      if (((yi > p.lat) !== (yj > p.lat)) && (p.lng < (xj - xi) * (p.lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function renderAreas() {
    outageLayer.clearLayers(); feederLayer.clearLayers(); zoneLayer.clearLayers();
    if (S.tsunami) { L.polygon(C_ZONE, { color: '#F87171', weight: 2.5, fillColor: '#DC2626', fillOpacity: 0.28, interactive: false }).addTo(zoneLayer); return; }
    if (S.filters.outages && (UI.quick === 'all' || UI.quick === 'outages')) {
      S.outages.forEach(function (o) {
        var outs = o.points.filter(function (q) { return q.st === 'out'; }), pw = o.kind === 'power';
        var line = pw ? '#E5E7EB' : '#60A5FA', fill = pw ? '#000000' : '#3B82F6';
        var first = outs[0] || o.points[0];
        var shape = outs.length >= 3 ? L.polygon(hull(outs), { color: line, weight: 2, dashArray: '6 4', fillColor: fill, fillOpacity: pw ? 0.35 : 0.2 })
          : L.circle([first.lat, first.lng], { radius: 400, color: line, weight: 2, dashArray: '6 4', fillColor: fill, fillOpacity: 0.25 });
        shape.on('click', function () { if (!recentDrop()) go('outage/' + o.id); }).addTo(outageLayer);
        if (map.getZoom() >= 13) o.points.forEach(function (q) {
          L.circleMarker([q.lat, q.lng], q.st === 'out' ? { radius: 4, color: '#111', weight: 1.5, fillColor: line, fillOpacity: 1, interactive: false } : { radius: 4, color: '#4ADE80', weight: 2.5, fillColor: '#111', fillOpacity: 1, interactive: false }).addTo(outageLayer);
        });
      });
    }
    if (S.filters.feeders) {
      var st = {
        on: { color: '#4ADE80', weight: 2, dashArray: '6 4', fillColor: '#22C55E', fillOpacity: 0.2 },
        working: { color: '#FBBF24', weight: 3, fillColor: '#F59E0B', fillOpacity: 0.3 },
        partial: { color: '#FBBF24', weight: 2, dashArray: '6 4', fillColor: '#F59E0B', fillOpacity: 0.12 },
        out: { color: '#E5E7EB', weight: 2, dashArray: '6 4', fillColor: '#000000', fillOpacity: 0.35 },
        unknown: { color: '#9CA3AF', weight: 2, dashArray: '2 6', fillColor: '#9CA3AF', fillOpacity: 0.05 }
      };
      S.feeders.forEach(function (f) {
        L.polygon(f.poly, st[f.status]).on('click', function () { if (!recentDrop()) go('feeder/' + f.id); }).addTo(feederLayer);
        var c = f.poly.reduce(function (a, q) { return [a[0] + q[0] / f.poly.length, a[1] + q[1] / f.poly.length]; }, [0, 0]);
        var mine = f.id === S.settings.feeder;
        L.marker(c, { icon: L.divIcon({ className: '', html: '<span class="flabel' + (mine ? ' mine' : '') + '">' + f.id + (mine ? ' ★' : '') + '</span>', iconSize: [0, 0] }) })
          .on('click', function () { go('feeder/' + f.id); }).addTo(feederLayer);
      });
    }
  }
  function outagePoint(kind, at, st) {
    var best = null, bd = 1e12;
    S.outages.forEach(function (o) { if (o.kind !== kind) return; o.points.forEach(function (q) { var d = dist(q, at); if (d < bd) { bd = d; best = o; } }); });
    if (!best || bd > 3000) { best = { id: 'o' + now(), kind: kind, name: nearestVillage(at), since: now(), confirmed: now(), points: [] }; S.outages.push(best); }
    best.points.push({ lat: at.lat, lng: at.lng, t: now(), st: st }); best.confirmed = now();
    save(); return best;
  }

  // ---------- long-press to drop a pin ----------
  (function () {
    var el = document.getElementById('map'), t = null, start = null, ringEl = null, pointers = 0;
    function cancel() { clearTimeout(t); t = null; if (ringEl) { ringEl.remove(); ringEl = null; } }
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    el.addEventListener('pointerdown', function (e) {
      pointers++;
      if (pointers > 1 || !e.isPrimary) { cancel(); return; }
      if (e.target.closest('.leaflet-marker-icon,.leaflet-control')) return;
      if (route.name && route.name !== 'drop') return;
      if (S.tsunami) return;
      var r = el.getBoundingClientRect(); start = { x: e.clientX - r.left, y: e.clientY - r.top };
      ringEl = document.createElement('div'); ringEl.className = 'ring'; ringEl.style.left = start.x + 'px'; ringEl.style.top = start.y + 'px';
      document.getElementById('mapfx').appendChild(ringEl);
      t = setTimeout(function () { cancel(); if (guard('drop pins')) dropAt(map.containerPointToLatLng([start.x, start.y])); }, 500);
    });
    el.addEventListener('pointermove', function (e) {
      if (!t || !start) return; var r = el.getBoundingClientRect(), dx = e.clientX - r.left - start.x, dy = e.clientY - r.top - start.y;
      if (dx * dx + dy * dy > 100) cancel();
    });
    function up() { pointers = Math.max(0, pointers - 1); cancel(); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', function () { pointers = 0; cancel(); });
  })();

  function clearDraft() { draft = null; if (dropMarker) { map.removeLayer(dropMarker); dropMarker = null; } }
  function dropAt(ll) {
    if (S.frozen && !isAdmin()) { toast('Posting is paused by an admin right now.'); return; }
    clearDraft(); vibrate(20); lastDrop = now();
    var pt = map.latLngToContainerPoint(ll), snap = null, bd = 32;
    S.places.forEach(function (p) { if (!placeVisible(p)) return; var q = map.latLngToContainerPoint([p.lat, p.lng]), d = Math.hypot(q.x - pt.x, q.y - pt.y); if (d < bd) { bd = d; snap = p; } });
    if (snap) ll = L.latLng(snap.lat, snap.lng);
    draft = { lat: ll.lat, lng: ll.lng, snap: snap ? snap.id : null, cat: null, kind: null, photo: null, note: '' };
    dropMarker = L.marker(ll, { draggable: true, zIndexOffset: 1000, keyboard: false, icon: L.divIcon({ className: '', iconSize: [36, 48], iconAnchor: [18, 46], html: '<div class="droppin"><svg width="36" height="48" viewBox="0 0 36 48"><path d="M18 46 C18 46 3 28 3 17 a15 15 0 0 1 30 0 C33 28 18 46 18 46z" fill="#FF4632" stroke="#fff" stroke-width="3"/><circle cx="18" cy="17" r="6" fill="#191414"/></svg></div>' }) }).addTo(map);
    dropMarker.on('dragend', function () { var p = dropMarker.getLatLng(); if (draft) { draft.lat = p.lat; draft.lng = p.lng; draft.snap = null; } if (route.name === 'drop') renderRoute(true); });
    dropMarker.on('drag', positionCard);
    var rp = map.latLngToContainerPoint(ll), rip = document.createElement('div'); rip.className = 'ripple'; rip.style.left = rp.x + 'px'; rip.style.top = rp.y + 'px';
    document.getElementById('mapfx').appendChild(rip); setTimeout(function () { rip.remove(); }, 1100);
    if (route.name === 'drop') renderRoute(true); else go('drop');
  }
  function positionCard() {
    var card = $('.dropcard'); if (!card || !draft) return;
    var p = dropMarker ? dropMarker.getLatLng() : L.latLng(draft.lat, draft.lng), pt = map.latLngToContainerPoint(p), H = map.getSize().y;
    if (pt.y < H * 0.5) { card.style.top = (pt.y + 12) + 'px'; card.style.bottom = 'auto'; card.style.transformOrigin = (pt.x - 12) + 'px 0'; }
    else { card.style.top = 'auto'; card.style.bottom = (H - pt.y + 56) + 'px'; card.style.transformOrigin = (pt.x - 12) + 'px 100%'; }
  }
  map.on('move', positionCard);
  var lastZoom = map.getZoom();
  map.on('moveend zoomend rotate', function () { renderMarkers(); if (map.getZoom() !== lastZoom) { lastZoom = map.getZoom(); renderAreas(); } });

  // ---------- chrome: search, banner, filter, buttons, drawer ----------
  var QUICK = [['all', 'All'], ['road', 'Roads', CATS.road.color], ['light', 'Lights', CATS.light.color], ['pole', 'Power lines', CATS.pole.color], ['outages', 'Outages', '#E5E7EB'], ['places', 'Places', PT.store.color]];
  function drawerH(state) { var H = window.innerHeight; return state === 'closed' ? 30 : state === 'open' ? Math.round(H * 0.6) : 112; }
  function nearLists() {
    var roads = S.reports.filter(function (r) { return r.cat === 'road' && reportVisible(r) === 'yes' && dist(r, ME) < 8000; }).sort(function (a, b) { return dist(a, ME) - dist(b, ME); });
    var gas = S.places.filter(function (p) { return p.type === 'gas' && p.open && dist(p, ME) < 10000; }).sort(function (a, b) { return dist(a, ME) - dist(b, ME); });
    var outs = S.outages.slice().sort(function (a, b) { return dist(a.points[0], ME) - dist(b.points[0], ME); });
    return { road: roads, gas: gas, outage: outs };
  }
  function renderChrome() {
    var ch = $('#chrome'), onMap = !route.name, drop = route.name === 'drop';
    var min = S.settings.bannerMin;
    var bannerTxt = S.tsunami ? ['TSUNAMI WARNING', 'Move to high ground now', 'PTWC ›'] : ['COR 1', 'Typhoon Warning · stay indoors', 'OFFICIAL ›'];
    var strip = min ? '' : '<div class="strip' + (S.tsunami ? ' red' : '') + '"><button class="go" data-act="go" data-to="updates"><span class="cond">' + bannerTxt[0] + '</span><span class="grow" style="font-weight:600;font-size:14px">' + bannerTxt[1] + '</span><span class="small" style="font-weight:700;letter-spacing:.04em">' + bannerTxt[2] + '</span></button><button class="min" data-act="bannerMin" aria-label="Minimize announcement">' + ic('chevL', 20, 'currentColor', 2.6) + '</button></div>';
    var tab = min ? '<button class="bannertab' + (S.tsunami ? ' red' : '') + '" data-act="bannerMax" aria-label="Show announcement: ' + bannerTxt[0] + '">' + ic('chev', 18, 'currentColor', 2.6) + '<span>' + bannerTxt[0] + '</span></button>' : '';
    var cur = QUICK.filter(function (q) { return q[0] === UI.quick; })[0];
    var filter = S.tsunami ? '' : '<div class="filterwrap"' + (min ? ' style="margin-left:30px"' : '') + '><button class="chip' + (UI.quick !== 'all' ? ' on' : '') + '" data-act="filterToggle" aria-expanded="' + UI.filterOpen + '">' + (cur[2] && UI.quick !== 'all' ? '<span class="dot" style="background:' + cur[2] + '"></span>' : '') + cur[1] + ic(UI.filterOpen ? 'chevU' : 'chevD', 16, 'currentColor', 2.6) + '</button>' +
      (UI.filterOpen ? '<div class="filterstack">' + QUICK.filter(function (q) { return q[0] !== UI.quick; }).map(function (c) { return '<button class="chip" data-act="quick" data-v="' + c[0] + '">' + (c[2] ? '<span class="dot" style="background:' + c[2] + '"></span>' : '') + c[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';

    var dstate = S.settings.drawer, dh = drawerH(dstate), drawer = '', tsunamiSheet = '';
    if (onMap && !S.tsunami) {
      var L1 = nearLists();
      var stats = '<div class="stats">' +
        '<button class="stat' + (dstate === 'open' && UI.stat === 'road' ? ' on' : '') + '" style="color:#FB923C" data-act="stat" data-v="road"><b>' + L1.road.length + '</b> road blocks</button>' +
        '<button class="stat' + (dstate === 'open' && UI.stat === 'gas' ? ' on' : '') + '" style="color:#4ADE80" data-act="stat" data-v="gas"><b>' + L1.gas.length + '</b> stations open</button>' +
        '<button class="stat' + (dstate === 'open' && UI.stat === 'outage' ? ' on' : '') + '" style="color:#93C5FD" data-act="stat" data-v="outage"><b>' + L1.outage.length + '</b> outage areas</button></div>';
      var list = '';
      if (dstate === 'open') {
        var items = L1[UI.stat] || [];
        list = items.length ? items.map(function (x) {
          if (UI.stat === 'outage') return '<button class="ditem" data-act="dOutage" data-id="' + x.id + '"><span class="sw sq2" style="--c:' + (x.kind === 'power' ? '#E5E7EB' : '#3B82F6') + '">' + rich(x.kind, 20) + '</span><span class="col grow" style="gap:0"><b>' + esc(x.name) + ' · no ' + x.kind + '</b><span class="small muted">since ' + fdate(x.since) + ' · ' + miles(dist(x.points[0], ME)) + '</span></span>' + ic('chev', 18) + '</button>';
          var isR = UI.stat === 'road', it = { k: isR ? 'r' : 'p', o: x };
          return '<button class="ditem" data-act="dItem" data-k="' + it.k + '" data-id="' + x.id + '">' + swatch(it) + '<span class="col grow" style="gap:0"><b>' + esc(isR ? x.title : x.name) + '</b><span class="small muted">' + (isR ? esc(x.kind) + ' · ' + rel(x.t) : (x.prices.unleaded.v ? '$' + x.prices.unleaded.v.toFixed(2) + ' · ' : '') + 'line ' + x.line) + ' · ' + miles(dist(x, ME)) + '</span></span>' + ic('chev', 18) + '</button>';
        }).join('') : '<div class="muted small">Nothing nearby right now.</div>';
        list += '<div class="grid2" style="margin-top:4px"><button class="btn sm" data-act="go" data-to="updates">Official updates</button><button class="btn sm" data-act="go" data-to="following">Following</button></div>';
      }
      drawer = '<div class="drawer" style="height:calc(' + dh + 'px + var(--safe-bot))"><button class="grip" data-grip="1" aria-label="Drag to resize; tap to expand or collapse"><i></i></button>' +
        (dstate === 'closed' ? '' : '<div class="dbody"><div class="row" style="justify-content:space-between"><b style="font-size:17px">Near you</b><span class="row" style="gap:6px">' + (S.account ? '' : '<span class="demo-tag">READ ONLY</span>') + '<span class="demo-tag">DEMO DATA</span></span></div>' + stats + (dstate === 'open' ? list : (ME.real ? '' : '<div class="small muted">demo location</div>')) + '</div>') + '</div>';
    }
    if (S.tsunami && onMap) {
      var inside = inPoly(ME, C_ZONE), safe = nearestOf('tsunami');
      tsunamiSheet = '<div class="drawer" style="height:auto;border-top:6px solid #DC2626"><div class="dbody" style="padding-top:12px">' +
        (inside ? '<div style="background:#450A0A;color:#FECACA;border-radius:10px;padding:10px 12px;font-weight:700">You appear to be inside the evacuation zone.</div>' : '<div style="background:#052E16;color:#BBF7D0;border-radius:10px;padding:10px 12px;font-weight:700">You appear to be outside the evacuation zone. Stay away from the coast.</div>') +
        (safe ? '<div><div class="small muted" style="font-weight:600">NEAREST TSUNAMI SAFE SPOT</div><div style="font-weight:700;font-size:20px">' + esc(safe.p.name) + '</div><div class="small">' + miles(safe.d) + ' · about ' + Math.max(1, Math.round(safe.d / 80)) + ' min on foot</div></div>' +
          '<button class="btn big full" style="background:#2563EB;color:#fff;border:0" data-act="directions" data-lat="' + safe.p.lat + '" data-lng="' + safe.p.lng + '">DIRECTIONS</button>' : '') +
        '<button class="btn sm" data-act="tsunamiToggle">End demo warning</button></div></div>';
    }
    var fabBottom = !onMap ? 24 : (dstate === 'closed' ? 46 : dstate === 'peek' ? 128 : -200);
    var b = bearing();
    ch.innerHTML =
      '<div class="topbar">' +
        '<div class="row"><label class="search">' + ic('search', 20, '#9BA0A8', 2) + '<input id="q" type="search" placeholder="Search places, villages, feeder #" value="' + esc(UI.q) + '" autocomplete="off"></label>' +
        '<button class="sq" data-act="go" data-to="settings" aria-label="Account and settings">' + (S.account ? (acct(S.me) && acct(S.me).photo ? '<img src="' + acct(S.me).photo + '" alt="">' : esc(S.me.slice(0, 2).toUpperCase())) : ic('user', 22)) + '</button></div>' +
        '<div id="results"></div>' + strip + filter +
      '</div>' + tab +
      ((onMap || drop) && !S.tsunami && fabBottom > 0 ? '<div class="fabs" style="bottom:calc(' + fabBottom + 'px + var(--safe-bot))">' +
        '<button class="sq compass' + (Math.abs(b % 360) < 0.5 ? ' hidden' : '') + '" data-act="compass" aria-label="Reset map to north up"><svg width="26" height="26" viewBox="0 0 24 24" style="transform:rotate(' + (-b) + 'deg)" aria-hidden="true"><path d="M12 2l4 10h-8z" fill="#EF4444"/><path d="M12 22l-4-10h8z" fill="#ECEDEE"/></svg></button>' +
        '<button class="sq" data-act="go" data-to="filters" aria-label="Layers and filters">' + ic('layers', 22) + '</button><button class="sq" data-act="locate" aria-label="My location">' + ic('locate', 22) + '</button></div>' : '') +
      (onMap && !S.tsunami && fabBottom > 0 ? '<button class="fab" style="bottom:calc(' + fabBottom + 'px + var(--safe-bot))" data-act="pinFab" aria-label="Drop a pin at my location">' + PIN_SVG + '</button>' : '') +
      drawer + tsunamiSheet;
    renderResults();
  }
  function nearestOf(type) { var best = null; S.places.forEach(function (p) { if (p.type !== type) return; var d = dist(p, ME); if (!best || d < best.d) best = { p: p, d: d }; }); return best; }
  function renderResults() {
    var box = $('#results'); if (!box) return;
    var q = UI.q.trim().toLowerCase(); if (!q) { box.innerHTML = ''; return; }
    var res = [];
    S.feeders.forEach(function (f) { if (f.id.toLowerCase().replace('-', '').indexOf(q.replace('-', '').replace(' ', '')) >= 0) res.push(['feeder', f.id, f.id, 'GPA feeder · ' + f.desc]); });
    S.places.forEach(function (p) { if (p.name.toLowerCase().indexOf(q) >= 0 || PT[p.type].label.toLowerCase().indexOf(q) >= 0) res.push(['place', p.id, p.name, PT[p.type].label]); });
    C.VILLAGES.forEach(function (v) { if (v[0].toLowerCase().indexOf(q) >= 0) res.push(['village', v[0], v[0], 'Village']); });
    S.reports.forEach(function (r) { if (r.title.toLowerCase().indexOf(q) >= 0) res.push(['report', r.id, r.title, CATS[r.cat].label]); });
    box.innerHTML = res.length ? '<div class="results">' + res.slice(0, 8).map(function (x) { return '<button data-act="pick" data-t="' + x[0] + '" data-id="' + esc(x[1]) + '"><span class="col grow" style="gap:0"><b>' + esc(x[2]) + '</b><span class="small muted">' + esc(x[3]) + '</span></span>' + ic('chev', 18) + '</button>'; }).join('') + '</div>'
      : '<div class="results"><div style="padding:14px" class="muted">No matches</div></div>';
  }

  // drawer drag on the grip
  (function () {
    var startY = 0, startH = 0, dragging = false, moved = false;
    document.addEventListener('pointerdown', function (e) {
      var g = e.target.closest && e.target.closest('[data-grip]'); if (!g) return;
      var d = g.parentElement; dragging = true; moved = false; startY = e.clientY; startH = d.getBoundingClientRect().height;
      d.classList.add('dragging'); try { g.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    document.addEventListener('pointermove', function (e) {
      if (!dragging) return; var d = $('.drawer'); if (!d) return;
      var dy = startY - e.clientY; if (Math.abs(dy) > 6) moved = true;
      d.style.height = Math.max(30, Math.min(window.innerHeight * 0.85, startH + dy)) + 'px';
    });
    document.addEventListener('pointerup', function (e) {
      if (!dragging) return; dragging = false; var d = $('.drawer'); if (!d) return;
      d.classList.remove('dragging');
      var cur = S.settings.drawer;
      if (!moved) { S.settings.drawer = cur === 'open' ? 'peek' : cur === 'closed' ? 'peek' : 'open'; }
      else {
        var h = d.getBoundingClientRect().height, dy = startY - e.clientY, opts = ['closed', 'peek', 'open'];
        var best = opts.reduce(function (a, k) { return Math.abs(drawerH(k) - h) < Math.abs(drawerH(a) - h) ? k : a; }, 'peek');
        if (Math.abs(dy) > 40 && best === cur) best = opts[Math.max(0, Math.min(2, opts.indexOf(cur) + (dy > 0 ? 1 : -1)))];
        S.settings.drawer = best;
      }
      save(); renderChrome();
    });
  })();

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'q') { UI.q = t.value; renderResults(); }
    var b = t.getAttribute && t.getAttribute('data-bind');
    if (b === 'draftNote' && draft) draft.note = t.value;
    if (b === 'suU') { UI.su.u = t.value; refreshSignup(); }
    if (b === 'suP') { UI.su.p = t.value; refreshSignup(); }
    if (b === 'siU') UI.si.u = t.value;
    if (b === 'siP') UI.si.p = t.value;
  });

  // ---------- router ----------
  function parse() { var h = location.hash.replace(/^#\/?/, ''), i = h.indexOf('/'); return i < 0 ? { name: h, arg: '' } : { name: h.slice(0, i), arg: decodeURIComponent(h.slice(i + 1)) }; }
  function go(h, replace) {
    if (replace) { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); renderRoute(); }
    else if (('#' + h) === location.hash) renderRoute(true);
    else location.hash = h;
  }
  function back() { if (history.length > 1 && location.hash) history.back(); else go('', true); }
  window.addEventListener('hashchange', function () { renderRoute(); });
  window.addEventListener('resize', function () { renderChrome(); });

  function renderRoute(keep) {
    var prev = route.name;
    route = parse();
    if (prev === 'camera' && route.name !== 'camera') stopCam();
    if (['drop', 'report', 'camera'].indexOf(route.name) < 0 && draft) clearDraft();
    if (route.name === 'drop' && !draft) { go('', true); return; }
    if (route.name === 'report' && (!draft || !draft.cat)) { go('', true); return; }
    if (['signup', 'signin'].indexOf(route.name) < 0) UI.ts = 'idle';
    var key = route.name + '/' + route.arg, same = key === lastRouteKey || keep;
    lastRouteKey = key;
    var ov = $('#overlay'), scroll = $('.body', ov), st = scroll ? scroll.scrollTop : 0;
    var html = '';
    try { html = (VIEWS[route.name] || function () { return ''; })(route.arg); } catch (err) { html = ''; console.error(err); }
    ov.innerHTML = html;
    ov.classList.toggle('still', !!same);
    var nb = $('.body', ov); if (nb && same) nb.scrollTop = st;
    UI.filterOpen = false;
    renderChrome(); renderMarkers(); renderAreas();
    if (route.name === 'drop') positionCard();
    if (route.name === 'camera') startCam();
  }

  // ---------- shared view pieces ----------
  function hdr(color, title, extra) {
    return '<div class="hdr ' + color + '"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back', 22) + '</button><h1>' + esc(title) + '</h1>' + (extra || '') + '</div>';
  }
  function followBtn(kind, id) {
    var on = S.account && S.follows[kind].indexOf(id) >= 0;
    return '<button class="follow' + (on ? ' on' : '') + '" data-act="follow" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-pressed="' + !!on + '">' + ic('bell', 16, 'currentColor', 2, on ? 'currentColor' : 'none') + (on ? 'Following' : 'Follow') + '</button>';
  }
  function notesHtml(list, key) {
    if (!list.length) return '<div class="muted small">No notes yet.' + (S.account ? ' Be the first.' : '') + '</div>';
    return list.slice().sort(function (a, b) { return b.t - a.t; }).map(function (n) {
      var k = key + ':' + n.id, mine = S.account && n.by === S.me, ed = UI.editing === k;
      return '<div class="note">' + avatar(n.by) + '<div class="bubble"><div class="who"><b>' + esc(n.by) + (mine ? ' (you)' : '') + '</b>' + roleTag(n.by) + '<span class="muted">· ' + rel(n.t) + '</span>' + (n.updated ? '<span class="tag updated">Updated</span>' : '') + '</div>' +
        (n.photo ? '<img src="' + n.photo + '" alt="Photo" style="width:100%;border-radius:8px">' : '') +
        (ed ? '<textarea class="input" id="edit-' + esc(n.id) + '">' + esc(n.text) + '</textarea><div class="row"><button class="btn sm fuchsia" data-act="saveEdit" data-k="' + esc(k) + '">Save update</button><button class="btn sm" data-act="cancelEdit">Cancel</button></div>'
          : '<div style="font-size:15px;line-height:1.4">' + esc(n.text) + '</div>') +
        (UI.expanded[k] && n.versions.length ? '<div class="small muted" style="border-left:3px solid var(--line);padding-left:8px">' + n.versions.map(function (v) { return fdate(v.t) + ' ' + new Date(v.t).toTimeString().slice(0, 5) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
        '<div class="row" style="gap:12px">' + (mine && !ed ? '<button class="btn sm" data-act="editNote" data-k="' + esc(k) + '">' + ic('edit', 14) + 'Edit</button>' : '') +
        (n.versions.length ? '<button class="btn link" data-act="toggleHist" data-k="' + esc(k) + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (n.versions.length + 1) + ' versions</button>' : '') + '</div></div></div>';
    }).join('');
  }
  function composer(target) {
    if (!S.account) return '<div class="guestbar">' + ic('lock', 20, '#9BA0A8') + '<span class="grow small muted">You’re browsing read-only.</span><button class="btn sm fuchsia" data-act="join" data-v="add notes">Sign in to add notes</button></div>';
    return '<div class="composer"><input id="composer" type="text" placeholder="Add a note…" aria-label="Add a note" enterkeyhint="send"><button class="round-btn" style="border:1px solid var(--line);background:var(--card2);color:var(--text)" data-act="camNote" data-target="' + target + '" aria-label="Attach photo">' + ic('camera', 22, 'currentColor', 2) + '</button><button class="round-btn" style="background:#F037A5;color:#121212" data-act="postNote" data-target="' + target + '" aria-label="Post note">' + ic('send', 20, 'currentColor', 2.4) + '</button></div>';
  }
  function seg(act, id, opts, cur, colors) {
    return '<div class="seg">' + opts.map(function (o) { var on = o[0] === cur; return '<button class="' + (on ? 'on' : '') + '" style="' + (on ? 'background:' + (colors[o[0]] || '#ECEDEE') : '') + '" data-act="' + act + '" data-id="' + id + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function catTile(cat, isPlace) {
    var c = isPlace ? PT[cat] : CATS[cat];
    return '<button class="cat' + (isPlace ? ' place' : '') + '" data-act="' + (isPlace ? 'dropPlace' : 'dropCat') + '" data-v="' + cat + '"><span class="i" style="--c:' + c.color + '">' + rich(cat, 26) + '</span>' + c.short + '</button>';
  }

  // ---------- views ----------
  var VIEWS = {};
  VIEWS[''] = function () { return ''; };

  VIEWS.join = function (why) {
    return '<div class="scrim" data-act="back"></div><div class="sheet t-klein"><div class="handle"></div>' +
      '<div class="row">' + ic('lock', 24, '#8B6CFF') + '<b class="grow" style="font-size:20px">Sign in to ' + esc(why || 'contribute') + '</b><button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<div style="color:var(--text2);line-height:1.45">Anyone can read the map. A free account lets you drop pins, vote, add notes and photos, confirm places and follow areas. Just a username and password.</div>' +
      '<button class="btn big klein full" data-act="go" data-to="signup" data-replace="1">CREATE ACCOUNT</button><button class="btn full" data-act="go" data-to="signin" data-replace="1">I already have an account</button><button class="btn link" style="align-self:center" data-act="back">Keep browsing</button></div>';
  };

  function turnstile() {
    var s = UI.ts;
    return '<div class="ts" role="group" aria-label="Human verification (demo)">' +
      (s === 'ok' ? '<span class="box" style="border-color:#22C55E;background:#22C55E">' + ic('check', 18, '#111', 3) + '</span><span style="font-weight:600">Success!</span>'
        : s === 'busy' ? '<span class="spin"></span><span>Verifying…</span>'
        : '<button class="box" data-act="tsCheck" aria-label="Verify you are human"></button><span>Verify you are human</span>') +
      '<span class="brand"><b>CLOUDFLARE</b><br>Turnstile · demo</span></div>';
  }
  function signupValid() {
    var u = UI.su.u.trim(), okU = /^[A-Za-z0-9_]{3,20}$/.test(u), taken = okU && (acct(u) || C.USERS[u.toLowerCase()] || u.toLowerCase() === 'guest');
    return { u: u, okU: okU && !taken, taken: !!taken, okP: UI.su.p.length >= 8 };
  }
  function refreshSignup() {
    var v = signupValid(), hu = $('#suHintU'), hp = $('#suHintP'), b = $('[data-act="createAccount"]');
    if (hu) { hu.textContent = !UI.su.u ? '3–20 letters, numbers or _' : v.taken ? 'That username is taken' : v.okU ? 'Available' : '3–20 letters, numbers or _'; hu.style.color = v.taken ? '#FCA5A5' : v.okU ? '#4ADE80' : ''; }
    if (hp) { hp.textContent = UI.su.p.length >= 8 ? 'Looks good' : 'At least 8 characters'; hp.style.color = UI.su.p.length >= 8 ? '#4ADE80' : ''; }
    if (b) b.disabled = !(v.okU && v.okP && UI.ts === 'ok');
  }
  VIEWS.signup = function () {
    var v = signupValid();
    return '<div class="page">' + hdr('klein', 'Create account') + '<div class="body">' +
      '<div class="row" style="gap:14px"><button class="avpick" data-act="pickAvatar" aria-label="Add profile photo (optional)" style="' + (UI.su.photo ? 'background-image:url(' + UI.su.photo + ');border-style:solid' : '') + '">' + (UI.su.photo ? '' : ic('camera', 26)) + '</button>' +
        '<div class="col" style="gap:2px"><b>Profile photo</b><span class="small muted">Optional. Shown next to your notes.</span>' + (UI.su.photo ? '<button class="btn link" style="align-self:flex-start" data-act="clearAvatar">Remove</button>' : '') + '</div></div>' +
      '<input id="avfile" type="file" accept="image/*" class="hidden">' +
      '<label class="col" style="gap:4px"><b>Username</b><input class="input" data-bind="suU" value="' + esc(UI.su.u) + '" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"><span id="suHintU" class="small muted">3–20 letters, numbers or _</span></label>' +
      '<label class="col" style="gap:4px"><b>Password</b><span class="row"><input class="input grow" data-bind="suP" type="' + (UI.su.show ? 'text' : 'password') + '" value="' + esc(UI.su.p) + '" autocomplete="new-password"><button class="btn sm" data-act="togglePw" aria-label="Show password">' + ic('eye', 18) + '</button></span><span id="suHintP" class="small muted">At least 8 characters</span></label>' +
      turnstile() +
      '<div class="small muted" style="line-height:1.45">No email or phone needed. There’s no password reset without one, so keep your password somewhere safe.</div>' +
      '<button class="btn big klein full" data-act="createAccount"' + (v.okU && v.okP && UI.ts === 'ok' ? '' : ' disabled') + '>CREATE ACCOUNT</button>' +
      '<button class="btn link" style="align-self:center" data-act="go" data-to="signin" data-replace="1">I already have an account</button></div></div>';
  };
  VIEWS.signin = function () {
    return '<div class="page">' + hdr('klein', 'Sign in') + '<div class="body">' +
      '<label class="col" style="gap:4px"><b>Username</b><input class="input" data-bind="siU" value="' + esc(UI.si.u) + '" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
      '<label class="col" style="gap:4px"><b>Password</b><input class="input" data-bind="siP" type="password" value="' + esc(UI.si.p) + '" autocomplete="current-password"></label>' +
      (UI.si.err ? '<div style="color:#FCA5A5;font-weight:600">' + esc(UI.si.err) + '</div>' : '') +
      turnstile() +
      '<button class="btn big klein full" data-act="doSignin"' + (UI.ts === 'ok' ? '' : ' disabled') + '>SIGN IN</button>' +
      '<div class="soft small" style="color:var(--text2)">Demo: sign in as <b>cougot</b> / <b>demo1234</b> for the omega account, or use any account you created on this phone.</div>' +
      '<button class="btn link" style="align-self:center" data-act="go" data-to="signup" data-replace="1">Create an account instead</button></div></div>';
  };

  VIEWS.drop = function () {
    var vill = nearestVillage(draft), snap = draft.snap ? byId(S.places, draft.snap) : null;
    if (snap) {
      var t = PT[snap.type];
      return '<div class="dropcard" role="dialog" aria-label="Did you mean"><div class="row"><span class="sw sq2" style="--c:' + t.color + ';width:42px;height:42px">' + rich(snap.type, 26) + '</span><span class="col grow" style="gap:0"><b style="font-size:18px">Did you mean ' + esc(snap.name) + '?</b><span class="small muted">' + t.label + ' · ' + esc(nearestVillage(snap)) + '</span></span><button class="icon-btn" data-act="back" aria-label="Cancel">' + ic('close', 18) + '</button></div>' +
        '<button class="btn aqua full" data-act="snapYes">Yes, update this ' + t.short.toLowerCase() + '</button><button class="btn full" data-act="snapNo">No, something else here</button></div>';
    }
    return '<div class="dropcard" role="dialog" aria-label="What is here"><div class="row"><span class="col grow" style="gap:0"><b style="font-size:18px">What’s here?</b><span class="small muted">Pin near ' + esc(vill) + ' · drag the pin to adjust</span></span><button class="icon-btn" data-act="back" aria-label="Cancel">' + ic('close', 18) + '</button></div>' +
      '<div class="catgrid">' + ['road', 'light', 'pole', 'power', 'water'].map(function (c) { return catTile(c); }).join('') + '<span></span>' + ['gas', 'store', 'supply', 'shelter', 'muster', 'tsunami'].map(function (c) { return catTile(c, true); }).join('') + '</div></div>';
  };

  VIEWS.report = function () {
    var c = CATS[draft.cat], vill = nearestVillage(draft);
    return '<div class="sheet t-tangerine" style="max-height:62%">' +
      '<div class="row"><span class="sw" style="--c:' + c.color + ';width:42px;height:42px">' + rich(draft.cat, 26) + '</span><span class="col grow" style="gap:0"><b style="font-size:18px">' + c.label + '</b><span class="small muted">near ' + esc(vill) + ' · drag the pin to fine-tune</span></span><button class="btn sm" data-act="changeCat">Change</button></div>' +
      '<div class="lbl">What kind?</div><div class="row" style="flex-wrap:wrap">' + c.kinds.map(function (k) { return '<button class="chip' + (draft.kind === k ? ' on' : '') + '" style="box-shadow:none;' + (draft.kind === k ? 'background:#FF4632;border-color:#FF4632;color:#121212' : '') + '" data-act="kind" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div>' +
      '<div class="row">' + (draft.photo ? '<button style="width:64px;height:64px;border-radius:12px;border:0;background:url(' + draft.photo + ') center/cover;flex-shrink:0" data-act="removePhoto" aria-label="Remove photo"></button>' : '<button style="width:64px;height:64px;border-radius:12px;border:2px dashed var(--line);background:var(--card2);color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0" data-act="camDraft" aria-label="Add photo">' + ic('camera', 26, 'currentColor', 2) + '</button>') +
      '<input class="input grow" style="height:64px" data-bind="draftNote" placeholder="Note (optional): lanes, depth, detour…" value="' + esc(draft.note) + '"></div>' +
      (S.frozen && !isAdmin() ? '<div class="small" style="color:#FCA5A5;font-weight:700">Posting is paused by an admin.</div>' : '') +
      '<button class="btn big tangerine full" data-act="postReport"' + (S.frozen && !isAdmin() ? ' disabled' : '') + '>POST HERE</button></div>';
  };

  VIEWS.camera = function () {
    return '<div class="camera"><video id="camvid" playsinline muted autoplay></video>' +
      '<div class="camwarn" role="alert"><div class="a">PHOTO RESPONSIBLY:</div><div class="b">PULL OVER SAFELY BEFORE TAKING PICTURES IF DRIVING</div></div>' +
      '<div class="row" style="position:relative;z-index:2;padding:10px 8px"><button class="icon-btn" style="background:rgba(0,0,0,.55);color:#fff" data-act="back" aria-label="Back">' + ic('back', 22) + '</button><span style="background:rgba(0,0,0,.55);color:#fff;border-radius:16px;padding:6px 12px;font-weight:600;font-size:14px">' + esc(UI.camTarget && UI.camTarget !== 'draft' ? 'Photo for your note' : (draft && draft.cat ? CATS[draft.cat].label + (draft.kind ? ' · ' + draft.kind : '') : 'Photo')) + '</span></div>' +
      '<div id="camerr" class="hidden" style="position:relative;z-index:2;margin:auto;color:#fff;text-align:center;padding:24px;display:flex;flex-direction:column;gap:12px;align-items:center"><div>Camera preview isn’t available here.</div><button class="btn aqua" data-act="camFile">Choose or take a photo</button></div>' +
      '<input id="camfile" type="file" accept="image/*" capture="environment" class="hidden">' +
      '<div class="camctl"><button style="width:52px;height:52px;border-radius:10px;border:2px solid #fff;background:#3A4048" data-act="camFile" aria-label="Choose from gallery"></button><button class="shutter" data-act="camShoot" aria-label="Take photo"><span></span></button><span style="width:52px"></span></div></div>';
  };

  VIEWS.pin = function (id) {
    var r = byId(S.reports, id); if (!r) return VIEWS.missing();
    var c = CATS[r.cat], mine = S.account && r.by === S.me, k = 'r:' + r.id + ':main', ed = UI.editing === k;
    var main = r.note, updated = main.versions.length > 0;
    return '<div class="page">' +
      '<div class="body" style="padding:0;gap:0">' +
        '<div class="photo" style="' + (r.photo ? 'background-image:url(' + r.photo + ')' : '') + '">' + (r.photo ? '' : 'No photo yet') +
          '<button class="icon-btn" style="position:absolute;left:10px;top:calc(10px + var(--safe-top));background:rgba(0,0,0,.6);color:#fff" data-act="back" aria-label="Back">' + ic('back', 22) + '</button>' +
          '<button class="icon-btn" style="position:absolute;right:10px;top:calc(10px + var(--safe-top));background:rgba(0,0,0,.6);color:#fff" data-act="flagReport" data-id="' + r.id + '" aria-label="Flag this report">' + ic('flag', 20) + '</button></div>' +
        '<div style="padding:16px;background:var(--card);border-top:6px solid #F037A5;border-bottom:1px solid var(--line2);display:flex;flex-direction:column;gap:6px">' +
          '<div class="row"><span class="sw" style="--c:' + c.color + '">' + rich(r.cat, 20) + '</span><span class="tag" style="background:' + c.color + ';color:#121212">' + c.label + ' · ' + esc(r.kind) + '</span></div>' +
          '<div style="font-weight:700;font-size:22px;line-height:1.2">' + esc(r.title) + '</div>' +
          '<div class="small muted">Reported by ' + esc(r.by) + ' · ' + rel(r.t) + ' · last activity ' + rel(r.last) + ' · ' + miles(dist(r, ME)) + ' away</div>' +
          '<div class="row" style="margin-top:6px"><div class="vote" role="group" aria-label="Vote"><button class="' + (r.myVote > 0 ? 'on' : '') + '" data-act="vote" data-id="' + r.id + '" data-v="1" aria-label="Upvote">' + ic('up', 20, 'currentColor', 2.6) + '</button><b>' + (r.score > 0 ? '+' : '') + r.score + '</b><button class="' + (r.myVote < 0 ? 'on' : '') + '" data-act="vote" data-id="' + r.id + '" data-v="-1" aria-label="Downvote">' + ic('down', 20, 'currentColor', 2.6) + '</button></div><span class="grow"></span>' +
          '<button class="follow" data-act="mergeOpen" data-id="' + r.id + '">' + ic('merge', 18) + 'Suggest merge</button></div>' +
        '</div>' +
        '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px">' +
          '<div class="card"><div class="row" style="justify-content:space-between"><b>Note from ' + esc(r.by) + (mine ? ' (you)' : '') + '</b>' + (updated ? '<span class="tag updated">Updated ' + rel(main.t) + '</span>' : '') + '</div>' +
            (ed ? '<textarea class="input" id="edit-main">' + esc(main.text) + '</textarea><div class="row"><button class="btn sm fuchsia" data-act="saveEdit" data-k="' + k + '">Save update</button><button class="btn sm" data-act="cancelEdit">Cancel</button></div>'
              : '<div style="font-size:16px;line-height:1.45">' + (main.text ? esc(main.text) : '<span class="muted">No note.</span>') + '</div>') +
            (UI.expanded[k] ? '<div class="small muted" style="border-left:3px solid var(--line);padding-left:8px">' + main.versions.map(function (v) { return fdate(v.t) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
            '<div class="row" style="gap:12px">' + (mine && !ed ? '<button class="btn sm" data-act="editNote" data-k="' + k + '">' + ic('edit', 14) + 'Update note</button>' : '') + (updated ? '<button class="btn link" data-act="toggleHist" data-k="' + k + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (main.versions.length + 1) + ' versions</button>' : '') + '</div></div>' +
          '<div class="row" style="justify-content:space-between"><span class="lbl">Notes on this · ' + r.notes.length + '</span><span class="small muted">Newest first</span></div>' +
          notesHtml(r.notes, 'r:' + r.id) +
        '</div>' +
      '</div>' + composer('r:' + r.id) + '</div>';
  };

  VIEWS.merge = function (id) {
    var r = byId(S.reports, id); if (!r) return VIEWS.missing();
    var cands = S.reports.filter(function (x) { return x.id !== r.id && x.cat === r.cat && dist(x, r) < 1500; }).sort(function (a, b) { return dist(a, r) - dist(b, r); });
    UI.mergePick = UI.mergePick && byId(cands, UI.mergePick) ? UI.mergePick : (cands[0] && cands[0].id);
    return '<div class="scrim" data-act="back"></div><div class="sheet t-fuchsia"><div class="handle"></div><div class="row"><b class="grow" style="font-size:19px">Suggest merge</b><button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<div class="small muted">This report: <b style="color:var(--text)">' + esc(r.title) + '</b></div><div class="lbl">Which nearby pin is the same thing?</div>' +
      (cands.length ? cands.map(function (x) { var on = x.id === UI.mergePick; return '<button class="card" style="flex-direction:row;align-items:center;' + (on ? 'border:2px solid #F037A5' : '') + '" data-act="mergePick" data-id="' + x.id + '"><span style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (on ? '#F037A5' : '#6B7280') + ';background:' + (on ? '#F037A5' : 'transparent') + ';flex-shrink:0"></span><span class="col grow" style="gap:2px"><b>' + esc(x.title) + '</b><span class="small muted">' + miles(dist(x, r)) + ' away · ' + rel(x.t) + ' · ' + (x.score > 0 ? '+' : '') + x.score + '</span></span></button>'; }).join('')
        : '<div class="muted">No similar pins nearby.</div>') +
      '<div class="soft" style="font-size:14px;line-height:1.45;color:var(--text2)"><b style="color:var(--text)">If merged:</b> notes, photos and votes combine into one pin. Each note keeps its author. An admin reviews the suggestion first.</div>' +
      '<button class="btn big fuchsia full" data-act="sendMerge" data-id="' + r.id + '"' + (cands.length ? '' : ' disabled') + '>SEND SUGGESTION</button></div>';
  };

  VIEWS.place = function (id) {
    var p = byId(S.places, id); if (!p) return VIEWS.missing();
    var t = PT[p.type], body = p.type === 'gas' ? gasBody(p) : p.type === 'store' ? storeBody(p) : safeBody(p);
    return '<div class="page"><div class="hdr aqua" style="align-items:flex-start;padding-top:calc(8px + var(--safe-top));padding-bottom:12px"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back', 22) + '</button>' +
      '<div class="col grow" style="gap:2px;padding-top:6px"><div style="font-weight:700;font-size:21px;line-height:1.15">' + esc(p.name) + '</div><div class="small sub">' + t.label + ' · ' + esc(nearestVillage(p)) + ' · ' + miles(dist(p, ME)) + (p.official ? ' · <b>official</b>' : '') + (p.pending ? ' · <b>pending review</b>' : '') + '</div></div>' + followBtn('places', p.id) + '</div>' +
      '<div class="body">' + body + '<div class="lbl">Discussion · ' + p.notes.length + '</div>' + notesHtml(p.notes, 'p:' + p.id) + '</div>' + composer('p:' + p.id) + '</div>';
  };
  function gasBody(p) {
    var pr = p.prices;
    function prow(k, label) { var x = pr[k]; return '<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line2)"><span style="font-weight:600;font-size:16px">' + label + '</span><span>' + (x.out ? '<b class="muted">Sold out</b>' : x.v ? '<b style="font-size:20px">$' + x.v.toFixed(2) + '</b>' : '<b class="muted">—</b>') + ' <span class="small muted">' + (x.t ? rel(x.t) : '') + '</span></span></div>'; }
    return '<div class="card"><div class="row"><span class="cond" style="font-size:26px;padding:2px 12px;border-radius:6px;background:' + (p.open ? '#16A34A' : '#4B5563') + ';color:#fff">' + (p.open ? 'OPEN' : 'CLOSED') + '</span><span class="small" style="line-height:1.3">' + (p.open ? p.openVotes : p.closedVotes) + ' people said ' + (p.open ? 'open' : 'closed') + '<br><span class="muted">last report ' + rel(p.statusT) + '</span></span></div>' +
      '<div class="grid2"><button class="btn green" data-act="gasStatus" data-id="' + p.id + '" data-v="1">It’s open</button><button class="btn gray" data-act="gasStatus" data-id="' + p.id + '" data-v="0">It’s closed</button></div>' +
      '<div class="row" style="border-top:1px solid var(--line2);padding-top:10px"><b class="grow">Line right now</b>' + seg('line', p.id, [['none', 'None'], ['short', 'Short'], ['long', 'Long · ' + p.lineVotes.long]], p.line, { none: '#4ADE80', short: '#FBBF24', long: '#FB923C' }) + '</div></div>' +
      '<div class="card" style="gap:4px"><div class="lbl">Prices</div>' + prow('unleaded', 'Unleaded') + prow('diesel', 'Diesel') + prow('premium', 'Premium') +
      '<button class="btn full" style="margin-top:8px" data-act="pricesOpen" data-id="' + p.id + '">Report prices</button></div>' +
      (p.tags.length ? '<div class="row" style="flex-wrap:wrap;gap:6px">' + p.tags.map(function (x) { return '<span class="tag soft" style="font-family:Barlow;font-size:14px;text-transform:none;letter-spacing:0;padding:5px 10px;border-radius:15px">' + esc(x) + '</span>'; }).join('') + '</div>' : '');
  }
  function storeBody(p) {
    var ok = p.owner, k = 'p:' + p.id + ':owner';
    var owner = ok ? '<div class="card" style="border-color:#22D3EE;background:#0B2A30"><div class="row" style="flex-wrap:wrap;gap:6px"><span class="tag" style="background:#22D3EE;color:#121212">' + ic('check', 12, '#121212', 3) + 'Verified owner</span>' + (ok.versions.length ? '<span class="tag updated">Updated ' + rel(ok.t) + '</span>' : '') + '</div><div style="font-size:16px;line-height:1.45">' + esc(ok.text) + '</div>' +
      (UI.expanded[k] ? '<div class="small muted" style="border-left:3px solid #22D3EE;padding-left:8px">' + ok.versions.map(function (v) { return fdate(v.t) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
      (ok.versions.length ? '<button class="btn link" style="align-self:flex-start" data-act="toggleHist" data-k="' + k + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (ok.versions.length + 1) + ' versions</button>' : '') + '</div>'
      : '<div class="card" style="border-style:dashed"><b>No owner notes yet</b><div class="small muted">Own this store? Claim it to post official hours and stock.</div><button class="btn sm" data-act="claim" data-id="' + p.id + '">Claim this store</button></div>';
    var stock = '<div class="card"><div class="row" style="justify-content:space-between"><span class="lbl">Stock check</span><span class="small muted">tap to update · ' + rel(p.stockT) + '</span></div>' +
      Object.keys(p.stock).map(function (item) { var s = p.stock[item]; return '<div class="row"><span class="grow" style="font-weight:600">' + esc(item) + '</span>' + seg('stock', p.id + '|' + item, [['in', 'In stock' + (s.s === 'in' ? ' · ' + s.n : '')], ['low', 'Low' + (s.s === 'low' ? ' · ' + s.n : '')], ['out', 'Out' + (s.s === 'out' ? ' · ' + s.n : '')]], s.s, { in: '#4ADE80', low: '#FBBF24', out: '#9CA3AF' }) + '</div>'; }).join('') +
      '<div class="row" style="border-top:1px solid var(--line2);padding-top:8px"><b class="grow">Line at the door</b>' + seg('line', p.id, [['none', 'None'], ['short', 'Short'], ['long', 'Long · ' + p.lineVotes.long]], p.line, { none: '#4ADE80', short: '#FBBF24', long: '#FB923C' }) + '</div>' +
      (S.account ? '<div class="row"><input class="input grow" id="newitem" placeholder="Add an item to check"><button class="btn sm" data-act="addItem" data-id="' + p.id + '">Add</button></div>' : '') + '</div>';
    var prices = '<div class="card"><div class="lbl">Recent price reports</div>' + (p.prices.length ? p.prices.map(function (x, i) {
      return '<div class="col" style="gap:4px;padding-bottom:10px;border-bottom:1px solid var(--line2)"><div class="row" style="justify-content:space-between"><span style="font-weight:600;font-size:16px">' + esc(x.item) + '</span><b style="font-size:20px">$' + x.v.toFixed(2) + '</b></div>' +
        (x.before ? '<div class="small" style="color:var(--text2)">Before the storm: <b style="color:var(--text)">$' + x.before.toFixed(2) + '</b></div>' : '') +
        '<div class="row" style="flex-wrap:wrap">' + (x.flags >= 3 ? '<span class="tag" style="background:#F97316;color:#121212">Gouging suspected · ' + x.flags + ' flags</span>' : '') + '<span class="small muted">' + rel(x.t) + '</span><span class="grow"></span><button class="btn sm red" data-act="flagPrice" data-id="' + p.id + '" data-v="' + i + '">' + ic('flag', 14) + 'Flag gouging' + (x.flags && x.flags < 3 ? ' · ' + x.flags : '') + '</button></div></div>';
    }).join('') : '<div class="muted small">No prices reported yet.</div>') +
      (S.account ? '<div class="lbl" style="margin-top:4px">Report a price</div><input class="input" id="pitem" placeholder="Item (e.g. Bottled water, 24-pack)"><div class="grid2"><input class="input" id="pnow" inputmode="decimal" placeholder="Price now $"><input class="input" id="pbefore" inputmode="decimal" placeholder="Before storm $ (optional)"></div><button class="btn" data-act="addPrice" data-id="' + p.id + '">Submit price</button>' : '') + '</div>';
    return owner + stock + prices;
  }
  function relevantCard(p) {
    var a = S.account && S.relevant[S.me + ':' + p.id], open = p.type === 'shelter' || p.type === 'supply';
    var yes = open ? 'still open' : 'still valid', no = open ? 'closed' : 'not anymore';
    if (a && now() - a.t < WEEK && !UI.expanded['rel:' + p.id]) {
      return '<button class="relevant-min" data-act="relExpand" data-id="' + p.id + '">' + ic('check', 18, '#4ADE80', 2.6) + '<span class="grow">You answered “' + (a.v === 'yes' ? 'Yes, ' + yes : a.v === 'no' ? 'No, ' + no : 'Not sure') + '” on ' + fdate(a.t) + '. Asks again ' + fdate(a.t + WEEK) + '.</span>' + ic('chevD', 20) + '</button>';
    }
    return '<div class="card" style="background:var(--card2)"><div class="row"><b class="grow" style="font-size:17px">Do you know if this is still relevant?</b>' + (a ? '<button class="icon-btn" data-act="relCollapse" data-id="' + p.id + '" aria-label="Collapse">' + ic('chevU', 20) + '</button>' : '') + '</div><div class="small" style="color:var(--text2)">Last confirmed <b style="color:var(--text)">' + fdate(p.confirmed) + '</b> (' + rel(p.confirmed) + ') by ' + p.confirmN + ' ' + (p.confirmN === 1 ? 'person' : 'people') + '</div>' +
      '<div class="grid2"><button class="btn green" data-act="confirm" data-id="' + p.id + '" data-v="yes">Yes, ' + yes + '</button><button class="btn gray" data-act="confirm" data-id="' + p.id + '" data-v="no">No, ' + no + '</button></div><button class="btn link" style="align-self:center" data-act="confirm" data-id="' + p.id + '" data-v="skip">Not sure, skip</button></div>';
  }
  function safeBody(p) {
    var t = PT[p.type], desc = {
      shelter: 'Stay here: sleeping space and basic services.',
      muster: 'Gather point only. No shelter or services; used for headcounts and pickup.',
      tsunami: 'High ground. Go here during a tsunami warning.',
      supply: p.detail || 'Water, ice or food distribution.'
    }[p.type];
    return '<div class="row" style="flex-wrap:wrap;gap:6px"><span class="sw sq2" style="--c:' + t.color + '">' + rich(p.type, 20) + '</span><span class="tag" style="background:' + t.color + ';color:#121212">' + t.label + '</span>' + (p.official ? '<span class="tag official">Official</span>' : '<span class="tag soft">Community</span>') + '<span class="tag soft">Long-term</span></div>' +
      '<div style="font-size:15px;color:var(--text2)">' + esc(desc) + '</div>' +
      (p.type === 'shelter' ? '<div class="card"><div class="row" style="align-items:baseline;gap:10px"><b style="font-size:28px">' + p.occ + ' / ' + p.cap + '</b><span class="small">occupancy · ' + (p.cap ? Math.round(p.occ / p.cap * 100) : 0) + '% full<br><span class="muted">from JIC release, ' + fdate(p.occT) + '</span></span></div>' +
        '<div class="row" style="justify-content:space-between;border-top:1px solid var(--line2);padding-top:6px"><span class="muted">Pets</span><b>' + p.pets + '</b></div><div class="row" style="justify-content:space-between"><span class="muted">Generator power</span><b>' + p.generator + '</b></div></div>' : '') +
      (S.account ? relevantCard(p) : '<div class="card" style="background:var(--card2)"><div class="small" style="color:var(--text2)">Last confirmed <b style="color:var(--text)">' + fdate(p.confirmed) + '</b> by ' + p.confirmN + ' ' + (p.confirmN === 1 ? 'person' : 'people') + '.</div><button class="btn sm" data-act="join" data-v="confirm places">Sign in to confirm</button></div>') +
      '<button class="btn" data-act="directions" data-lat="' + p.lat + '" data-lng="' + p.lng + '">Directions</button>';
  }

  VIEWS.prices = function (id) {
    var p = byId(S.places, id); if (!p) return VIEWS.missing();
    function f(k, label, req) { var x = p.prices[k]; return '<label class="col" style="gap:4px"><span class="row" style="justify-content:space-between"><b class="cond" style="font-size:16px">' + label + (req ? '' : ' <span class="muted" style="font-family:Barlow;font-weight:500;font-size:13px;letter-spacing:0">optional</span>') + '</b><span class="small muted">' + (x.v ? 'Last: $' + x.v.toFixed(2) + ' · ' + rel(x.t) : '') + '</span></span><span class="row" style="height:' + (req ? 72 : 56) + 'px;border:' + (req ? '2px solid #22C55E' : '1px solid var(--line)') + ';border-radius:14px;padding:0 14px;background:' + (req ? '#052E16' : 'var(--card2)') + '"><b style="font-size:' + (req ? 32 : 20) + 'px;color:var(--muted)">$</b><input id="pr-' + k + '" inputmode="decimal" placeholder="' + (req ? '0.00' : '—') + '" style="border:0;outline:0;background:transparent;font-size:' + (req ? 36 : 22) + 'px;font-weight:700;flex:1;min-width:0"><span class="small muted">/ gal</span></span></label>'; }
    return '<div class="scrim" data-act="back"></div><div class="sheet t-aqua"><div class="handle"></div><div class="row"><b class="grow" style="font-size:20px">Report prices</b><button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div><div class="small muted">' + esc(p.name) + '</div>' +
      f('unleaded', 'UNLEADED', true) + f('diesel', 'Diesel') + f('premium', 'Premium') + '<button class="btn big aqua full" data-act="submitPrices" data-id="' + p.id + '">SUBMIT PRICES</button></div>';
  };

  VIEWS.outage = function (id) {
    var o = byId(S.outages, id); if (!o) return VIEWS.missing();
    var outs = o.points.filter(function (q) { return q.st === 'out'; }).length, backs = o.points.length - outs, pw = o.kind === 'power';
    return '<div class="sheet t-aqua" style="max-height:58%"><div class="handle"></div>' +
      '<div class="row"><span class="sw sq2" style="--c:' + (pw ? '#E5E7EB' : '#3B82F6') + '">' + rich(o.kind, 20) + '</span><span class="tag" style="background:' + (pw ? '#E5E7EB' : '#3B82F6') + ';color:#121212">' + (pw ? 'Power' : 'Water') + ' outage</span><span class="grow"></span>' + followBtn('villages', o.name) + '<button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<b style="font-size:21px">' + esc(o.name) + ' area</b>' +
      '<div class="small" style="line-height:1.45;color:var(--text2)">Out since <b style="color:var(--text)">' + fdate(o.since) + '</b> · last confirmed ' + rel(o.confirmed) + '. Shape built from ' + outs + ' “no ' + o.kind + '” reports; ' + backs + ' nearby say it’s back. Stays on the map until people report it’s back.</div>' +
      (S.account ? '<b class="small">At your location' + (ME.real ? '' : ' (demo location)') + ':</b><div class="grid2"><button class="btn black" data-act="outagePt" data-id="' + o.id + '" data-v="out">No ' + o.kind + ' here</button><button class="btn green" data-act="outagePt" data-id="' + o.id + '" data-v="back">' + (pw ? 'Power' : 'Water') + ' is back</button></div>'
        : '<button class="btn" data-act="join" data-v="report outages">Sign in to report your spot</button>') + '</div>';
  };

  VIEWS.feeder = function (id) {
    var f = byId(S.feeders, id); if (!f) return VIEWS.missing();
    var lab = { on: ['ON', '#4ADE80'], working: ['CREWS WORKING · NEXT 1–3 DAYS', '#FBBF24'], partial: ['PARTIALLY ON', '#FDE68A'], out: [f.heavy ? 'OUT · HEAVY DAMAGE' : 'OUT', '#E5E7EB'], unknown: ['NO WORD YET', '#9CA3AF'] }[f.status];
    var pct = f.total ? Math.round(f.yes / f.total * 100) : null, mine = f.id === S.settings.feeder;
    return '<div class="sheet t-citric" style="max-height:62%"><div class="handle"></div>' +
      '<div class="row"><div class="col grow" style="gap:0"><span class="small muted" style="font-weight:700;letter-spacing:.05em">' + (mine ? 'YOUR FEEDER' : 'GPA FEEDER') + '</span><span class="cond" style="font-size:30px;line-height:1">' + f.id + '</span></div>' + followBtn('feeders', f.id) + '<button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<span class="tag" style="background:' + lab[1] + ';color:#121212;font-size:15px">' + lab[0] + '</span>' +
      '<div style="font-size:15px;line-height:1.4">' + esc(f.desc) + '</div><div class="small muted">Area outline is approximate (demo). Status from the latest GPA focus list.</div>' +
      '<div class="row soft" style="gap:10px"><b style="font-size:24px">' + (pct == null ? '—' : pct + '%') + '</b><span class="small">of people on ' + f.id + ' say their power is back <span class="muted">(' + f.total + ' reports)</span></span></div>' +
      (S.account ? '<div class="grid2"><button class="btn green" data-act="feederVote" data-id="' + f.id + '" data-v="1">My power is back</button><button class="btn black" data-act="feederVote" data-id="' + f.id + '" data-v="0">Still out</button></div>' : '<button class="btn" data-act="join" data-v="report power">Sign in to report your power</button>') +
      (mine ? '' : '<button class="btn sm" data-act="setFeeder" data-id="' + f.id + '">This is my feeder</button>') + '</div>';
  };

  VIEWS.filters = function () {
    var F = S.filters;
    function ck(k, label, color, sq) { return '<label><input type="checkbox" data-change="filter" data-k="' + k + '"' + (F[k] ? ' checked' : '') + '><span style="width:10px;height:10px;border-radius:' + (sq ? '2px' : '50%') + ';background:' + color + '"></span>' + label + '</label>'; }
    return '<div class="scrim" data-act="back"></div><div class="sheet"><div class="handle"></div><div class="row"><b class="grow" style="font-size:20px">Map layers</b><button class="btn sm" data-act="back">Done</button></div>' +
      '<div class="checks">' + ck('road', 'Road blocks', CATS.road.color) + ck('light', 'Traffic lights', CATS.light.color) + ck('pole', 'Pole / lines', CATS.pole.color) + ck('outages', 'Outage areas', '#E5E7EB', 1) + ck('gas', 'Gas stations', PT.gas.color, 1) + ck('store', 'Stores', PT.store.color, 1) + ck('shelter', 'Shelters', PT.shelter.color, 1) + ck('muster', 'Muster points', PT.muster.color, 1) + ck('tsunami', 'Tsunami safe', PT.tsunami.color, 1) + ck('supply', 'Supply points', PT.supply.color, 1) + '</div>' +
      '<label class="row" style="min-height:52px;padding:6px 12px;border:2px solid #9DBF2E;border-radius:10px;background:#1E2610;font-weight:700"><input type="checkbox" data-change="filter" data-k="official"' + (F.official ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#CDF564"><span class="grow">Official updates<br><span class="small" style="font-weight:500;color:var(--text2)">JIC · GPA · GWA, approved by admins</span></span></label>' +
      '<label class="row" style="min-height:52px;padding:6px 12px;border:1px solid var(--line);border-radius:10px;font-weight:700;background:var(--card2)"><input type="checkbox" data-change="filter" data-k="feeders"' + (F.feeders ? ' checked' : '') + ' style="width:18px;height:18px"><span class="grow">GPA feeder overlay<br><span class="small muted" style="font-weight:500">Find your feeder # on your GPA bill</span></span></label>' +
      '<div class="lbl">Hide reports with no activity for</div><div class="grid3">' + [[6, '6 h'], [24, '24 h'], [72, '3 days']].map(function (o) { return '<button class="btn sm' + (F.windowH === o[0] ? ' black' : '') + '" data-act="windowH" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="small muted">Activity = posted, voted on, or a new note. Outage areas, shelters and safe spots never hide this way; they ask “still relevant?” instead.</div>' +
      '<label class="row" style="justify-content:space-between;min-height:44px;font-weight:700">Show older posts<input type="checkbox" class="switch" data-change="filter" data-k="older"' + (F.older ? ' checked' : '') + '></label>' +
      (F.older ? '<div class="grid2"><label class="col small muted" style="gap:2px;font-weight:600">From<input class="input" type="date" data-change="date" data-k="from" value="' + esc(F.from) + '"></label><label class="col small muted" style="gap:2px;font-weight:600">To<input class="input" type="date" data-change="date" data-k="to" value="' + esc(F.to) + '"></label></div><div class="small muted">Older pins show faded with their date.</div>' : '') + '</div>';
  };

  VIEWS.updates = function () {
    var src = UI.src || 'All', list = S.updates.filter(function (u) { return src === 'All' || u.src === src || (src === 'Tsunami' && u.src === 'PTWC'); }).sort(function (a, b) { return b.t - a.t; });
    var colors = { NWS: ['#374151', '#fff'], JIC: ['#CDF564', '#121212'], GPA: ['#2563EB', '#fff'], GWA: ['#0E7490', '#fff'], PTWC: ['#1E40AF', '#fff'], Broadcast: ['#ECEDEE', '#121212'] };
    return '<div class="page">' + hdr('citric', 'Official updates') +
      '<div style="background:var(--citric);padding:0 12px 12px;display:flex;flex-direction:column;gap:8px">' +
        (S.tsunami ? '<div style="background:#DC2626;color:#fff;border-radius:10px;padding:10px 12px"><div class="cond" style="font-size:22px">TSUNAMI WARNING · GUAM</div><div class="small" style="font-weight:600">Move to high ground or inland now. (demo)</div></div>'
          : '<div style="background:#121212;color:#CDF564;border-radius:10px;padding:10px 12px"><div class="cond" style="font-size:22px">COR 1 · STAY INDOORS</div><div class="small" style="font-weight:600">Typhoon Warning in effect · No tsunami threat</div></div>') +
        '<div class="row" style="overflow-x:auto;gap:6px">' + ['All', 'NWS', 'Tsunami', 'JIC', 'GPA', 'GWA'].map(function (s) { return '<button class="chip' + (src === s ? ' on' : '') + '" style="box-shadow:none' + (src === s ? '' : ';background:rgba(0,0,0,.08);color:#121212;border-color:rgba(0,0,0,.2)') + '" data-act="src" data-v="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
      '<div class="body">' + list.map(function (u) { var c = colors[u.src] || ['#ECEDEE', '#121212']; return '<div class="feed-card"><div class="row"><span class="tag" style="background:' + c[0] + ';color:' + c[1] + '">' + (u.src === 'PTWC' ? 'Tsunami · PTWC' : esc(u.src)) + '</span><span class="small muted">' + (u.auto ? 'automatic · ' : '') + rel(u.t) + '</span></div><b style="font-size:16px">' + esc(u.title) + '</b><div class="small" style="color:var(--text2)">' + esc(u.body) + '</div>' + (u.link ? '<button class="btn link" style="align-self:flex-start" data-act="updLink" data-v="' + esc(u.link) + '">Show on map ›</button>' : '') + '</div>'; }).join('') +
        '<div class="lbl">Hotlines</div><a class="tel em" href="tel:911">Emergency<span>911</span></a><a class="tel" href="tel:6714780210">JIC hotline<span>(671) 478-0210</span></a><a class="tel" href="tel:6714751472">GPA downed lines<span>(671) 475-1472</span></a><a class="tel" href="tel:6716464211">GWA dispatch<span>(671) 646-4211</span></a>' +
        '<div class="small muted">Demo feed. In the real app NWS and PTWC items arrive automatically; JIC, GPA and GWA items are reviewed by admins first.</div></div></div>';
  };

  VIEWS.settings = function () {
    var s = S.settings, signed = !!S.account;
    function tog(k, title, sub, dis) { return '<label class="toggle-row"><span class="col grow" style="gap:0"><b style="font-size:15px">' + title + '</b><span class="small muted">' + sub + '</span></span><input type="checkbox" class="switch" data-change="setting" data-k="' + k + '"' + (s[k] && !dis ? ' checked' : '') + (dis ? ' disabled' : '') + '></label>'; }
    var nf = signed ? S.follows.places.length + S.follows.villages.length + S.follows.feeders.length : 0;
    var account = signed
      ? '<div class="card" style="flex-direction:row;align-items:center;gap:12px">' + avatar(S.me) + '<div class="col grow" style="gap:0"><b>' + esc(S.me) + '</b><span class="small muted">' + S.reports.filter(function (r) { return r.by === S.me; }).length + ' reports</span></div>' + roleTag(S.me) + '<button class="btn sm" data-act="signOut">Sign out</button></div>'
      : '<div class="card" style="border:2px solid #4100F5"><div class="row">' + ic('user', 24, '#8B6CFF') + '<b class="grow" style="font-size:17px">You’re browsing read-only</b></div><div class="small" style="color:var(--text2)">Create a free account to drop pins, vote, add notes and follow places.</div><div class="grid2"><button class="btn klein" data-act="go" data-to="signup">Create account</button><button class="btn" data-act="go" data-to="signin">Sign in</button></div></div>';
    return '<div class="page">' + hdr('klein', 'Settings') + '<div class="body">' + account +
      '<div class="card" style="border:2px dashed #4100F5"><div class="lbl" style="color:#8B6CFF">Demo controls</div>' +
        (signed ? '<label class="row" style="justify-content:space-between"><b>Role</b><select class="input" style="width:150px;height:44px" data-change="role">' + ['user', 'admin', 'omega'].map(function (r) { return '<option value="' + r + '"' + (s.role === r ? ' selected' : '') + '>' + r[0].toUpperCase() + r.slice(1) + '</option>'; }).join('') + '</select></label>' : '') +
        '<label class="row" style="justify-content:space-between"><b>Map style</b><select class="input" style="width:190px;height:44px" data-change="tiles">' + Object.keys(TILESETS).map(function (k) { return '<option value="' + k + '"' + ((s.tiles || 'osmdark') === k ? ' selected' : '') + '>' + TILESETS[k].name + '</option>'; }).join('') + '</select></label>' +
        '<label class="row" style="justify-content:space-between;min-height:44px"><b>Simulate tsunami warning</b><input type="checkbox" class="switch" data-change="tsunami"' + (S.tsunami ? ' checked' : '') + '></label>' +
        '<button class="btn sm red" data-act="reset">Reset demo data</button><div class="small muted">All places, people and statuses are fictional. Everything is saved on this phone only.</div></div>' +
      (isAdmin() ? '<button class="card" style="flex-direction:row;align-items:center" data-act="go" data-to="admin">' + ic('shield', 22) + '<span class="col grow" style="gap:0"><b>Admin console</b><span class="small muted">Moderation queue · imports' + (role() === 'omega' ? ' · roles' : '') + '</span></span>' + ic('chev', 18) + '</button>' : '') +
      (signed ? '<button class="card" style="flex-direction:row;align-items:center" data-act="go" data-to="following">' + ic('bell', 22) + '<span class="col grow" style="gap:0"><b>Following</b><span class="small muted">' + nf + ' places, villages and feeders</span></span>' + ic('chev', 18) + '</button>' : '') +
      '<div class="lbl">Permissions</div><div class="list"><div class="toggle-row">' + ic('locate', 22) + '<span class="col grow" style="gap:0"><b>Location</b><span class="small muted">Places reports, finds things near you</span></span><b class="small" style="color:' + (ME.real ? '#4ADE80' : '#FBBF24') + '">' + (ME.real ? 'Using GPS' : 'Demo location') + '</b></div><div class="toggle-row">' + ic('camera', 22) + '<span class="col grow" style="gap:0"><b>Camera</b><span class="small muted">Asked the first time you add a photo</span></span></div></div>' +
      '<div class="lbl">Notifications <span class="muted" style="font-family:Barlow;font-weight:500;letter-spacing:0;text-transform:none">(demo: nothing is sent)</span></div><div class="list">' +
        tog('nTsunami', 'Tsunami warnings', 'Off if you already get GTA / phone emergency alerts') + tog('nWeather', 'Weather warnings & COR changes', 'NWS warnings, JIC readiness level') + tog('nOfficial', 'Official updates', 'New JIC, GPA, GWA releases') + tog('nBack', 'Power / water back near me', 'When your outage area shrinks or clears') + tog('nNear', 'New reports near me', 'Road blocks, supply points, gas open') +
        tog('nFollow', 'Places & villages I follow', signed ? 'Status changes, stock, outages, owner notes' : 'Needs an account', !signed) +
        (signed ? '<label class="toggle-row" style="background:var(--card2);padding-left:28px"><span class="col grow" style="gap:0"><b style="font-size:14px">Notify after matching reports</b><span class="small muted">1 = every report · higher = wait for agreement</span></span><input class="input" type="number" min="1" max="20" inputmode="numeric" data-change="setting" data-k="threshold" value="' + s.threshold + '" style="width:72px;text-align:center;font-weight:700"></label>' : '') +
        tog('nReplies', 'Replies to my posts', signed ? 'Notes, merge suggestions' : 'Needs an account', !signed) + '</div>' +
      '<div class="lbl">“Near me” means</div><div class="grid4">' + ['1 mi', '3 mi', 'Village', 'Island'].map(function (r) { return '<button class="btn sm' + (s.radius === r ? ' black' : '') + '" data-act="radius" data-v="' + r + '">' + r + '</button>'; }).join('') + '</div>' +
      '<label class="card" style="flex-direction:row;align-items:center;justify-content:space-between"><b>Home village</b><select class="input" style="width:170px;height:44px" data-change="setting" data-k="home">' + C.VILLAGES.map(function (v) { return '<option' + (s.home === v[0] ? ' selected' : '') + '>' + esc(v[0]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="card" style="flex-direction:row;align-items:center;justify-content:space-between"><span class="col" style="gap:0"><b>My GPA feeder #</b><span class="small muted">Printed on your GPA bill</span></span><input class="input" data-change="setting" data-k="feeder" value="' + esc(s.feeder) + '" style="width:110px;text-align:center;font-weight:700"></label>' +
      '</div></div>';
  };

  VIEWS.following = function () {
    if (!S.account) return '<div class="page">' + hdr('klein', 'Following') + '<div class="body"><div class="card">' + ic('lock', 24, '#8B6CFF') + '<b>Following needs an account</b><div class="small muted">Follow places, villages and GPA feeders to get updates about them.</div><button class="btn klein" data-act="go" data-to="signup">Create account</button></div></div></div>';
    var F = S.follows;
    function bell(kind, id) { var muted = F.muted[kind + ':' + id]; return '<button class="icon-btn" data-act="mute" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-label="' + (muted ? 'Unmute' : 'Mute') + '">' + ic(muted ? 'bellOff' : 'bell', 20, muted ? '#9BA0A8' : '#ECEDEE', 2, muted ? 'none' : 'currentColor') + '</button>'; }
    var vill = F.villages.map(function (v) {
      var o = S.outages.filter(function (x) { return x.name === v; });
      var chips = o.length ? o.map(function (x) { return '<span style="background:' + (x.kind === 'power' ? '#E5E7EB' : '#3B82F6') + ';color:#121212;padding:0 6px;border-radius:3px;font-weight:600">No ' + x.kind + ' since ' + fdate(x.since) + '</span>'; }).join(' ') : '<span style="background:#14532D;color:#BBF7D0;padding:0 6px;border-radius:3px;font-weight:600">No outages reported</span>';
      return '<div class="toggle-row"><button class="col grow" style="gap:2px;border:0;background:none;text-align:left;padding:0" data-act="flyVillage" data-id="' + esc(v) + '"><b style="font-size:16px">' + esc(v) + (v === S.settings.home ? ' <span class="small muted">· home</span>' : '') + '</b><span class="small row" style="flex-wrap:wrap;gap:6px">' + chips + '</span></button>' + bell('villages', v) + '</div>';
    }).join('');
    var places = F.places.map(function (id) { var p = byId(S.places, id); if (!p) return ''; var st = p.type === 'gas' ? (p.open ? 'Open' : 'Closed') + ' · unleaded ' + (p.prices.unleaded.v ? '$' + p.prices.unleaded.v.toFixed(2) : '—') + ' · line ' + p.line : p.type === 'store' ? Object.keys(p.stock).slice(0, 2).map(function (k) { return k + ' ' + p.stock[k].s; }).join(' · ') + ' · line ' + p.line : 'Confirmed ' + fdate(p.confirmed);
      return '<div class="toggle-row"><button class="row grow" style="border:0;background:none;text-align:left;padding:0" data-act="go" data-to="place/' + p.id + '">' + swatch({ k: 'p', o: p }) + '<span class="col grow" style="gap:2px"><b style="font-size:16px">' + esc(p.name) + '</b><span class="small" style="color:var(--text2)">' + esc(st) + '</span></span></button>' + bell('places', id) + '</div>'; }).join('');
    var feeders = F.feeders.map(function (id) { var f = byId(S.feeders, id); if (!f) return ''; return '<div class="toggle-row"><button class="col grow" style="gap:2px;border:0;background:none;text-align:left;padding:0" data-act="openFeeder" data-id="' + f.id + '"><b style="font-size:16px">' + f.id + '</b><span class="small" style="color:var(--text2)">' + { on: 'On', working: 'Crews working', partial: 'Partially on', out: 'Out', unknown: 'No word yet' }[f.status] + '</span></button>' + bell('feeders', id) + '</div>'; }).join('');
    return '<div class="page">' + hdr('klein', 'Following') + '<div class="body">' +
      '<div class="lbl">Villages</div><div class="list">' + (vill || '<div class="toggle-row muted">None yet. Tap Follow on an outage area.</div>') + '</div>' +
      '<div class="lbl">Places</div><div class="list">' + (places || '<div class="toggle-row muted">None yet. Tap Follow on a place.</div>') + '</div>' +
      '<div class="lbl">GPA feeders</div><div class="list">' + (feeders || '<div class="toggle-row muted">None yet.</div>') + '</div>' +
      '<div class="small muted">Followed places show first in stacks. Bells mute an item without unfollowing.</div></div></div>';
  };

  VIEWS.admin = function () {
    if (!isAdmin()) return '<div class="page">' + hdr('black', 'Admin console') + '<div class="body"><div class="card">Sign in and switch your role to Admin or Omega in Settings → Demo controls.</div></div></div>';
    var q = S.queue.map(function (x) {
      var acts = { gouging: [['reviewed', 'Mark reviewed'], ['hidePrice', 'Hide price']], flag: [['mergeDup', 'Merge into nearest'], ['keep', 'Keep'], ['hideReport', 'Hide']], merge: [['doMerge', 'Merge'], ['keep', 'Dismiss']], owner: [['approveOwner', 'Approve'], ['keep', 'Deny']], place: [['approvePlace', 'Approve'], ['removePlace', 'Remove']] }[x.kind] || [['keep', 'Dismiss']];
      return '<div class="card"><div class="row"><b class="grow">' + esc(x.title) + '</b>' + (x.flags ? '<span class="tag" style="background:#F97316;color:#121212">' + x.flags + ' flags</span>' : '') + '</div><div class="small muted">' + esc(x.sub) + ' · ' + esc(x.reason) + ' · ' + rel(x.t) + '</div><div class="row" style="flex-wrap:wrap">' + acts.map(function (a) { return '<button class="btn sm" data-act="queue" data-id="' + x.id + '" data-v="' + a[0] + '">' + a[1] + '</button>'; }).join('') + (x.ref ? '<button class="btn link" data-act="queueOpen" data-id="' + x.id + '">Open ›</button>' : '') + '</div></div>';
    }).join('') || '<div class="card muted">Queue is empty.</div>';
    var imp = UI.importOpen ? '<div class="card"><div class="row"><span class="tag" style="background:#2563EB;color:#fff">GPA</span><b>Sample focus list (demo)</b></div><div class="small muted">Pulled from the release · review before publishing</div>' +
      IMPORT.map(function (x, i) { return '<label class="row" style="border-top:1px solid var(--line2);padding-top:8px"><input type="checkbox" checked data-imp="' + i + '" style="width:18px;height:18px"><span class="grow"><b>' + x.f + '</b> → ' + x.label + '</span></label>'; }).join('') +
      '<button class="btn black" data-act="publishImport">Publish selected</button></div>'
      : '<button class="btn" data-act="openImport">Import sample GPA release</button>';
    var users = Object.keys(C.USERS).concat(S.accounts.map(function (a) { return a.u; })).filter(function (u, i, arr) { return u !== S.me && arr.indexOf(u) === i; });
    var omega = role() === 'omega' ? '<div class="lbl">Omega only</div><div class="card" style="border:2px solid #CDF564"><b>Roles</b>' + users.map(function (u) { var r = (S.roles && S.roles[u]) || (C.USERS[u] && C.USERS[u].role) || (acct(u) && acct(u).role) || 'user'; return '<label class="row" style="justify-content:space-between"><span>' + esc(u) + '</span><select class="input" style="width:140px;height:40px" data-change="userRole" data-k="' + esc(u) + '">' + ['user', 'admin', 'suspended'].map(function (o) { return '<option' + (r === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></label>'; }).join('') +
      '<div class="lbl" style="margin-top:6px">Emergency controls</div><input class="input" id="bcast" placeholder="Broadcast message to everyone"><button class="btn black" data-act="broadcast">Broadcast alert</button>' +
      '<button class="btn red" data-act="freeze">' + (S.frozen ? 'Resume posting' : 'Freeze all new posts') + '</button></div>' : '';
    return '<div class="page">' + hdr('black', 'Admin console', '<span class="tag official">' + role() + '</span>') + '<div class="body"><div class="lbl">Moderation queue · ' + S.queue.length + '</div>' + q + '<div class="lbl">Official imports</div>' + imp + omega + '</div></div>';
  };
  var IMPORT = [{ f: 'P-280', st: 'on', label: 'On (restored)' }, { f: 'P-262', st: 'on', label: 'On (restored)' }, { f: 'P-270', st: 'working', label: 'Crews working · 1–3 days' }, { f: 'P-250', st: 'partial', label: 'Partially on' }];

  VIEWS.missing = function () { return '<div class="page">' + hdr('black', 'Not found') + '<div class="body"><div class="card">This item was removed or merged.</div></div></div>'; };

  // ---------- camera and photos ----------
  var stream = null;
  function startCam() {
    var v = $('#camvid'), err = $('#camerr');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { if (err) err.classList.remove('hidden'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }).then(function (s) {
      if (route.name !== 'camera') { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; v.srcObject = s;
    }).catch(function () { if (err) err.classList.remove('hidden'); });
  }
  function stopCam() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }
  function shrink(img, cb, max) {
    max = max || 720; var w = img.videoWidth || img.naturalWidth, h = img.videoHeight || img.naturalHeight; if (!w) return cb(null);
    var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.6));
  }
  function readImage(file, max, cb) { var img = new Image(), fr = new FileReader(); fr.onload = function () { img.onload = function () { shrink(img, cb, max); }; img.src = fr.result; }; fr.readAsDataURL(file); }
  function gotPhoto(url) {
    if (!url) return;
    var tgt = UI.camTarget;
    if (!tgt || tgt === 'draft') { if (draft) draft.photo = url; }
    else addNote(tgt, 'Photo', url);
    UI.camTarget = null; back();
  }

  // ---------- mutations ----------
  function noteTarget(target) { var parts = target.split(':'); return parts[0] === 'r' ? byId(S.reports, parts[1]) : byId(S.places, parts[1]); }
  function addNote(target, text, photo) {
    var o = noteTarget(target); if (!o) return;
    o.notes.push({ id: 'n' + now(), by: S.me, text: text, t: now(), versions: [], photo: photo || null });
    if (o.last !== undefined) o.last = now();
    save(); if (route.name !== 'camera') renderRoute(true);
  }
  function findNoteByKey(k) {
    var parts = k.split(':'), o = parts[0] === 'r' ? byId(S.reports, parts[1]) : byId(S.places, parts[1]);
    if (!o) return null;
    if (parts[2] === 'main') return { obj: o, note: o.note };
    if (parts[2] === 'owner') return { obj: o, note: o.owner };
    return { obj: o, note: byId(o.notes, parts[2]) };
  }
  function createReport() {
    var c = CATS[draft.cat], vill = nearestVillage(draft);
    var r = { id: 'r' + now(), cat: draft.cat, kind: draft.kind || c.kinds[0], lat: draft.lat, lng: draft.lng, title: (draft.kind || c.label) + ' · ' + vill, by: S.me, t: now(), last: now(), score: 1, myVote: 1, photo: draft.photo, note: { text: draft.note.trim(), t: now(), versions: [] }, notes: [] };
    S.reports.push(r); save(); clearDraft(); go('', true);
    toast('Posted to the map.', 'View', function () { go('pin/' + r.id); });
  }
  function applyQueue(x, a) {
    function done(msg) { S.queue = S.queue.filter(function (y) { return y !== x; }); save(); renderRoute(true); toast(msg); }
    if (a === 'keep' || a === 'reviewed') return done('Done.');
    if (a === 'hideReport') { S.reports = S.reports.filter(function (r) { return r.id !== x.ref; }); return done('Report hidden.'); }
    if (a === 'hidePrice') { var s = byId(S.places, x.ref); if (s) s.prices = s.prices.filter(function (p) { return p.flags < 3; }); return done('Price hidden.'); }
    if (a === 'mergeDup' || a === 'doMerge') {
      var src = byId(S.reports, x.ref), tgt = x.target ? byId(S.reports, x.target) : null;
      if (src && !tgt) { var cands = S.reports.filter(function (r) { return r.id !== src.id && r.cat === src.cat; }).sort(function (a, b) { return dist(a, src) - dist(b, src); }); tgt = cands[0]; }
      if (src && tgt) { tgt.notes = tgt.notes.concat(src.notes, src.note.text ? [{ id: 'n' + now(), by: src.by, text: src.note.text, t: src.t, versions: [] }] : []); tgt.score += Math.max(0, src.score); tgt.last = now(); S.reports = S.reports.filter(function (r) { return r !== src; }); }
      return done('Merged.');
    }
    if (a === 'approveOwner') { var st = byId(S.places, x.ref); if (st) st.owner = { text: 'Owner verified. Hours and stock coming soon.', t: now(), versions: [] }; return done('Owner verified.'); }
    if (a === 'approvePlace') { var pl = byId(S.places, x.ref); if (pl) pl.pending = false; return done('Place approved.'); }
    if (a === 'removePlace') { S.places = S.places.filter(function (p) { return p.id !== x.ref; }); return done('Place removed.'); }
  }
  function afterAuth(msg) {
    UI.ts = 'idle'; toast(msg);
    var rt = UI.returnTo; UI.returnTo = '';
    go(rt && rt.indexOf('join') !== 0 ? rt : '', true);
  }

  // actions that need an account, with the phrase used on the sign-in sheet
  var NEEDS = { vote: 'vote', flagReport: 'flag reports', editNote: 'edit notes', postNote: 'add notes', camNote: 'add photos', follow: 'follow places', mute: 'manage follows', gasStatus: 'update stations', line: 'report lines', stock: 'update stock', addItem: 'update stock', flagPrice: 'flag prices', addPrice: 'report prices', pricesOpen: 'report prices', claim: 'claim a store', confirm: 'confirm places', outagePt: 'report outages', feederVote: 'report power', mergeOpen: 'suggest merges', pinFab: 'drop pins' };

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), id = el.getAttribute('data-id'), v = el.getAttribute('data-v');
    if (NEEDS[a] && !guard(NEEDS[a])) return;
    switch (a) {
      case 'go': go(el.getAttribute('data-to'), !!el.getAttribute('data-replace')); break;
      case 'back': back(); break;
      case 'join': guard(v || 'contribute'); break;
      case 'toastAction': $('#toast').innerHTML = ''; if (toastFn) toastFn(); break;
      case 'filterToggle': UI.filterOpen = !UI.filterOpen; renderChrome(); break;
      case 'quick': UI.quick = v; UI.filterOpen = false; renderChrome(); renderMarkers(); renderAreas(); break;
      case 'bannerMin': S.settings.bannerMin = true; save(); renderChrome(); break;
      case 'bannerMax': S.settings.bannerMin = false; save(); renderChrome(); break;
      case 'compass': map.setBearing(0); break;
      case 'stat': UI.stat = v; S.settings.drawer = 'open'; save(); renderChrome(); break;
      case 'dItem': var di = el.getAttribute('data-k') === 'r' ? byId(S.reports, id) : byId(S.places, id); if (di) { map.flyTo([di.lat, di.lng], 16, { duration: 0.5 }); go((el.getAttribute('data-k') === 'r' ? 'pin/' : 'place/') + id); } break;
      case 'dOutage': var dov = byId(S.outages, id); if (dov) { S.settings.drawer = 'peek'; map.flyTo([dov.points[0].lat, dov.points[0].lng], 13, { duration: 0.5 }); go('outage/' + id); } break;
      case 'locate': map.flyTo([ME.lat, ME.lng], 15, { duration: 0.6 }); if (!ME.real) toast('Using a demo location in Hagåtña (GPS is off or you’re off-island).'); break;
      case 'pinFab': map.flyTo([ME.lat, ME.lng], Math.max(map.getZoom(), 15), { duration: 0.4 }); setTimeout(function () { dropAt(L.latLng(ME.lat, ME.lng)); }, 450); break;
      case 'pick':
        var t = el.getAttribute('data-t'); UI.q = ''; var qi = $('#q'); if (qi) qi.blur();
        if (t === 'place') { var pp = byId(S.places, id); map.flyTo([pp.lat, pp.lng], 16); go('place/' + id); }
        else if (t === 'report') { var rr = byId(S.reports, id); map.flyTo([rr.lat, rr.lng], 16); go('pin/' + id); }
        else if (t === 'village') { var vv = C.VILLAGES.filter(function (x) { return x[0] === id; })[0]; map.flyTo([vv[1], vv[2]], 14); renderChrome(); }
        else if (t === 'feeder') openFeeder(id);
        break;
      case 'dropCat':
        if (CATS[v].outage) { var o = outagePoint(v, draft, 'out'); clearDraft(); go('', true); toast('Added: no ' + v + ' here. ' + o.name + ' area now has ' + o.points.filter(function (q) { return q.st === 'out'; }).length + ' reports.', 'View', function () { go('outage/' + o.id); }); }
        else { draft.cat = v; draft.kind = null; go('report', true); map.panTo([draft.lat - (map.getBounds().getNorth() - map.getBounds().getSouth()) * 0.18, draft.lng]); }
        break;
      case 'dropPlace':
        var np = { id: 'x' + now(), type: v, name: 'New ' + PT[v].label.toLowerCase() + ' (pending)', lat: draft.lat, lng: draft.lng, official: false, pending: true, notes: [], confirmed: now(), confirmN: 1 };
        if (v === 'gas') { np.open = true; np.openVotes = 1; np.closedVotes = 0; np.statusT = now(); np.line = 'none'; np.lineVotes = { none: 1, short: 0, long: 0 }; np.prices = { unleaded: { v: null, t: 0 }, diesel: { v: null, t: 0 }, premium: { v: null, t: 0 } }; np.tags = []; }
        if (v === 'store') { np.owner = null; np.stock = { 'Bottled water': { s: 'in', n: 0 }, 'Ice': { s: 'in', n: 0 } }; np.stockT = now(); np.line = 'none'; np.lineVotes = { none: 0, short: 0, long: 0 }; np.prices = []; }
        if (v === 'shelter') { np.occ = 0; np.cap = 0; np.occT = now(); np.pets = '?'; np.generator = '?'; }
        if (v === 'supply') np.detail = 'Community-reported supply point.';
        S.places.push(np); S.queue.push({ id: 'q' + now(), kind: 'place', ref: np.id, title: np.name, sub: 'Added by ' + S.me, reason: 'New place', flags: 0, t: now() });
        save(); clearDraft(); go('place/' + np.id, true); toast('New place added. An admin will verify it.');
        break;
      case 'snapYes': var sid = draft.snap; clearDraft(); go('place/' + sid, true); break;
      case 'snapNo': draft.snap = null; renderRoute(true); break;
      case 'changeCat': draft.cat = null; go('drop', true); break;
      case 'kind': draft.kind = v; renderRoute(true); break;
      case 'camDraft': UI.camTarget = 'draft'; go('camera'); break;
      case 'camNote': UI.camTarget = el.getAttribute('data-target'); go('camera'); break;
      case 'removePhoto': draft.photo = null; renderRoute(true); break;
      case 'camShoot': var vid = $('#camvid'); if (stream && vid && vid.videoWidth) shrink(vid, gotPhoto); else { var f = $('#camfile'); if (f) f.click(); } break;
      case 'camFile': var cf = $('#camfile'); if (cf) cf.click(); break;
      case 'postReport': if (!draft.kind) draft.kind = CATS[draft.cat].kinds[0]; createReport(); break;
      case 'vote': var r = byId(S.reports, id), dir = +v; r.score -= r.myVote; r.myVote = r.myVote === dir ? 0 : dir; r.score += r.myVote; r.last = now(); save(); renderRoute(true); break;
      case 'flagReport': S.queue.push({ id: 'q' + now(), kind: 'flag', ref: id, title: byId(S.reports, id).title, sub: 'Flagged by ' + S.me, reason: 'Flagged as wrong or outdated', flags: 1, t: now() }); save(); toast('Thanks. An admin will take a look.'); break;
      case 'editNote': UI.editing = el.getAttribute('data-k'); renderRoute(true); break;
      case 'cancelEdit': UI.editing = null; renderRoute(true); break;
      case 'saveEdit':
        var kk = el.getAttribute('data-k'), fnd = findNoteByKey(kk), ta = kk.split(':')[2] === 'main' ? $('#edit-main') : $('#edit-' + kk.split(':')[2]);
        if (fnd && fnd.note && ta && ta.value.trim() && ta.value !== fnd.note.text) { fnd.note.versions.push({ text: fnd.note.text, t: fnd.note.t }); fnd.note.text = ta.value.trim(); fnd.note.t = now(); fnd.note.updated = now(); if (fnd.obj.last !== undefined) fnd.obj.last = now(); save(); }
        UI.editing = null; renderRoute(true); break;
      case 'toggleHist': var hk = el.getAttribute('data-k'); UI.expanded[hk] = !UI.expanded[hk]; renderRoute(true); break;
      case 'postNote': var ci = $('#composer'); if (ci && ci.value.trim()) addNote(el.getAttribute('data-target'), ci.value.trim()); break;
      case 'follow':
        var kind = el.getAttribute('data-kind'), arr = S.follows[kind], ix = arr.indexOf(id);
        if (ix >= 0) arr.splice(ix, 1); else arr.push(id); save(); renderRoute(true); toast(ix >= 0 ? 'Unfollowed.' : 'Following. You’ll get updates (demo).'); break;
      case 'mute': var mk = el.getAttribute('data-kind') + ':' + id; S.follows.muted[mk] = !S.follows.muted[mk]; save(); renderRoute(true); break;
      case 'gasStatus': var g = byId(S.places, id); if (v === '1') { g.openVotes++; g.open = g.openVotes >= g.closedVotes; } else { g.closedVotes++; g.open = g.openVotes > g.closedVotes; } g.statusT = now(); save(); renderRoute(true); toast('Thanks for the update.'); break;
      case 'line': var lp = byId(S.places, id); lp.lineVotes[v] = (lp.lineVotes[v] || 0) + 1; lp.line = v; save(); renderRoute(true); break;
      case 'stock': var sp = id.split('|'), so = byId(S.places, sp[0]), it = so.stock[sp[1]]; if (it.s === v) it.n++; else { it.s = v; it.n = 1; } so.stockT = now(); save(); renderRoute(true); break;
      case 'addItem': var ni = $('#newitem'), sx = byId(S.places, id); if (ni && ni.value.trim()) { sx.stock[ni.value.trim()] = { s: 'in', n: 1 }; sx.stockT = now(); save(); renderRoute(true); } break;
      case 'flagPrice': var fp = byId(S.places, id).prices[+v]; fp.flags++; if (fp.flags === 3) S.queue.push({ id: 'q' + now(), kind: 'gouging', ref: id, title: fp.item + ' $' + fp.v.toFixed(2), sub: 'Price report · ' + byId(S.places, id).name, reason: 'Gouging suspected', flags: 3, t: now() }); save(); renderRoute(true); toast('Flag recorded.'); break;
      case 'addPrice':
        var pi = $('#pitem'), pn = parseFloat(($('#pnow') || {}).value), pb = parseFloat(($('#pbefore') || {}).value), ps = byId(S.places, id);
        if (pi && pi.value.trim() && pn > 0) { ps.prices.unshift({ item: pi.value.trim(), v: pn, before: pb > 0 ? pb : null, flags: 0, t: now() }); save(); renderRoute(true); toast('Price reported.'); } else toast('Enter an item and a price.');
        break;
      case 'pricesOpen': go('prices/' + id); break;
      case 'mergeOpen': go('merge/' + id); break;
      case 'claim': S.queue.push({ id: 'q' + now(), kind: 'owner', ref: id, title: 'Owner claim · ' + byId(S.places, id).name, sub: 'Claimed by ' + S.me, reason: 'Verification', flags: 0, t: now() }); save(); toast('Claim sent. An admin will verify you.'); break;
      case 'submitPrices':
        var gp = byId(S.places, id), u = parseFloat(($('#pr-unleaded') || {}).value), d2 = parseFloat(($('#pr-diesel') || {}).value), pm = parseFloat(($('#pr-premium') || {}).value);
        if (!(u > 0)) { toast('Enter the unleaded price.'); break; }
        gp.prices.unleaded = { v: u, t: now() }; if (d2 > 0) gp.prices.diesel = { v: d2, t: now() }; if (pm > 0) gp.prices.premium = { v: pm, t: now() };
        save(); back(); toast('Prices updated.'); break;
      case 'confirm':
        var cp = byId(S.places, id);
        if (v === 'yes') { cp.confirmed = now(); cp.confirmN++; toast('Thanks. Marked as confirmed today.'); }
        else if (v === 'no') { S.queue.push({ id: 'q' + now(), kind: 'flag', ref: null, title: cp.name, sub: 'Reported closed by ' + S.me, reason: 'No longer relevant', flags: 1, t: now() }); toast('Thanks. An admin will review it.'); }
        S.relevant[S.me + ':' + id] = { t: now(), v: v }; UI.expanded['rel:' + id] = false; save(); renderRoute(true); break;
      case 'relExpand': UI.expanded['rel:' + id] = true; renderRoute(true); break;
      case 'relCollapse': UI.expanded['rel:' + id] = false; renderRoute(true); break;
      case 'outagePt': var oo = byId(S.outages, id), at = ME.real ? ME : { lat: oo.points[0].lat + (Math.random() - .5) * 0.01, lng: oo.points[0].lng + (Math.random() - .5) * 0.01 };
        oo.points.push({ lat: at.lat, lng: at.lng, t: now(), st: v }); oo.confirmed = now(); save(); renderRoute(true); toast(v === 'out' ? 'Added. The area shape updates with each report.' : 'Thanks. Marked as back at your spot.'); break;
      case 'feederVote': var ff = byId(S.feeders, id); ff.total++; if (v === '1') ff.yes++; save(); renderRoute(true); toast('Thanks for reporting.'); break;
      case 'setFeeder': S.settings.feeder = id; save(); renderRoute(true); toast(id + ' saved as your feeder.'); break;
      case 'openFeeder': openFeeder(id); break;
      case 'flyVillage': var fv = C.VILLAGES.filter(function (x) { return x[0] === id; })[0]; if (fv) { go('', true); map.flyTo([fv[1], fv[2]], 14); } break;
      case 'windowH': S.filters.windowH = +v; save(); renderRoute(true); break;
      case 'src': UI.src = v; renderRoute(true); break;
      case 'updLink': if (v === 'feeders') { S.filters.feeders = true; save(); go('', true); map.flyTo([13.45, 144.78], 12); } else if (v.indexOf('place:') === 0) { var lp2 = byId(S.places, v.slice(6)); map.flyTo([lp2.lat, lp2.lng], 15); go('place/' + lp2.id, true); } break;
      case 'radius': S.settings.radius = v; save(); renderRoute(true); break;
      case 'reset': if (confirm('Reset all demo data on this phone? This also signs you out.')) { try { localStorage.removeItem(KEY); } catch (x) {} S = fixAccounts(C.seed()); UI.quick = 'all'; setTiles(S.settings.tiles); go('', true); toast('Demo data reset.'); } break;
      case 'tsunamiToggle': setTsunami(!S.tsunami); break;
      case 'directions': var durl = 'https://www.google.com/maps/dir/?api=1&destination=' + el.getAttribute('data-lat') + ',' + el.getAttribute('data-lng') + '&travelmode=walking'; if (window.ConradAndroid) location.href = durl; else window.open(durl, '_blank'); break;
      case 'mergePick': UI.mergePick = id; renderRoute(true); break;
      case 'sendMerge': if (UI.mergePick) { S.queue.push({ id: 'q' + now(), kind: 'merge', ref: id, target: UI.mergePick, title: 'Merge: ' + byId(S.reports, id).title, sub: 'into ' + byId(S.reports, UI.mergePick).title + ' · by ' + S.me, reason: 'Merge suggestion', flags: 0, t: now() }); save(); back(); toast('Suggestion sent to admins.'); } break;
      case 'queue': var qx = byId(S.queue, id); if (qx) applyQueue(qx, v); break;
      case 'queueOpen': var qo = byId(S.queue, id); if (qo && qo.ref) go((qo.ref.charAt(0) === 'r' ? 'pin/' : 'place/') + qo.ref); break;
      case 'openImport': UI.importOpen = true; renderRoute(true); break;
      case 'publishImport':
        var n = 0; document.querySelectorAll('[data-imp]').forEach(function (cb) { if (cb.checked) { var x = IMPORT[+cb.getAttribute('data-imp')], fd = byId(S.feeders, x.f); if (fd) { fd.status = x.st; n++; } } });
        S.updates.push({ id: 'up' + now(), src: 'GPA', t: now(), title: 'Feeder focus list updated (demo import)', body: n + ' feeders changed status.', link: 'feeders' });
        UI.importOpen = false; save(); renderRoute(true); toast(n + ' feeder statuses published.'); break;
      case 'broadcast': var bc = $('#bcast'); if (bc && bc.value.trim()) { S.updates.push({ id: 'up' + now(), src: 'Broadcast', t: now(), title: bc.value.trim(), body: 'Sent by ' + S.me + ' to all users (demo).' }); save(); toast('Broadcast: ' + bc.value.trim()); renderRoute(true); } break;
      case 'freeze': S.frozen = !S.frozen; save(); renderRoute(true); toast(S.frozen ? 'New posts are frozen.' : 'Posting resumed.'); break;
      // accounts
      case 'tsCheck': UI.ts = 'busy'; renderRoute(true); setTimeout(function () { if (UI.ts === 'busy') { UI.ts = 'ok'; renderRoute(true); refreshSignup(); } }, 1100); break;
      case 'togglePw': UI.su.show = !UI.su.show; renderRoute(true); refreshSignup(); break;
      case 'pickAvatar': var af = $('#avfile'); if (af) af.click(); break;
      case 'clearAvatar': UI.su.photo = null; renderRoute(true); refreshSignup(); break;
      case 'createAccount':
        var sv = signupValid(); if (!(sv.okU && sv.okP && UI.ts === 'ok')) break;
        S.accounts.push({ u: sv.u, h: hash(UI.su.p), role: 'user', photo: UI.su.photo || null, created: now() });
        signIn(sv.u, true); UI.su = { u: '', p: '', photo: null, show: false };
        afterAuth('Welcome, ' + sv.u + '! You can now drop pins and add notes.'); break;
      case 'doSignin':
        var ac = acct(UI.si.u.trim());
        if (!ac || ac.h !== hash(UI.si.p)) { UI.si.err = 'Wrong username or password.'; UI.ts = 'idle'; renderRoute(true); break; }
        signIn(ac.u, false); UI.si = { u: '', p: '', err: '' }; afterAuth('Signed in as ' + ac.u + '.'); break;
      case 'signOut': S.account = null; S.me = 'guest'; save(); go('', true); toast('Signed out. You can still browse the map.'); break;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'composer') { var b = $('[data-act="postNote"]'); if (b) b.click(); }
    if (e.key === 'Enter' && e.target.id === 'q') { var first = $('#results [data-act="pick"]'); if (first) first.click(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'camfile' && t.files && t.files[0]) { readImage(t.files[0], 720, gotPhoto); return; }
    if (t.id === 'avfile' && t.files && t.files[0]) { readImage(t.files[0], 256, function (url) { UI.su.photo = url; renderRoute(true); refreshSignup(); }); return; }
    var c = t.getAttribute && t.getAttribute('data-change'); if (!c) return;
    var k = t.getAttribute('data-k');
    if (c === 'filter') { S.filters[k] = t.checked; save(); renderRoute(true); }
    else if (c === 'date') { S.filters[k] = t.value; save(); renderRoute(true); }
    else if (c === 'setting') { S.settings[k] = t.type === 'checkbox' ? t.checked : (k === 'threshold' ? Math.max(1, Math.min(20, +t.value || 1)) : t.value.trim()); save(); renderAreas(); }
    else if (c === 'role') { S.settings.role = t.value; save(); renderRoute(true); toast('Role switched to ' + t.value + ' (demo).'); }
    else if (c === 'tsunami') { setTsunami(t.checked); }
    else if (c === 'tiles') { S.settings.tiles = t.value; save(); setTiles(t.value); toast('Map style: ' + TILESETS[t.value].name); }
    else if (c === 'userRole') { S.roles = S.roles || {}; S.roles[k] = t.value; save(); toast(k + ' is now ' + t.value + '.'); }
  });

  function openFeeder(id) { S.filters.feeders = true; save(); var f = byId(S.feeders, id); if (f) map.flyToBounds(f.poly, { padding: [40, 40], maxZoom: 14, duration: 0.6 }); go('feeder/' + id); }
  function setTsunami(on) {
    S.tsunami = on; save();
    if (on) { vibrate([200, 100, 200]); go('', true); map.flyToBounds(L.latLngBounds(C_ZONE).extend([ME.lat, ME.lng]), { padding: [60, 60], duration: 0.8 }); }
    else { go('', true); toast('Demo tsunami warning ended.'); }
  }

  window.conradBack = function () {
    if ($('.stackmenu')) { $('.stackmenu').remove(); return true; }
    if (UI.filterOpen) { UI.filterOpen = false; renderChrome(); return true; }
    if (location.hash && location.hash !== '#') { back(); return true; }
    if (S.settings.drawer === 'open') { S.settings.drawer = 'peek'; save(); renderChrome(); return true; }
    return false;
  };

  renderRoute();
  setTimeout(function () { map.invalidateSize(); }, 200);
})();
