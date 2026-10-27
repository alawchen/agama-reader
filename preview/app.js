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

  // 浮動卡片
  var pop = null, lastTrigger = null;
  function closePop() {
    if (pop) { pop.remove(); pop = null; }
    document.querySelectorAll('.nref a.active, .notes li.active').forEach(function (el) { el.classList.remove('active'); });
    if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
  }
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
      var g = (window.GLOSSARY || [])[Number(b.dataset.term)];
      if (!g) return;
      openPop(g.term, g.html + '<p style="margin:10px 0 0"><a href="' + g.page + '.html#note-' + g.n + '">出自原書註解 →</a></p>', b);
    });
  });

  // 閱讀進度與續讀位置
  var main = document.querySelector('.reader');
  var bar = document.querySelector('.progress-bar');
  var pageId = main && main.dataset.page;
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    bar.style.width = (ratio * 100).toFixed(1) + '%';
    if (pageId) save('ar:last', { id: pageId, title: document.title.split('｜')[0], y: window.scrollY });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (pageId && location.hash === '#resume') {
    var last = load('ar:last');
    if (last && last.id === pageId) window.scrollTo(0, last.y);
  }
  var resume = document.querySelector('.resume');
  if (resume) {
    var l = load('ar:last');
    if (l && l.id) {
      var link = resume.querySelector('a');
      link.href = l.id + '.html#resume';
      link.querySelector('span').textContent = l.title;
      resume.hidden = false;
    }
  }
})();
