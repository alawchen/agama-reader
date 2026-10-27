// 全文搜尋：下載各分類純文字後逐字比對，結果附前後文並連到該頁（含搜尋詞，供頁面標示）
(function () {
  var form = document.querySelector('.search-form');
  if (!form) return;
  var input = form.querySelector('input[name="q"]');
  var status = document.querySelector('.search-status');
  var list = document.querySelector('.search-results');
  var more = document.querySelector('.search-more');
  var NAMES = {};
  document.querySelectorAll('input[name="scope"]').forEach(function (c) { NAMES[c.value] = c.parentNode.textContent.trim(); });
  var cache = {}, hits = [], shown = 0, PAGE = 20;

  function load(k) {
    if (!cache[k]) cache[k] = fetch('search/' + k + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[k];
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function count(text, term) { var n = 0, i = 0; while ((i = text.indexOf(term, i)) >= 0) { n++; i += term.length; } return n; }
  function snippet(text, terms) {
    var at = text.indexOf(terms[0]);
    var from = Math.max(0, at - 40), to = Math.min(text.length, at + terms[0].length + 60);
    var s = esc(text.slice(from, to));
    terms.forEach(function (t) { s = s.split(esc(t)).join('<mark>' + esc(t) + '</mark>'); });
    return (from > 0 ? '…' : '') + s + (to < text.length ? '…' : '');
  }
  function render() {
    hits.slice(shown, shown + PAGE).forEach(function (h) {
      var li = document.createElement('li');
      var href = h.url + (h.url.indexOf('#') < 0 ? '#q=' + encodeURIComponent(h.terms[0]) : '');
      li.innerHTML = '<a href="' + href + '">' + esc(h.title) + '</a> <span class="search-meta">' + esc(NAMES[h.scope]) + '・' + h.n + ' 處</span><p>' + snippet(h.text, h.terms) + '</p>';
      list.appendChild(li);
    });
    shown = Math.min(hits.length, shown + PAGE);
    more.hidden = shown >= hits.length;
  }
  function run(q) {
    var terms = q.split(/\s+/).filter(Boolean);
    list.innerHTML = ''; hits = []; shown = 0; more.hidden = true;
    if (!terms.length) { status.textContent = ''; return; }
    var scopes = [].slice.call(document.querySelectorAll('input[name="scope"]:checked')).map(function (c) { return c.value; });
    status.textContent = '搜尋中…';
    Promise.all(scopes.map(load)).then(function (all) {
      all.forEach(function (rows, k) {
        rows.forEach(function (r) {
          if (terms.every(function (t) { return r[2].indexOf(t) >= 0; })) hits.push({ scope: scopes[k], url: r[0], title: r[1], text: r[2], terms: terms, n: count(r[2], terms[0]) });
        });
      });
      status.textContent = hits.length ? '找到 ' + hits.length + ' 頁含有「' + terms.join('」「') + '」' : '找不到「' + terms.join('」「') + '」';
      render();
    }).catch(function () { status.textContent = '搜尋資料下載失敗，請檢查網路後再試一次。'; });
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    history.replaceState(null, '', '?q=' + encodeURIComponent(input.value.trim()));
    run(input.value.trim());
  });
  more.addEventListener('click', render);
  var q0 = new URLSearchParams(location.search).get('q');
  if (q0) { input.value = q0; run(q0); }
})();

// === 更新日誌 ===
// [2026-10-27] [v1.0] SR-1：逐字比對多詞搜尋、分類範圍、前後文與分頁載入
