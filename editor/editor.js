(() => {
  const CARD_W = 1200;
  const CARD_H = 600;
  const BTN_H = 56;
  const BTN_GAP = 10;
  const PAD_Y = 14;
  const PAD_X = 20;
  const PAD_B = 14;
  const RADIUS = 16;
  const STROKE = 3;
  const FONT_PX = 30;
  const ACCENT = "#1d9bf0";
  const EXPORT_SCALE = 2;
  const STORE = "quiz-card-v1";

  const defaults = [
    "Post #DemocraticParty",
    "Post #RepublicanParty",
    "Post #MarioParty",
    "Post #Other",
  ];

  const DEMO = [
    "demo/left-democrat.jpg",
    "demo/center-republican.jpg",
    "demo/right-mario.jpg",
  ];

  const state = {
    images: [null, null, null, null],
    choices: loadChoices(),
  };

  const panelsEl = document.getElementById("panels");
  const pollEl = document.getElementById("poll");
  const cardEl = document.getElementById("card");
  const scalerEl = document.getElementById("scaler");
  const stageEl = document.getElementById("stage");
  const exportBtn = document.getElementById("export");

  function loadChoices() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "null");
      if (Array.isArray(raw) && raw.length >= 1 && raw.length <= 4) {
        return raw.map((s) => String(s));
      }
    } catch (_) {}
    return defaults.slice(0, 3);
  }

  function persist() {
    localStorage.setItem(STORE, JSON.stringify(state.choices));
  }

  function fitStage() {
    const pad = 24;
    const avail = Math.max(240, window.innerWidth - pad);
    const s = Math.min(1, avail / CARD_W);
    cardEl.style.transform = s === 1 ? "" : `scale(${s})`;
    scalerEl.style.width = `${CARD_W * s}px`;
    scalerEl.style.height = `${cardEl.offsetHeight * s}px`;
  }

  function renderPoll() {
    pollEl.innerHTML = "";
    state.choices.forEach((text, i) => {
      const row = document.createElement("div");
      row.className = "choice";
      row.role = "button";
      row.tabIndex = 0;
      row.dataset.index = String(i);

      const label = document.createElement("span");
      label.className = "choice-label";
      label.contentEditable = "true";
      label.spellcheck = false;
      label.dataset.placeholder = "Choice";
      label.textContent = text;

      label.addEventListener("input", () => {
        state.choices[i] = label.textContent.replace(/\s*\n+\s*/g, " ").trimEnd();
        persist();
      });
      label.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          label.blur();
        }
      });
      label.addEventListener("paste", (e) => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData("text");
        document.execCommand("insertText", false, t.replace(/\s+/g, " "));
      });

      row.appendChild(label);
      pollEl.appendChild(row);
    });

    document.querySelectorAll(".seg[data-count]").forEach((b) => {
      b.classList.toggle("is-on", Number(b.dataset.count) === state.choices.length);
    });
    renderPanels();
    layoutCard();
  }

  function setCount(n, save) {
    n = Math.max(1, Math.min(4, n));
    while (state.choices.length < n) {
      state.choices.push(defaults[state.choices.length] || `Post #Choice${state.choices.length + 1}`);
    }
    if (!state.choices[n - 1] || !state.choices[n - 1].trim()) {
      state.choices[n - 1] = defaults[n - 1] || `Post #Choice${n}`;
    }
    state.choices.length = n;
    if (save !== false) persist();
    renderPoll();
  }

  function loadFile(file, slot) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const prev = state.images[slot];
      if (prev && prev.url) URL.revokeObjectURL(prev.url);
      state.images[slot] = { url, img, name: file.name };
      paintSlot(slot);
    };
    img.src = url;
  }

  function paintSlot(slot) {
    const el = panelsEl.querySelector(`[data-slot="${slot}"]`);
    if (!el) return;
    const data = state.images[slot];
    el.querySelector("img")?.remove();
    el.querySelector(".clear")?.remove();
    if (!data) {
      el.classList.remove("is-filled");
      return;
    }
    const image = document.createElement("img");
    image.alt = "";
    image.src = data.url;
    el.appendChild(image);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "clear";
    clear.setAttribute("aria-label", "Remove image");
    clear.textContent = "×";
    clear.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (data.url.startsWith("blob:")) URL.revokeObjectURL(data.url);
      state.images[slot] = null;
      paintSlot(slot);
    });
    el.appendChild(clear);
    el.classList.add("is-filled");
  }

  function bindPanel(panel) {
    const slot = Number(panel.dataset.slot);
    const input = panel.querySelector('input[type="file"]');
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (file) loadFile(file, slot);
      input.value = "";
    });
    panel.addEventListener("dragenter", (e) => {
      e.preventDefault();
      panel.classList.add("is-over");
    });
    panel.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    panel.addEventListener("dragleave", () => panel.classList.remove("is-over"));
    panel.addEventListener("drop", (e) => {
      e.preventDefault();
      panel.classList.remove("is-over");
      filesToSlots(e.dataTransfer.files, slot);
    });
  }

  function renderPanels() {
    const n = state.choices.length;
    panelsEl.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const panel = document.createElement("label");
      panel.className = "panel";
      panel.dataset.slot = String(i);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.hidden = true;
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = String(i + 1);
      panel.append(input, hint);
      bindPanel(panel);
      panelsEl.appendChild(panel);
      paintSlot(i);
    }
  }

  function filesToSlots(files, start) {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    const n = state.choices.length;
    images.forEach((file, i) => {
      const slot = start + i;
      if (slot < n) loadFile(file, slot);
    });
  }

  cardEl.addEventListener("dragover", (e) => e.preventDefault());
  cardEl.addEventListener("drop", (e) => {
    if (e.target.closest(".panel")) return;
    e.preventDefault();
    filesToSlots(e.dataTransfer.files, 0);
  });

  document.querySelectorAll(".seg[data-count]").forEach((b) => {
    b.addEventListener("click", () => setCount(Number(b.dataset.count), true));
  });

  function quizHeight() {
    const n = state.choices.length;
    return PAD_Y + n * BTN_H + (n - 1) * BTN_GAP + PAD_B;
  }

  function memeHeight() {
    return CARD_H - quizHeight();
  }

  function layoutCard() {
    cardEl.style.setProperty("--meme-h", `${memeHeight()}px`);
    cardEl.style.setProperty("--quiz-h", `${quizHeight()}px`);
    cardEl.style.setProperty("--panel-count", String(state.choices.length));
    fitStage();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function drawContained(ctx, img, x, y, w, h) {
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  async function renderCanvas() {
    await document.fonts.ready;
    const n = state.choices.length;
    const memeH = memeHeight();
    const scale = EXPORT_SCALE;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(CARD_W * scale);
    canvas.height = Math.round(CARD_H * scale);
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    ctx.fillStyle = "#000";
    roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, CARD_W, CARD_H, RADIUS);
    ctx.clip();

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CARD_W, memeH);

    const slotW = CARD_W / n;
    for (let i = 0; i < n; i++) {
      const data = state.images[i];
      if (data && data.img) drawContained(ctx, data.img, i * slotW, 0, slotW, memeH);
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(0, memeH, CARD_W, CARD_H - memeH);

    ctx.strokeStyle = ACCENT;
    ctx.fillStyle = ACCENT;
    ctx.lineWidth = STROKE;
    ctx.font = `700 ${FONT_PX}px TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < n; i++) {
      const y = memeH + PAD_Y + i * (BTN_H + BTN_GAP);
      const x = PAD_X;
      const w = CARD_W - PAD_X * 2;
      roundRect(ctx, x + STROKE / 2, y + STROKE / 2, w - STROKE, BTN_H - STROKE, 999);
      ctx.stroke();
      const label = (state.choices[i] || "").trim();
      if (label) ctx.fillText(label, CARD_W / 2, y + BTN_H / 2, w * 0.92);
    }

    ctx.restore();
    return canvas;
  }

  async function exportPng() {
    exportBtn.classList.add("is-busy");
    try {
      const canvas = await renderCanvas();
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "quiz-card.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      exportBtn.classList.remove("is-busy");
    }
  }

  exportBtn.addEventListener("click", () => exportPng());
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      exportPng();
    }
  });

  function loadDemo() {
    return Promise.all(
      DEMO.map(
        (src, slot) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              state.images[slot] = { url: src, img, name: src };
              paintSlot(slot);
              resolve();
            };
            img.onerror = resolve;
            img.src = src;
          })
      )
    );
  }

  new ResizeObserver(fitStage).observe(stageEl);
  window.addEventListener("resize", fitStage);

  const params = new URLSearchParams(location.search);
  const nParam = Number(params.get("n"));
  if (nParam >= 1 && nParam <= 4) setCount(nParam, false);
  else renderPoll();
  fitStage();

  loadDemo();
})();
