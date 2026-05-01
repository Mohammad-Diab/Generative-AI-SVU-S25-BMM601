(function () {
  const warning = document.getElementById('screen-warning');
  const warningRes = document.getElementById('warning-res');
  function checkScreen() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const small = w < 1280 || h < 720;
    warning.classList.toggle('visible', small);
    if (warningRes) warningRes.textContent = w + ' × ' + h;
  }
  checkScreen();
  window.addEventListener('resize', checkScreen);
})();

(function () {
  'use strict';

  const PROXY_BASE = 'http://127.0.0.1:8787';

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
  let _lastHoveredLabel = '٠١';
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
  let hoveredNavBtn   = false;
  let hoveredTealBtn  = false;

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
    const anyHover    = dotHover || hoveredButton || hoveredNavBtn || hoveredTealBtn;
    const ringTarget  = anyHover ? 26 : 16;
    const alphaTarget = anyHover ? 1  : 0;
    curRingR  += (ringTarget  - curRingR)  * 0.13;
    curHoverA += (alphaTarget - curHoverA) * 0.13;

    const stillAnimating = Math.abs(curRingR - ringTarget) > 0.05 || Math.abs(curHoverA - alphaTarget) > 0.005;
    if (stillAnimating) curDirty = true;

    let r, g, b;
    if (hoveredTealBtn) {
      r = Math.round(201 + (255 - 201) * curHoverA);
      g = Math.round(168 + (220 - 168) * curHoverA);
      b = Math.round(76  + (80  - 76)  * curHoverA);
    } else {
      r = Math.round(201 + (45  - 201) * curHoverA);
      g = Math.round(168 + (212 - 168) * curHoverA);
      b = Math.round(76  + (191 - 76)  * curHoverA);
    }
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

  const toHindi = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  const SLIDE_LABELS = [
    'الغلاف', 'مقدمة', 'الانتشار', 'GANs', 'نماذج اللغة',
    'الصورة', 'الصوت', 'الفيديو', 'التطوير', 'النماذج', 'الميزان', 'المستقبل', 'الأخلاق والخاتمة'
  ];

  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'nav-dot' + (i === 0 ? ' active' : '');
    dot.dataset.tooltip = toHindi(String(i + 1).padStart(2, '0')) + '  ' + (SLIDE_LABELS[i] || '');
    dot.addEventListener('click', () => goTo(i));
    dot.addEventListener('mouseenter', () => {
      if (i === currentIdx) return;
      hoveredDotIndex = i;
      _lastHoveredLabel = toHindi(String(i + 1).padStart(2, '0')) + '  ' + (SLIDE_LABELS[i] || '');
      curDirty = true; requestCursorTick();
    });
    dot.addEventListener('mouseleave', () => { hoveredDotIndex = -1; curDirty = true; requestCursorTick(); });
    dotTrack.appendChild(dot);
  });

  function attachCursorHover(el) {
    const isTeal = el.classList.contains('deep-dive-btn') || el.classList.contains('breath-mic-btn');
    el.addEventListener('mouseenter', () => {
      if (el.disabled) return;
      if (isTeal) hoveredTealBtn = true; else hoveredButton = true;
      curDirty = true; requestCursorTick();
    });
    el.addEventListener('mouseleave', () => {
      if (isTeal) hoveredTealBtn = false; else hoveredButton = false;
      curDirty = true; requestCursorTick();
    });
  }
  document.querySelectorAll('button').forEach(attachCursorHover);

  [btnPrev, btnNext].forEach(el => {
    el.addEventListener('mouseenter', () => { if (!el.disabled) { hoveredNavBtn = true; curDirty = true; requestCursorTick(); } });
    el.addEventListener('mouseleave', () => { hoveredNavBtn = false; curDirty = true; requestCursorTick(); });
  });

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
    if (e.target.closest('.model-scroll-outer')) return;
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

  document.querySelectorAll('[data-flip="true"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      if (!card) return;
      card.classList.add('flipped');
      const slide = btn.closest('.slide');
      const idx   = slide ? parseInt(slide.dataset.index) : -1;
      if (idx === 12 && window._quizReset) window._quizReset();
      if (FLIP_CREDITS[idx] !== undefined && slideCreditEl) {
        slideCreditEl.innerHTML = FLIP_CREDITS[idx];
        slideCreditEl.classList.add('visible');
      }
    });
  });

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.card');
      if (!card) return;
      card.classList.remove('flipped');
      const slide = btn.closest('.slide');
      const idx   = slide ? parseInt(slide.dataset.index) : -1;
      if (FLIP_CREDITS[idx] !== undefined && slideCreditEl) {
        slideCreditEl.classList.remove('visible');
      }
    });
  });

  const DEEP_DIVE_DATA = {
    definition: {
      eyebrow: '٠١ · التعريف — تعمّق أكثر',
      title: 'ما هو الذكاء الاصطناعي التوليدي؟',
      facts: [
        'ينشئ محتوى جديداً بدل أن يكتفي بتصنيف المحتوى الموجود.',
        'يختلف عن الذكاء التقليدي لأنه يتعامل مع الاحتمالات والأنماط لتوليد نتيجة.',
        'أهم الأنواع في العرض: نص، صورة، صوت، وفيديو.',
        'أمثلة قريبة للطلاب: مساعدات المحادثة، توليد الصور، تلخيص المحاضرات.',
      ],
      paragraphs: [
        'الفكرة الأساسية أن النموذج يتعلم من أمثلة كثيرة، ثم يستخدم ما تعلمه لإنشاء نص أو صورة أو صوت أو فيديو جديد.',
        'الذكاء التقليدي غالباً يجيب عن سؤال مثل: ما هذا؟ أما الذكاء التوليدي فيحاول الإجابة عن طلب مثل: أنشئ لي شيئاً جديداً بهذه المواصفات.',
      ],
    },
    diffusion: {
      eyebrow: '٠٢ · الانتشار — تعمّق أكثر',
      title: 'كيف تنتج نماذج الانتشار صوراً واقعية؟',
      facts: [
        'تبدأ الفكرة بإضافة ضوضاء إلى الصور أثناء التدريب.',
        'يتعلم النموذج عكس العملية: إزالة الضوضاء خطوة بعد خطوة.',
        'كل خطوة تقرّب الصورة من وصف المستخدم.',
        'أمثلة مشهورة: Stable Diffusion و DALL·E.',
      ],
      paragraphs: [
        'نموذج الانتشار يتدرب على فهم كيف تتحول الصورة الواضحة إلى ضوضاء، ثم يتعلم الطريق المعاكس لإعادة بناء صورة مفهومة.',
        'لذلك تظهر النتيجة تدريجياً: من ضوضاء عشوائية إلى شكل عام ثم تفاصيل أدق حتى تصبح الصورة مقنعة.',
      ],
    },
    gans: {
      eyebrow: '٠٣ · GANs — تعمّق أكثر',
      title: 'شبكتان تتنافسان حتى تتحسن النتيجة',
      facts: [
        'المولّد يحاول إنشاء عينة مقنعة.',
        'المميّز يحاول كشف هل العينة حقيقية أم مزيفة.',
        'التدريب يتحسن لأن كل طرف يدفع الآخر للأفضل.',
        'ما زالت GANs مفيدة في الوجوه، الفن، وبعض تطبيقات الفيديو.',
      ],
      paragraphs: [
        'في GANs لا يوجد نموذج واحد فقط. هناك مولّد يصنع المحتوى، ومميّز يحكم عليه. إذا كشف المميّز الخدعة، يتعلم المولّد تحسين عمله.',
        'هذه المنافسة تجعل النظام قادراً على إنتاج صور أو عينات واقعية، لكنها قد تكون أصعب في التدريب من بعض الأساليب الحديثة.',
      ],
    },
    llm: {
      eyebrow: '٠٤ · LLMs — تعمّق أكثر',
      title: 'كيف تولد نماذج اللغة النص؟',
      facts: [
        'النموذج يتوقع الكلمة أو الرمز التالي بناءً على السياق.',
        'التدريب على نصوص ضخمة يعني تعلم أنماط اللغة والمعرفة الشائعة.',
        'الحجم الأكبر لا يعني دائماً إجابة أفضل.',
        'أمثلة: GPT-5.5 و Gemini 3.1 Pro و Claude Opus 4.7 و Qwen.',
      ],
      paragraphs: [
        'نموذج اللغة لا ينسخ إجابة جاهزة غالباً، بل يبني النص تدريجياً عبر اختيار الرمز التالي الأكثر مناسبة للسياق.',
        'جودة الإجابة تعتمد على التدريب، التعليمات، السياق، وطريقة السؤال، وليس فقط على حجم النموذج.',
      ],
    },
    image: {
      eyebrow: '٠٥ · الصور — تعمّق أكثر',
      title: 'من الوصف النصي إلى الصورة',
      facts: [
        'المستخدم يكتب Prompt يصف المشهد والأسلوب والتفاصيل.',
        'النموذج يحول الوصف إلى تمثيل داخلي ثم يولد صورة.',
        'Midjourney V7 قوي في الأسلوب البصري، و GPT-Image-1.5 جيد في الفهم والتحرير.',
        'Stable Diffusion 3.5 مناسب للتحكم والتخصيص المحلي.',
      ],
      paragraphs: [
        'الوصف الجيد يحدد الموضوع، الأسلوب، الإضاءة، زاوية الرؤية، وما يجب تجنبه. كلما كان الوصف أوضح، أصبحت النتيجة أقرب للمطلوب.',
        'الأدوات تختلف في القوة: بعضها أفضل للصور الفنية، وبعضها أفضل للتحرير، وبعضها يعطي تحكماً تقنياً أوسع.',
      ],
    },
    audio: {
      eyebrow: '٠٦ · الصوت — تعمّق أكثر',
      title: 'كلام · موسيقى · فهم الصوت',
      facts: [
        'Eleven v3 يولد كلاماً بشرياً عاطفياً ويدعم الحوار متعدد المتحدثين.',
        'Suno v5.5 يولد موسيقى أكثر تخصيصاً مع ذاكرة للصوت والأسلوب.',
        'GPT-4o Transcribe يحول الصوت إلى نص بدقة أعلى من نماذج Whisper القديمة.',
        'TTS الحديث يُحاكي المشاعر والتنفس لا مجرد النطق الحرفي للنص.',
      ],
      paragraphs: [
        'الفرق الجوهري: Eleven v3 يركز على الكلام والأصوات البشرية، Suno v5.5 على الموسيقى التوليدية، وGPT-4o Transcribe على فهم الصوت وتحويله لنص.',
        'استنساخ الصوت يُفيد في النشر، الإذاعة، وإمكانية الوصول — لكنه خطر أخلاقي مباشر إذا استُخدم لتزوير كلام شخصية حقيقية.',
      ],
    },
    video: {
      eyebrow: '٠٧ · الفيديو — تعمّق أكثر',
      title: 'توليد مشهد كامل من النص',
      facts: [
        'يبدأ النظام بوصف نصي للمشهد والحركة والكاميرا.',
        'النموذج ينتج سلسلة إطارات مترابطة زمنياً.',
        'التحديات الحالية: طول الفيديو، ثبات الشخصيات، وقوانين الفيزياء.',
        'أمثلة أدوات: Sora 2 و Runway Gen-4 و Kling 2.5 Turbo.',
      ],
      paragraphs: [
        'توليد الفيديو أصعب من الصورة لأن النموذج يجب أن يحافظ على الاتساق بين الإطارات: نفس الشخص، نفس المكان، وحركة منطقية.',
        'الأدوات الحديثة تقدمت كثيراً، لكنها لا تزال تواجه أخطاء في الحركة الطويلة، التفاصيل الدقيقة، والسببية الفيزيائية.',
      ],
    },
    dev: {
      eyebrow: '٠٨ · التطوير — تعمّق أكثر',
      title: 'كيف يساعد الذكاء الاصطناعي في كتابة الكود؟',
      facts: [
        'يقترح كوداً بناءً على الوصف أو الملف الحالي.',
        'يساعد في الشرح، الاختبارات، المراجعة، والتوثيق.',
        'أمثلة أدوات: Copilot و Cursor و Claude.',
        'لا يمكن الاعتماد عليه دون مراجعة وفهم من المطور.',
      ],
      paragraphs: [
        'أدوات البرمجة الذكية تقرأ السياق ثم تقترح تعديلاً أو حلاً. فائدتها الأكبر تظهر عندما يكون الطلب محدداً والكود منظماً.',
        'ما زالت تخطئ في التفاصيل، الأمان، وحالات الاختبار، لذلك دور المطور هو التحقق والتعديل وليس النسخ المباشر.',
      ],
    },
    tools: {
      eyebrow: '١٠ · النماذج — تعمّق أكثر',
      title: '٨ فئات · أبرز ما يميز كل أداة',
      facts: [
        'GPT-5.5 و Claude Opus 4.7 قويان في المنطق والعمل الطويل — Gemini 3.1 Pro بارز في الفهم متعدد الوسائط.',
        'Midjourney V7 أقوى في الأسلوب الفني، و GPT-Image-1.5 أدق في التحرير وتنفيذ التعليمات.',
        'GitHub Copilot مدمج في المحرر مباشرة، بينما Cursor يُعيد بناء تجربة الكتابة من الأساس.',
        'Perplexity يُوثّق مصادره مع كل إجابة — ميزة مهمة لأغراض البحث الأكاديمي.',
      ],
      paragraphs: [
        'الفئات الثماني متداخلة في الواقع: GPT-5.5 يفهم الصور، Gemini 3.1 Pro يفهم الفيديو، وClaude Opus 4.7 يكتب كوداً. التصنيف يُنظم الفهم لكنه لا يعكس الحدود الحقيقية بين النماذج.',
        'الفرق بين النماذج المغلقة (GPT-5.5, Claude Opus 4.7) والمفتوحة (Stable Diffusion 3.5) ليس فقط في الكلفة — بل في التحكم الكامل والخصوصية وإمكانية تشغيلها محلياً بدون إنترنت.',
      ],
    },
    ethics: {
      eyebrow: '١٢ · الأخلاق والخاتمة — تعمّق أكثر',
      title: 'المخاطر التي يجب شرحها مع التقنية',
      facts: [
        'Deepfakes قد تستخدم في التضليل أو انتحال الشخصيات.',
        'حقوق الملكية تصبح معقدة عندما يتدرب النموذج على أعمال بشرية.',
        'الانحياز يظهر عندما تعكس البيانات التدريبية مشاكل المجتمع.',
        'EU AI Act يحاول تنظيم الاستخدام حسب مستوى الخطر.',
      ],
      paragraphs: [
        'الأخلاق ليست شريحة جانبية؛ هي جزء من فهم التقنية. كلما أصبح التوليد أسهل، زادت الحاجة إلى التحقق والشفافية.',
        'الفكرة العملية للطلاب: لا يكفي أن نسأل هل نستطيع توليد هذا المحتوى، بل يجب أن نسأل هل من الصحيح نشره واستخدامه.',
      ],
    },
  };

  const ddOverlay  = document.getElementById('deep-dive-overlay');
  const ddBackdrop = document.getElementById('dd-backdrop');
  const ddClose    = document.getElementById('dd-close');
  const ddEyebrow  = document.getElementById('dd-eyebrow');
  const ddTitleEl  = document.getElementById('dd-title');
  const ddFacts    = document.getElementById('dd-facts');
  const ddText     = document.getElementById('dd-text');

  function openDeepDive(key) {
    const data = DEEP_DIVE_DATA[key];
    if (!data || !ddOverlay) return;
    ddEyebrow.textContent = data.eyebrow;
    ddTitleEl.textContent = data.title;
    ddFacts.innerHTML = '';
    data.facts.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'dd-fact';
      div.innerHTML = `<span class="dd-fact-num">0${i + 1}</span><span class="dd-fact-text">${f}</span>`;
      ddFacts.appendChild(div);
    });
    ddText.innerHTML = data.paragraphs.map(p => `<p>${p}</p>`).join('');
    ddOverlay.setAttribute('aria-hidden', 'false');
    ddOverlay.classList.add('open');
  }

  function closeDeepDive() {
    if (!ddOverlay) return;
    ddOverlay.classList.remove('open');
    ddOverlay.setAttribute('aria-hidden', 'true');
  }

  if (ddClose)    ddClose.addEventListener('click', closeDeepDive);
  if (ddBackdrop) ddBackdrop.addEventListener('click', closeDeepDive);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDeepDive(); });

  document.querySelectorAll('.deep-dive-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeepDive(btn.dataset.slide));
    attachCursorHover(btn);
  });

  (function () {
    const core    = document.querySelector('.breath-core');
    const cvs     = document.getElementById('breath-canvas');
    if (!core || !cvs) return;
    const ctx     = cvs.getContext('2d');
    const mockBtn = document.getElementById('btn-breath-sample');

    cvs.width  = 400;
    cvs.height = 400;

    let analyser    = null;
    let analyserBuf = null;
    let mockMode    = false;

    if (mockBtn) {
      const audio = new Audio('audio/tts-sample.mp3');
      mockBtn.addEventListener('click', () => {
        mockMode = true;
        core.classList.add('reactive');
        audio.currentTime = 0;
        audio.play().catch(() => {});
      });
    }

    (function tick() {
      requestAnimationFrame(tick);
      let v = 0;
      if (analyser) {
        analyser.getByteTimeDomainData(analyserBuf);
        let sum = 0;
        for (let i = 0; i < analyserBuf.length; i++) {
          const d = (analyserBuf[i] - 128) / 128;
          sum += d * d;
        }
        v = Math.min(Math.sqrt(sum / analyserBuf.length) * 3, 1);
      } else if (mockMode) {
        const t = performance.now() / 1000;
        v = 0.25 + 0.25 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 4.1);
        v = Math.max(0, Math.min(1, v));
      }

      const W  = cvs.width, H = cvs.height;
      const cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);

      const N = 64;
      const R = (0.24 + 0.08 * v) * Math.min(W, H);
      const t = performance.now() / 1000;

      for (let i = 0; i < N; i++) {
        const a  = (i / N) * Math.PI * 2;
        const rr = R * (1 + 0.15 * Math.sin(a * 5 + t * 2) + 0.25 * v * Math.sin(a * 3 - t * 3));
        const x  = cx + Math.cos(a) * rr;
        const y  = cy + Math.sin(a) * rr;
        const hue = 175 - ((Math.sin(a * 2.5 + t * 0.8) + 1) / 2) * 133;
        ctx.beginPath();
        ctx.arc(x, y, 2 + v * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.6 + 0.3 * v})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.7, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      grd.addColorStop(0, `hsla(175, 80%, 62%, ${0.2 + 0.25 * v})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fill();
    })();
  })();

  let scaleReset = null;
  let scaleStart = null;

  (function () {
    const scaleBtn    = document.getElementById('btn-scale-run');
    const scaleAxis   = document.getElementById('scale-axis');
    const panBenefits = document.getElementById('scale-pan-benefits');
    const panRisks    = document.getElementById('scale-pan-risks');
    if (!scaleBtn || !scaleAxis) return;

    const bItems = panBenefits ? Array.from(panBenefits.querySelectorAll('.slide-para')) : [];
    const rItems = panRisks    ? Array.from(panRisks.querySelectorAll('.slide-para'))    : [];
    let running = false;
    let timers  = [];

    const setTilt = (deg, bY, rY) => {
      scaleAxis.style.setProperty('--scale-tilt', deg + 'deg');
      if (panBenefits) panBenefits.style.transform = `translateY(${bY}rem)`;
      if (panRisks)    panRisks.style.transform    = `translateY(${rY}rem)`;
    };

    scaleReset = () => {
      timers.forEach(clearTimeout);
      timers = [];
      running = false;
      scaleBtn.disabled = false;
      bItems.forEach(el => el.classList.remove('scale-item--visible'));
      rItems.forEach(el => el.classList.remove('scale-item--visible'));
      setTilt(0, 0, 0);
    };

    const runAnimation = () => {
      if (running) return;
      running = true;
      scaleBtn.disabled = true;

      const CYCLE = 650;
      const REACT = 300;

      const B =  10, bY =  0.7, nY = -0.7;
      const R = -10, rY = -0.7, pY =  0.7;
      const E =   0;

      const seq = [
        { items: bItems, idx: 0, deg: B, bYv: bY, rYv: nY },
        { items: rItems, idx: 0, deg: E, bYv:  0, rYv:  0 },
        { items: rItems, idx: 1, deg: R, bYv: nY, rYv: pY },
        { items: bItems, idx: 1, deg: E, bYv:  0, rYv:  0 },
        { items: bItems, idx: 2, deg: B, bYv: bY, rYv: nY },
        { items: rItems, idx: 2, deg: E, bYv:  0, rYv:  0 },
        { items: rItems, idx: 3, deg: R, bYv: nY, rYv: pY },
        { items: bItems, idx: 3, deg: E, bYv:  0, rYv:  0 },
        { items: bItems, idx: 4, deg: B, bYv: bY, rYv: nY },
        { items: rItems, idx: 4, deg: E, bYv:  0, rYv:  0 },
        { items: bItems, idx: 5, deg: 13, bYv: 0.9, rYv: -0.9 },
      ];

      seq.forEach((step, i) => {
        const at = i * CYCLE;
        if (step.items[step.idx]) {
          timers.push(setTimeout(() => step.items[step.idx].classList.add('scale-item--visible'), at));
        }
        timers.push(setTimeout(() => setTilt(step.deg, step.bYv, step.rYv), at + REACT));
      });

      timers.push(setTimeout(() => {
        running = false;
        scaleBtn.disabled = false;
      }, seq.length * CYCLE));
    };

    scaleBtn.addEventListener('click', () => {
      if (running) return;
      scaleReset();
      scaleBtn.disabled = true;
      timers.push(setTimeout(runAnimation, 1500));
    });

    scaleStart = () => {
      scaleBtn.disabled = true;
      timers.push(setTimeout(runAnimation, 1500));
    };
  })();

  (function () {
    const QUESTIONS = [
      {
        q: 'ما الفرق الرئيسي بين الذكاء الاصطناعي التوليدي والتقليدي؟',
        answers: ['التوليدي يُنشئ محتوى جديداً، التقليدي يُصنّف فحسب', 'التوليدي أقدم من التقليدي', 'التقليدي يحتاج بيانات أكثر', 'لا فرق بينهما'],
        correct: 0,
      },
      {
        q: 'ما التقنية التي تستخدمها DALL-E و Midjourney و Stable Diffusion؟',
        answers: ['شبكات GANs', 'توليد النصوص', 'توليد الصور بالانتشار', 'التعرف على الكلام'],
        correct: 2,
      },
      {
        q: 'ما المبدأ الأساسي لـ GANs؟',
        answers: ['شبكة واحدة تتدرب على بيانات ضخمة', 'مولّد ومميّز يتنافسان لتحسين الناتج', 'نموذج يُزيل الضوضاء تدريجياً', 'نموذج يترجم النص إلى رمز'],
        correct: 1,
      },
      {
        q: 'أي نموذج يُعدّ مثالاً على توليد الفيديو من النص؟',
        answers: ['GPT-5.5', 'Eleven v3', 'Sora 2', 'Stable Diffusion 3.5'],
        correct: 2,
      },
      {
        q: 'ما أحد المخاطر الأخلاقية الرئيسية للذكاء الاصطناعي التوليدي؟',
        answers: ['الحوسبة الكمومية', 'قواعد البيانات العلائقية', 'تشفير البيانات', 'التزييف العميق Deepfakes'],
        correct: 3,
      },
    ];

    const qEl       = document.getElementById('quiz-question');
    const answersEl = document.getElementById('quiz-answers');
    const feedbackEl= document.getElementById('quiz-feedback');
    const qNumEl    = document.getElementById('quiz-q-num');
    const scoreFill = document.getElementById('quiz-score-fill');
    if (!qEl || !answersEl) return;

    const ARABIC_NUMS = ['١','٢','٣','٤','٥'];
    let current = 0, score = 0;

    function resetQuiz() {
      current = 0;
      score   = 0;
      scoreFill.style.width = '0%';
      answersEl.innerHTML = QUESTIONS[0].answers
        .map(a => `<button class="quiz-answer-btn">${a}</button>`).join('');
      loadQuestion(0);
    }
    window._quizReset = resetQuiz;

    function loadQuestion(i) {
      const item = QUESTIONS[i];
      qEl.textContent = item.q;
      qNumEl.textContent = ARABIC_NUMS[i];
      feedbackEl.textContent = '';
      const btns = answersEl.querySelectorAll('.quiz-answer-btn');
      btns.forEach((btn, j) => {
        btn.textContent = item.answers[j];
        btn.className = 'quiz-answer-btn';
        btn.disabled = false;
      });
    }

    answersEl.addEventListener('click', e => {
      const btn = e.target.closest('.quiz-answer-btn');
      if (!btn || btn.disabled) return;
      const idx = [...answersEl.querySelectorAll('.quiz-answer-btn')].indexOf(btn);
      const correct = QUESTIONS[current].correct;
      answersEl.querySelectorAll('.quiz-answer-btn').forEach(b => b.disabled = true);
      if (idx === correct) {
        btn.classList.add('correct');
        score++;
        feedbackEl.textContent = '✓ إجابة صحيحة!';
      } else {
        btn.classList.add('wrong');
        answersEl.querySelectorAll('.quiz-answer-btn')[correct].classList.add('correct');
        feedbackEl.textContent = '✗ الإجابة الصحيحة مُظلَّلة';
      }
      scoreFill.style.width = (score / QUESTIONS.length * 100) + '%';
      current++;
      if (current < QUESTIONS.length) {
        setTimeout(() => loadQuestion(current), 1200);
      } else {
        setTimeout(() => {
          qEl.textContent = `انتهى الاختبار — نتيجتك ${ARABIC_NUMS[score - 1] || '٠'} / ٥`;
          answersEl.innerHTML = '';
          feedbackEl.textContent = score >= 4 ? '🌟 ممتاز!' : score >= 3 ? '👍 جيد' : 'استمر في التعلم!';
        }, 1200);
      }
    });

    loadQuestion(0);
  })();

  (function codeDemoInit() {
    const promptEl  = document.getElementById('code-prompt');
    if (!promptEl) return;
    const genBtn    = document.getElementById('code-gen-btn');
    const outputEl  = document.getElementById('code-lines');
    const statusEl  = document.getElementById('code-gen-status');
    const counterEl = document.getElementById('code-counter');
    const tabLabel  = document.getElementById('code-tab-label');
    const langBtns  = document.querySelectorAll('.code-lang-btn');

    const CALL_LIMIT = 5;
    const S_KEY  = 'code_calls';
    const S_DATE = 'code_date';

    function callsLeft() {
      const today = new Date().toDateString();
      if (localStorage.getItem(S_DATE) !== today) {
        localStorage.setItem(S_DATE, today);
        localStorage.setItem(S_KEY, '0');
      }
      return Math.max(0, CALL_LIMIT - parseInt(localStorage.getItem(S_KEY) || '0'));
    }
    function recordCall() {
      localStorage.setItem(S_KEY, String(parseInt(localStorage.getItem(S_KEY) || '0') + 1));
    }
    function updateCounter() {
      if (!counterEl) return;
      const left = callsLeft();
      counterEl.className = 'llm-counter' + (left === 0 ? ' llm-counter--empty' : left <= 2 ? ' llm-counter--warn' : '');
      counterEl.innerHTML = `<span>محاولات اليوم</span><strong>${toHindi(String(left))}</strong><span>متبقية</span>`;
      genBtn.disabled = left === 0;
    }

    let currentLang = 'python';
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        langBtns.forEach(b => b.classList.remove('code-lang-btn--active'));
        btn.classList.add('code-lang-btn--active');
        currentLang = btn.dataset.lang;
        if (tabLabel) tabLabel.textContent = currentLang === 'python' ? 'main.py' : 'main.js';
      });
    });

    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    function typeCode(code) {
      if (!outputEl) return;
      outputEl.textContent = '';
      let i = 0;
      const speed = Math.max(8, Math.min(25, Math.floor(2000 / code.length)));
      function next() {
        if (i >= code.length) { setStatus(''); return; }
        outputEl.textContent += code[i++];
        setTimeout(next, speed);
      }
      next();
    }

    let running = false;
    async function generate() {
      if (running || callsLeft() <= 0) return;
      const prompt = promptEl.value.trim();
      if (!prompt) return;
      running = true;
      genBtn.disabled = true;
      promptEl.disabled = true;
      setStatus('جاري التوليد…');
      if (outputEl) outputEl.textContent = '';

      let data;
      try {
        const res = await fetch(PROXY_BASE + '/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, language: currentLang }),
        });
        data = await res.json();
      } catch {
        setStatus('خطأ في الاتصال');
        running = false;
        genBtn.disabled = false;
        promptEl.disabled = false;
        return;
      }

      if (data.error === 'daily_limit') { setStatus('وصلت إلى الحد اليومي'); }
      else if (data.error === 'cooldown') { setStatus('انتظر ' + (data.retryAfter || 3) + ' ث…'); }
      else if (data.error || !data.code)  { setStatus('خطأ في الخدمة'); }
      else {
        recordCall();
        updateCounter();
        setStatus('يكتب…');
        typeCode(data.code);
      }

      running = false;
      promptEl.disabled = false;
      if (callsLeft() > 0) genBtn.disabled = false;
    }

    updateCounter();
    genBtn.addEventListener('click', generate);
    promptEl.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  })();

  (function sttDemoInit() {
    const recordBtn    = document.getElementById('stt-record-btn');
    if (!recordBtn) return;
    const transcriptEl = document.getElementById('stt-transcript');
    const placeholderEl= document.getElementById('stt-placeholder');
    const finalEl      = document.getElementById('stt-final');
    const interimEl    = document.getElementById('stt-interim');
    const recordLbl    = document.getElementById('stt-record-label');
    const langBtns     = document.querySelectorAll('.stt-lang-btn');
    const sttCvs       = document.getElementById('stt-canvas');
    const sttCtx       = sttCvs ? sttCvs.getContext('2d') : null;

    let analyser    = null;
    let analyserBuf = null;
    let animRunning = false;

    function resizeCanvas() {
      if (!sttCvs) return;
      sttCvs.width  = sttCvs.offsetWidth;
      sttCvs.height = sttCvs.offsetHeight;
    }

    function startAnim(stream) {
      resizeCanvas();
      if (stream) {
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const src  = actx.createMediaStreamSource(stream);
        analyser   = actx.createAnalyser();
        analyser.fftSize = 512;
        analyserBuf = new Uint8Array(analyser.fftSize);
        src.connect(analyser);
      }
      if (sttCvs) sttCvs.classList.add('stt-canvas--active');
      animRunning = true;
      (function tick() {
        if (!animRunning) return;
        requestAnimationFrame(tick);
        if (!sttCtx) return;
        let v = 0;
        if (analyser) {
          analyser.getByteTimeDomainData(analyserBuf);
          let sum = 0;
          for (let i = 0; i < analyserBuf.length; i++) {
            const d = (analyserBuf[i] - 128) / 128;
            sum += d * d;
          }
          v = Math.min(Math.sqrt(sum / analyserBuf.length) * 3, 1);
        } else {
          const t = performance.now() / 1000;
          v = 0.25 + 0.25 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3) + 0.1 * Math.sin(t * 4.1);
          v = Math.max(0, Math.min(1, v));
        }
        const W = sttCvs.width, H = sttCvs.height;
        const cx = W / 2, cy = H / 2;
        sttCtx.clearRect(0, 0, W, H);
        const N = 80, t = performance.now() / 1000;
        const R = (Math.min(W, H) * 0.28) * (1 + 0.12 * v);
        for (let i = 0; i < N; i++) {
          const a  = (i / N) * Math.PI * 2;
          const rr = R * (1 + 0.15 * Math.sin(a * 5 + t * 2) + 0.28 * v * Math.sin(a * 3 - t * 3));
          const x  = cx + Math.cos(a) * rr;
          const y  = cy + Math.sin(a) * rr;
          const hue = 175 - ((Math.sin(a * 2.5 + t * 0.8) + 1) / 2) * 133;
          sttCtx.beginPath();
          sttCtx.arc(x, y, 2 + v * 4, 0, Math.PI * 2);
          sttCtx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.55 + 0.35 * v})`;
          sttCtx.fill();
        }
      })();
    }

    function stopAnim() {
      animRunning = false;
      analyser    = null;
      analyserBuf = null;
      if (sttCvs) sttCvs.classList.remove('stt-canvas--active');
      if (sttCtx && sttCvs) sttCtx.clearRect(0, 0, sttCvs.width, sttCvs.height);
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      recordBtn.disabled = true;
      if (recordLbl) recordLbl.textContent = 'غير مدعوم — استخدم Chrome';
      return;
    }

    let recognition  = null;
    let running      = false;
    let finalText    = '';
    let currentLang  = 'ar-SA';

    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        langBtns.forEach(b => b.classList.remove('stt-lang-btn--active'));
        btn.classList.add('stt-lang-btn--active');
        currentLang = btn.dataset.lang;
        if (running) stop();
      });
    });

    function stop() {
      if (recognition) recognition.stop();
    }

    function start() {
      finalText = '';
      if (finalEl)  finalEl.textContent  = '';
      if (interimEl) interimEl.textContent = '';
      if (placeholderEl) placeholderEl.style.display = 'none';

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => startAnim(stream))
        .catch(() => startAnim(null));

      recognition = new SR();
      recognition.continuous      = true;
      recognition.interimResults  = true;
      recognition.lang            = currentLang;

      recognition.onstart = () => {
        running = true;
        recordBtn.classList.add('stt-record-btn--active');
        if (recordLbl) recordLbl.textContent = 'إيقاف';
      };

      recognition.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t + ' ';
          else interim += t;
        }
        if (finalEl)   finalEl.textContent   = finalText;
        if (interimEl) interimEl.textContent  = interim;
        if (transcriptEl) transcriptEl.scrollTop = transcriptEl.scrollHeight;
      };

      recognition.onend = () => {
        running = false;
        stopAnim();
        if (interimEl) interimEl.textContent = '';
        recordBtn.classList.remove('stt-record-btn--active');
        if (recordLbl) recordLbl.textContent = 'تسجيل';
        if (!finalText && placeholderEl) placeholderEl.style.display = '';
      };

      recognition.onerror = e => {
        if (e.error === 'aborted') return;
        running = false;
        stopAnim();
        recordBtn.classList.remove('stt-record-btn--active');
        if (recordLbl) recordLbl.textContent = 'تسجيل';
      };

      recognition.start();
    }

    recordBtn.addEventListener('click', () => { if (running) stop(); else start(); });
  })();

  (function forgeDemoInit() {
    const inputEl   = document.getElementById('forge-input');
    if (!inputEl) return;
    const genBtn    = document.getElementById('forge-gen-btn');
    const canvas    = document.getElementById('forge-canvas');
    const statusEl  = document.getElementById('forge-status');
    const dotEl     = document.getElementById('forge-status-dot');
    const counterEl = document.getElementById('forge-counter');

    const S_KEY  = 'forge_used';
    const S_DATE = 'forge_date';

    function canGenerate() {
      const today = new Date().toDateString();
      if (localStorage.getItem(S_DATE) !== today) return true;
      return localStorage.getItem(S_KEY) !== '1';
    }

    function recordUse() {
      localStorage.setItem(S_DATE, new Date().toDateString());
      localStorage.setItem(S_KEY, '1');
    }

    function updateCounter() {
      if (!counterEl) return;
      const left = canGenerate() ? 1 : 0;
      counterEl.className = 'llm-counter' + (left === 0 ? ' llm-counter--empty' : '');
      counterEl.innerHTML = left === 0
        ? '<span>صور اليوم</span><strong>٠</strong><span>متبقية</span>'
        : '<span>صور اليوم</span><strong>١</strong><span>متبقية</span>';
      const btnLbl = genBtn.querySelector('span:last-child') || genBtn;
      if (left === 0) btnLbl.textContent = 'استُنفدت';
    }

    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }
    function setBusy(on) {
      genBtn.disabled  = on || !canGenerate();
      inputEl.disabled = on;
      if (dotEl) dotEl.style.animationPlayState = on ? 'running' : 'paused';
    }

    function drawImageOnCanvas(blob) {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    let running = false;

    async function generate() {
      if (running || !canGenerate()) return;
      const prompt = inputEl.value.trim();
      if (!prompt) return;

      running = true;
      setBusy(true);
      setStatus('جاري التوليد…');

      for (let attempt = 0; attempt < 4; attempt++) {
        let res;
        try {
          res = await fetch(PROXY_BASE + '/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
        } catch {
          setStatus('خطأ في الاتصال');
          break;
        }

        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          const wait = Math.min((data.estimatedTime || 20) * 1000, 30000);
          setStatus('النموذج يُحمَّل… ' + Math.ceil(wait / 1000) + ' ث');
          await sleep(wait);
          continue;
        }

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'daily_limit') setStatus('وصلت إلى الحد اليومي — يُجدَّد غداً');
          else if (data.error === 'cooldown') setStatus('انتظر ' + (data.retryAfter || 3) + ' ث…');
          else setStatus('حاول مرة أخرى لاحقاً');
          break;
        }

        if (!res.ok) { setStatus('خطأ في الخدمة'); break; }

        const blob = await res.blob();
        recordUse();
        updateCounter();
        drawImageOnCanvas(blob);
        setStatus('تم التوليد — صورة واحدة لكل يوم');
        break;
      }

      running = false;
      setBusy(false);
    }

    updateCounter();
    if (!canGenerate()) setStatus('استُنفدت الصورة اليومية — تعود غداً');
    if (dotEl) dotEl.style.animationPlayState = 'paused';

    genBtn.addEventListener('click', generate);
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  })();

  (function llmDemoInit() {
    const MAX_STEPS  = 2;
    const CALL_LIMIT = 5;
    const S_KEY      = 'llm_calls';
    const S_DATE     = 'llm_date';

    const inputEl   = document.getElementById('llm-user-input');
    if (!inputEl) return;
    const genBtn    = document.getElementById('llm-gen-btn');
    const tokensEl  = document.getElementById('llm-demo-tokens');
    const probsEl   = document.getElementById('llm-demo-probs');
    const outputEl  = document.getElementById('llm-output-text');
    const cursorEl  = document.getElementById('llm-cursor');
    const boxEl     = document.getElementById('llm-demo-box');
    const statusEl  = document.getElementById('llm-demo-status');
    const counterEl = document.getElementById('llm-counter');

    function callsLeft() {
      const today = new Date().toDateString();
      if (localStorage.getItem(S_DATE) !== today) {
        localStorage.setItem(S_DATE, today);
        localStorage.setItem(S_KEY, '0');
      }
      return Math.max(0, CALL_LIMIT - parseInt(localStorage.getItem(S_KEY) || '0'));
    }

    function recordCall() {
      localStorage.setItem(S_KEY, String(parseInt(localStorage.getItem(S_KEY) || '0') + 1));
    }

    function updateCounter() {
      const left = callsLeft();
      if (!counterEl) return;
      counterEl.className = 'llm-counter' +
        (left === 0 ? ' llm-counter--empty' : left <= 2 ? ' llm-counter--warn' : '');
      counterEl.innerHTML = `<span>محاولات اليوم</span><strong>${toHindi(String(left))}</strong><span>متبقية</span>`;
      genBtn.disabled = left === 0;
      const btnLbl = genBtn.querySelector('span:last-child');
      if (left === 0) {
        if (btnLbl) btnLbl.textContent = 'استُنفدت المحاولات اليوم';
        setStatus('وصلت إلى الحد اليومي — يُجدَّد غداً');
      } else {
        if (btnLbl) btnLbl.textContent = 'توليد';
      }
    }

    let dotsTimer = null;
    const DOT_FRAMES = ['●○○', '●●○', '●●●', '○●●', '○○●'];
    function startDots() {
      let i = 0;
      dotsTimer = setInterval(() => {
        if (statusEl) statusEl.textContent = 'جاري التوليد ' + DOT_FRAMES[i++ % DOT_FRAMES.length];
      }, 280);
    }
    function stopDots() { clearInterval(dotsTimer); dotsTimer = null; }
    function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

    async function fetchToken(text) {
      const res = await fetch(PROXY_BASE + '/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text }),
      });
      return res.json();
    }

    function renderTokens(text) {
      const words = text.trim().split(/\s+/).filter(Boolean);
      tokensEl.innerHTML = '<div class="llm-col-label">المُدخلات</div>';
      words.slice(-4).forEach(w => {
        const d = document.createElement('div');
        d.className = 'llm-token';
        d.textContent = w;
        tokensEl.appendChild(d);
      });
    }

    function renderProbs(top, chosenText) {
      const pctFor = t => {
        if (Number.isFinite(t.percent)) return t.percent;
        if (Number.isFinite(t.probability)) return Math.round(t.probability * 100);
        if (Number.isFinite(t.logprob)) return Math.round(Math.exp(t.logprob) * 100);
        return 0;
      };
      const topPct = Math.max(1, ...top.map(pctFor));
      probsEl.innerHTML = '';
      top.forEach(t => {
        const pct  = pctFor(t);
        const bar  = Math.round((pct / topPct) * 85) + 5;
        const sel  = t.selected || t.text.trim() === chosenText.trim();
        const div  = document.createElement('div');
        div.className = 'llm-prob' + (sel ? ' llm-prob--selected' : '');
        const fill = document.createElement('div');
        fill.className = 'llm-prob-fill';
        fill.style.cssText = 'width:0%;transition:width 0.55s cubic-bezier(0.34,1.2,0.64,1)';
        const track = document.createElement('div');
        track.className = 'llm-prob-track';
        track.appendChild(fill);
        const lbl = document.createElement('small');
        lbl.textContent = (t.text.trim() || '…') + ' ' + pct + '%';
        div.appendChild(track);
        div.appendChild(lbl);
        probsEl.appendChild(div);
        requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = bar + '%'; }));
      });
    }

    function appendToken(tok) {
      const span = document.createElement('span');
      span.className = 'llm-new-token';
      span.textContent = tok;
      outputEl.appendChild(span);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    let isGenerating = false;

    async function generate() {
      if (isGenerating) return;
      if (callsLeft() <= 0) return;
      const raw = inputEl.value.trim();
      if (!raw) return;
      isGenerating = true;

      const words = raw.split(/\s+/).filter(Boolean).slice(0, 10);
      if (raw.split(/\s+/).filter(Boolean).length > 10) inputEl.value = words.join(' ');
      let text = words.join(' ');

      genBtn.disabled        = true;
      inputEl.disabled       = true;
      inputEl.value          = '';
      cursorEl.style.display = 'inline';
      outputEl.innerHTML     = '';
      probsEl.innerHTML      = '';
      renderTokens(text);
      const base = document.createElement('span');
      base.textContent = text;
      outputEl.appendChild(base);

      let counted = false;
      for (let step = 0; step < MAX_STEPS; step++) {
        boxEl.classList.add('llm-generating');
        startDots();

        let data;
        try { data = await fetchToken(text); } catch { stopDots(); setStatus('خطأ في الاتصال'); break; }
        stopDots();
        boxEl.classList.remove('llm-generating');

        if (data.loading) {
          const wait = Math.min((data.retryAfter || 20) * 1000, 30000);
          setStatus('النموذج يُحمَّل… ' + Math.ceil(wait / 1000) + ' ث');
          await sleep(wait);
          step--;
          continue;
        }

        if (data.error === 'daily_limit') { setStatus('وصلت إلى الحد اليومي — يُجدَّد غداً'); break; }
        if (data.error === 'cooldown')    { setStatus('انتظر ' + (data.retryAfter || 3) + ' ث…'); break; }
        if (data.error)                   { setStatus('خطأ في الخدمة'); break; }
        if (!data.top || !data.chosen)    { setStatus('لا نتيجة'); break; }

        if (!counted) { recordCall(); updateCounter(); counted = true; }

        renderProbs(data.top, data.chosen.text);
        setStatus('');
        await sleep(950);

        text += ' ' + data.chosen.text;
        appendToken(' ' + data.chosen.text);
      }

      isGenerating           = false;
      cursorEl.style.display = 'none';
      inputEl.disabled       = false;
      const left = callsLeft();
      genBtn.disabled = left <= 0;
      const lbl = genBtn.querySelector('span:last-child');
      if (lbl && left > 0) lbl.textContent = 'مجدداً';
      if (left > 0) setStatus('');
    }

    updateCounter();
    genBtn.addEventListener('click', generate);
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
  })();

  const slideCreditEl = document.getElementById('slide-credit');
  const SLIDE_CREDITS = {
    2: 'الصور مُولَّدة بـ <strong>DALL·E</strong> عبر ChatGPT &thinsp;·&thinsp; الوصف: <em>"sharp photorealistic red coffee mug on a wooden table, professional lighting, detailed ceramic texture"</em>',
    7: 'الفيديو مُولَّد بـ <strong>Gemini Veo 3</strong> &thinsp;·&thinsp; Google DeepMind',
  };
  const FLIP_CREDITS = {
    4: 'مشغّل بـ <strong>Groq</strong> · نموذج <strong>Llama 3.1 8B</strong> · <em>groq.com</em>',
    5: 'مشغّل بـ <strong>Hugging Face</strong> · نموذج <strong>FLUX.1-schnell</strong> · صورة واحدة يومياً',
    8: 'مشغّل بـ <strong>Groq</strong> · نموذج <strong>Qwen3-32B</strong> · توليد كود Python / JS',
  };
  const marsVideo = document.querySelector('[data-index="7"] video');
  let marsUserPaused = false;

  if (marsVideo) {
    marsVideo.style.cursor = 'none';
    marsVideo.addEventListener('click', () => {
      if (marsVideo.paused) { marsUserPaused = false; marsVideo.play().catch(() => {}); }
      else                  { marsUserPaused = true;  marsVideo.pause(); }
    });
  }

  function onSlideEnter(idx) {
    if (marsVideo) {
      if (idx === 7) { if (!marsUserPaused) setTimeout(() => marsVideo.play().catch(() => {}), 1000); }
      else           { marsVideo.pause(); marsVideo.currentTime = 0; marsUserPaused = false; }
    }
    if (idx === 10) { if (scaleStart) scaleStart(); }
    else if (scaleReset) scaleReset();
    if (!slideCreditEl) return;
    if (SLIDE_CREDITS[idx] !== undefined) {
      slideCreditEl.innerHTML = SLIDE_CREDITS[idx];
      slideCreditEl.classList.add('visible');
    } else {
      slideCreditEl.classList.remove('visible');
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!marsVideo) return;
    if (document.hidden) marsVideo.pause();
    else if (currentIdx === 7 && !marsUserPaused) marsVideo.play().catch(() => {});
  });

  (function () {
    const scrollArea = document.querySelector('.model-scroll-outer');
    const landscape = document.querySelector('.model-landscape');
    const hint      = document.querySelector('.scroll-hint--right');
    if (!scrollArea || !landscape || !hint) return;

    const maxScroll = () => Math.max(0, landscape.scrollWidth - landscape.clientWidth);
    const position = () => Math.abs(landscape.scrollLeft);
    const updateHint = () => {
      hint.classList.toggle('scroll-hint--hidden', position() >= maxScroll() - 10);
    };

    scrollArea.addEventListener('wheel', e => {
      e.preventDefault();
      e.stopPropagation();

      const delta = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 5.6;
      const before = landscape.scrollLeft;
      landscape.scrollLeft += delta;

      if (landscape.scrollLeft === before) {
        landscape.scrollLeft -= delta;
      }

      updateHint();
    }, { passive: false });

    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragPointerId = null;

    landscape.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      dragging = true;
      hoveredButton = true;
      curDirty = true;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragStartScroll = landscape.scrollLeft;
      landscape.classList.add('is-dragging');
      landscape.setPointerCapture(e.pointerId);
      requestCursorTick();
    });

    landscape.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragPointerId) return;
      e.preventDefault();
      landscape.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
      updateHint();
    });

    function stopDrag(e) {
      if (!dragging || e.pointerId !== dragPointerId) return;
      dragging = false;
      dragPointerId = null;
      landscape.classList.remove('is-dragging');
      hoveredButton = landscape.matches(':hover');
      curDirty = true;
      requestCursorTick();
    }

    landscape.addEventListener('pointerup', stopDrag);
    landscape.addEventListener('pointercancel', stopDrag);
    landscape.addEventListener('lostpointercapture', () => {
      dragging = false;
      dragPointerId = null;
      landscape.classList.remove('is-dragging');
      hoveredButton = false;
      curDirty = true;
      requestCursorTick();
    });

    landscape.addEventListener('mouseenter', () => {
      hoveredButton = true;
      curDirty = true;
      requestCursorTick();
    });

    landscape.addEventListener('mouseleave', () => {
      if (dragging) return;
      hoveredButton = false;
      curDirty = true;
      requestCursorTick();
    });

    landscape.addEventListener('scroll', updateHint);
    updateHint();
  })();

  updateNav();

})();
