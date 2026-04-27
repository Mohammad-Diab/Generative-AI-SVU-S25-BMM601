/* ═══════════════════════════════════════════════
   Generative AI — ITE_BMM601 · SVU · S25
   Interactivity
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── SECTION 1 · NEURAL NETWORK BACKGROUND ── */
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx    = bgCanvas.getContext('2d');

  const NN = {
    nodes: [],
    NODE_COUNT: 60,
    MAX_DIST:   180,
    NODE_SPEED: 0.4,

    resize() {
      bgCanvas.width  = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    },

    init() {
      this.resize();
      this.nodes = Array.from({ length: this.NODE_COUNT }, () => ({
        x:  Math.random() * bgCanvas.width,
        y:  Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * this.NODE_SPEED,
        vy: (Math.random() - 0.5) * this.NODE_SPEED,
        r:  Math.random() * 2 + 1.5,
      }));
    },

    update() {
      this.nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > bgCanvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > bgCanvas.height) n.vy *= -1;
      });
    },

    draw() {
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i], b = this.nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > this.MAX_DIST) continue;
          const alpha = (1 - dist / this.MAX_DIST) * 0.35;
          bgCtx.strokeStyle = `rgba(201,168,76,${alpha})`;
          bgCtx.lineWidth   = 0.8;
          bgCtx.beginPath();
          bgCtx.moveTo(a.x, a.y);
          bgCtx.lineTo(b.x, b.y);
          bgCtx.stroke();
        }
      }

      this.nodes.forEach(n => {
        bgCtx.beginPath();
        bgCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        bgCtx.fillStyle = 'rgba(201,168,76,0.7)';
        bgCtx.fill();
      });
    },

    tick() {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.tick());
    },
  };

  window.addEventListener('resize', () => NN.resize());
  NN.init();
  NN.tick();

  /* ── SECTION 2 · CUSTOM CURSOR & LETTER PARTICLES ── */
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

  window.addEventListener('resize', () => resizeCur());
  resizeCur();
  requestCursorTick();

})();
