// Study-materials pages (English only): folder navigation (#/Folder/Sub), file search and folder download as .zip
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var T = {
    zipping: 'Preparing the .zip: ',
    zipDone: 'Download started.',
    zipFail: 'The .zip could not be made. Please download the files one by one.',
    zipBig: 'This folder is too large to zip in the browser. Please download the files one by one.'
  };
  var t = function (k) { return T[k]; };
  var status = $('#m-status');
  var say = function (msg) { if (status) status.textContent = msg; };
  var q = $('#m-q');

  // ---- Folder navigation ----
  var dirs = $$('.m-dir');
  function current() {
    var h = location.hash.replace(/^#\/?/, '');
    try { h = decodeURIComponent(h); } catch (e) {}
    return h.replace(/\/+$/, '');
  }
  function showCurrent() {
    var p = current();
    var target = dirs.filter(function (d) { return d.getAttribute('data-path') === p; })[0] || dirs[0];
    dirs.forEach(function (d) { d.classList.toggle('is-current', d === target); });
  }

  // ---- Search across all files ----
  var allFiles = $$('.m-dir .m-row-file');
  var results = $('#m-results'), body = $('#m-results-body'), none = $('#m-results-none'), count = $('#m-results-count');
  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function search(v) {
    var s = norm(v.trim());
    if (!s) { results.hidden = true; showCurrent(); return; }
    dirs.forEach(function (d) { d.classList.remove('is-current'); });
    body.textContent = '';
    var n = 0;
    allFiles.forEach(function (row) {
      var rel = row.getAttribute('data-rel');
      if (norm(rel).indexOf(s) === -1) return;
      var c = row.cloneNode(true);
      var parent = rel.split('/').slice(0, -1).join(' › ');
      if (parent) {
        var sp = document.createElement('span'); sp.className = 'm-path'; sp.textContent = parent;
        c.querySelector('.m-label').appendChild(sp);
      }
      body.appendChild(c); n++;
    });
    count.textContent = n + (n === 1 ? ' file' : ' files') + ' found';
    none.hidden = n > 0;
    body.parentNode.hidden = n === 0;
    results.hidden = false;
  }
  if (q) q.addEventListener('input', function () { search(q.value); });

  window.addEventListener('hashchange', function () {
    if (q && q.value) { q.value = ''; results.hidden = true; }
    showCurrent();
    var b = $('#m-browser'); if (b && b.getBoundingClientRect().top < 0) b.scrollIntoView();
  });
  showCurrent();

  // ---- Download a folder as .zip (files stored without compression; built in the browser) ----
  var CRC = (function () { var tb = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } return tb; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(entries) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, csize = 0;
    var d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    entries.forEach(function (e) {
      var name = enc.encode(e.name), data = e.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
      h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(h.buffer, name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(c.buffer, name);
      csize += 46 + name.length;
      offset += 30 + name.length + data.length;
    });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }
  var MAX = 1024 * 1024 * 1024; // 1 GB: beyond that, zipping in a browser is unreliable
  $$('.m-zip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var path = btn.getAttribute('data-path');
      var rows = allFiles.filter(function (r) { return !path || r.getAttribute('data-rel').indexOf(path + '/') === 0; });
      var total = rows.reduce(function (s, r) { return s + (+r.getAttribute('data-size') || 0); }, 0);
      if (total > MAX || !window.fetch || !window.TextEncoder) { say(t('zipBig')); return; }
      var cut = path ? path.length + 1 : 0;
      var top = path ? path.split('/').pop() : (location.pathname.replace(/\/+$/, '').split('/').pop() || 'materials');
      btn.disabled = true;
      var entries = [], i = 0;
      (function next() {
        if (i >= rows.length) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(makeZip(entries));
          a.download = top + '.zip';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
          btn.disabled = false; say(t('zipDone'));
          return;
        }
        var r = rows[i++];
        say(t('zipping') + i + '/' + rows.length);
        fetch(r.getAttribute('data-href')).then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.arrayBuffer();
        }).then(function (buf) {
          entries.push({ name: top + '/' + r.getAttribute('data-rel').slice(cut), data: new Uint8Array(buf) });
          next();
        }).catch(function () { btn.disabled = false; say(t('zipFail')); });
      })();
    });
  });
})();
