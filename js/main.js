(function () {
  'use strict';

  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx    = bgCanvas.getContext('2d');

  const NODE_N      = 46;
  const LINK_D      = 116;
  const BG_INTERVAL = 1000 / 24;
  let   bgNodes    = [];
  let   bgLastTime = 0;

  function resizeBg() {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function initNodes() {
    bgNodes = [];
    for (let i = 0; i < NODE_N; i++) {
      bgNodes.push({
        x:  Math.random() * bgCanvas.width,
        y:  Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.92,
        vy: (Math.random() - 0.5) * 0.92,
        r:  Math.random() * 2.1 + 1.0,
      });
    }
  }

  function tickBg(ts) {
    requestAnimationFrame(tickBg);
    if (ts - bgLastTime < BG_INTERVAL) return;
    bgLastTime = ts;

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    bgNodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0) n.x = bgCanvas.width;
      else if (n.x > bgCanvas.width)  n.x = 0;
      if (n.y < 0) n.y = bgCanvas.height;
      else if (n.y > bgCanvas.height) n.y = 0;
    });

    bgCtx.beginPath();
    bgCtx.strokeStyle = 'rgba(201,168,76,0.34)';
    bgCtx.lineWidth   = 0.75;
    for (let i = 0; i < bgNodes.length; i++) {
      for (let j = i + 1; j < bgNodes.length; j++) {
        const dx = bgNodes[i].x - bgNodes[j].x;
        const dy = bgNodes[i].y - bgNodes[j].y;
        if (dx * dx + dy * dy < LINK_D * LINK_D) {
          bgCtx.moveTo(bgNodes[i].x, bgNodes[i].y);
          bgCtx.lineTo(bgNodes[j].x, bgNodes[j].y);
        }
      }
    }
    bgCtx.stroke();

    bgCtx.beginPath();
    bgCtx.fillStyle = 'rgba(0,201,212,0.74)';
    bgNodes.forEach(n => {
      bgCtx.moveTo(n.x + n.r, n.y);
      bgCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    });
    bgCtx.fill();
  }

  window.addEventListener('resize', () => { resizeBg(); initNodes(); });
  resizeBg(); initNodes(); requestAnimationFrame(tickBg);

  const curCanvas = document.getElementById('cursor-canvas');
  const curCtx    = curCanvas.getContext('2d');

  const CHARS            = ['ذ','ك','ا','ء','ت','و','ل','ي','د','AI','01','GEN'];
  const MAX_CURSOR_PARTS = 72;
  const SPAWN_INTERVAL   = 24;
  const SPAWN_DISTANCE_SQ = 7 * 7;

  let curParts   = [];
  let curRipples = [];
  let curDots    = [];
  let curRingR   = 16;
  let curHoverA  = 0;
  let _lastHoveredLabel = '01';
  let mouseX     = -200;
  let mouseY     = -200;
  let curDirty   = true;
  let lastMX     = -200;
  let lastMY     = -200;
  let cursorRafId    = null;
  let lastSpawnTime  = 0;
  let lastSpawnX     = -200;
  let lastSpawnY     = -200;
  let hoveredDotIndex = -1;
  let hoveredButton   = false;

  function resizeCur() {
    curCanvas.width  = window.innerWidth;
    curCanvas.height = window.innerHeight;
  }

  function spawnChar(x, y, burst) {
    const count  = burst ? 7 : 1;
    const spread = burst ? 28 : 0;
    for (let i = 0; i < count; i++) {
      curParts.push({
        x:    x + (Math.random() - 0.5) * spread,
        y:    y + (Math.random() - 0.5) * spread,
        ch:   CHARS[Math.floor(Math.random() * CHARS.length)],
        vx:   (Math.random() - 0.5) * (burst ? 2.2 : 1.2),
        vy:   -(Math.random() * 1.8 + 0.4),
        life: 1,
        size: 11 + Math.floor(Math.random() * 5) * 2,
        gold: Math.random() < 0.5,
      });
    }
    if (curParts.length > MAX_CURSOR_PARTS) {
      curParts.splice(0, curParts.length - MAX_CURSOR_PARTS);
    }
  }

  function requestCursorTick() {
    if (!cursorRafId) cursorRafId = requestAnimationFrame(tickCursor);
  }

  function tickCursor() {
    cursorRafId = null;
    const hasAnything  = curParts.length > 0 || curDots.length > 0 || curRipples.length > 0;
    const cursorMoved  = mouseX !== lastMX || mouseY !== lastMY;
    if (!hasAnything && !cursorMoved && !curDirty) return;

    curCtx.clearRect(0, 0, curCanvas.width, curCanvas.height);
    curDirty = false;
    lastMX   = mouseX;
    lastMY   = mouseY;

    const aliveParts = [];
    curParts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.024;
      if (p.life <= 0) return;
      aliveParts.push(p);
      curCtx.globalAlpha = Math.max(0, p.life);
      curCtx.fillStyle   = p.gold ? '#c9a84c' : '#00c9d4';
      curCtx.font        = `${p.size}px 'IBM Plex Sans Arabic', sans-serif`;
      curCtx.fillText(p.ch, p.x, p.y);
    });
    curParts = aliveParts;
    curCtx.globalAlpha = 1;

    const aliveDots = [];
    curDots.forEach(d => {
      d.x += d.vx; d.y += d.vy; d.life -= 0.022;
      if (d.life <= 0) return;
      aliveDots.push(d);
      curCtx.globalAlpha = d.life * d.life;
      curCtx.beginPath();
      curCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      curCtx.fillStyle = d.color;
      curCtx.fill();
    });
    curDots = aliveDots;
    curCtx.globalAlpha = 1;

    const dotHover    = hoveredDotIndex >= 0;
    const anyHover    = dotHover || hoveredButton;
    const ringTarget  = anyHover ? 26 : 16;
    const alphaTarget = anyHover ? 1  : 0;
    curRingR  += (ringTarget  - curRingR)  * 0.13;
    curHoverA += (alphaTarget - curHoverA) * 0.13;

    const stillAnimating = Math.abs(curRingR - ringTarget) > 0.05 || Math.abs(curHoverA - alphaTarget) > 0.005;
    if (stillAnimating) curDirty = true;

    const r = Math.round(201 + (0   - 201) * curHoverA);
    const g = Math.round(168 + (201 - 168) * curHoverA);
    const b = Math.round(76  + (212 - 76)  * curHoverA);
    const ringAlpha = 0.45 + 0.4 * curHoverA;
    const ringWidth = 1.2  + 0.6 * curHoverA;

    curCtx.beginPath();
    curCtx.arc(mouseX, mouseY, curRingR, 0, Math.PI * 2);
    curCtx.strokeStyle = `rgba(${r},${g},${b},${ringAlpha})`;
    curCtx.lineWidth   = ringWidth;
    curCtx.stroke();

    curCtx.beginPath();
    curCtx.arc(mouseX, mouseY, 4, 0, Math.PI * 2);
    curCtx.fillStyle = `rgb(${r},${g},${b})`;
    curCtx.fill();

    if (dotHover && curHoverA > 0.01) {
      curCtx.globalAlpha  = curHoverA;
      curCtx.fillStyle    = `rgb(${r},${g},${b})`;
      curCtx.font         = "bold 11px 'IBM Plex Sans Arabic', sans-serif";
      curCtx.textAlign    = 'center';
      curCtx.textBaseline = 'middle';
      curCtx.fillText(_lastHoveredLabel, mouseX, mouseY - curRingR - 10);
      curCtx.globalAlpha  = 1;
      curCtx.textAlign    = 'start';
      curCtx.textBaseline = 'alphabetic';
    }

    if (curParts.length > 0 || curRipples.length > 0 || curDots.length > 0) requestCursorTick();
  }

  document.addEventListener('mousemove', e => {
    mouseX   = e.clientX;
    mouseY   = e.clientY;
    curDirty = true;
    const now = performance.now();
    const dx  = e.clientX - lastSpawnX;
    const dy  = e.clientY - lastSpawnY;
    if (now - lastSpawnTime > SPAWN_INTERVAL && dx * dx + dy * dy > SPAWN_DISTANCE_SQ) {
      spawnChar(e.clientX, e.clientY, false);
      lastSpawnTime = now;
      lastSpawnX    = e.clientX;
      lastSpawnY    = e.clientY;
    }
    requestCursorTick();
  });

  document.addEventListener('click', e => {
    curDirty = true;
    spawnChar(e.clientX, e.clientY, true);
    requestCursorTick();
  });

  window.addEventListener('resize', () => { resizeCur(); curDirty = true; requestCursorTick(); });
  resizeCur(); requestCursorTick();

  const slides       = Array.from(document.querySelectorAll('.slide'));
  const TOTAL        = slides.length;
  const btnPrev      = document.getElementById('btn-prev');
  const btnNext      = document.getElementById('btn-next');
  const dotTrack     = document.getElementById('dot-track');
  const currentNumEl = document.getElementById('current-num');
  const progressFill = document.getElementById('progress-fill');
  let   currentIdx   = 0;
  let   animating    = false;
  const ANIM_MS      = 650;

  const SLIDE_LABELS = [
    'الغلاف', 'مقدمة', 'الانتشار', 'GANs', 'نماذج اللغة',
    'الصورة', 'الصوت', 'الفيديو', 'التطوير', 'النماذج', 'الميزان', 'الأخلاق', 'الخاتمة'
  ];

  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
    dot.dataset.tooltip = String(i + 1).padStart(2, '0') + ' · ' + (SLIDE_LABELS[i] || '');
    dot.addEventListener('click', () => goTo(i));
    dot.addEventListener('mouseenter', () => {
      if (i === currentIdx) return;
      hoveredDotIndex = i;
      _lastHoveredLabel = String(i + 1).padStart(2, '0') + ' · ' + (SLIDE_LABELS[i] || '');
      curDirty = true; requestCursorTick();
    });
    dot.addEventListener('mouseleave', () => { hoveredDotIndex = -1; curDirty = true; requestCursorTick(); });
    dotTrack.appendChild(dot);
  });

  function attachCursorHover(el) {
    el.addEventListener('mouseenter', () => {
      if (el.disabled) return;
      hoveredButton = true; curDirty = true; requestCursorTick();
    });
    el.addEventListener('mouseleave', () => { hoveredButton = false; curDirty = true; requestCursorTick(); });
  }
  document.querySelectorAll('button').forEach(attachCursorHover);

  function updateNav() {
    btnPrev.disabled = currentIdx === 0;
    btnNext.disabled = currentIdx === TOTAL - 1;
    document.querySelectorAll('.nav-dot').forEach((d, i) =>
      d.classList.toggle('active', i === currentIdx)
    );
    currentNumEl.textContent = String(currentIdx + 1).padStart(2, '0');
    progressFill.style.height = ((currentIdx + 1) / TOTAL * 100) + '%';
  }

  function goTo(idx) {
    if (animating || idx === currentIdx || idx < 0 || idx >= TOTAL) return;
    slides[currentIdx].querySelectorAll('.card.flipped').forEach(c => c.classList.remove('flipped'));
    animating = true;
    const dir      = idx > currentIdx ? 1 : -1;
    const outSlide = slides[currentIdx];
    const inSlide  = slides[idx];
    outSlide.classList.add(dir > 0 ? 'exit-next' : 'exit-prev');
    inSlide.classList.add(dir > 0 ? 'enter-next' : 'enter-prev');
    setTimeout(() => {
      outSlide.classList.remove('active', 'exit-next', 'exit-prev');
      inSlide.classList.remove('enter-next', 'enter-prev');
      inSlide.classList.add('active');
      currentIdx = idx;
      animating  = false;
      updateNav();
      onSlideEnter(currentIdx);
    }, ANIM_MS);
  }

  btnPrev.addEventListener('click', () => goTo(currentIdx - 1));
  btnNext.addEventListener('click', () => goTo(currentIdx + 1));

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(currentIdx + 1);
    if (e.key === 'ArrowRight') goTo(currentIdx - 1);
  });

  const scrollWrap               = document.getElementById('scroll-bar-wrap');
  const scrollFill               = document.getElementById('scroll-bar-fill');
  const SCROLL_NEEDED            = 600;
  const SCROLL_LOCK_MS           = 500;
  const SCROLL_COMPLETE_DELAY_MS = 350;
  const SCROLL_COOLDOWN_MS       = 700;

  let scrollAccum   = 0;
  let committedDir  = 0;
  let scrollCooling = false;
  let lockTimer     = null;
  let hideTimer     = null;

  function hideScrollBar() {
    scrollFill.style.width = '0%';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => scrollWrap.classList.remove('visible'), 300);
  }

  function resetScrollBar() {
    scrollAccum  = 0;
    committedDir = 0;
    hideScrollBar();
    scrollWrap.classList.remove('dir-prev');
  }

  function fireCompletionFx(dir) {
    const mainColor = dir > 0 ? '#00c9d4' : '#c9a84c';
    const altColor  = dir > 0 ? '#c9a84c' : '#00c9d4';
    const origin = { x: dir > 0 ? 0 : window.innerWidth, y: window.innerHeight };
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = cx - origin.x, dy = cy - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const baseAngle = Math.atan2(dy / dist, dx / dist);
    const count = 22 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const speed = 6 + Math.random() * 8;
      const angle = baseAngle + (Math.random() - 0.5) * 0.55;
      curDots.push({
        x: origin.x + (Math.random() - 0.5) * 10,
        y: origin.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life:  0.65 + Math.random() * 0.35,
        size:  1.5 + Math.random() * 3,
        color: Math.random() < 0.7 ? mainColor : altColor,
      });
    }
    curDirty = true; requestCursorTick();
  }

  document.addEventListener('wheel', e => {
    if (animating || scrollCooling) return;
    const rawDir = e.deltaY > 0 ? 1 : -1;
    if (rawDir === 1  && currentIdx === TOTAL - 1) return;
    if (rawDir === -1 && currentIdx === 0)         return;
    if (committedDir === 0) {
      committedDir = rawDir;
      scrollWrap.classList.toggle('dir-prev', committedDir === -1);
      scrollWrap.classList.add('visible');
    }
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => {
      scrollAccum  = 0;
      committedDir = 0;
      hideScrollBar();
      scrollWrap.classList.remove('dir-prev');
    }, SCROLL_LOCK_MS);
    if (rawDir === committedDir) {
      scrollAccum = Math.min(scrollAccum + Math.abs(e.deltaY), SCROLL_NEEDED);
    } else {
      scrollAccum = Math.max(scrollAccum - Math.abs(e.deltaY), 0);
    }
    const pct = scrollAccum / SCROLL_NEEDED * 100;
    scrollFill.style.width = pct + '%';
    if (scrollAccum <= 0) { hideScrollBar(); return; }
    scrollWrap.classList.add('visible');
    if (pct >= 100) {
      const dir = committedDir;
      clearTimeout(lockTimer);
      scrollCooling = true;
      fireCompletionFx(dir);
      setTimeout(() => {
        resetScrollBar();
        goTo(currentIdx + dir);
        setTimeout(() => { scrollCooling = false; }, SCROLL_COOLDOWN_MS);
      }, SCROLL_COMPLETE_DELAY_MS);
    }
  }, { passive: true });

  function onSlideEnter(idx) {}

  updateNav();

})();
