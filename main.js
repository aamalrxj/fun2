// main.js
window.addEventListener('DOMContentLoaded', () => {
  // 1) Start CSS animations
  document.body.classList.remove('not-loaded');

  // 2) Respect OS reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.body.classList.add('reduced-motion');
  }

  // 3) Auto-adjust typing steps for the main special message
  const msg = document.querySelector('.special-message__text');
  if (msg) {
    const len = msg.textContent.trim().length;
    msg.style.setProperty('--chars', Math.max(len, 10));
  }

  // 4) Background music: user-gesture friendly autoplay with button toggle
  const audio = document.getElementById('bgMusic');
  const musicBtn = document.getElementById('musicToggle');

  if (audio && musicBtn) {
    // Gentle default volume
    audio.volume = 0.35;

    const updateMusicUI = (playing) => {
      musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      musicBtn.textContent = playing ? '♫ Pause music' : '♫ Play music';
    };

    const tryPlay = async () => {
      try {
        await audio.play();
        updateMusicUI(true);
        localStorage.setItem('bgMusicEnabled', 'true');
      } catch (e) {
        // Autoplay likely blocked; keep button visible
        updateMusicUI(false);
      }
    };

    // Restore prior consent if set
    const wanted = localStorage.getItem('bgMusicEnabled') === 'true';
    if (wanted) {
      // Passive attempt (may be blocked)
      tryPlay();
      // One-time gesture unlock for stricter browsers
      const unlock = async () => {
        if (audio.paused) await tryPlay();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    } else {
      updateMusicUI(false);
    }

    // Toggle on click
    musicBtn.addEventListener('click', async () => {
      if (audio.paused) {
        await tryPlay();
      } else {
        audio.pause();
        updateMusicUI(false);
        localStorage.setItem('bgMusicEnabled', 'false');
      }
    });
  }

  // 5) Rotating secondary messages with type-in effect and crossfade
  const rotatorLines = Array.from(document.querySelectorAll('.special-rotator .rotator__line'));
  const reduced = document.body.classList.contains('reduced-motion');

  if (rotatorLines.length) {
    let i = 0;
    const typeDuration = 2200; // ms
    const holdDuration = 1800; // ms
    const fadeDuration = 700;  // ms

    const prepare = (el) => {
      const text = el.textContent.trim();
      el.style.setProperty('--chars', Math.max(text.length, 10));
      el.style.clipPath = 'inset(0 100% 0 0)'; // start hidden for typing
    };

    const typeIn = (el) => {
      if (reduced) {
        el.style.clipPath = 'inset(0 0 0 0)';
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const start = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - start) / typeDuration);
          el.style.clipPath = `inset(0 ${Math.round((1 - p) * 100)}% 0 0)`;
          if (p < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    };

    const show = async (idx) => {
      const prev = document.querySelector('.rotator__line.is-active');
      if (prev) prev.classList.remove('is-active');

      const el = rotatorLines[idx];
      prepare(el);
      el.classList.add('is-active'); // triggers CSS fade-in transform
      await typeIn(el);
      await new Promise(r => setTimeout(r, holdDuration));
    };

    const cycle = async () => {
      while (true) {
        await show(i);
        i = (i + 1) % rotatorLines.length;
        await new Promise(r => setTimeout(r, fadeDuration));
      }
    };

    // Initialize first as active immediately to avoid empty space
    rotatorLines[0].classList.add('is-active');
    rotatorLines.forEach(prepare);
    cycle();
  }

  // 6) Constellation heart canvas animation (skipped in reduced motion)
  const canvas = document.getElementById('constellationHeart');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const logicalW = canvas.width;   // set in HTML attribute, e.g., 560
    const logicalH = canvas.height;  // set in HTML attribute, e.g., 300

    // HiDPI setup
    canvas.width = logicalW * DPR;
    canvas.height = logicalH * DPR;
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    ctx.scale(DPR, DPR);

    // Parametric heart curve
    const heart = (t) => {
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return { x: x / 18, y: y / 18 };
    };

    // Precompute points on the curve
    const N = 180;
    const pts = [];
    for (let k = 0; k < N; k++) {
      const t = Math.PI + (2 * Math.PI * k) / N;
      const p = heart(t);
      pts.push({
        x: (p.x * 220) + logicalW / 2,
        y: (-p.y * 220) + logicalH / 2,
        a: 0,
        phase: Math.random() * Math.PI * 2
      });
    }

    const swayPeriod = 4000; // align with flower sways
    const draw = (now) => {
      ctx.clearRect(0, 0, logicalW, logicalH);

      const glow = 0.35 + 0.2 * Math.sin((now % swayPeriod) / swayPeriod * Math.PI * 2);
      for (const p of pts) {
        p.a = 0.55 + 0.45 * Math.sin((now / 900) + p.phase); // twinkle
        ctx.beginPath();
        ctx.fillStyle = `rgba(35, 240, 255, ${p.a.toFixed(3)})`;
        ctx.shadowColor = `rgba(57, 198, 214, ${glow.toFixed(3)})`;
        ctx.shadowBlur = 10;
        ctx.arc(p.x, p.y, 1.2 + 0.8 * p.a, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  // Scroll reveal for gallery items
(() => {
  const items = document.querySelectorAll('.gallery .reveal');
  if (!items.length) return;

  const reduced = document.body.classList.contains('reduced-motion');
  if (reduced) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
    }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { root: null, threshold: 0.15 });

  items.forEach((el) => io.observe(el));
})();

});


