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

})();
