// Global nav, turned photos, galleries, glyph fields, the local nav, Ad Agent's rollout, videos, Assemblr's demo, the dashboards' dots and scroll reveals. A module: it loads
// glyphs.js only on pages that have a glyph field. No other dependencies.

const root = document.documentElement;
const desktop = window.matchMedia("(min-width: 834px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Global nav -------------------------------------------------------------- */

function initGlobalNav() {
  const nav = document.querySelector(".gn");
  if (!nav) return;
  const curtain = document.querySelector(".gn-curtain");
  const menuTrigger = nav.querySelector(".gn-menu-trigger");
  const menus = [...nav.querySelectorAll("[data-gn-menu]")].map((item) => ({
    item,
    link: item.querySelector(".gn-link"),
    trigger: item.querySelector(".gn-submenu-trigger"),
    flyout: item.querySelector(".gn-flyout"),
    back: item.querySelector(".gn-back"),
  }));

  let open = null;
  let openTimer = 0;
  let closeTimer = 0;
  let lastPointer = "mouse";

  const clearTimers = () => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
  };

  function show(menu) {
    clearTimers();
    if (open === menu) return;
    if (open) hide({ keepCurtain: true });
    open = menu;
    menu.item.classList.add("is-open");
    menu.trigger.setAttribute("aria-expanded", "true");
    if (desktop.matches) {
      nav.style.setProperty("--gn-flyout-h", `${menu.flyout.offsetHeight}px`);
      root.classList.add("gn-flyout-open");
    }
  }

  function hide({ keepCurtain = false } = {}) {
    clearTimers();
    if (!open) return;
    open.item.classList.remove("is-open");
    open.trigger.setAttribute("aria-expanded", "false");
    open = null;
    if (!keepCurtain) {
      nav.style.setProperty("--gn-flyout-h", "0px");
      root.classList.remove("gn-flyout-open");
    }
  }

  const scheduleClose = (delay = 120) => {
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(hide, delay);
  };

  function setMenuOpen(isOpen) {
    root.classList.toggle("gn-menu-open", isOpen);
    menuTrigger.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) hide();
  }

  nav.addEventListener("pointerdown", (event) => { lastPointer = event.pointerType; });

  for (const menu of menus) {
    // Desktop: hover opens, after a short pause so passing over the bar doesn't flash menus.
    menu.item.addEventListener("pointerenter", (event) => {
      if (!desktop.matches || event.pointerType === "touch") return;
      clearTimeout(closeTimer);
      if (open) show(menu);
      else openTimer = setTimeout(() => show(menu), 120);
    });

    menu.link.addEventListener("click", (event) => {
      // Small screens: the link opens its submenu instead of navigating.
      if (!desktop.matches) {
        event.preventDefault();
        show(menu);
        menu.back.focus();
        return;
      }
      // Touch on a large screen: first tap opens the flyout, second tap follows the link.
      if (lastPointer === "touch" && open !== menu) {
        event.preventDefault();
        show(menu);
      }
    });

    menu.trigger.addEventListener("click", () => {
      if (open === menu) return hide();
      show(menu);
      menu.flyout.querySelector("a")?.focus();
    });

    menu.back.addEventListener("click", () => {
      hide();
      menu.link.focus();
    });

    // Close a keyboard-opened flyout once focus leaves it.
    menu.item.addEventListener("focusout", (event) => {
      if (desktop.matches && open === menu && !menu.item.contains(event.relatedTarget)) hide();
    });
  }

  // Hovering the logo or About closes any flyout, as does leaving the nav.
  for (const item of nav.querySelectorAll(".gn-item:not([data-gn-menu])")) {
    item.addEventListener("pointerenter", (event) => {
      if (desktop.matches && event.pointerType !== "touch" && open) scheduleClose(80);
    });
  }
  nav.addEventListener("pointerleave", (event) => {
    if (desktop.matches && event.pointerType !== "touch") scheduleClose();
  });
  nav.addEventListener("pointerenter", () => clearTimeout(closeTimer));
  curtain?.addEventListener("click", () => hide());

  menuTrigger.addEventListener("click", () => setMenuOpen(!root.classList.contains("gn-menu-open")));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (open) {
      const menu = open;
      hide();
      (desktop.matches ? menu.trigger : menu.link).focus();
    } else if (root.classList.contains("gn-menu-open")) {
      setMenuOpen(false);
      menuTrigger.focus();
    }
  });

  // Moving between the menu and the bar resets everything.
  desktop.addEventListener("change", () => setMenuOpen(false));
  window.addEventListener("pageshow", () => setMenuOpen(false));
}

/* Turned photos ----------------------------------------------------------- */

// A photo turned by --turn (main.css) grows by --cover: just enough that, turned about its middle, it still covers its
// box. Its box is the photo's own (each is placed over the whole of its container), so it is worked out again on resize.
// One given a centre (data-centre, a point of the photo in its own fractions, before it is turned) is placed instead:
// sized to the photo, just big enough turned to cover its container and then --zoom times that, and moved so that point
// sits in the container's middle, as far as the photo's edges allow (--x, --y, --w, --h). Its `sizes` follows, so the
// browser loads a file as wide as the photo is drawn.
function initPhotos() {
  const photos = document.querySelectorAll("img[data-turn]");
  if (!photos.length) return;
  const fit = (img) => {
    const w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    const a = (parseFloat(getComputedStyle(img).getPropertyValue("--turn")) * Math.PI) / 180;
    const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    img.style.setProperty("--cover", Math.max(c + (h / w) * s, (w / h) * s + c).toFixed(4));
  };
  const place = (img) => {
    const w = img.parentElement.clientWidth, h = img.parentElement.clientHeight;
    if (!w || !h) return;
    const style = getComputedStyle(img);
    const t = (parseFloat(style.getPropertyValue("--turn")) * Math.PI) / 180;
    const cos = Math.cos(t), sin = Math.sin(t), c = Math.abs(cos), s = Math.abs(sin);
    const ratio = img.getAttribute("width") / img.getAttribute("height");
    const zoom = Math.max(1, parseFloat(style.getPropertyValue("--zoom")) || 1);
    // Half the container measured along the photo's own sides, and the photo's width that covers it.
    const ex = (c * w + s * h) / 2, ey = (s * w + c * h) / 2;
    const pw = Math.max(2 * ex, 2 * ey * ratio) * zoom, ph = pw / ratio;
    // The centre from the photo's middle, held in so the container stays covered.
    const [fx, fy] = img.dataset.centre.split(/\s+/).map((v) => parseFloat(v) / 100);
    const hold = (v, most) => Math.max(-most, Math.min(most, v));
    const qx = hold((fx - 0.5) * pw, pw / 2 - ex), qy = hold((fy - 0.5) * ph, ph / 2 - ey);
    // The photo's middle, so that the centre, turned with it, lands on the container's.
    const mx = w / 2 - (qx * cos - qy * sin), my = h / 2 - (qx * sin + qy * cos);
    const px = (v) => `${v.toFixed(1)}px`;
    img.style.setProperty("--x", px(mx - pw / 2));
    img.style.setProperty("--y", px(my - ph / 2));
    img.style.setProperty("--w", px(pw));
    img.style.setProperty("--h", px(ph));
    img.style.setProperty("--cover", "1");
    img.sizes = `${Math.ceil(pw)}px`;
  };
  const centred = new Map();
  const observer = new ResizeObserver((entries) =>
    entries.forEach((entry) => (centred.has(entry.target) ? place(centred.get(entry.target)) : fit(entry.target))));
  photos.forEach((img) => {
    if (img.dataset.centre) {
      centred.set(img.parentElement, img);
      observer.observe(img.parentElement);
    } else observer.observe(img);
  });
}

/* Galleries --------------------------------------------------------------- */

function initGalleries() {
  for (const gallery of document.querySelectorAll("[data-gallery]")) {
    const track = gallery.querySelector("[data-gallery-track]");
    const prev = gallery.querySelector("[data-gallery-prev]");
    const next = gallery.querySelector("[data-gallery-next]");
    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.offsetWidth + gap : track.clientWidth;
    };
    const update = () => {
      prev.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };
    const behavior = () => (reducedMotion.matches ? "auto" : "smooth");
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: behavior() }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: behavior() }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }
}

/* Glyph fields ------------------------------------------------------------ */

// Monochrome's glyphs (glyphs.js, from Ad Agent) behind [data-glyphs], loaded only on a page that has one. The
// attribute is a form ("horizon", "globe", "a"), or JSON: a form's name, or the options Ad Agent's tune panel copies
// ({"form":"globe","speed":2,…}). Each runs while it is on screen; off screen it stops and later starts again on the
// same canvas (so the same WebGL context) where it left off.
function initGlyphs() {
  const hosts = document.querySelectorAll("[data-glyphs]");
  if (!hosts.length) return;
  const url = new URL(`./glyphs.js${new URL(import.meta.url).search}`, import.meta.url);
  import(url.href).then(({ startGlyphGlobe, globeDefaults }) => {
    for (const host of hosts) {
      const raw = host.dataset.glyphs;
      const given = /^[{"]/.test(raw) ? JSON.parse(raw) : raw;
      const options = typeof given === "string" ? { form: given } : given;
      const canvas = document.createElement("canvas");
      host.append(canvas);
      const { speed } = { ...globeDefaults(options.form), ...options };
      let globe = null;
      let time = 0;
      let since = 0;
      const start = () => {
        if (globe) return;
        globe = startGlyphGlobe(canvas, { ...options, time });
        since = performance.now();
      };
      const stop = () => {
        if (!globe) return;
        if (!reducedMotion.matches) time += ((performance.now() - since) / 1000) * speed;
        globe.stop();
        globe = null;
      };
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(host);
    }
  });
}

/* Local nav (product pages) ----------------------------------------------- */

// The house tab bar: the section in view underlined, and a progress line across the top of the bar.
function initLocalNav() {
  const nav = document.querySelector(".localnav");
  if (!nav) return;
  const links = [...nav.querySelectorAll('.localnav-links a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  let queued = false;
  const update = () => {
    queued = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    nav.style.setProperty("--progress", scrollable > 0 ? Math.min(1, window.scrollY / scrollable).toFixed(4) : "0");
    const line = nav.getBoundingClientRect().bottom + 48;
    let current = -1;
    targets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) current = i; });
    links.forEach((a, i) => a.classList.toggle("is-current", i === current));
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

/* Rollout (Ad Agent's node view) ------------------------------------------ */

// The run plays once as the view scrolls in (the reveal's .is-visible, main.css); Run plays it again.
function initRollouts() {
  for (const rollout of document.querySelectorAll("[data-rollout]")) {
    rollout.querySelector("[data-rollout-run]")?.addEventListener("click", () => {
      rollout.classList.add("is-resetting");
      rollout.classList.remove("is-visible");
      void rollout.offsetWidth; // apply the planned state at once, without its transitions
      rollout.classList.remove("is-resetting");
      rollout.classList.add("is-visible");
    });
  }
}

/* Videos ------------------------------------------------------------------ */

// The poster links to the video on YouTube; played here, it becomes YouTube's privacy-enhanced player, started.
function initVideos() {
  for (const link of document.querySelectorAll("[data-video]")) {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      const player = document.createElement("iframe");
      player.src = `https://www.youtube-nocookie.com/embed/${link.dataset.video}?autoplay=1&rel=0&playsinline=1`;
      player.title = link.dataset.videoTitle;
      player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      player.allowFullscreen = true;
      player.referrerPolicy = "strict-origin-when-cross-origin";
      link.replaceWith(player);
      player.focus();
    });
  }
}

/* Assemblr's live demo ---------------------------------------------------- */

// The demo (assemblr-demo.js) and the engine it runs load only as the section comes near the screen.
function initDemos() {
  const roots = document.querySelectorAll("[data-assemblr-demo]");
  if (!roots.length) return;
  const url = new URL(`./assemblr-demo.js${new URL(import.meta.url).search}`, import.meta.url);
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      import(url.href).then(({ startDemo }) => startDemo(entry.target)).catch((error) => {
        entry.target.querySelector("[data-demo-status]").textContent = "The demo could not start in this browser.";
        console.error(error);
      });
    }
  }, { rootMargin: "600px 0px" });
  roots.forEach((root) => observer.observe(root));
}

/* A plugin's panel, explained (panel-tour.njk) ---------------------------- */

// The tabs and tiles switch the panel drawn and its notes together; a numbered mark and its note light up together while
// either is under the pointer, and stay lit once either is clicked (the mark scrolls its note into view, and back).
function initPanelTours() {
  // One tab's section at a time: its tiles open their views, and a setting and its note light together.
  for (const root of document.querySelectorAll("[data-panel-tour]")) {
    const all = (selector) => [...root.querySelectorAll(selector)];
    const pickers = all("[data-view]");
    let view = pickers[0]?.dataset.view ?? root.querySelector("[data-view-panel]")?.dataset.viewPanel, held = null;
    const panelOf = () => root.querySelector(`[data-view-panel="${view}"]`);
    const notesOf = () => root.querySelector(`[data-view-notes="${view}"]`);
    const light = (n) => {
      all(".is-lit").forEach((el) => el.classList.remove("is-lit"));
      if (n == null) return;
      panelOf()?.querySelector(`.pt-hot[data-n="${n}"]`)?.classList.add("is-lit");
      panelOf()?.querySelector(`.pt-mark[data-mark="${n}"]`)?.classList.add("is-lit");
      notesOf()?.querySelector(`[data-note="${n}"]`)?.classList.add("is-lit");
    };
    const show = (next) => {
      view = next;
      held = null;
      pickers.forEach((p) => p.setAttribute("aria-pressed", String(p.dataset.view === view)));
      all("[data-view-panel]").forEach((v) => { v.hidden = v.dataset.viewPanel !== view; });
      all("[data-view-notes]").forEach((v) => { v.hidden = v.dataset.viewNotes !== view; });
      light(null);
    };
    pickers.forEach((p) => p.addEventListener("click", () => show(p.dataset.view)));
    const visible = (el) => { const r = el.getBoundingClientRect(); return r.top >= 60 && r.bottom <= innerHeight; };
    const bring = (el) => { if (el && !visible(el)) el.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "auto" : "smooth" }); };
    for (const hot of all(".pt-hot")) {
      const n = hot.dataset.n;
      hot.addEventListener("pointerenter", () => light(n));
      hot.addEventListener("pointerleave", () => light(held));
      const mark = hot.querySelector(".pt-mark");
      mark.addEventListener("focus", () => light(n));
      mark.addEventListener("blur", () => light(held));
      mark.addEventListener("click", () => { held = n; light(n); bring(notesOf()?.querySelector(`[data-note="${n}"]`)); });
    }
    for (const note of all(".pt-note")) {
      const n = note.dataset.note;
      note.addEventListener("pointerenter", () => light(n));
      note.addEventListener("pointerleave", () => light(held));
      note.addEventListener("click", () => { held = n; light(n); bring(panelOf()?.querySelector(`.pt-hot[data-n="${n}"]`)); });
    }
    root.classList.add("is-ready");
  }
}

/* A spread made as you scroll (Automated Assemblr's build.njk) ------------- */

// The spread is held at the top of the window and its steps scroll up under it. The step that has risen past the
// middle of the half under the spread is the current one: the frame gets s1 … sN for every step reached, the step
// is-current, and the spread's caption its number and its `data-cap`. Scrolling back takes them off again.
function initBuilds() {
  for (const root of document.querySelectorAll("[data-build]")) {
    const frame = root.querySelector(".cb-frame"), stage = root.querySelector(".cb-stage");
    const steps = [...root.querySelectorAll("[data-step]")];
    const capN = root.querySelector(".cb-cap-n"), capT = root.querySelector(".cb-cap-t");
    let at = -1, queued = false;
    const update = () => {
      queued = false;
      const below = stage.getBoundingClientRect().bottom;
      const line = below + (innerHeight - below) * 0.45;
      let n = 0;
      steps.forEach((s) => { if (s.getBoundingClientRect().top <= line) n = Number(s.dataset.step); });
      if (n === at) return;
      at = n;
      for (let k = 1; k < steps.length; k++) frame.classList.toggle(`s${k}`, k <= n);
      steps.forEach((s) => s.classList.toggle("is-current", Number(s.dataset.step) === n));
      capN.textContent = String(n).padStart(2, "0");
      capT.textContent = steps.find((s) => Number(s.dataset.step) === n)?.dataset.cap ?? "";
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", queue);
    update();
    root.classList.add("is-ready");
  }
}

/* Ad Agent's journey ------------------------------------------------------- */

// partials/ad-journey.njk: the app's window held under the local nav while its steps scroll past behind it. The step
// whose top has passed the middle of the screen is the one shown: each part of the window in or out by its `data-in`
// and `data-out`, its classes by `data-st` ("4:made 12:dim", "-made" off), the root `s1`…`sN` up to the step; then
// the camera moves and scales the window (1440 × 900) to frame what the step's `data-cam` names, and a ring is drawn
// round each of its `data-hl` (a selector's matches as one box). The window's own coordinates are measured from the
// screen through its current transform, so a camera still moving measures the same.
function initJourney() {
  for (const root of document.querySelectorAll("[data-journey]")) {
    const view = root.querySelector(".aj-view"), win = root.querySelector(".aj-win"), hls = root.querySelector(".aj-hls");
    const WW = win.offsetWidth, WH = win.offsetHeight;
    const steps = [...root.querySelectorAll(".aj-step")];
    const parts = [...win.querySelectorAll("[data-in], [data-out]")].map((el) => ({
      el, from: el.dataset.in != null ? Number(el.dataset.in) : -Infinity, to: el.dataset.out != null ? Number(el.dataset.out) : Infinity,
    }));
    const staged = [...win.querySelectorAll("[data-st]")].map((el) => ({
      el, rules: el.dataset.st.trim().split(/\s+/).map((t) => { const [k, c] = t.split(":"); return { k: Number(k), c }; }).sort((a, b) => a.k - b.k),
    }));
    const capK = root.querySelector(".aj-cap-k"), capT = root.querySelector(".aj-cap-t"), capX = root.querySelector(".aj-cap-x");
    const capBody = root.querySelector(".aj-cap-body"), dots = [...root.querySelectorAll(".aj-dots i")];
    let at = -1, cam = null, queued = false;

    // A selector's matches as one box, in the window's coordinates.
    const boxOf = (sel) => {
      if (sel === "all") return { x: 0, y: 0, w: WW, h: WH };
      const els = [...win.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
      if (!els.length) return null;
      const wr = win.getBoundingClientRect(), s = wr.width / WW;
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      for (const e of els) {
        const r = e.getBoundingClientRect();
        // A card (or a chat turn) still sliding in: measured where it lands, not where it is mid-slide, or its
        // highlight is left off centre by the slide (cards come in from 14px aside).
        const slide = e.closest(".aj-card, .aj-turn");
        const m = slide ? new DOMMatrixReadOnly(getComputedStyle(slide).transform === "none" ? undefined : getComputedStyle(slide).transform) : null;
        const dx = m ? m.e : 0, dy = m ? m.f : 0;
        x1 = Math.min(x1, (r.left - wr.left) / s - dx); y1 = Math.min(y1, (r.top - wr.top) / s - dy);
        x2 = Math.max(x2, (r.right - wr.left) / s - dx); y2 = Math.max(y2, (r.bottom - wr.top) / s - dy);
      }
      return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    };
    // The camera: the box framed with a margin, no further in than 2.2× (or 6× the whole window's fit), the window
    // kept over the view's edges when it is bigger than the view.
    const place = () => {
      if (!cam) return;
      const VW = view.clientWidth, VH = view.clientHeight, fit = Math.min(VW / WW, VH / WH), pad = 26;
      let s = Math.min(VW / (cam.w + 2 * pad), VH / (cam.h + 2 * pad));
      s = Math.max(fit, Math.min(s, fit * 6, 2.2));
      const ww = WW * s, wh = WH * s;
      let tx = VW / 2 - (cam.x + cam.w / 2) * s, ty = VH / 2 - (cam.y + cam.h / 2) * s;
      tx = ww <= VW ? (VW - ww) / 2 : Math.min(0, Math.max(VW - ww, tx));
      ty = wh <= VH ? (VH - wh) / 2 : Math.min(0, Math.max(VH - wh, ty));
      win.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
      win.style.setProperty("--inv", (1 / s).toFixed(3));
    };
    const show = (n) => {
      root.dataset.at = String(n);
      for (let k = 1; k < steps.length; k++) root.classList.toggle(`s${k}`, k <= n);
      for (const p of parts) p.el.classList.toggle("is-on", n >= p.from && n < p.to);
      for (const { el, rules } of staged) {
        const on = new Set();
        for (const r of rules) {
          if (r.k > n) break;
          if (r.c.startsWith("-")) on.delete(r.c.slice(1)); else on.add(r.c);
        }
        for (const r of rules) { const c = r.c.replace(/^-/, ""); el.classList.toggle(c, on.has(c)); }
      }
      const step = steps[n];
      capK.textContent = String(n + 1).padStart(2, "0");
      capT.textContent = step.querySelector("h3").textContent;
      capX.innerHTML = step.querySelector("p").innerHTML;
      capBody.classList.remove("is-new"); void capBody.offsetWidth; capBody.classList.add("is-new");
      dots.forEach((d, k) => { d.classList.toggle("is-past", k < n); d.classList.toggle("is-now", k === n); });
      // A phone's camera (`data-mcam`) frames less, so what it shows can be read.
      const framing = (view.clientWidth < 600 && step.dataset.mcam) || step.dataset.cam;
      cam = framing.split(",").map((s) => boxOf(s.trim())).filter(Boolean).reduce((a, b) => (a ? {
        x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y),
      } : b), null) || boxOf("all");
      place();
      hls.replaceChildren(...JSON.parse(step.dataset.hl || "[]").map((sel) => {
        const b = boxOf(sel);
        if (!b) return null;
        const ring = document.createElement("span");
        ring.className = "aj-hl";
        Object.assign(ring.style, { left: `${b.x - 6}px`, top: `${b.y - 6}px`, width: `${b.w + 12}px`, height: `${b.h + 12}px` });
        return ring;
      }).filter(Boolean));
    };
    const update = () => {
      queued = false;
      const line = innerHeight * 0.5;
      let n = 0;
      steps.forEach((s, i) => { if (s.getBoundingClientRect().top <= line) n = i; });
      if (n !== at) { at = n; show(n); }
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", () => { place(); queue(); });
    new ResizeObserver(place).observe(view);
    update();
    root.classList.add("is-ready");
  }
}

/* Scroll reveal ----------------------------------------------------------- */

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  items.forEach((el) => observer.observe(el));
}

/* A plugin's live job ------------------------------------------------------ */

// Bloom's bloom (live-job.njk). One mark is open at a time: on hover or focus, of the mark or its chip in the filter
// bar, or held by a click or a tap (a tap elsewhere or Escape lets it go). An open mark is lit, its chip too, its value
// and label print in the readout, and its popup opens beside it, inside the job. The bloom freezes while one is held,
// as it does under the pointer, and its marks fade in as the job comes into view.
function initLiveJobs() {
  for (const root of document.querySelectorAll("[data-live-job]")) {
    const get = (attr, id) => root.querySelector(`[${attr}="${id}"]`);
    const value = root.querySelector("[data-readout-value]"), type = root.querySelector("[data-readout-type]");
    const idle = [value.textContent, type.textContent];
    let held = null;

    const place = (mark, pop) => {
      const box = root.getBoundingClientRect(), r = mark.getBoundingClientRect();
      const w = pop.offsetWidth, h = pop.offsetHeight, gap = 16, pad = 12;
      const cx = r.left + r.width / 2 - box.left, cy = r.top + r.height / 2 - box.top;
      let x, y;
      if (box.width < 560) {
        // A phone: under the mark, or over it in the lower half.
        x = Math.min(Math.max(cx - w / 2, pad), box.width - w - pad);
        y = cy < box.height / 2 ? cy + gap : cy - gap - h;
      } else {
        x = cx < box.width / 2 ? cx + gap : cx - gap - w;
        y = Math.min(Math.max(cy - h / 2, pad), box.height - h - pad);
      }
      pop.style.setProperty("--px", `${Math.round(x)}px`);
      pop.style.setProperty("--py", `${Math.round(y)}px`);
    };
    const light = (id) => {
      for (const el of root.querySelectorAll(".is-lit, .is-open")) el.classList.remove("is-lit", "is-open");
      root.classList.toggle("is-held", held != null);
      if (id == null) { [value.textContent, type.textContent] = idle; return; }
      const mark = get("data-mark", id), pop = get("data-pop", id);
      mark.classList.add("is-lit");
      get("data-chip", id).classList.add("is-lit");
      value.textContent = pop.querySelector(".lj-pop-value")?.textContent ?? "";
      type.textContent = pop.querySelector(".lj-pop-type").textContent;
      place(mark, pop);
      pop.classList.add("is-open");
    };
    const settle = () => light(held);
    const hold = (id) => { held = held === id ? null : id; light(held ?? id); };

    for (const el of root.querySelectorAll("[data-mark], [data-chip]")) {
      const id = el.dataset.mark ?? el.dataset.chip;
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") light(id); });
      el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") settle(); });
      el.addEventListener("focus", () => light(id));
      el.addEventListener("blur", settle);
      el.addEventListener("click", () => hold(id));
      // The marks are SVG groups with role="button": Enter and Space press them, as a button's would.
      if (el.dataset.mark != null) el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hold(id); } });
    }
    document.addEventListener("pointerdown", (e) => { if (held != null && !e.target.closest("[data-mark], [data-chip]")) { held = null; settle(); } });
    root.addEventListener("keydown", (e) => { if (e.key === "Escape") { held = null; settle(); } });
    window.addEventListener("resize", () => { const id = held ?? root.querySelector(".bl-mark.is-lit")?.dataset.mark; if (id != null) light(id); });

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      root.classList.add("is-scanning");
    }, { threshold: 0.3 });
    io.observe(root);
  }
}

/* Dashboards (Studio Tools) ------------------------------------------------ */

// A dashboard's widgets, each a link to its entry beside the window (partials/dashboard.njk): rolling over one, or a click, shows that entry
// and hides the others, the widget outlined; the first widget's is shown to begin with. Without script every entry
// shows and each tile jumps to its own.
function initDashboardDetails() {
  for (const root of document.querySelectorAll(".sd")) {
    const details = [...root.querySelectorAll("[data-detail]")];
    const links = [...root.querySelectorAll(".sd-window a.widget")];
    if (!details.length || !links.length) continue;
    const show = (id) => {
      details.forEach((d) => { d.hidden = d.id !== id; });
      links.forEach((a) => {
        const on = a.getAttribute("href") === `#${id}`;
        a.classList.toggle("is-active", on);
        a.toggleAttribute("aria-current", on);
      });
    };
    for (const a of links) {
      // Rolling over a widget (or tabbing to it) shows its entry; it stays until another is picked, so moving the
      // pointer off the window to read it does not lose it. A tap or click still opens it, for touch.
      const open = () => { const id = a.getAttribute("href").slice(1); if (details.some((d) => d.id === id)) show(id); };
      a.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") open(); });
      a.addEventListener("focus", open);
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        if (!details.some((d) => d.id === id)) return;
        e.preventDefault();
        show(id);
      });
    }
    // A link to a widget's entry (#widget-template) opens on it; otherwise the first widget's.
    const wanted = location.hash.slice(1);
    show(details.some((d) => d.id === wanted) ? wanted : links[0].getAttribute("href").slice(1));
  }
}

// The dots that drift behind the Creatives card, as the plugin paints them (monocode.campaign-manager
// bloom/src/ui/overviewHero.js _startOvDots and _paintOvDots, src/ui/shared/math.js _valueNoise2D): a cloud thickest
// towards the bottom right, each dot a point, a ring, a cross or a stroke by the noise under it, grey or one of the
// plugin's colours. Seeded, so it is the same cloud on every visit; repainted every 50ms while in view, once with
// reduced motion. The card is 192px square in the plugin, and the cloud is worked out at that size however big it is drawn.
function initDashboards() {
  const canvases = document.querySelectorAll("[data-ov-dots]");
  if (!canvases.length) return;
  const noise = (seed) => {
    const hash = (ix, iy) => {
      let n = (ix * 374761393 + iy * 668265263 + seed * 1013904223) >>> 0;
      n = n ^ (n >>> 13); n = (n * 1274126177) >>> 0; n = (n ^ (n >>> 16)) >>> 0;
      return n / 4294967295;
    };
    const sm = (t) => t * t * (3 - 2 * t), lp = (a, b, t) => a + (b - a) * t;
    const oct = (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), tx = sm(x - x0), ty = sm(y - y0);
      return lp(lp(hash(x0, y0), hash(x0 + 1, y0), tx), lp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), tx), ty);
    };
    return (x, y) => 0.65 * oct(x, y) + 0.35 * oct(x * 2.3 + 11.7, y * 2.3 + 5.1);
  };
  const PALETTE = ["#f07000", "#ff8fb3", "#3a9d6b", "#3d7bd6", "#e8b53a", "#9b59c8"];
  const S = 192, seed = 520117, nShape = noise(81233), nTint = noise(44021), step = 5, r = 1.4;
  const hash = (x, y, k) => {
    let n = ((x * 73856093) ^ (y * 19349663) ^ (((seed + k * 40503) >>> 0) * 83492791)) >>> 0;
    n = n ^ (n >>> 13); n = (n * 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const paint = (canvas, t) => {
    const px = Math.round(canvas.getBoundingClientRect().width * (window.devicePixelRatio || 1));
    if (!px) return;
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(px / S, 0, 0, px / S, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const sxo = t * 0.015, syo = t * 0.009, txo = t * 0.012;
    ctx.lineWidth = 0.75;
    for (let gy = 0; gy < S; gy += step) {
      for (let gx = 0; gx < S; gx += step) {
        const pr = Math.max(0, Math.min(1, (gx / S) * 0.7 + 0.3 * (gy / S) - 0.15));
        if (pr <= 0.002) continue;
        const s = nShape(gx / 72 + sxo, gy / 72 + syo) * 0.82 + hash(gx, gy, 7) * 0.18;
        if (s < Math.max(0.3, 1 - pr)) continue;
        let col;
        if (nTint(gx / 90 + txo, gy / 90) > 0.62 && hash(gx, gy, 3) < 0.35) col = PALETTE[Math.floor(hash(gx, gy, 9) * PALETTE.length) % PALETTE.length];
        else { const g = Math.floor(hash(gx, gy, 2) * 128); col = `rgb(${g},${g},${g})`; }
        ctx.strokeStyle = col; ctx.fillStyle = col;
        if (s < 0.52) ctx.fillRect(gx, gy, 1, 1);
        else {
          ctx.beginPath();
          if (s < 0.7) ctx.arc(gx + 0.5, gy + 0.5, r, 0, Math.PI * 2);
          else if (s < 0.85) { ctx.moveTo(gx - r, gy - r); ctx.lineTo(gx + r, gy + r); ctx.moveTo(gx - r, gy + r); ctx.lineTo(gx + r, gy - r); }
          else { ctx.moveTo(gx - r, gy - r); ctx.lineTo(gx + r, gy + r); }
          ctx.stroke();
        }
      }
    }
  };
  for (const canvas of canvases) {
    let raf = 0, last = -1e9;
    const t0 = performance.now();
    const frame = (now) => {
      if (now - last >= 50) { last = now; paint(canvas, (now - t0) / 1000); }
      raf = requestAnimationFrame(frame);
    };
    paint(canvas, 0);
    if (reducedMotion.matches) continue;
    new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (entry.isIntersecting) raf = requestAnimationFrame(frame);
    }).observe(canvas);
  }
}

initGlobalNav();
initPhotos();
initGalleries();
initGlyphs();
initLocalNav();
initRollouts();
initVideos();
initDemos();
initPanelTours();
initBuilds();
initJourney();
initLiveJobs();
initDashboards();
initDashboardDetails();
initReveal();
