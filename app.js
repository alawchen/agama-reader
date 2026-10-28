(function () {
  var root = document.documentElement;
  var FS = [16, 17, 18, 20, 22, 24];

  function load(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  // 底色與字級
  var prefs = load('ar:prefs') || {};
  function applyPrefs() {
    root.dataset.theme = prefs.theme || 'cream';
    root.style.setProperty('--fs', (prefs.fs || 18) + 'px');
    root.style.setProperty('--lh', prefs.lh || 2);
    document.querySelectorAll('[data-theme-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === (prefs.theme || 'cream')));
    });
  }
  document.querySelectorAll('[data-theme-set]').forEach(function (b) {
    b.addEventListener('click', function () { prefs.theme = b.dataset.themeSet; save('ar:prefs', prefs); applyPrefs(); });
  });
  document.querySelectorAll('[data-fs]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = FS.indexOf(prefs.fs || 18);
      i = Math.max(0, Math.min(FS.length - 1, (i < 0 ? 2 : i) + Number(b.dataset.fs)));
      prefs.fs = FS[i]; save('ar:prefs', prefs); applyPrefs();
    });
  });
  var LH = [1.8, 2, 2.3];
  document.querySelectorAll('[data-lh]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = LH.indexOf(prefs.lh || 2);
      prefs.lh = LH[(i + 1) % LH.length]; save('ar:prefs', prefs); applyPrefs();
    });
  });
  applyPrefs();

  // 窄螢幕目錄抽屜
  var toc = document.getElementById('toc');
  var toggle = document.querySelector('.nav-toggle');
  var scrim = document.querySelector('.scrim');
  function setNav(open) {
    toc.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
    if (open) { var cur = toc.querySelector('[aria-current]'); (cur || toc.querySelector('a')).focus(); }
  }
  toggle.addEventListener('click', function () { setNav(!toc.classList.contains('open')); });
  scrim.addEventListener('click', function () { setNav(false); closePop(); });
  // 左欄的同頁跳轉連結（名詞表、各部目錄）點後收起抽屜
  toc.addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"]'); if (a && toc.classList.contains('open')) setNav(false); });
  // 名詞表網址帶條目錨點時，展開左欄中該條目所在的聲母群組
  if (location.hash) {
    var tl = toc.querySelector('details a[href="' + location.hash.replace(/"/g, '') + '"]');
    if (tl) tl.closest('details').open = true;
  }

  // 浮動卡片
  var pop = null, lastTrigger = null;
  function closePop(noFocus) {
    if (pop) { pop.remove(); pop = null; }
    document.querySelectorAll('.nref a.active, .notes li.active').forEach(function (el) { el.classList.remove('active'); });
    if (lastTrigger && noFocus !== true) lastTrigger.focus();
    lastTrigger = null;
  }
  // 點卡片以外的位置關閉卡片（不把焦點拉回觸發處，避免畫面跳動）
  document.addEventListener('click', function (e) {
    if (pop && !e.target.closest('.popover, .nref a, .term')) closePop(true);
  });
  function openPop(label, html, trigger) {
    closePop();
    lastTrigger = trigger;
    pop = document.createElement('section');
    pop.className = 'popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', label);
    pop.innerHTML = '<div class="popover-head"><b></b><button type="button" class="popover-close" aria-label="關閉">×</button></div><div class="popover-body"></div>';
    pop.querySelector('b').textContent = label;
    pop.querySelector('.popover-body').innerHTML = html;
    pop.querySelector('.popover-close').addEventListener('click', closePop);
    document.body.appendChild(pop);
    pop.querySelector('.popover-close').focus();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (pop) closePop(); else if (toc.classList.contains('open')) { setNav(false); toggle.focus(); } }
  });

  // 註腳：寬螢幕在右欄標示，窄螢幕彈出卡片
  var wide = window.matchMedia('(min-width: 1200px)');
  document.querySelectorAll('.nref a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var li = document.getElementById('note-' + a.dataset.n);
      if (!li) return;
      e.preventDefault();
      if (wide.matches) {
        closePop();
        a.classList.add('active');
        li.classList.add('active');
        li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        var clone = li.cloneNode(true);
        var back = clone.querySelector('.back');
        if (back) back.remove();
        openPop('註 ' + a.dataset.n, clone.innerHTML, a);
        a.classList.add('active');
      }
    });
  });

  // 名詞解釋
  document.querySelectorAll('.term').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = (window.GLOSSARY || {})[b.dataset.term];
      if (!g) return;
      openPop(g.term, g.html, b);
    });
  });

  // 經文白話：原文／對照／白話切換，記住讀者的選擇
  var modeBtns = document.querySelectorAll('.modes [data-mode]');
  var sutraText = document.querySelector('.sutra-text.has-tr');
  function applyMode() {
    var m = prefs.mode || 'both';
    if (sutraText) sutraText.dataset.mode = m;
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
  }
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () { prefs.mode = b.dataset.mode; save('ar:prefs', prefs); applyMode(); });
  });
  applyMode();

  // 從搜尋結果進入（網址 #q=詞）：標示第一個含該詞的段落並捲動過去
  var hashQ = location.hash.indexOf('#q=') === 0 ? decodeURIComponent(location.hash.slice(3)) : '';
  if (hashQ) {
    var blocks = document.querySelectorAll('article .seg, article p, article li, article dd, .notes li');
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      if (el.textContent.indexOf(hashQ) < 0 || el.querySelector('.seg')) continue;
      // 詞只出現在目前隱藏的原文或白話時，暫時改為對照模式（不存入偏好）
      var shownPart = el.classList.contains('seg') && sutraText && el.querySelector(sutraText.dataset.mode === 'orig' ? '.zh' : sutraText.dataset.mode === 'plain' ? '.bh' : '.seg');
      if (shownPart && shownPart.textContent.indexOf(hashQ) < 0) sutraText.dataset.mode = 'both';
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node;
      while ((node = walker.nextNode())) {
        var at = node.data.indexOf(hashQ);
        if (at < 0) continue;
        var range = document.createRange();
        range.setStart(node, at); range.setEnd(node, at + hashQ.length);
        range.surroundContents(document.createElement('mark'));
        break;
      }
      el.classList.add('search-hit');
      el.scrollIntoView({ block: 'center' });
      break;
    }
  }

  // 閱讀進度與續讀位置
  var main = document.querySelector('.reader');
  var bar = document.querySelector('.progress-bar');
  var pageId = main && main.dataset.page;
  var lastKey = 'ar:last:' + (main && main.dataset.scope || '');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.width = (ratio * 100).toFixed(1) + '%';
    if (pageId) save(lastKey, { id: pageId, title: document.title.split('｜')[0], y: window.scrollY });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  var last = pageId && location.hash === '#resume' ? load(lastKey) : null;
  onScroll();
  if (last && last.id === pageId) window.scrollTo(0, last.y);
  document.querySelectorAll('.resume').forEach(function (resume) {
    var l = load('ar:last:' + resume.dataset.scope);
    if (l && l.id) {
      var link = resume.querySelector('a');
      link.href = l.id + '.html#resume';
      link.querySelector('span').textContent = l.title;
      resume.hidden = false;
    }
  });
})();

// === 更新日誌 ===
// [2026-10-27] [v1.2] 名詞卡片改用建置時組好的解釋與出處（含原站註解）
// [2026-10-27] [v1.1] 點卡片以外位置可關閉註解／名詞卡片
// [2026-10-27] [v1.3] 經文頁原文／對照／白話切換，選擇存於閱讀偏好
// [2026-10-27] [v1.4] 從搜尋結果進入時標示並捲到含搜尋詞的段落
// [2026-10-28] [v1.5] 繼續閱讀改為各書各部分開記憶（ar:last:<範圍>），目錄頁各自顯示本範圍的最後一頁
// [2026-10-28] [v1.6] 名詞表左欄：同頁連結點後收起抽屜、網址帶錨點時展開所在聲母群組
// [2026-10-28] [v1.7] 續讀位置改在初次記錄捲動位置之前讀取，避免被頁首位置 0 覆蓋
