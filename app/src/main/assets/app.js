/* Conrad – semi-functional demo. Mock data only; state lives in localStorage on this device. */
(function () {
  'use strict';
  var C = window.CONRAD, CATS = C.CATS, PT = C.PLACES;
  var KEY = 'conrad.demo.v1';
  var S = load();
  var UI = { q: '', quick: 'all', editing: null, expanded: {}, importOpen: false, camTarget: null };
  var draft = null;           // pin being placed
  var route = { name: '', arg: '' }, lastRouteKey = null;
  var ME = { lat: 13.4745, lng: 144.7525, real: false };

  // ---------- utilities ----------
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) { var s = JSON.parse(raw); if (s && s.v === 1) return s; } } catch (e) {}
    return C.seed();
  }
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 200); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function now() { return Date.now(); }
  function rel(t) {
    if (!t) return '—';
    var m = Math.round((now() - t) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    var d = Math.round(h / 24); return d + ' d ago';
  }
  function fdate(t) { var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2); }
  function dist(a, b) { // metres
    var R = 6371000, toR = Math.PI / 180, dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function miles(m) { var mi = m / 1609; return mi < 0.1 ? Math.round(m * 3.28) + ' ft' : mi.toFixed(1) + ' mi'; }
  function nearestVillage(p) { var best = null, bd = 1e12; C.VILLAGES.forEach(function (v) { var d = dist(p, { lat: v[1], lng: v[2] }); if (d < bd) { bd = d; best = v[0]; } }); return best; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function role() { return S.settings.role; }
  function isAdmin() { return role() === 'admin' || role() === 'omega'; }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  var toastT = null, toastFn = null;
  function toast(msg, actionLabel, fn) {
    var el = $('#toast'); toastFn = fn || null;
    el.innerHTML = '<div class="t"><span class="grow">' + esc(msg) + '</span>' + (actionLabel ? '<button data-act="toastAction">' + esc(actionLabel) + '</button>' : '') + '</div>';
    clearTimeout(toastT); toastT = setTimeout(function () { el.innerHTML = ''; }, 4200);
  }

  // ---------- icons ----------
  var P = {
    alert: '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/>',
    light: '<rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="7" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="17" r="1.3"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    nopower: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/><path d="M4 4l16 16"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
    bag: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    house: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.5-3.5 3-5 6-5s5.5 1.5 6 5M15 15.5c2.5 0 4.5 1.5 5 4.5"/>',
    wave: '<path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M12 14V3M8 7l4-4 4 4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    bellOff: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/>',
    merge: '<path d="M6 3v6a6 6 0 0 0 6 6 6 6 0 0 1 6 6M18 3v6a6 6 0 0 1-3 5.2"/>',
    chev: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/>'
  };
  function ic(name, size, color, sw, fill) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="' + (fill || 'none') + '" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
  }
  function avatar(by) { var u = C.USERS[by] || { color: '#57606A' }; return '<div class="av" style="background:' + u.color + '">' + esc(by.slice(0, 2).toUpperCase()) + '</div>'; }
  function roleTag(by) { var r = (S.roles && S.roles[by]) || (C.USERS[by] && C.USERS[by].role); if (by === S.me) r = role(); return r === 'admin' ? '<span class="tag dark">Admin</span>' : r === 'omega' ? '<span class="tag official">Omega</span>' : ''; }

  // ---------- map ----------
  var map = L.map('map', { zoomControl: false, attributionControl: true, tap: false, minZoom: 10, maxZoom: 18, maxBounds: [[12.9, 144.3], [13.9, 145.3]] }).setView([13.479, 144.775], 13);
  var tileErrors = 0;
  var tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  tiles.on('tileerror', function () { tileErrors++; if (tileErrors > 6) document.body.classList.add('nomap'); });
  tiles.on('tileload', function () { tileErrors = 0; document.body.classList.remove('nomap'); });
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

  // ---------- visibility and stacking ----------
  function reportVisible(r) {
    if (!S.filters[r.cat]) return false;
    if (UI.quick !== 'all' && UI.quick !== r.cat) return false;
    var fresh = now() - r.last <= S.filters.windowH * 3600000;
    if (fresh) return 'yes';
    if (S.filters.older) {
      var from = S.filters.from ? new Date(S.filters.from).getTime() : 0, to = S.filters.to ? new Date(S.filters.to).getTime() + 86400000 : Infinity;
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
    S.places.forEach(function (p) { if (placeVisible(p)) out.push({ k: 'p', o: p, rank: (S.follows.places.indexOf(p.id) >= 0 ? 100 : 0) + (p.official ? 5 : 0) + 4 }); });
    return out;
  }
  function itemIcon(it) {
    var o = it.o;
    if (it.k === 'r') { var c = CATS[o.cat]; return '<div class="pin' + (it.faded ? ' faded' : '') + '" style="--c:' + c.color + '">' + ic(c.icon, 18, '#fff') + (it.faded ? '<span class="ago">' + fdate(o.t) + '</span>' : '') + '</div>'; }
    var t = PT[o.type];
    if (o.type === 'gas') {
      var lbl = o.open ? (o.prices.unleaded.v ? '$' + o.prices.unleaded.v.toFixed(2) : 'OPEN') : 'CLOSED';
      return '<div class="pin square pill" style="--c:' + (o.open ? t.color : '#57606A') + '">' + ic('fuel', 16, '#fff') + lbl + '</div>';
    }
    var flagged = o.type === 'store' && o.prices && o.prices.some(function (x) { return x.flags >= 3; });
    return '<div class="pin square' + (o.official ? ' off' : '') + '" style="--c:' + t.color + '">' + ic(t.icon, 18, '#fff') + (flagged ? '<span class="count" style="background:#C2410C">!</span>' : '') + '</div>';
  }
  function renderMarkers() {
    markerLayer.clearLayers();
    var items = visibleItems();
    items.forEach(function (it) { it.pt = map.latLngToContainerPoint([it.o.lat, it.o.lng]); });
    items.sort(function (a, b) { return b.rank - a.rank; });
    var used = {}, groups = [];
    for (var i = 0; i < items.length; i++) {
      if (used[i]) continue; var g = [items[i]]; used[i] = 1;
      for (var j = i + 1; j < items.length; j++) { if (used[j]) continue; var dx = items[i].pt.x - items[j].pt.x, dy = items[i].pt.y - items[j].pt.y; if (dx * dx + dy * dy < 34 * 34) { g.push(items[j]); used[j] = 1; } }
      groups.push(g);
    }
    groups.forEach(function (g) {
      var top = g[0], html = itemIcon(top);
      if (g.length > 1) html = html.replace('class="pin', 'class="pin stack').replace(/<\/div>$/, '<span class="count">' + g.length + '</span></div>');
      var m = L.marker([top.o.lat, top.o.lng], { icon: L.divIcon({ className: '', html: html, iconSize: [36, 36], iconAnchor: [18, 18] }), keyboard: false, riseOnHover: true });
      if (g.length === 1) m.on('click', function () { openItem(top); });
      else m.on('add', function () { attachStack(m.getElement(), g); });
      m.addTo(markerLayer);
    });
  }
  function openItem(it) { go(it.k === 'r' ? 'pin/' + it.o.id : 'place/' + it.o.id); }

  // Stack gesture: hold to expand, drag over rows, lift to select. Quick tap opens the top pin.
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
        return '<button class="srow" data-k="' + k + '"><span class="sw" style="background:' + (it.k === 'p' && o.type === 'gas' && !o.open ? '#57606A' : c.color) + ';border-radius:' + (isR ? '50%' : '6px') + '"></span><span class="grow col" style="gap:0"><b style="font-size:15px">' + esc(isR ? o.title : o.name) + '</b><span class="small muted">' + esc(sub) + '</span></span>' + (isR ? '<b>' + (o.score > 0 ? '+' : '') + o.score + '</b>' : '') + '</button>';
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
    function end() {
      clearTimeout(holdT); map.dragging.enable();
      if (!open) { if (now() - downAt < 330) openItem(group[0]); return; }
      if (hl >= 0) { var it = group[hl]; closeMenu(); openItem(it); }
      // else leave the menu open for tapping
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', function () { clearTimeout(holdT); map.dragging.enable(); });
  }

  // ---------- outages, feeders, tsunami zone ----------
  function hull(points) {
    var p = points.map(function (q) { return [q.lng, q.lat]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    up.pop(); lo.pop(); var h = lo.concat(up);
    var cx = 0, cy = 0; h.forEach(function (q) { cx += q[0]; cy += q[1]; }); cx /= h.length; cy /= h.length;
    return h.map(function (q) { return [cy + (q[1] - cy) * 1.12, cx + (q[0] - cx) * 1.12]; });
  }
  function renderAreas() {
    outageLayer.clearLayers(); feederLayer.clearLayers(); zoneLayer.clearLayers();
    if (S.tsunami) {
      L.polygon(C_ZONE, { color: '#B91C1C', weight: 2.5, fillColor: '#B91C1C', fillOpacity: 0.22, interactive: false }).addTo(zoneLayer);
      return;
    }
    if (S.filters.outages && (UI.quick === 'all' || UI.quick === 'outages')) {
      S.outages.forEach(function (o) {
        var outs = o.points.filter(function (q) { return q.st === 'out'; });
        var col = o.kind === 'power' ? '#111827' : '#1D4ED8';
        var shape = outs.length >= 3 ? L.polygon(hull(outs), { color: col, weight: 2, dashArray: '6 4', fillColor: col, fillOpacity: o.kind === 'power' ? 0.16 : 0.14 })
          : L.circle([outs[0] ? outs[0].lat : o.points[0].lat, outs[0] ? outs[0].lng : o.points[0].lng], { radius: 400, color: col, weight: 2, dashArray: '6 4', fillOpacity: 0.12 });
        shape.on('click', function () { if (!recentDrop()) go('outage/' + o.id); }).addTo(outageLayer);
        if (map.getZoom() >= 13) o.points.forEach(function (q) {
          L.circleMarker([q.lat, q.lng], q.st === 'out' ? { radius: 4, color: '#fff', weight: 1.5, fillColor: col, fillOpacity: 1, interactive: false } : { radius: 4, color: '#15803D', weight: 2.5, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(outageLayer);
        });
      });
    }
    if (S.filters.feeders) {
      var st = {
        on: { color: '#15803D', weight: 2, dashArray: '6 4', fillColor: '#22C55E', fillOpacity: 0.25 },
        working: { color: '#B45309', weight: 3, fillColor: '#F59E0B', fillOpacity: 0.35 },
        partial: { color: '#B45309', weight: 2, dashArray: '6 4', fillColor: '#F59E0B', fillOpacity: 0.15 },
        out: { color: '#111827', weight: 2, dashArray: '6 4', fillColor: '#111827', fillOpacity: 0.25 },
        unknown: { color: '#57606A', weight: 2, dashArray: '2 6', fillColor: '#9AA1A9', fillOpacity: 0.08 }
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
  // Rough demo evacuation zone along the west coast (not an official map).
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
      t = setTimeout(function () { cancel(); dropAt(map.containerPointToLatLng([start.x, start.y])); }, 500);
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
  map.on('moveend zoomend', function () { renderMarkers(); if (map.getZoom() !== lastZoom) { lastZoom = map.getZoom(); renderAreas(); } });
  var lastZoom = map.getZoom();

  // ---------- chrome (search, strip, chips, buttons, near-you) ----------
  function renderChrome() {
    var ch = $('#chrome'), onMap = !route.name, drop = route.name === 'drop';
    var strip = S.tsunami
      ? '<button class="strip red" data-act="go" data-to="updates"><span class="cond">TSUNAMI WARNING</span><span class="grow" style="font-weight:600;font-size:14px">Move to high ground now</span><span class="small" style="font-weight:700">PTWC ›</span></button>'
      : '<button class="strip" data-act="go" data-to="updates"><span class="cond">COR 1</span><span class="grow" style="font-weight:600;font-size:14px">Typhoon Warning · stay indoors</span><span class="small" style="font-weight:700;letter-spacing:.04em">OFFICIAL ›</span></button>';
    var chips = [['all', 'All'], ['road', 'Roads', '#C2410C'], ['light', 'Lights', '#A16207'], ['pole', 'Power lines', '#6D28D9'], ['outages', 'Outages', '#111827'], ['places', 'Places', '#0E7490']]
      .map(function (c) { return '<button class="chip' + (UI.quick === c[0] ? ' on' : '') + '" data-act="quick" data-v="' + c[0] + '">' + (c[2] ? '<span class="dot" style="background:' + c[2] + '"></span>' : '') + c[1] + '</button>'; }).join('');
    var near = '';
    if (onMap && !S.tsunami) {
      var roads = S.reports.filter(function (r) { return r.cat === 'road' && reportVisible(r) === 'yes' && dist(r, ME) < 8000; }).length;
      var gas = S.places.filter(function (p) { return p.type === 'gas' && p.open && dist(p, ME) < 10000; }).length;
      near = '<div class="near"><div class="handle"></div><div class="row" style="justify-content:space-between"><b style="font-size:17px">Near you</b><span class="demo-tag">DEMO DATA</span></div>' +
        '<div class="stats"><span><b style="color:#C2410C">' + roads + '</b> road blocks</span><span><b style="color:#15803D">' + gas + '</b> stations open</span><button data-act="nearOutage"><b>' + S.outages.length + '</b> outage areas</button>' + (ME.real ? '' : '<span class="muted small">demo location</span>') + '</div></div>';
    }
    var tsunamiSheet = '';
    if (S.tsunami && onMap) {
      var inside = inPoly(ME, C_ZONE), safe = nearestOf('tsunami');
      tsunamiSheet = '<div class="near" style="border-top:6px solid #B91C1C;display:flex;flex-direction:column;gap:10px"><div class="handle"></div>' +
        (inside ? '<div style="background:#FEE2E2;color:#7F1D1D;border-radius:10px;padding:10px 12px;font-weight:700">You appear to be inside the evacuation zone.</div>' : '<div style="background:#DCFCE7;color:#14532D;border-radius:10px;padding:10px 12px;font-weight:700">You appear to be outside the evacuation zone. Stay away from the coast.</div>') +
        (safe ? '<div><div class="small muted" style="font-weight:600">NEAREST TSUNAMI SAFE SPOT</div><div style="font-weight:700;font-size:20px">' + esc(safe.p.name) + '</div><div class="small">' + miles(safe.d) + ' · about ' + Math.max(1, Math.round(safe.d / 80)) + ' min on foot</div></div>' +
          '<button class="btn big full" style="background:#1E3A8A;color:#fff;border:0" data-act="directions" data-lat="' + safe.p.lat + '" data-lng="' + safe.p.lng + '">DIRECTIONS</button>' : '') +
        '<button class="btn sm" data-act="tsunamiToggle">End demo warning</button>' + '</div>';
    }
    ch.innerHTML =
      '<div class="topbar">' +
        '<div class="row"><label class="search">' + ic('search', 20, '#57606A', 2) + '<input id="q" type="search" placeholder="Search places, villages, feeder #" value="' + esc(UI.q) + '" autocomplete="off"></label>' +
        '<button class="sq" data-act="go" data-to="settings" aria-label="Settings">' + esc(S.me.slice(0, 2).toUpperCase()) + '</button></div>' +
        '<div id="results"></div>' + strip +
        (S.tsunami ? '' : '<div class="chips">' + chips + '</div>') +
      '</div>' +
      ((onMap || drop) && !S.tsunami ? '<div class="fabs" style="bottom:' + (onMap ? 'calc(110px + var(--safe-bot))' : 'calc(24px + var(--safe-bot))') + '"><button class="sq" data-act="go" data-to="filters" aria-label="Layers and filters">' + ic('layers', 22) + '</button><button class="sq" data-act="locate" aria-label="My location">' + ic('locate', 22) + '</button></div>' : '') +
      (onMap && !S.tsunami ? '<button class="fab" style="bottom:calc(110px + var(--safe-bot))" data-act="pinFab">' + ic('plus', 24, '#191414', 2.6) + 'PIN</button>' : '') +
      near + tsunamiSheet;
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
  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { UI.q = e.target.value; renderResults(); }
    var b = e.target.getAttribute && e.target.getAttribute('data-bind');
    if (b === 'draftNote' && draft) draft.note = e.target.value;
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

  function renderRoute(keep) {
    var prev = route.name;
    route = parse();
    if (prev === 'camera' && route.name !== 'camera') stopCam();
    if (['drop', 'report', 'camera'].indexOf(route.name) < 0 && draft) clearDraft();
    if (route.name === 'drop' && !draft) { go('', true); return; }
    if (route.name === 'report' && (!draft || !draft.cat)) { go('', true); return; }
    var key = route.name + '/' + route.arg, same = key === lastRouteKey || keep;
    lastRouteKey = key;
    var ov = $('#overlay'), scroll = $('.body', ov), st = scroll ? scroll.scrollTop : 0;
    var html = '';
    try { html = (VIEWS[route.name] || function () { return ''; })(route.arg); } catch (err) { html = ''; console.error(err); }
    ov.innerHTML = html;
    ov.classList.toggle('still', !!same);
    var nb = $('.body', ov); if (nb && same) nb.scrollTop = st;
    renderChrome(); renderMarkers(); renderAreas();
    if (route.name === 'drop') positionCard();
    if (route.name === 'camera') startCam();
  }

  // ---------- shared view pieces ----------
  function hdr(color, title, extra, backTo) {
    return '<div class="hdr ' + color + '"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back', 22) + '</button><h1>' + esc(title) + '</h1>' + (extra || '') + '</div>';
  }
  function followBtn(kind, id) {
    var on = S.follows[kind].indexOf(id) >= 0;
    return '<button class="follow' + (on ? ' on' : '') + '" data-act="follow" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-pressed="' + on + '">' + ic('bell', 16, 'currentColor', 2, on ? 'currentColor' : 'none') + (on ? 'Following' : 'Follow') + '</button>';
  }
  function notesHtml(list, key) {
    if (!list.length) return '<div class="muted small">No notes yet. Be the first.</div>';
    return list.slice().sort(function (a, b) { return b.t - a.t; }).map(function (n) {
      var k = key + ':' + n.id, mine = n.by === S.me, ed = UI.editing === k;
      return '<div class="note">' + avatar(n.by) + '<div class="bubble"><div class="who"><b>' + esc(n.by) + (mine ? ' (you)' : '') + '</b>' + roleTag(n.by) + '<span class="muted">· ' + rel(n.t) + '</span>' + (n.updated ? '<span class="tag updated">Updated</span>' : '') + '</div>' +
        (n.photo ? '<img src="' + n.photo + '" alt="Photo" style="width:100%;border-radius:8px">' : '') +
        (ed ? '<textarea class="input" id="edit-' + esc(n.id) + '">' + esc(n.text) + '</textarea><div class="row"><button class="btn sm fuchsia" data-act="saveEdit" data-k="' + esc(k) + '">Save update</button><button class="btn sm" data-act="cancelEdit">Cancel</button></div>'
          : '<div style="font-size:15px;line-height:1.4">' + esc(n.text) + '</div>') +
        (UI.expanded[k] && n.versions.length ? '<div class="small muted" style="border-left:3px solid #E1E4E8;padding-left:8px">' + n.versions.map(function (v) { return fdate(v.t) + ' ' + new Date(v.t).toTimeString().slice(0, 5) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
        '<div class="row" style="gap:12px">' + (mine && !ed ? '<button class="btn sm" data-act="editNote" data-k="' + esc(k) + '">' + ic('edit', 14) + 'Edit</button>' : '') +
        (n.versions.length ? '<button class="btn sm" style="border:0;padding:0;color:#0E5A8A" data-act="toggleHist" data-k="' + esc(k) + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (n.versions.length + 1) + ' versions</button>' : '') + '</div></div></div>';
    }).join('');
  }
  function composer(target, color) {
    return '<div class="composer"><input id="composer" type="text" placeholder="Add a note…" aria-label="Add a note" enterkeyhint="send"><button class="round-btn" style="border:1px solid #D5D9DE;background:#fff" data-act="camNote" data-target="' + target + '" aria-label="Attach photo">' + ic('camera', 22, '#191414', 2) + '</button><button class="round-btn" style="background:' + color + '" data-act="postNote" data-target="' + target + '" aria-label="Post note">' + ic('send', 20, '#191414', 2.4) + '</button></div>';
  }
  function seg(act, id, opts, cur, colors) {
    return '<div class="seg">' + opts.map(function (o) { var on = o[0] === cur; return '<button class="' + (on ? 'on' : '') + '" style="' + (on ? 'background:' + (colors[o[0]] || '#191414') : '') + '" data-act="' + act + '" data-id="' + id + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function catTile(cat, isPlace) {
    var c = isPlace ? PT[cat] : CATS[cat];
    return '<button class="cat' + (isPlace ? ' place' : '') + '" data-act="' + (isPlace ? 'dropPlace' : 'dropCat') + '" data-v="' + cat + '"><span class="i" style="background:' + c.tint + '">' + ic(c.icon, 20, c.color) + '</span>' + c.short + '</button>';
  }

  // ---------- views ----------
  var VIEWS = {};
  VIEWS[''] = function () { return ''; };

  VIEWS.drop = function () {
    var vill = nearestVillage(draft), snap = draft.snap ? byId(S.places, draft.snap) : null;
    if (snap) {
      var t = PT[snap.type];
      return '<div class="dropcard" role="dialog" aria-label="Did you mean"><div class="row"><span style="width:40px;height:40px;border-radius:8px;background:' + t.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + ic(t.icon, 20, '#fff') + '</span><span class="col grow" style="gap:0"><b style="font-size:18px">Did you mean ' + esc(snap.name) + '?</b><span class="small muted">' + t.label + ' · ' + esc(nearestVillage(snap)) + '</span></span><button class="icon-btn" data-act="back" aria-label="Cancel">' + ic('close', 18, '#57606A') + '</button></div>' +
        '<button class="btn aqua full" data-act="snapYes">Yes, update this ' + t.short.toLowerCase() + '</button><button class="btn full" data-act="snapNo">No, something else here</button></div>';
    }
    return '<div class="dropcard" role="dialog" aria-label="What is here"><div class="row"><span class="col grow" style="gap:0"><b style="font-size:18px">What’s here?</b><span class="small muted">Pin near ' + esc(vill) + ' · drag the pin to adjust</span></span><button class="icon-btn" data-act="back" aria-label="Cancel">' + ic('close', 18, '#57606A') + '</button></div>' +
      '<div class="catgrid">' + ['road', 'light', 'pole', 'power', 'water'].map(function (c) { return catTile(c); }).join('') + '<span></span>' + ['gas', 'store', 'supply', 'shelter', 'muster', 'tsunami'].map(function (c) { return catTile(c, true); }).join('') + '</div></div>';
  };

  VIEWS.report = function () {
    var c = CATS[draft.cat], vill = nearestVillage(draft);
    return '<div class="sheet t-tangerine" style="max-height:62%">' +
      '<div class="row"><span style="width:40px;height:40px;border-radius:20px;background:' + c.tint + ';display:flex;align-items:center;justify-content:center">' + ic(c.icon, 20, c.color) + '</span><span class="col grow" style="gap:0"><b style="font-size:18px">' + c.label + '</b><span class="small muted">near ' + esc(vill) + ' · drag the pin to fine-tune</span></span><button class="btn sm" data-act="changeCat">Change</button></div>' +
      '<div class="lbl">What kind?</div><div class="chips" style="flex-wrap:wrap">' + c.kinds.map(function (k) { return '<button class="chip' + (draft.kind === k ? ' on' : '') + '" style="' + (draft.kind === k ? 'background:#FF4632;color:#191414' : 'border:1px solid #D5D9DE;box-shadow:none') + '" data-act="kind" data-v="' + esc(k) + '">' + esc(k) + '</button>'; }).join('') + '</div>' +
      '<div class="row">' + (draft.photo ? '<button style="width:64px;height:64px;border-radius:12px;border:0;background:url(' + draft.photo + ') center/cover;flex-shrink:0" data-act="removePhoto" aria-label="Remove photo"></button>' : '<button style="width:64px;height:64px;border-radius:12px;border:2px dashed #9AA1A9;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0" data-act="camDraft" aria-label="Add photo">' + ic('camera', 26, '#191414', 2) + '</button>') +
      '<input class="input grow" style="height:64px" data-bind="draftNote" placeholder="Note (optional): lanes, depth, detour…" value="' + esc(draft.note) + '"></div>' +
      (S.frozen && !isAdmin() ? '<div class="small" style="color:#991B1B;font-weight:700">Posting is paused by an admin.</div>' : '') +
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
    var c = CATS[r.cat], mine = r.by === S.me, k = 'r:' + r.id + ':main', ed = UI.editing === k;
    var main = r.note, updated = main.versions.length > 0;
    return '<div class="page">' +
      '<div class="body" style="padding:0;gap:0">' +
        '<div class="photo" style="' + (r.photo ? 'background-image:url(' + r.photo + ')' : '') + '">' + (r.photo ? '' : 'No photo yet') +
          '<button class="icon-btn" style="position:absolute;left:10px;top:calc(10px + var(--safe-top));background:rgba(0,0,0,.55);color:#fff" data-act="back" aria-label="Back">' + ic('back', 22) + '</button>' +
          '<button class="icon-btn" style="position:absolute;right:10px;top:calc(10px + var(--safe-top));background:rgba(0,0,0,.55);color:#fff" data-act="flagReport" data-id="' + r.id + '" aria-label="Flag this report">' + ic('flag', 20) + '</button></div>' +
        '<div style="padding:16px;background:#fff;border-top:6px solid #F037A5;border-bottom:1px solid #E1E4E8;display:flex;flex-direction:column;gap:6px">' +
          '<span class="tag" style="background:' + c.color + ';color:#fff">' + c.label + ' · ' + esc(r.kind) + '</span>' +
          '<div style="font-weight:700;font-size:22px;line-height:1.2">' + esc(r.title) + '</div>' +
          '<div class="small muted">Reported by ' + esc(r.by) + ' · ' + rel(r.t) + ' · last activity ' + rel(r.last) + ' · ' + miles(dist(r, ME)) + ' away</div>' +
          '<div class="row" style="margin-top:6px"><div class="vote" role="group" aria-label="Vote"><button class="' + (r.myVote > 0 ? 'on' : '') + '" data-act="vote" data-id="' + r.id + '" data-v="1" aria-label="Upvote">' + ic('up', 20, 'currentColor', 2.6) + '</button><b>' + (r.score > 0 ? '+' : '') + r.score + '</b><button class="' + (r.myVote < 0 ? 'on' : '') + '" data-act="vote" data-id="' + r.id + '" data-v="-1" aria-label="Downvote">' + ic('down', 20, 'currentColor', 2.6) + '</button></div><span class="grow"></span>' +
          '<button class="follow" data-act="go" data-to="merge/' + r.id + '">' + ic('merge', 18) + 'Suggest merge</button></div>' +
        '</div>' +
        '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px">' +
          '<div class="card"><div class="row" style="justify-content:space-between"><b>Note from ' + esc(r.by) + (mine ? ' (you)' : '') + '</b>' + (updated ? '<span class="tag updated">Updated ' + rel(main.t) + '</span>' : '') + '</div>' +
            (ed ? '<textarea class="input" id="edit-main">' + esc(main.text) + '</textarea><div class="row"><button class="btn sm fuchsia" data-act="saveEdit" data-k="' + k + '">Save update</button><button class="btn sm" data-act="cancelEdit">Cancel</button></div>'
              : '<div style="font-size:16px;line-height:1.45">' + (main.text ? esc(main.text) : '<span class="muted">No note.</span>') + '</div>') +
            (UI.expanded[k] ? '<div class="small muted" style="border-left:3px solid #E1E4E8;padding-left:8px">' + main.versions.map(function (v) { return fdate(v.t) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
            '<div class="row" style="gap:12px">' + (mine && !ed ? '<button class="btn sm" data-act="editNote" data-k="' + k + '">' + ic('edit', 14) + 'Update note</button>' : '') + (updated ? '<button class="btn sm" style="border:0;padding:0;color:#0E5A8A" data-act="toggleHist" data-k="' + k + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (main.versions.length + 1) + ' versions</button>' : '') + '</div></div>' +
          '<div class="row" style="justify-content:space-between"><span class="lbl">Notes on this · ' + r.notes.length + '</span><span class="small muted">Newest first</span></div>' +
          notesHtml(r.notes, 'r:' + r.id) +
        '</div>' +
      '</div>' + composer('r:' + r.id, '#F037A5') + '</div>';
  };

  VIEWS.merge = function (id) {
    var r = byId(S.reports, id); if (!r) return VIEWS.missing();
    var cands = S.reports.filter(function (x) { return x.id !== r.id && x.cat === r.cat && dist(x, r) < 1500; }).sort(function (a, b) { return dist(a, r) - dist(b, r); });
    UI.mergePick = UI.mergePick && byId(cands, UI.mergePick) ? UI.mergePick : (cands[0] && cands[0].id);
    return '<div class="scrim" data-act="back"></div><div class="sheet t-fuchsia"><div class="handle"></div><div class="row"><b class="grow" style="font-size:19px">Suggest merge</b><button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<div class="small muted">This report: <b style="color:#191414">' + esc(r.title) + '</b></div><div class="lbl">Which nearby pin is the same thing?</div>' +
      (cands.length ? cands.map(function (x) { var on = x.id === UI.mergePick; return '<button class="card" style="flex-direction:row;align-items:center;text-align:left;' + (on ? 'border:2px solid #F037A5' : '') + '" data-act="mergePick" data-id="' + x.id + '"><span style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (on ? '#F037A5' : '#9AA1A9') + ';background:' + (on ? '#F037A5' : '#fff') + ';flex-shrink:0"></span><span class="col grow" style="gap:2px"><b>' + esc(x.title) + '</b><span class="small muted">' + miles(dist(x, r)) + ' away · ' + rel(x.t) + ' · ' + (x.score > 0 ? '+' : '') + x.score + '</span></span></button>'; }).join('')
        : '<div class="muted">No similar pins nearby.</div>') +
      '<div style="background:#EEF2F6;border-radius:12px;padding:12px;font-size:14px;line-height:1.45"><b>If merged:</b> notes, photos and votes combine into one pin. Each note keeps its author. An admin reviews the suggestion first.</div>' +
      '<button class="btn big fuchsia full" data-act="sendMerge" data-id="' + r.id + '"' + (cands.length ? '' : ' disabled') + '>SEND SUGGESTION</button></div>';
  };

  VIEWS.place = function (id) {
    var p = byId(S.places, id); if (!p) return VIEWS.missing();
    var t = PT[p.type], body = '';
    if (p.type === 'gas') body = gasBody(p); else if (p.type === 'store') body = storeBody(p); else body = safeBody(p);
    return '<div class="page"><div class="hdr aqua" style="align-items:flex-start;padding-top:calc(8px + var(--safe-top));padding-bottom:12px"><button class="icon-btn" data-act="back" aria-label="Back">' + ic('back', 22) + '</button>' +
      '<div class="col grow" style="gap:2px;padding-top:6px"><div style="font-weight:700;font-size:21px;line-height:1.15">' + esc(p.name) + '</div><div class="small" style="color:#3A4048">' + t.label + ' · ' + esc(nearestVillage(p)) + ' · ' + miles(dist(p, ME)) + (p.official ? ' · <b>official</b>' : '') + (p.pending ? ' · <b>pending review</b>' : '') + '</div></div>' + followBtn('places', p.id) + '</div>' +
      '<div class="body">' + body + '<div class="lbl">Discussion · ' + p.notes.length + '</div>' + notesHtml(p.notes, 'p:' + p.id) + '</div>' + composer('p:' + p.id, '#F037A5') + '</div>';
  };
  function gasBody(p) {
    var pr = p.prices;
    function prow(k, label) { var x = pr[k]; return '<div class="row" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid #EEF0F2"><span style="font-weight:600;font-size:16px">' + label + '</span><span>' + (x.out ? '<b class="muted">Sold out</b>' : x.v ? '<b style="font-size:20px">$' + x.v.toFixed(2) + '</b>' : '<b class="muted">—</b>') + ' <span class="small muted">' + (x.t ? rel(x.t) : '') + '</span></span></div>'; }
    return '<div class="card"><div class="row"><span class="cond" style="font-size:26px;padding:2px 12px;border-radius:6px;background:' + (p.open ? '#15803D' : '#57606A') + ';color:#fff">' + (p.open ? 'OPEN' : 'CLOSED') + '</span><span class="small" style="line-height:1.3">' + (p.open ? p.openVotes : p.closedVotes) + ' people said ' + (p.open ? 'open' : 'closed') + '<br>last report ' + rel(p.statusT) + '</span></div>' +
      '<div class="grid2"><button class="btn green" data-act="gasStatus" data-id="' + p.id + '" data-v="1">It’s open</button><button class="btn gray" data-act="gasStatus" data-id="' + p.id + '" data-v="0">It’s closed</button></div>' +
      '<div class="row" style="border-top:1px solid #EEF0F2;padding-top:10px"><b class="grow">Line right now</b>' + seg('line', p.id, [['none', 'None'], ['short', 'Short'], ['long', 'Long · ' + p.lineVotes.long]], p.line, { none: '#15803D', short: '#A16207', long: '#C2410C' }) + '</div></div>' +
      '<div class="card" style="gap:4px"><div class="lbl">Prices</div>' + prow('unleaded', 'Unleaded') + prow('diesel', 'Diesel') + prow('premium', 'Premium') +
      '<button class="btn full" style="margin-top:8px;background:#F5F6F7" data-act="go" data-to="prices/' + p.id + '">Report prices</button></div>' +
      (p.tags.length ? '<div class="row" style="flex-wrap:wrap;gap:6px">' + p.tags.map(function (x) { return '<span style="height:30px;padding:0 10px;border-radius:15px;background:#E7ECF1;font-size:14px;font-weight:600;display:flex;align-items:center">' + esc(x) + '</span>'; }).join('') + '</div>' : '');
  }
  function storeBody(p) {
    var ok = p.owner, k = 'p:' + p.id + ':owner';
    var owner = ok ? '<div class="card" style="background:#ECFEFF;border-color:#0E7490"><div class="row" style="flex-wrap:wrap;gap:6px"><span class="tag" style="background:#0E7490;color:#fff">' + ic('check', 12, '#fff', 3) + 'Verified owner</span>' + (ok.versions.length ? '<span class="tag updated">Updated ' + rel(ok.t) + '</span>' : '') + '</div><div style="font-size:16px;line-height:1.45">' + esc(ok.text) + '</div>' +
      (UI.expanded[k] ? '<div class="small muted" style="border-left:3px solid #9BF0E1;padding-left:8px">' + ok.versions.map(function (v) { return fdate(v.t) + ': ' + esc(v.text); }).join('<br>') + '</div>' : '') +
      (ok.versions.length ? '<button class="btn sm" style="border:0;padding:0;color:#0E5A8A;align-self:flex-start;background:none" data-act="toggleHist" data-k="' + k + '">' + (UI.expanded[k] ? 'Hide' : 'See') + ' ' + (ok.versions.length + 1) + ' versions</button>' : '') + '</div>'
      : '<div class="card" style="border-style:dashed"><b>No owner notes yet</b><div class="small muted">Own this store? Claim it to post official hours and stock.</div><button class="btn sm" data-act="claim" data-id="' + p.id + '">Claim this store</button></div>';
    var stock = '<div class="card"><div class="row" style="justify-content:space-between"><span class="lbl">Stock check</span><span class="small muted">tap to update · ' + rel(p.stockT) + '</span></div>' +
      Object.keys(p.stock).map(function (item) { var s = p.stock[item]; return '<div class="row"><span class="grow" style="font-weight:600">' + esc(item) + '</span>' + seg('stock', p.id + '|' + item, [['in', 'In stock' + (s.s === 'in' ? ' · ' + s.n : '')], ['low', 'Low' + (s.s === 'low' ? ' · ' + s.n : '')], ['out', 'Out' + (s.s === 'out' ? ' · ' + s.n : '')]], s.s, { in: '#15803D', low: '#A16207', out: '#57606A' }) + '</div>'; }).join('') +
      '<div class="row" style="border-top:1px solid #EEF0F2;padding-top:8px"><b class="grow">Line at the door</b>' + seg('line', p.id, [['none', 'None'], ['short', 'Short'], ['long', 'Long · ' + p.lineVotes.long]], p.line, { none: '#15803D', short: '#A16207', long: '#C2410C' }) + '</div>' +
      '<div class="row"><input class="input grow" id="newitem" placeholder="Add an item to check"><button class="btn sm" data-act="addItem" data-id="' + p.id + '">Add</button></div></div>';
    var prices = '<div class="card"><div class="lbl">Recent price reports</div>' + (p.prices.length ? p.prices.map(function (x, i) {
      return '<div class="col" style="gap:4px;padding-bottom:10px;border-bottom:1px solid #EEF0F2"><div class="row" style="justify-content:space-between"><span style="font-weight:600;font-size:16px">' + esc(x.item) + '</span><b style="font-size:20px">$' + x.v.toFixed(2) + '</b></div>' +
        (x.before ? '<div class="small">Before the storm: <b>$' + x.before.toFixed(2) + '</b></div>' : '') +
        '<div class="row" style="flex-wrap:wrap">' + (x.flags >= 3 ? '<span class="tag" style="background:#C2410C;color:#fff">Gouging suspected · ' + x.flags + ' flags</span>' : '') + '<span class="small muted">' + rel(x.t) + '</span><span class="grow"></span><button class="btn sm red" data-act="flagPrice" data-id="' + p.id + '" data-v="' + i + '">' + ic('flag', 14) + 'Flag gouging' + (x.flags && x.flags < 3 ? ' · ' + x.flags : '') + '</button></div></div>';
    }).join('') : '<div class="muted small">No prices reported yet.</div>') +
      '<div class="lbl" style="margin-top:4px">Report a price</div><input class="input" id="pitem" placeholder="Item (e.g. Bottled water, 24-pack)"><div class="grid2"><input class="input" id="pnow" inputmode="decimal" placeholder="Price now $"><input class="input" id="pbefore" inputmode="decimal" placeholder="Before storm $ (optional)"></div><button class="btn" data-act="addPrice" data-id="' + p.id + '">Submit price</button></div>';
    return owner + stock + prices;
  }
  function safeBody(p) {
    var t = PT[p.type], desc = {
      shelter: 'Stay here: sleeping space and basic services.',
      muster: 'Gather point only. No shelter or services; used for headcounts and pickup.',
      tsunami: 'High ground. Go here during a tsunami warning.',
      supply: p.detail || 'Water, ice or food distribution.'
    }[p.type];
    return '<div class="row" style="flex-wrap:wrap;gap:6px"><span class="tag" style="background:' + t.color + ';color:#fff">' + t.label + '</span>' + (p.official ? '<span class="tag official">Official</span>' : '<span class="tag" style="background:#EEF0F2">Community</span>') + '<span class="tag" style="background:#E7ECF1">Long-term</span></div>' +
      '<div style="font-size:15px">' + esc(desc) + '</div>' +
      (p.type === 'shelter' ? '<div class="card"><div class="row" style="align-items:baseline;gap:10px"><b style="font-size:28px">' + p.occ + ' / ' + p.cap + '</b><span class="small">occupancy · ' + Math.round(p.occ / p.cap * 100) + '% full<br><span class="muted">from JIC release, ' + fdate(p.occT) + '</span></span></div>' +
        '<div class="row" style="justify-content:space-between;border-top:1px solid #EEF0F2;padding-top:6px"><span class="muted">Pets</span><b>' + p.pets + '</b></div><div class="row" style="justify-content:space-between"><span class="muted">Generator power</span><b>' + p.generator + '</b></div></div>' : '') +
      '<div class="card" style="background:#F5F6F7"><b style="font-size:17px">Do you know if this is still relevant?</b><div class="small">Last confirmed <b>' + fdate(p.confirmed) + '</b> (' + rel(p.confirmed) + ') by ' + p.confirmN + ' ' + (p.confirmN === 1 ? 'person' : 'people') + '</div>' +
        '<div class="grid2"><button class="btn green" data-act="confirm" data-id="' + p.id + '" data-v="yes">Yes, still ' + (p.type === 'shelter' || p.type === 'supply' ? 'open' : 'valid') + '</button><button class="btn gray" data-act="confirm" data-id="' + p.id + '" data-v="no">No, ' + (p.type === 'shelter' || p.type === 'supply' ? 'closed' : 'not anymore') + '</button></div><button class="btn sm" style="border:0;background:none" data-act="confirm" data-id="' + p.id + '" data-v="skip">Not sure, skip</button></div>' +
      '<button class="btn" data-act="directions" data-lat="' + p.lat + '" data-lng="' + p.lng + '">Directions</button>';
  }

  VIEWS.prices = function (id) {
    var p = byId(S.places, id); if (!p) return VIEWS.missing();
    function f(k, label, req) { var x = p.prices[k]; return '<label class="col" style="gap:4px"><span class="row" style="justify-content:space-between"><b class="cond" style="font-size:16px">' + label + (req ? '' : ' <span class="muted" style="font-family:Barlow;font-weight:500;font-size:13px;letter-spacing:0">optional</span>') + '</b><span class="small muted">' + (x.v ? 'Last: $' + x.v.toFixed(2) + ' · ' + rel(x.t) : '') + '</span></span><span class="row" style="height:' + (req ? 72 : 56) + 'px;border:' + (req ? '2px solid #15803D' : '1px solid #D5D9DE') + ';border-radius:14px;padding:0 14px;background:' + (req ? '#F0FDF4' : '#fff') + '"><b style="font-size:' + (req ? 32 : 20) + 'px;color:#57606A">$</b><input id="pr-' + k + '" inputmode="decimal" placeholder="' + (req ? '0.00' : '—') + '" style="border:0;outline:0;background:transparent;font-size:' + (req ? 36 : 22) + 'px;font-weight:700;flex:1;min-width:0"><span class="small muted">/ gal</span></span></label>'; }
    return '<div class="scrim" data-act="back"></div><div class="sheet t-aqua"><div class="handle"></div><div class="row"><b class="grow" style="font-size:20px">Report prices</b><button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div><div class="small muted">' + esc(p.name) + '</div>' +
      f('unleaded', 'UNLEADED', true) + f('diesel', 'Diesel') + f('premium', 'Premium') + '<button class="btn big aqua full" data-act="submitPrices" data-id="' + p.id + '">SUBMIT PRICES</button></div>';
  };

  VIEWS.outage = function (id) {
    var o = byId(S.outages, id); if (!o) return VIEWS.missing();
    var outs = o.points.filter(function (q) { return q.st === 'out'; }).length, backs = o.points.length - outs, pw = o.kind === 'power';
    return '<div class="sheet t-aqua" style="max-height:55%"><div class="handle"></div>' +
      '<div class="row"><span class="tag" style="background:' + (pw ? '#111827' : '#1D4ED8') + ';color:#fff">' + (pw ? 'Power' : 'Water') + ' outage</span><span class="grow"></span>' + followBtn('villages', o.name) + '<button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<b style="font-size:21px">' + esc(o.name) + ' area</b>' +
      '<div class="small muted" style="line-height:1.4">Out since <b style="color:#191414">' + fdate(o.since) + '</b> · last confirmed ' + rel(o.confirmed) + '. Shape built from ' + outs + ' “no ' + o.kind + '” reports; ' + backs + ' nearby say it’s back. Stays on the map until people report it’s back.</div>' +
      '<b class="small">At your location' + (ME.real ? '' : ' (demo location)') + ':</b><div class="grid2"><button class="btn black" data-act="outagePt" data-id="' + o.id + '" data-v="out">No ' + o.kind + ' here</button><button class="btn green" data-act="outagePt" data-id="' + o.id + '" data-v="back">' + (pw ? 'Power' : 'Water') + ' is back</button></div></div>';
  };

  VIEWS.feeder = function (id) {
    var f = byId(S.feeders, id); if (!f) return VIEWS.missing();
    var lab = { on: ['ON', '#22C55E', '#191414'], working: ['CREWS WORKING · NEXT 1–3 DAYS', '#F59E0B', '#191414'], partial: ['PARTIALLY ON', '#FDE68A', '#191414'], out: [f.heavy ? 'OUT · HEAVY DAMAGE' : 'OUT', '#111827', '#fff'], unknown: ['NO WORD YET', '#E1E4E8', '#191414'] }[f.status];
    var pct = f.total ? Math.round(f.yes / f.total * 100) : null, mine = f.id === S.settings.feeder;
    return '<div class="sheet t-citric" style="max-height:62%"><div class="handle"></div>' +
      '<div class="row"><div class="col grow" style="gap:0"><span class="small muted" style="font-weight:700;letter-spacing:.05em">' + (mine ? 'YOUR FEEDER' : 'GPA FEEDER') + '</span><span class="cond" style="font-size:30px;line-height:1">' + f.id + '</span></div>' + followBtn('feeders', f.id) + '<button class="icon-btn" data-act="back" aria-label="Close">' + ic('close', 20) + '</button></div>' +
      '<span class="tag" style="background:' + lab[1] + ';color:' + lab[2] + ';font-size:15px">' + lab[0] + '</span>' +
      '<div style="font-size:15px;line-height:1.4">' + esc(f.desc) + '</div><div class="small muted">Area outline is approximate (demo). Status from the latest GPA focus list.</div>' +
      '<div class="row" style="background:#F5F6F7;border-radius:10px;padding:10px 12px;gap:10px"><b style="font-size:24px">' + (pct == null ? '—' : pct + '%') + '</b><span class="small">of people on ' + f.id + ' say their power is back <span class="muted">(' + f.total + ' reports)</span></span></div>' +
      '<div class="grid2"><button class="btn green" data-act="feederVote" data-id="' + f.id + '" data-v="1">My power is back</button><button class="btn black" data-act="feederVote" data-id="' + f.id + '" data-v="0">Still out</button></div>' +
      (mine ? '' : '<button class="btn sm" data-act="setFeeder" data-id="' + f.id + '">This is my feeder</button>') + '</div>';
  };

  VIEWS.filters = function () {
    var F = S.filters;
    function ck(k, label, color, sq) { return '<label><input type="checkbox" data-change="filter" data-k="' + k + '"' + (F[k] ? ' checked' : '') + '><span style="width:10px;height:10px;border-radius:' + (sq ? '2px' : '50%') + ';background:' + color + '"></span>' + label + '</label>'; }
    return '<div class="scrim" data-act="back"></div><div class="sheet"><div class="handle"></div><div class="row"><b class="grow" style="font-size:20px">Map layers</b><button class="btn sm" data-act="back">Done</button></div>' +
      '<div class="checks">' + ck('road', 'Road blocks', '#C2410C') + ck('light', 'Traffic lights', '#A16207') + ck('pole', 'Pole / lines', '#6D28D9') + ck('outages', 'Outage areas', '#111827', 1) + ck('gas', 'Gas stations', '#15803D', 1) + ck('store', 'Stores', '#0E7490', 1) + ck('shelter', 'Shelters', '#9D174D', 1) + ck('muster', 'Muster points', '#334155', 1) + ck('tsunami', 'Tsunami safe', '#1E3A8A', 1) + ck('supply', 'Supply points', '#B45309', 1) + '</div>' +
      '<label class="row" style="min-height:52px;padding:6px 12px;border:2px solid #9DBF2E;border-radius:10px;background:#F3FCD9;font-weight:700"><input type="checkbox" data-change="filter" data-k="official"' + (F.official ? ' checked' : '') + ' style="width:18px;height:18px"><span class="grow">Official updates<br><span class="small" style="font-weight:500">JIC · GPA · GWA, approved by admins</span></span></label>' +
      '<label class="row" style="min-height:52px;padding:6px 12px;border:1px solid #D5D9DE;border-radius:10px;font-weight:700"><input type="checkbox" data-change="filter" data-k="feeders"' + (F.feeders ? ' checked' : '') + ' style="width:18px;height:18px"><span class="grow">GPA feeder overlay<br><span class="small muted" style="font-weight:500">Find your feeder # on your GPA bill</span></span></label>' +
      '<div class="lbl">Hide reports with no activity for</div><div class="grid3">' + [[6, '6 h'], [24, '24 h'], [72, '3 days']].map(function (o) { return '<button class="btn sm' + (F.windowH === o[0] ? ' black' : '') + '" data-act="windowH" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="small muted">Activity = posted, voted on, or a new note. Outage areas, shelters and safe spots never hide this way; they ask “still relevant?” instead.</div>' +
      '<label class="row" style="justify-content:space-between;min-height:44px;font-weight:700">Show older posts<input type="checkbox" class="switch" data-change="filter" data-k="older"' + (F.older ? ' checked' : '') + '></label>' +
      (F.older ? '<div class="grid2"><label class="col small muted" style="gap:2px;font-weight:600">From<input class="input" type="date" data-change="date" data-k="from" value="' + esc(F.from) + '"></label><label class="col small muted" style="gap:2px;font-weight:600">To<input class="input" type="date" data-change="date" data-k="to" value="' + esc(F.to) + '"></label></div><div class="small muted">Older pins show faded with their date.</div>' : '') + '</div>';
  };

  VIEWS.updates = function () {
    var src = UI.src || 'All', list = S.updates.filter(function (u) { return src === 'All' || u.src === src || (src === 'Tsunami' && u.src === 'PTWC'); }).sort(function (a, b) { return b.t - a.t; });
    var colors = { NWS: ['#1F2937', '#fff'], JIC: ['#CDF564', '#191414'], GPA: ['#1D4ED8', '#fff'], GWA: ['#0E7490', '#fff'], PTWC: ['#1E3A8A', '#fff'], Broadcast: ['#191414', '#CDF564'] };
    return '<div class="page">' + hdr('citric', 'Official updates') +
      '<div style="background:#CDF564;padding:0 12px 12px;display:flex;flex-direction:column;gap:8px">' +
        (S.tsunami ? '<div style="background:#B91C1C;color:#fff;border-radius:10px;padding:10px 12px"><div class="cond" style="font-size:22px">TSUNAMI WARNING · GUAM</div><div class="small" style="font-weight:600">Move to high ground or inland now. (demo)</div></div>'
          : '<div style="background:#191414;color:#CDF564;border-radius:10px;padding:10px 12px"><div class="cond" style="font-size:22px">COR 1 · STAY INDOORS</div><div class="small" style="font-weight:600">Typhoon Warning in effect · No tsunami threat</div></div>') +
        '<div class="chips">' + ['All', 'NWS', 'Tsunami', 'JIC', 'GPA', 'GWA'].map(function (s) { return '<button class="chip' + (src === s ? ' on' : '') + '" data-act="src" data-v="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
      '<div class="body">' + list.map(function (u) { var c = colors[u.src] || ['#191414', '#fff']; return '<div class="feed-card"><div class="row"><span class="tag" style="background:' + c[0] + ';color:' + c[1] + '">' + (u.src === 'PTWC' ? 'Tsunami · PTWC' : esc(u.src)) + '</span><span class="small muted">' + (u.auto ? 'automatic · ' : '') + rel(u.t) + '</span></div><b style="font-size:16px">' + esc(u.title) + '</b><div class="small" style="color:#3A4048">' + esc(u.body) + '</div>' + (u.link ? '<button class="btn sm" style="align-self:flex-start;border:0;padding:0;color:#0E5A8A;background:none" data-act="updLink" data-v="' + esc(u.link) + '">Show on map ›</button>' : '') + '</div>'; }).join('') +
        '<div class="lbl">Hotlines</div><a class="tel em" href="tel:911">Emergency<span>911</span></a><a class="tel" href="tel:6714780210">JIC hotline<span>(671) 478-0210</span></a><a class="tel" href="tel:6714751472">GPA downed lines<span>(671) 475-1472</span></a><a class="tel" href="tel:6716464211">GWA dispatch<span>(671) 646-4211</span></a>' +
        '<div class="small muted">Demo feed. In the real app NWS and PTWC items arrive automatically; JIC, GPA and GWA items are reviewed by admins first.</div></div></div>';
  };

  VIEWS.settings = function () {
    var s = S.settings;
    function tog(k, title, sub) { return '<label class="toggle-row"><span class="col grow" style="gap:0"><b style="font-size:15px">' + title + '</b><span class="small muted">' + sub + '</span></span><input type="checkbox" class="switch" data-change="setting" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '></label>'; }
    var nf = S.follows.places.length + S.follows.villages.length + S.follows.feeders.length;
    return '<div class="page">' + hdr('klein', 'Settings') + '<div class="body">' +
      '<div class="card" style="flex-direction:row;align-items:center;gap:12px">' + avatar(S.me) + '<div class="col grow" style="gap:0"><b>' + esc(S.me) + '</b><span class="small muted">' + S.reports.filter(function (r) { return r.by === S.me; }).length + ' reports</span></div>' + roleTag(S.me) + '</div>' +
      '<div class="card" style="border:2px dashed #4100F5"><div class="lbl" style="color:#4100F5">Demo controls</div>' +
        '<label class="row" style="justify-content:space-between"><b>Role</b><select class="input" style="width:150px;height:44px" data-change="role">' + ['user', 'admin', 'omega'].map(function (r) { return '<option value="' + r + '"' + (s.role === r ? ' selected' : '') + '>' + r[0].toUpperCase() + r.slice(1) + '</option>'; }).join('') + '</select></label>' +
        '<label class="row" style="justify-content:space-between;min-height:44px"><b>Simulate tsunami warning</b><input type="checkbox" class="switch" data-change="tsunami"' + (S.tsunami ? ' checked' : '') + '></label>' +
        '<button class="btn sm red" data-act="reset">Reset demo data</button><div class="small muted">All places, people and statuses are fictional. Your posts are saved on this phone only.</div></div>' +
      (isAdmin() ? '<button class="card" style="flex-direction:row;align-items:center;text-align:left" data-act="go" data-to="admin">' + ic('shield', 22) + '<span class="col grow" style="gap:0"><b>Admin console</b><span class="small muted">Moderation queue · imports' + (role() === 'omega' ? ' · roles' : '') + '</span></span>' + ic('chev', 18) + '</button>' : '') +
      '<button class="card" style="flex-direction:row;align-items:center;text-align:left" data-act="go" data-to="following">' + ic('bell', 22) + '<span class="col grow" style="gap:0"><b>Following</b><span class="small muted">' + nf + ' places, villages and feeders</span></span>' + ic('chev', 18) + '</button>' +
      '<div class="lbl">Permissions</div><div class="list"><div class="toggle-row">' + ic('locate', 22) + '<span class="col grow" style="gap:0"><b>Location</b><span class="small muted">Places reports, finds things near you</span></span><b class="small" style="color:' + (ME.real ? '#14532D' : '#9A3412') + '">' + (ME.real ? 'Using GPS' : 'Demo location') + '</b></div><div class="toggle-row">' + ic('camera', 22) + '<span class="col grow" style="gap:0"><b>Camera</b><span class="small muted">Asked the first time you add a photo</span></span></div></div>' +
      '<div class="lbl">Notifications <span class="muted" style="font-family:Barlow;font-weight:500;letter-spacing:0;text-transform:none">(demo: nothing is sent)</span></div><div class="list">' +
        tog('nTsunami', 'Tsunami warnings', 'Off if you already get GTA / phone emergency alerts') + tog('nWeather', 'Weather warnings & COR changes', 'NWS warnings, JIC readiness level') + tog('nOfficial', 'Official updates', 'New JIC, GPA, GWA releases') + tog('nBack', 'Power / water back near me', 'When your outage area shrinks or clears') + tog('nNear', 'New reports near me', 'Road blocks, supply points, gas open') + tog('nFollow', 'Places & villages I follow', 'Status changes, stock, outages, owner notes') +
        '<label class="toggle-row" style="background:#FAFBFC;padding-left:28px"><span class="col grow" style="gap:0"><b style="font-size:14px">Notify after matching reports</b><span class="small muted">1 = every report · higher = wait for agreement</span></span><input class="input" type="number" min="1" max="20" inputmode="numeric" data-change="setting" data-k="threshold" value="' + s.threshold + '" style="width:72px;text-align:center;font-weight:700"></label>' +
        tog('nReplies', 'Replies to my posts', 'Notes, merge suggestions') + '</div>' +
      '<div class="lbl">“Near me” means</div><div class="grid2" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + ['1 mi', '3 mi', 'Village', 'Island'].map(function (r) { return '<button class="btn sm' + (s.radius === r ? ' black' : '') + '" data-act="radius" data-v="' + r + '">' + r + '</button>'; }).join('') + '</div>' +
      '<label class="card" style="flex-direction:row;align-items:center;justify-content:space-between"><b>Home village</b><select class="input" style="width:170px;height:44px" data-change="setting" data-k="home">' + C.VILLAGES.map(function (v) { return '<option' + (s.home === v[0] ? ' selected' : '') + '>' + esc(v[0]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="card" style="flex-direction:row;align-items:center;justify-content:space-between"><span class="col" style="gap:0"><b>My GPA feeder #</b><span class="small muted">Printed on your GPA bill</span></span><input class="input" data-change="setting" data-k="feeder" value="' + esc(s.feeder) + '" style="width:110px;text-align:center;font-weight:700"></label>' +
      '</div></div>';
  };

  VIEWS.following = function () {
    var F = S.follows;
    function bell(kind, id) { var muted = F.muted[kind + ':' + id]; return '<button class="icon-btn" data-act="mute" data-kind="' + kind + '" data-id="' + esc(id) + '" aria-label="' + (muted ? 'Unmute' : 'Mute') + '">' + ic(muted ? 'bellOff' : 'bell', 20, muted ? '#57606A' : '#191414', 2, muted ? 'none' : 'currentColor') + '</button>'; }
    var vill = F.villages.map(function (v) {
      var o = S.outages.filter(function (x) { return x.name === v; });
      var chips = o.length ? o.map(function (x) { return '<span style="background:' + (x.kind === 'power' ? '#111827' : '#1D4ED8') + ';color:#fff;padding:0 6px;border-radius:3px;font-weight:600">No ' + x.kind + ' since ' + fdate(x.since) + '</span>'; }).join(' ') : '<span style="background:#DCFCE7;color:#14532D;padding:0 6px;border-radius:3px;font-weight:600">No outages reported</span>';
      return '<div class="toggle-row"><button class="col grow" style="gap:2px;border:0;background:none;text-align:left;padding:0" data-act="flyVillage" data-id="' + esc(v) + '"><b style="font-size:16px">' + esc(v) + (v === S.settings.home ? ' <span class="small muted">· home</span>' : '') + '</b><span class="small row" style="flex-wrap:wrap;gap:6px">' + chips + '</span></button>' + bell('villages', v) + '</div>';
    }).join('');
    var places = F.places.map(function (id) { var p = byId(S.places, id); if (!p) return ''; var st = p.type === 'gas' ? (p.open ? 'Open' : 'Closed') + ' · unleaded ' + (p.prices.unleaded.v ? '$' + p.prices.unleaded.v.toFixed(2) : '—') + ' · line ' + p.line : p.type === 'store' ? Object.keys(p.stock).slice(0, 2).map(function (k) { return k + ' ' + p.stock[k].s; }).join(' · ') + ' · line ' + p.line : 'Confirmed ' + fdate(p.confirmed);
      return '<div class="toggle-row"><button class="row grow" style="border:0;background:none;text-align:left;padding:0" data-act="go" data-to="place/' + p.id + '"><span style="width:32px;height:32px;border-radius:8px;background:' + PT[p.type].color + ';flex-shrink:0' + (p.official ? ';border:3px solid #CDF564' : '') + '"></span><span class="col grow" style="gap:2px"><b style="font-size:16px">' + esc(p.name) + '</b><span class="small" style="color:#3A4048">' + esc(st) + '</span></span></button>' + bell('places', id) + '</div>'; }).join('');
    var feeders = F.feeders.map(function (id) { var f = byId(S.feeders, id); if (!f) return ''; return '<div class="toggle-row"><button class="col grow" style="gap:2px;border:0;background:none;text-align:left;padding:0" data-act="openFeeder" data-id="' + f.id + '"><b style="font-size:16px">' + f.id + '</b><span class="small" style="color:#3A4048">' + { on: 'On', working: 'Crews working', partial: 'Partially on', out: 'Out', unknown: 'No word yet' }[f.status] + '</span></button>' + bell('feeders', id) + '</div>'; }).join('');
    return '<div class="page">' + hdr('klein', 'Following') + '<div class="body">' +
      '<div class="lbl">Villages</div><div class="list">' + (vill || '<div class="toggle-row muted">None yet. Tap Follow on an outage area.</div>') + '</div>' +
      '<div class="lbl">Places</div><div class="list">' + (places || '<div class="toggle-row muted">None yet. Tap Follow on a place.</div>') + '</div>' +
      '<div class="lbl">GPA feeders</div><div class="list">' + (feeders || '<div class="toggle-row muted">None yet.</div>') + '</div>' +
      '<div class="small muted">Followed places show first in stacks. Bells mute an item without unfollowing.</div></div></div>';
  };

  VIEWS.admin = function () {
    if (!isAdmin()) return '<div class="page">' + hdr('black', 'Admin console') + '<div class="body"><div class="card">Switch your role to Admin or Omega in Settings → Demo controls.</div></div></div>';
    var q = S.queue.map(function (x) {
      var acts = { gouging: [['reviewed', 'Mark reviewed'], ['hidePrice', 'Hide price']], flag: [['mergeDup', 'Merge into nearest'], ['keep', 'Keep'], ['hideReport', 'Hide']], merge: [['doMerge', 'Merge'], ['keep', 'Dismiss']], owner: [['approveOwner', 'Approve'], ['keep', 'Deny']], place: [['approvePlace', 'Approve'], ['removePlace', 'Remove']] }[x.kind] || [['keep', 'Dismiss']];
      return '<div class="card"><div class="row"><b class="grow">' + esc(x.title) + '</b>' + (x.flags ? '<span class="tag" style="background:#C2410C;color:#fff">' + x.flags + ' flags</span>' : '') + '</div><div class="small muted">' + esc(x.sub) + ' · ' + esc(x.reason) + ' · ' + rel(x.t) + '</div><div class="row" style="flex-wrap:wrap">' + acts.map(function (a) { return '<button class="btn sm" data-act="queue" data-id="' + x.id + '" data-v="' + a[0] + '">' + a[1] + '</button>'; }).join('') + (x.ref ? '<button class="btn sm" style="border:0;background:none;color:#0E5A8A" data-act="queueOpen" data-id="' + x.id + '">Open ›</button>' : '') + '</div></div>';
    }).join('') || '<div class="card muted">Queue is empty.</div>';
    var imp = UI.importOpen ? '<div class="card"><div class="row"><span class="tag" style="background:#1D4ED8;color:#fff">GPA</span><b>Sample focus list (demo)</b></div><div class="small muted">Pulled from the release · review before publishing</div>' +
      IMPORT.map(function (x, i) { return '<label class="row" style="border-top:1px solid #EEF0F2;padding-top:8px"><input type="checkbox" checked data-imp="' + i + '" style="width:18px;height:18px"><span class="grow"><b>' + x.f + '</b> → ' + x.label + '</span></label>'; }).join('') +
      '<button class="btn black" data-act="publishImport">Publish selected</button></div>'
      : '<button class="btn" data-act="openImport">Import sample GPA release</button>';
    var omega = role() === 'omega' ? '<div class="lbl">Omega only</div><div class="card" style="border:2px solid #CDF564"><b>Roles</b>' + Object.keys(C.USERS).filter(function (u) { return u !== S.me; }).map(function (u) { var r = (S.roles && S.roles[u]) || C.USERS[u].role; return '<label class="row" style="justify-content:space-between"><span>' + esc(u) + '</span><select class="input" style="width:140px;height:40px" data-change="userRole" data-k="' + u + '">' + ['user', 'admin', 'suspended'].map(function (o) { return '<option' + (r === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></label>'; }).join('') +
      '<div class="lbl" style="margin-top:6px">Emergency controls</div><input class="input" id="bcast" placeholder="Broadcast message to everyone"><button class="btn black" data-act="broadcast">Broadcast alert</button>' +
      '<button class="btn red" data-act="freeze">' + (S.frozen ? 'Resume posting' : 'Freeze all new posts') + '</button></div>' : '';
    return '<div class="page">' + hdr('black', 'Admin console', '<span class="tag official">' + role() + '</span>') + '<div class="body"><div class="lbl">Moderation queue · ' + S.queue.length + '</div>' + q + '<div class="lbl">Official imports</div>' + imp + omega + '</div></div>';
  };
  var IMPORT = [{ f: 'P-280', st: 'on', label: 'On (restored)' }, { f: 'P-262', st: 'on', label: 'On (restored)' }, { f: 'P-270', st: 'working', label: 'Crews working · 1–3 days' }, { f: 'P-250', st: 'partial', label: 'Partially on' }];

  VIEWS.missing = function () { return '<div class="page">' + hdr('black', 'Not found') + '<div class="body"><div class="card">This item was removed or merged.</div></div></div>'; };

  // ---------- camera ----------
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
  function shrink(img, cb) {
    var max = 720, w = img.videoWidth || img.naturalWidth, h = img.videoHeight || img.naturalHeight; if (!w) return cb(null);
    var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', 0.6));
  }
  function gotPhoto(url) {
    if (!url) return;
    var tgt = UI.camTarget;
    if (!tgt || tgt === 'draft') { if (draft) draft.photo = url; }
    else addNote(tgt, 'Photo', url);
    UI.camTarget = null; back();
  }
  document.addEventListener('change', function (e) {
    if (e.target.id === 'camfile' && e.target.files && e.target.files[0]) {
      var img = new Image(), fr = new FileReader();
      fr.onload = function () { img.onload = function () { shrink(img, gotPhoto); }; img.src = fr.result; };
      fr.readAsDataURL(e.target.files[0]);
    }
  });

  // ---------- mutations ----------
  function noteTarget(target) { var parts = target.split(':'); return parts[0] === 'r' ? byId(S.reports, parts[1]) : byId(S.places, parts[1]); }
  function addNote(target, text, photo) {
    var o = noteTarget(target); if (!o) return;
    o.notes.push({ id: 'n' + now(), by: S.me, text: text, t: now(), versions: [], photo: photo || null });
    if (o.last !== undefined) o.last = now();
    save(); if (route.name !== 'camera') renderRoute(true);
  }
  function findNoteByKey(k) { // r:id:main | r:id:nid | p:id:nid | p:id:owner
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

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.getAttribute('data-act'), id = el.getAttribute('data-id'), v = el.getAttribute('data-v');
    switch (a) {
      case 'go': go(el.getAttribute('data-to')); break;
      case 'back': back(); break;
      case 'toastAction': $('#toast').innerHTML = ''; if (toastFn) toastFn(); break;
      case 'quick': UI.quick = v; renderChrome(); renderMarkers(); renderAreas(); break;
      case 'locate': map.flyTo([ME.lat, ME.lng], 15, { duration: 0.6 }); if (!ME.real) toast('Using a demo location in Hagåtña (GPS is off or you’re off-island).'); break;
      case 'pinFab': map.flyTo([ME.lat, ME.lng], Math.max(map.getZoom(), 15), { duration: 0.4 }); setTimeout(function () { dropAt(L.latLng(ME.lat, ME.lng)); }, 450); break;
      case 'nearOutage': var no = null, nd = 1e12; S.outages.forEach(function (o) { var d = dist(o.points[0], ME); if (d < nd) { nd = d; no = o; } }); if (no) { map.flyTo([no.points[0].lat, no.points[0].lng], 13); go('outage/' + no.id); } break;
      case 'pick':
        var t = el.getAttribute('data-t'); UI.q = ''; var qi = $('#q'); if (qi) qi.blur();
        if (t === 'place') { var pp = byId(S.places, id); map.flyTo([pp.lat, pp.lng], 16); go('place/' + id); }
        else if (t === 'report') { var rr = byId(S.reports, id); map.flyTo([rr.lat, rr.lng], 16); go('pin/' + id); }
        else if (t === 'village') { var vv = C.VILLAGES.filter(function (x) { return x[0] === id; })[0]; map.flyTo([vv[1], vv[2]], 14); renderChrome(); }
        else if (t === 'feeder') { openFeeder(id); }
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
      case 'vote':
        var r = byId(S.reports, id), dir = +v; r.score -= r.myVote; r.myVote = r.myVote === dir ? 0 : dir; r.score += r.myVote; r.last = now(); save(); renderRoute(true); break;
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
      case 'claim': S.queue.push({ id: 'q' + now(), kind: 'owner', ref: id, title: 'Owner claim · ' + byId(S.places, id).name, sub: 'Claimed by ' + S.me, reason: 'Verification', flags: 0, t: now() }); save(); toast('Claim sent. An admin will verify you.'); break;
      case 'submitPrices':
        var gp = byId(S.places, id), u = parseFloat(($('#pr-unleaded') || {}).value), d2 = parseFloat(($('#pr-diesel') || {}).value), pm = parseFloat(($('#pr-premium') || {}).value);
        if (!(u > 0)) { toast('Enter the unleaded price.'); break; }
        gp.prices.unleaded = { v: u, t: now() }; if (d2 > 0) gp.prices.diesel = { v: d2, t: now() }; if (pm > 0) gp.prices.premium = { v: pm, t: now() };
        save(); back(); toast('Prices updated.'); break;
      case 'confirm': var cp = byId(S.places, id); if (v === 'yes') { cp.confirmed = now(); cp.confirmN++; toast('Thanks. Marked as confirmed today.'); } else if (v === 'no') { S.queue.push({ id: 'q' + now(), kind: 'flag', ref: null, title: cp.name, sub: 'Reported closed by ' + S.me, reason: 'No longer relevant', flags: 1, t: now() }); toast('Thanks. An admin will review it.'); } save(); renderRoute(true); break;
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
      case 'reset': if (confirm('Reset all demo data on this phone?')) { try { localStorage.removeItem(KEY); } catch (x) {} S = C.seed(); UI.quick = 'all'; go('', true); toast('Demo data reset.'); } break;
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
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'composer') { var b = $('[data-act="postNote"]'); if (b) b.click(); }
    if (e.key === 'Enter' && e.target.id === 'q') { var first = $('#results [data-act="pick"]'); if (first) first.click(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, c = t.getAttribute && t.getAttribute('data-change'); if (!c) return;
    var k = t.getAttribute('data-k');
    if (c === 'filter') { S.filters[k] = t.checked; save(); renderRoute(true); }
    else if (c === 'date') { S.filters[k] = t.value; save(); renderRoute(true); }
    else if (c === 'setting') { S.settings[k] = t.type === 'checkbox' ? t.checked : (k === 'threshold' ? Math.max(1, Math.min(20, +t.value || 1)) : t.value.trim()); save(); renderAreas(); }
    else if (c === 'role') { S.settings.role = t.value; save(); renderRoute(true); toast('Role switched to ' + t.value + ' (demo).'); }
    else if (c === 'tsunami') { setTsunami(t.checked); }
    else if (c === 'userRole') { S.roles = S.roles || {}; S.roles[k] = t.value; save(); toast(k + ' is now ' + t.value + '.'); }
  });

  function openFeeder(id) { S.filters.feeders = true; save(); var f = byId(S.feeders, id); if (f) map.flyToBounds(f.poly, { padding: [40, 40], maxZoom: 14, duration: 0.6 }); go('feeder/' + id); }
  function setTsunami(on) {
    S.tsunami = on; save();
    if (on) { vibrate([200, 100, 200]); go('', true); map.flyToBounds(L.latLngBounds(C_ZONE).extend([ME.lat, ME.lng]), { padding: [60, 60], duration: 0.8 }); }
    else { go('', true); toast('Demo tsunami warning ended.'); }
  }

  // Android back button hook (called from the wrapper). Returns true when handled.
  window.conradBack = function () { if (location.hash && location.hash !== '#') { back(); return true; } if ($('.stackmenu')) { $('.stackmenu').remove(); return true; } return false; };

  renderRoute();
  setTimeout(function () { map.invalidateSize(); }, 200);
})();
