(() => {
  "use strict";

  const shell = document.getElementById("presentation");
  const slides = Array.from(document.querySelectorAll(".slide"));
  const currentLabel = document.getElementById("current-slide");
  const totalLabel = document.getElementById("total-slides");
  const progressBar = document.getElementById("progress-bar");
  const previousButton = document.getElementById("previous-button");
  const nextButton = document.getElementById("next-button");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const evidenceButton = document.getElementById("evidence-button");
  const overviewButton = document.getElementById("overview-button");
  const evidenceDrawer = document.getElementById("evidence-drawer");
  const indexDrawer = document.getElementById("index-drawer");
  const drawerScrim = document.getElementById("drawer-scrim");
  const evidenceContent = document.getElementById("evidence-content");
  const evidenceSlideTitle = document.getElementById("evidence-slide-title");
  const slideIndex = document.getElementById("slide-index");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let current = 0;
  let activeDrawer = null;
  let drawerTrigger = null;
  let pointerStart = null;
  let chartFrame = 0;

  const pad = (number) => String(number).padStart(2, "0");

  function indexFromLocation() {
    const match = window.location.hash.match(/^#slide-(\d+)$/);
    if (!match) return 0;
    return Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1));
  }

  function buildIndex() {
    const fragment = document.createDocumentFragment();
    slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.slideTarget = String(index);
      button.innerHTML = `<span>${pad(index + 1)}</span><span>${slide.dataset.title}</span>`;
      button.addEventListener("click", () => {
        goTo(index);
        closeDrawer();
      });
      fragment.appendChild(button);
    });
    slideIndex.appendChild(fragment);
  }

  function goTo(index, options = {}) {
    const nextIndex = Math.min(slides.length - 1, Math.max(0, index));
    if (nextIndex === current && options.force !== true) return;

    slides.forEach((slide, slideIndexValue) => {
      const isActive = slideIndexValue === nextIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    current = nextIndex;
    const slideNumber = current + 1;
    currentLabel.textContent = pad(slideNumber);
    totalLabel.textContent = pad(slides.length);
    progressBar.style.transform = `scaleX(${slideNumber / slides.length})`;
    previousButton.disabled = current === 0;
    nextButton.disabled = current === slides.length - 1;
    document.title = `${pad(slideNumber)} · ${slides[current].dataset.title} | Tourifye`;

    document.querySelectorAll("[data-slide-target]").forEach((button) => {
      button.setAttribute("aria-current", String(Number(button.dataset.slideTarget) === current));
    });

    if (activeDrawer === evidenceDrawer) populateEvidence();

    const nextHash = `#slide-${slideNumber}`;
    if (window.location.hash !== nextHash) {
      history.replaceState({ slide: slideNumber }, "", nextHash);
    }

    if (slideNumber === 5) {
      window.setTimeout(() => drawTourismChart(!prefersReducedMotion.matches), 90);
    }
  }

  function next() {
    goTo(current + 1);
  }

  function previous() {
    goTo(current - 1);
  }

  function populateEvidence() {
    const source = slides[current].querySelector(".slide__sources");
    evidenceSlideTitle.textContent = `${pad(current + 1)} · ${slides[current].dataset.title}`;
    evidenceContent.replaceChildren();
    if (!source) {
      evidenceContent.textContent = "No source note is attached to this scene.";
      return;
    }

    const content = source.cloneNode(true);
    content.classList.remove("slide__sources");
    content.querySelectorAll("a").forEach((link) => {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
    evidenceContent.append(...content.childNodes);
  }

  function openDrawer(drawer, trigger) {
    if (activeDrawer && activeDrawer !== drawer) {
      activeDrawer.classList.remove("is-open");
      activeDrawer.setAttribute("aria-hidden", "true");
      activeDrawer.inert = true;
    }

    if (drawer === evidenceDrawer) populateEvidence();
    activeDrawer = drawer;
    drawerTrigger = trigger || document.activeElement;
    drawer.inert = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    drawerScrim.classList.add("is-open");
    drawerScrim.setAttribute("aria-hidden", "false");
    drawer.querySelector(".drawer__close")?.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!activeDrawer) return;
    activeDrawer.classList.remove("is-open");
    activeDrawer.setAttribute("aria-hidden", "true");
    activeDrawer.inert = true;
    drawerScrim.classList.remove("is-open");
    drawerScrim.setAttribute("aria-hidden", "true");
    const previousTrigger = drawerTrigger;
    activeDrawer = null;
    drawerTrigger = null;
    previousTrigger?.focus?.({ preventScroll: true });
  }

  function toggleDrawer(drawer, trigger) {
    if (activeDrawer === drawer) closeDrawer();
    else openDrawer(drawer, trigger);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Fullscreen can be blocked by an embedded preview; the deck remains usable.
    }
  }

  function drawTourismChart(animate = false) {
    const canvas = document.getElementById("tourism-canvas");
    if (!canvas || !canvas.isConnected) return;

    cancelAnimationFrame(chartFrame);
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const labels = ["2019", "2020", "2021", "2022", "2023", "2024"];
    const values = [621.131, 181.518, 135.186, 529.268, 655.451, 660];
    const width = bounds.width;
    const height = bounds.height;
    const inset = { top: 18, right: 32, bottom: 34, left: 44 };
    const chartWidth = width - inset.left - inset.right;
    const chartHeight = height - inset.top - inset.bottom;
    const max = 700;

    const pointAt = (value, index) => ({
      x: inset.left + (chartWidth * index) / (values.length - 1),
      y: inset.top + chartHeight - (value / max) * chartHeight,
    });

    function render(progress) {
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.font = `${Math.max(10, width * .015)}px Inter, sans-serif`;

      for (let tick = 0; tick <= max; tick += 100) {
        const y = inset.top + chartHeight - (tick / max) * chartHeight;
        context.strokeStyle = "rgba(157,176,187,.20)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(inset.left, y);
        context.lineTo(width - inset.right, y);
        context.stroke();
        context.fillStyle = "rgba(157,176,187,.72)";
        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillText(String(tick), inset.left - 10, y);
      }

      labels.forEach((label, index) => {
        const { x } = pointAt(values[index], index);
        context.fillStyle = "rgba(157,176,187,.82)";
        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillText(label, x, height - inset.bottom + 12);
      });

      const visibleSegments = (values.length - 1) * progress;
      const completeSegments = Math.floor(visibleSegments);
      const partial = visibleSegments - completeSegments;
      const visiblePoints = values.map(pointAt);
      const linePoints = visiblePoints.slice(0, Math.min(values.length, completeSegments + 1));
      if (completeSegments < values.length - 1 && linePoints.length) {
        const start = visiblePoints[completeSegments];
        const end = visiblePoints[completeSegments + 1];
        linePoints.push({
          x: start.x + (end.x - start.x) * partial,
          y: start.y + (end.y - start.y) * partial,
        });
      }

      if (linePoints.length > 1) {
        const area = context.createLinearGradient(0, inset.top, 0, height - inset.bottom);
        area.addColorStop(0, "rgba(0,174,239,.25)");
        area.addColorStop(1, "rgba(0,174,239,0)");
        context.beginPath();
        context.moveTo(linePoints[0].x, height - inset.bottom);
        linePoints.forEach((point) => context.lineTo(point.x, point.y));
        context.lineTo(linePoints[linePoints.length - 1].x, height - inset.bottom);
        context.closePath();
        context.fillStyle = area;
        context.fill();

        context.beginPath();
        linePoints.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.strokeStyle = "#00aeef";
        context.lineWidth = 3;
        context.stroke();
      }

      visiblePoints.forEach((point, index) => {
        const pointProgress = Math.min(1, Math.max(0, visibleSegments - index + 1));
        if (pointProgress <= 0) return;
        context.beginPath();
        context.arc(point.x, point.y, index === values.length - 1 ? 5.5: 4, 0, Math.PI * 2);
        context.fillStyle = index === values.length - 1 ? "#face1c": "#071523";
        context.fill();
        context.lineWidth = 2.5;
        context.strokeStyle = index === values.length - 1 ? "#face1c": "#8addf2";
        context.stroke();
      });

      if (progress >= .99) {
        const first = visiblePoints[0];
        const last = visiblePoints[visiblePoints.length - 1];
        context.font = `700 ${Math.max(11, width * .016)}px Inter, sans-serif`;
        context.textBaseline = "bottom";
        context.textAlign = "center";
        context.fillStyle = "#8addf2";
        context.fillText("621k", first.x, first.y - 10);
        context.fillStyle = "#face1c";
        context.fillText("660k", last.x, last.y - 10);
      }
    }

    if (!animate) {
      render(1);
      return;
    }

    const start = performance.now();
    const duration = 1100;
    const animateFrame = (time) => {
      const raw = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      render(eased);
      if (raw < 1) chartFrame = requestAnimationFrame(animateFrame);
    };
    chartFrame = requestAnimationFrame(animateFrame);
  }

  previousButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  evidenceButton.addEventListener("click", () => toggleDrawer(evidenceDrawer, evidenceButton));
  overviewButton.addEventListener("click", () => toggleDrawer(indexDrawer, overviewButton));
  drawerScrim.addEventListener("click", closeDrawer);
  document.querySelectorAll("[data-close-drawer]").forEach((button) => button.addEventListener("click", closeDrawer));

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const isTyping = /input|textarea|select/i.test(document.activeElement?.tagName || "");
    if (isTyping) return;

    if (key === "escape" && activeDrawer) {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (key === "s") {
      event.preventDefault();
      toggleDrawer(evidenceDrawer, evidenceButton);
      return;
    }

    if (key === "o") {
      event.preventDefault();
      toggleDrawer(indexDrawer, overviewButton);
      return;
    }

    if (key === "f") {
      event.preventDefault();
      toggleFullscreen();
      return;
    }

    if (key === "p") {
      event.preventDefault();
      drawTourismChart(false);
      window.print();
      return;
    }

    if (activeDrawer) return;

    if (["arrowright", "arrowdown", "pagedown"].includes(key) || event.key === " ") {
      event.preventDefault();
      next();
    } else if (["arrowleft", "arrowup", "pageup"].includes(key)) {
      event.preventDefault();
      previous();
    } else if (key === "home") {
      event.preventDefault();
      goTo(0);
    } else if (key === "end") {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  });

  shell.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, a, .drawer")) return;
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  });

  shell.addEventListener("pointerup", (event) => {
    if (!pointerStart || activeDrawer) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const elapsed = performance.now() - pointerStart.time;
    pointerStart = null;
    if (elapsed > 900 || Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    if (deltaX < 0) next();
    else previous();
  });

  window.addEventListener("hashchange", () => goTo(indexFromLocation(), { force: true }));
  window.addEventListener("resize", () => {
    if (current === 4) drawTourismChart(false);
  }, { passive: true });
  window.addEventListener("beforeprint", () => drawTourismChart(false));

  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.setAttribute("aria-label", document.fullscreenElement ? "Exit fullscreen": "Enter fullscreen");
  });

  buildIndex();
  current = indexFromLocation();
  goTo(current, { force: true });
})();
