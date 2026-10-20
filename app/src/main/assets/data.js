/* Conrad demo data. Every business, shelter and person here is fictional. */
var CONRAD = {};

CONRAD.CATS = {
  road:  { label: 'Road blocked', short: 'Road', color: '#C2410C', tint: '#FFE9E6', icon: 'alert', kinds: ['Police barrier', 'Flooding', 'Accident', 'Landslide', 'Other'] },
  light: { label: 'Traffic light out', short: 'Light', color: '#A16207', tint: '#FDF3DC', icon: 'light', kinds: ['All directions', 'Flashing', 'Knocked down', 'Other'] },
  pole:  { label: 'Pole / line damage', short: 'Pole', color: '#6D28D9', tint: '#EFE7FB', icon: 'bolt', kinds: ['Pole', 'Lines down', 'Transformer', 'Box', 'Other'] },
  power: { label: 'No power here', short: 'No power', color: '#111827', tint: '#E7E9EC', icon: 'nopower', outage: true },
  water: { label: 'No water here', short: 'No water', color: '#1D4ED8', tint: '#E3EAFB', icon: 'drop', outage: true }
};

CONRAD.PLACES = {
  gas:     { label: 'Gas station', short: 'Gas', color: '#15803D', tint: '#E2F4E8', icon: 'fuel' },
  store:   { label: 'Store', short: 'Store', color: '#0E7490', tint: '#DDF1F5', icon: 'bag' },
  supply:  { label: 'Supply point', short: 'Supply', color: '#B45309', tint: '#F8EADB', icon: 'box' },
  shelter: { label: 'Shelter', short: 'Shelter', color: '#9D174D', tint: '#F7E1EA', icon: 'house' },
  muster:  { label: 'Muster point', short: 'Muster', color: '#334155', tint: '#E5E8EC', icon: 'people' },
  tsunami: { label: 'Tsunami safe spot', short: 'Tsunami', color: '#1E3A8A', tint: '#E1E6F2', icon: 'wave' }
};

CONRAD.VILLAGES = [
  ['Hagåtña', 13.4757, 144.7489], ['Tamuning', 13.4877, 144.7810], ['Tumon', 13.5110, 144.8020], ['Dededo', 13.5180, 144.8390],
  ['Yigo', 13.5360, 144.8880], ['Mangilao', 13.4470, 144.8010], ['Barrigada', 13.4680, 144.8000], ['Sinajana', 13.4630, 144.7550],
  ['Chalan Pago-Ordot', 13.4440, 144.7720], ['Mongmong-Toto-Maite', 13.4690, 144.7740], ['Asan-Maina', 13.4710, 144.7160], ['Piti', 13.4630, 144.6930],
  ['Agat', 13.3880, 144.6570], ['Santa Rita', 13.3870, 144.6730], ['Yona', 13.4100, 144.7760], ['Talofofo', 13.3550, 144.7600],
  ['Inarajan', 13.2730, 144.7480], ['Merizo', 13.2650, 144.6700], ['Umatac', 13.2990, 144.6610]
];

CONRAD.USERS = {
  cougot: { name: 'cougot', color: '#1F2937', role: 'omega' },
  kina_r: { name: 'kina_r', color: '#C2410C', role: 'user' },
  jtaitano: { name: 'jtaitano', color: '#0E7490', role: 'admin' },
  msantos: { name: 'msantos', color: '#6D28D9', role: 'user' },
  rbautista: { name: 'rbautista', color: '#A16207', role: 'user' },
  lpangelinan: { name: 'lpangelinan', color: '#15803D', role: 'user' },
  aquinata: { name: 'aquinata', color: '#9D174D', role: 'user' },
  user_4471: { name: 'user_4471', color: '#57606A', role: 'user' }
};

CONRAD.seed = function () {
  var now = Date.now(), M = 60000, H = 3600000, D = 86400000;
  function ago(min) { return now - min * M; }
  function note(by, text, min, extra) { var n = { id: 'n' + Math.random().toString(36).slice(2, 8), by: by, text: text, t: ago(min), versions: [] }; for (var k in extra) n[k] = extra[k]; return n; }

  var reports = [
    { id: 'r1', cat: 'road', kind: 'Flooding', lat: 13.4786, lng: 144.7578, title: 'Marine Corps Dr at Hagåtña', by: 'kina_r', t: ago(60), last: ago(12), score: 14, myVote: 0,
      note: { text: 'Water over both lanes, about knee deep. Update: right lane passable for high trucks only, cars turning back.', t: ago(20), versions: [{ text: 'Water over both lanes, about knee deep.', t: ago(60) }] },
      notes: [note('jtaitano', 'Confirmed with a second photo. Pinned to top of the area feed.', 30), note('msantos', 'Still there, passed it 5 min ago. Bus stop side is worse.', 48)] },
    { id: 'r2', cat: 'road', kind: 'Flooding', lat: 13.4791, lng: 144.7590, title: 'Water over road near the bus stop', by: 'user_4471', t: ago(50), last: ago(50), score: -3, myVote: 0,
      note: { text: 'Deep water here, turn around.', t: ago(50), versions: [] }, notes: [] },
    { id: 'r3', cat: 'light', kind: 'All directions', lat: 13.4775, lng: 144.7560, title: 'Light out at Hagåtña intersection', by: 'rbautista', t: ago(180), last: ago(40), score: 9, myVote: 0,
      note: { text: 'All directions dark. Treat as a four-way stop.', t: ago(180), versions: [] }, notes: [note('lpangelinan', 'Police directing traffic now.', 40)] },
    { id: 'r4', cat: 'road', kind: 'Police barrier', lat: 13.4722, lng: 144.7185, title: 'Route 1 closed at Asan', by: 'aquinata', t: ago(40), last: ago(25), score: 6, myVote: 0,
      note: { text: 'Barrier across both lanes northbound. Detour through Nimitz Hill.', t: ago(40), versions: [] }, notes: [] },
    { id: 'r5', cat: 'road', kind: 'Landslide', lat: 13.4150, lng: 144.7750, title: 'Route 4 landslide near Yona', by: 'msantos', t: ago(150), last: ago(70), score: 11, myVote: 0,
      note: { text: 'Mud and rocks across one lane. Single-lane traffic, go slow.', t: ago(150), versions: [] }, notes: [] },
    { id: 'r6', cat: 'road', kind: 'Accident', lat: 13.4800, lng: 144.8000, title: 'Crash on Route 16, Barrigada', by: 'lpangelinan', t: ago(35), last: ago(35), score: 3, myVote: 0,
      note: { text: 'Two cars, right lane blocked. Ambulance on scene.', t: ago(35), versions: [] }, notes: [] },
    { id: 'r7', cat: 'light', kind: 'Flashing', lat: 13.4900, lng: 144.7822, title: 'Flashing red at Tamuning', by: 'kina_r', t: ago(300), last: ago(120), score: 4, myVote: 0,
      note: { text: 'Flashing red all ways.', t: ago(300), versions: [] }, notes: [] },
    { id: 'r8', cat: 'pole', kind: 'Pole', lat: 13.5190, lng: 144.8400, title: 'Pole leaning on wires, Dededo', by: 'rbautista', t: ago(120), last: ago(25), score: 6, myVote: 0,
      note: { text: 'Pole leaning onto the lines over the road. Stay back, assume live.', t: ago(120), versions: [] }, notes: [note('jtaitano', 'Reported to GPA Trouble Dispatch.', 60)] },
    { id: 'r9', cat: 'pole', kind: 'Transformer', lat: 13.4475, lng: 144.8005, title: 'Transformer down, Mangilao', by: 'aquinata', t: ago(240), last: ago(200), score: 5, myVote: 0,
      note: { text: 'Transformer on the ground by the church.', t: ago(240), versions: [] }, notes: [] },
    { id: 'r10', cat: 'pole', kind: 'Lines down', lat: 13.5355, lng: 144.8860, title: 'Lines across road, Yigo', by: 'msantos', t: ago(90), last: ago(30), score: 8, myVote: 0,
      note: { text: 'Lines across the whole road. Turn around.', t: ago(90), versions: [] }, notes: [] },
    { id: 'r11', cat: 'pole', kind: 'Box', lat: 13.5050, lng: 144.8055, title: 'Utility box open, Harmon', by: 'lpangelinan', t: ago(400), last: ago(380), score: 1, myVote: 0,
      note: { text: 'Box door blown open, wires visible.', t: ago(400), versions: [] }, notes: [] },
    { id: 'r12', cat: 'road', kind: 'Flooding', lat: 13.3905, lng: 144.6600, title: 'Flooding at Agat (old)', by: 'kina_r', t: ago(72 * 60), last: ago(70 * 60), score: 7, myVote: 0,
      note: { text: 'Road flooded by the marina.', t: ago(72 * 60), versions: [] }, notes: [] }
  ];

  var places = [
    { id: 'g1', type: 'gas', name: 'Isla Fuel – Harmon', lat: 13.5040, lng: 144.8020, open: true, openVotes: 3, closedVotes: 0, statusT: ago(25),
      line: 'long', lineVotes: { none: 0, short: 1, long: 3 }, prices: { unleaded: { v: 4.89, t: ago(40) }, diesel: { v: null, out: true, t: ago(120) }, premium: { v: 5.19, t: ago(40) } },
      tags: ['Cash only', '$40 limit'], notes: [note('rbautista', 'Only 2 pumps working. Update: air pump is down too.', 25, { updated: ago(10) }), note('lpangelinan', 'Store side open, they have ice.', 60)] },
    { id: 'g2', type: 'gas', name: 'Reef Gas – Tamuning', lat: 13.4920, lng: 144.7760, open: false, openVotes: 0, closedVotes: 4, statusT: ago(60),
      line: 'none', lineVotes: { none: 2, short: 0, long: 0 }, prices: { unleaded: { v: 4.79, t: ago(26 * 60) }, diesel: { v: 5.09, t: ago(26 * 60) }, premium: { v: null, t: 0 } }, tags: [], notes: [] },
    { id: 'g3', type: 'gas', name: 'Latte Stone Fuel – Dededo', lat: 13.5150, lng: 144.8330, open: true, openVotes: 5, closedVotes: 1, statusT: ago(15),
      line: 'short', lineVotes: { none: 0, short: 4, long: 1 }, prices: { unleaded: { v: 4.99, t: ago(15) }, diesel: { v: 5.29, t: ago(15) }, premium: { v: null, t: 0 } }, tags: ['Card OK'], notes: [] },
    { id: 'g4', type: 'gas', name: 'South Point Gas – Agat', lat: 13.3860, lng: 144.6600, open: true, openVotes: 2, closedVotes: 0, statusT: ago(90),
      line: 'none', lineVotes: { none: 1, short: 0, long: 0 }, prices: { unleaded: { v: 4.95, t: ago(90) }, diesel: { v: null, t: 0 }, premium: { v: null, t: 0 } }, tags: [], notes: [] },
    { id: 's1', type: 'store', name: 'Isla Mart – Tamuning', lat: 13.4860, lng: 144.7880, owner: { text: 'Open 8 am–4 pm while the generator holds. Ice and water in stock, limit 2 per customer. Card machines down, cash only.', t: ago(60), versions: [{ text: 'Open 8 am–4 pm while the generator holds.', t: ago(300) }, { text: 'Open 9 am–3 pm.', t: ago(600) }] },
      stock: { 'Bottled water': { s: 'low', n: 3 }, 'Ice': { s: 'in', n: 2 }, 'Batteries': { s: 'out', n: 4 }, 'Plywood / tarps': { s: 'out', n: 1 } }, stockT: ago(20), line: 'long', lineVotes: { none: 0, short: 1, long: 5 },
      prices: [{ item: 'Bottled water, 24-pack', v: 18.99, before: 6.49, flags: 5, t: ago(40) }, { item: 'Bag of ice', v: 3.5, before: 3.25, flags: 0, t: ago(90) }],
      notes: [note('aquinata', 'Line out the door but moving. Back lot is flooded, park on the street.', 40)] },
    { id: 's2', type: 'store', name: 'Coral Grocery – Dededo', lat: 13.5205, lng: 144.8350, owner: null,
      stock: { 'Bottled water': { s: 'in', n: 2 }, 'Ice': { s: 'out', n: 3 }, 'Batteries': { s: 'low', n: 1 }, 'Plywood / tarps': { s: 'in', n: 0 } }, stockT: ago(55), line: 'short', lineVotes: { none: 0, short: 2, long: 0 },
      prices: [{ item: 'Rice, 20 lb', v: 21.99, before: null, flags: 1, t: ago(120) }], notes: [] },
    { id: 's3', type: 'store', name: 'Tasi Hardware – Harmon', lat: 13.5070, lng: 144.8095, owner: { text: 'Generators sold out. Tarps and rope in stock. Closing at 2 pm today.', t: ago(150), versions: [] },
      stock: { 'Bottled water': { s: 'out', n: 1 }, 'Ice': { s: 'out', n: 0 }, 'Batteries': { s: 'low', n: 2 }, 'Plywood / tarps': { s: 'in', n: 3 } }, stockT: ago(150), line: 'none', lineVotes: { none: 1, short: 0, long: 0 }, prices: [], notes: [] },
    { id: 'p1', type: 'shelter', name: 'Demo Elementary (Dededo)', lat: 13.5235, lng: 144.8445, official: true, occ: 283, cap: 334, occT: ago(24 * 60), confirmed: ago(7 * 24 * 60), confirmN: 4, pets: 'No', generator: 'Yes', notes: [] },
    { id: 'p2', type: 'shelter', name: 'Demo Middle School (Yona)', lat: 13.4130, lng: 144.7800, official: true, occ: 112, cap: 260, occT: ago(24 * 60), confirmed: ago(2 * 24 * 60), confirmN: 6, pets: 'Yes', generator: 'Yes', notes: [] },
    { id: 'p3', type: 'shelter', name: 'Demo High School (Agat)', lat: 13.3950, lng: 144.6680, official: true, occ: 40, cap: 300, occT: ago(24 * 60), confirmed: ago(18 * 24 * 60), confirmN: 1, pets: 'No', generator: 'No', notes: [] },
    { id: 'm1', type: 'muster', name: 'Asan Ridge Muster Point', lat: 13.4655, lng: 144.7230, official: true, confirmed: ago(30 * 24 * 60), confirmN: 2, notes: [] },
    { id: 'm2', type: 'muster', name: 'Agat Hillside Muster Point', lat: 13.3830, lng: 144.6680, official: true, confirmed: ago(30 * 24 * 60), confirmN: 1, notes: [] },
    { id: 't1', type: 'tsunami', name: 'Nimitz Hill Safe Area', lat: 13.4560, lng: 144.7280, official: true, confirmed: ago(40 * 24 * 60), confirmN: 3, notes: [] },
    { id: 't2', type: 'tsunami', name: 'Tamuning Heights Safe Area', lat: 13.4820, lng: 144.7950, official: true, confirmed: ago(40 * 24 * 60), confirmN: 2, notes: [] },
    { id: 't3', type: 'tsunami', name: 'Agat Heights Safe Area', lat: 13.3800, lng: 144.6750, official: true, confirmed: ago(40 * 24 * 60), confirmN: 1, notes: [] },
    { id: 'u1', type: 'supply', name: 'Water Haul – Barrigada Heights', lat: 13.4750, lng: 144.8100, official: true, detail: 'GWA water tanker. Bring your own containers.', confirmed: ago(3 * 60), confirmN: 5, notes: [] },
    { id: 'u2', type: 'supply', name: 'Ice & Water – Yona Community Center', lat: 13.4080, lng: 144.7720, official: false, detail: 'Volunteers handing out ice 9 am–noon.', confirmed: ago(5 * 60), confirmN: 3, notes: [] }
  ];

  function pts(lat, lng, n, spread, seed) {
    var out = [], s = seed;
    function r() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (var i = 0; i < n; i++) out.push({ lat: lat + (r() - .5) * spread, lng: lng + (r() - .5) * spread * 1.3, t: ago(10 + Math.floor(r() * 170)), st: 'out' });
    return out;
  }
  var outages = [
    { id: 'o1', kind: 'power', name: 'Dededo', since: now - 1 * D, confirmed: ago(120), points: pts(13.518, 144.842, 16, 0.03, 7).concat([{ lat: 13.506, lng: 144.826, t: ago(30), st: 'back' }, { lat: 13.531, lng: 144.861, t: ago(50), st: 'back' }]) },
    { id: 'o2', kind: 'power', name: 'Yigo', since: now - 1 * D, confirmed: ago(60), points: pts(13.538, 144.886, 10, 0.025, 19) },
    { id: 'o3', kind: 'water', name: 'Yona', since: now - 2 * D, confirmed: ago(200), points: pts(13.412, 144.776, 8, 0.022, 31) }
  ];

  var feeders = [
    { id: 'P-280', status: 'working', desc: 'Route 1 northbound in Asan, Piti, Hagåtña (incl. Adelup) and Maina.', poly: [[13.483, 144.700], [13.483, 144.762], [13.469, 144.762], [13.463, 144.700]], yes: 8, total: 21 },
    { id: 'P-310', status: 'on', desc: 'Tamuning, including the Harmon McDonald’s and Taitano Road areas.', poly: [[13.512, 144.784], [13.512, 144.816], [13.489, 144.816], [13.489, 144.784]], yes: 30, total: 33 },
    { id: 'P-270', status: 'out', heavy: true, desc: 'Dededo, including the village, Liguan Terrace, Ysengsong, Route 3.', poly: [[13.532, 144.824], [13.532, 144.858], [13.504, 144.858], [13.504, 144.824]], yes: 1, total: 40 },
    { id: 'P-330', status: 'out', heavy: true, desc: 'Yigo, including Paradise Meadows, Chalan La Chanch, Mataguac areas.', poly: [[13.552, 144.868], [13.552, 144.906], [13.524, 144.906], [13.524, 144.868]], yes: 0, total: 18 },
    { id: 'P-323', status: 'partial', desc: 'Mangilao, Route 15 in Marbo and Hawaiian Rock areas.', poly: [[13.457, 144.789], [13.457, 144.826], [13.434, 144.826], [13.434, 144.789]], yes: 9, total: 20 },
    { id: 'P-262', status: 'working', desc: 'Yona, including Baza Gardens.', poly: [[13.422, 144.764], [13.422, 144.796], [13.397, 144.796], [13.397, 144.764]], yes: 3, total: 15 },
    { id: 'P-250', status: 'unknown', desc: 'Ordot-Chalan Pago.', poly: [[13.456, 144.760], [13.456, 144.786], [13.437, 144.786], [13.437, 144.760]], yes: 0, total: 0 },
    { id: 'P-220', status: 'working', desc: 'Hågat and Santa Rita villages and subdivisions.', poly: [[13.401, 144.647], [13.401, 144.686], [13.374, 144.686], [13.374, 144.647]], yes: 4, total: 12 },
    { id: 'P-261', status: 'working', desc: 'Inalåhan, Målesso’ and Humåtak.', poly: [[13.302, 144.654], [13.302, 144.762], [13.254, 144.762], [13.254, 144.654]], yes: 2, total: 14 }
  ];

  var updates = [
    { id: 'up1', src: 'NWS', t: ago(15), title: 'Typhoon Warning remains in effect for Guam', body: 'Tropical storm-force winds continue; flash and coastal flooding possible.', auto: true },
    { id: 'up2', src: 'JIC', t: ago(80), title: 'JIC #13: Emergency Declaration approved; remain indoors in COR 1', body: 'Stay inside a sturdy structure until COR 4 is announced.' },
    { id: 'up3', src: 'GPA', t: ago(140), title: '51% of feeders online · no system blackout', body: 'Substations out: Talofofo, Umatac, Radio Barrigada, part of Pulantat.', link: 'feeders' },
    { id: 'up4', src: 'GWA', t: ago(200), title: 'Water haul site open in Barrigada Heights', body: 'Bring your own containers.', link: 'place:u1' },
    { id: 'up5', src: 'PTWC', t: ago(3 * 24 * 60), title: 'Tsunami information statement: M7.0 near Kamchatka', body: 'Information only. A warning would switch the map to warning mode.', auto: true }
  ];

  var queue = [
    { id: 'q1', kind: 'gouging', ref: 's1', title: 'Bottled water $18.99', sub: 'Price report · Isla Mart – Tamuning', reason: 'Gouging suspected', flags: 5, t: ago(40) },
    { id: 'q2', kind: 'flag', ref: 'r2', title: 'Water over road near the bus stop', sub: 'Report by user_4471', reason: 'Possible duplicate of Marine Corps Dr flooding', flags: 3, t: ago(15) },
    { id: 'q3', kind: 'owner', ref: 's2', title: 'Owner claim · Coral Grocery – Dededo', sub: 'Business license photo attached', reason: 'Verification', flags: 0, t: ago(120) }
  ];

  return {
    v: 1, me: 'cougot', reports: reports, places: places, outages: outages, feeders: feeders, updates: updates, queue: queue,
    follows: { places: ['s1'], villages: ['Dededo'], feeders: ['P-280'], muted: {} },
    settings: { role: 'omega', nTsunami: false, nWeather: true, nOfficial: true, nBack: true, nNear: false, nFollow: true, nReplies: true, threshold: 1, radius: '3 mi', home: 'Dededo', feeder: 'P-280' },
    filters: { road: true, light: true, pole: true, outages: true, gas: true, store: true, supply: true, shelter: true, muster: true, tsunami: true, official: true, feeders: false, windowH: 24, older: false, from: '', to: '' },
    tsunami: false, frozen: false
  };
};
