/* AtomAI front-end behaviour — no backend/Flask logic here. */
(function () {
  "use strict";

  /* -------------------------------------------------------------
     1. Mobile navigation
     ------------------------------------------------------------- */
  const navToggle = document.getElementById("navToggle");
  const navLinksEl = document.getElementById("navLinks");
  function setNav(open) {
    if (!navToggle || !navLinksEl) return;
    navLinksEl.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (navToggle && navLinksEl) {
    navToggle.addEventListener("click", () => setNav(!navLinksEl.classList.contains("is-open")));
    navLinksEl.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setNav(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
    window.addEventListener("resize", () => { if (window.innerWidth > 920) setNav(false); });
  }


  /* -------------------------------------------------------------
     1b. Theme switch (light / dark) + Material Families menu
     ------------------------------------------------------------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeToggle");
  function applyTheme(theme, animate) {
    root.setAttribute("data-theme", theme);
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      themeBtn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
    try { localStorage.setItem("atomai-theme", theme); } catch (e) {}
  }
  if (themeBtn) {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);
    themeBtn.addEventListener("click", () =>
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true)
    );
  }

  const families = document.getElementById("families");
  const familiesBtn = document.getElementById("familiesBtn");
  function setFamilies(open) {
    if (!families || !familiesBtn) return;
    families.classList.toggle("is-open", open);
    familiesBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (families && familiesBtn) {
    familiesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      setFamilies(!families.classList.contains("is-open"));
    });
    document.addEventListener("click", (e) => { if (!families.contains(e.target)) setFamilies(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && families.classList.contains("is-open")) { setFamilies(false); familiesBtn.focus(); }
    });
  }

  /* -------------------------------------------------------------
     2. Scrollspy — highlight the active nav link
     ------------------------------------------------------------- */
  const navLinks = Array.from(document.querySelectorAll(".nav__links a[data-nav]"));
  const spyTargets = [];
  navLinks.forEach((link) => {
    const key = link.dataset.nav;
    if (key === "top") {
      document.querySelectorAll(".hero, .stats").forEach((el) => spyTargets.push([el, "top"]));
    } else {
      const el = document.getElementById(key);
      if (el) spyTargets.push([el, key]);
    }
  });
  if (spyTargets.length && "IntersectionObserver" in window) {
    const keyFor = new Map(spyTargets);
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = keyFor.get(entry.target);
          navLinks.forEach((l) => l.classList.toggle("active", l.dataset.nav === key));
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    spyTargets.forEach(([el]) => spy.observe(el));
  }


  /* -------------------------------------------------------------
     2b. Scroll reveal (once per element) + timeline node tracking
     ------------------------------------------------------------- */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  function showEl(el, delay) {
    el.style.setProperty("--d", delay + "ms");
    el.classList.add("is-visible");
    // after the entrance finishes, hand transitions back to the hover system
    setTimeout(() => el.classList.add("is-done"), 700 + delay);
  }
  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealEls.forEach((el) => showEl(el, 0));
  } else {
    const revealIO = new IntersectionObserver(
      (entries) => {
        const batch = entries.filter((en) => en.isIntersecting)
          .sort((a, b) => (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        batch.forEach((en, i) => {
          showEl(en.target, Math.min(i, 5) * 100);
          revealIO.unobserve(en.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => revealIO.observe(el));
  }

  // Vision timeline: draw the line once, light up each node as its milestone arrives
  const timeline = document.querySelector(".zigzag--vision");
  if (timeline) {
    if (!("IntersectionObserver" in window) || reduceMotion) {
      timeline.classList.add("is-visible");
      timeline.querySelectorAll(".zz__node").forEach((n) => n.classList.add("is-active"));
    } else {
      const lineIO = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { timeline.classList.add("is-visible"); lineIO.disconnect(); }
      }, { threshold: 0.15 });
      lineIO.observe(timeline);
      const nodeIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const node = en.target.querySelector(".zz__node");
          if (node) node.classList.add("is-active");
          nodeIO.unobserve(en.target);
        });
      }, { threshold: 0.5 });
      timeline.querySelectorAll(".zz").forEach((z) => nodeIO.observe(z));
    }
  }

  /* -------------------------------------------------------------
     3. Chemical notation helpers
     ------------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }
  // "Sr2NiWO6" -> Sr<sub>2</sub>NiWO<sub>6</sub>
  function chem(str) {
    return escapeHtml(str).replace(/(\d+)/g, "<sub>$1</sub>");
  }
  // "Bi3+" -> Bi<sup>3+</sup>
  const formatIons = (scope) => {
    scope.querySelectorAll(".ion").forEach((el) => {
      const raw = el.dataset.ion || el.textContent.trim();
      const m = raw.match(/^([A-Za-z]+)(\d+)([+-])$/);
      if (m) el.innerHTML = `${m[1]}<sup>${m[2]}${m[3]}</sup>`;
    });
  };
  formatIons(document);

  function fmtNum(v, digits) {
    return typeof v === "number" && !Number.isNaN(v) ? v.toFixed(digits) : "\u2014";
  }
  // Compact display of a stored numeric string (max 4 decimals); data is unchanged.
  function sci(v) {
    const n = parseFloat(v);
    if (Number.isNaN(n)) return "\u2014";
    const t = n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    return t === "" || t === "-0" ? "0" : t;
  }

  /* -------------------------------------------------------------
     4. Formula search — AJAX on the same Flask route ("/"),
        falls back to a normal submit if fetch fails.
     ------------------------------------------------------------- */
  const form = document.getElementById("searchForm");
  const resultsWrapper = document.getElementById("resultsWrapper");
  const searchBtn = document.getElementById("searchBtn");

  if (form && resultsWrapper) {
    form.querySelectorAll("input").forEach((i) =>
      i.addEventListener("input", () => i.classList.remove("is-invalid"))
    );

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Client-side validation: all four sites are required.
      const empty = Array.from(form.querySelectorAll("input[required]")).filter((i) => !i.value.trim());
      form.querySelectorAll("input[required]").forEach((i) => i.classList.toggle("is-invalid", !i.value.trim()));
      if (empty.length) {
        resultsWrapper.innerHTML =
          '<div class="notice notice--error"><strong>Missing elements.</strong><p>Please provide all four site elements (A, A\u2032, B, B\u2032).</p></div>';
        empty[0].focus();
        return;
      }

      document.activeElement && document.activeElement.blur();
      const originalLabel = searchBtn.textContent;
      searchBtn.disabled = true;
      searchBtn.textContent = "Searching\u2026";

      try {
        const response = await fetch(form.action || window.location.pathname, {
          method: "POST",
          body: new FormData(form),
        });
        const html = await response.text();
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const newResults = parsed.getElementById("resultsWrapper");
        if (newResults) resultsWrapper.innerHTML = newResults.innerHTML;

        // Reflect server-side normalisation (capitalisation) in the inputs.
        parsed.querySelectorAll("#searchForm input").forEach((input) => {
          const local = form.querySelector("#" + input.id);
          if (local) local.value = input.value;
        });
        formatIons(resultsWrapper);
      } catch (err) {
        form.submit();
      } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = originalLabel;
      }
    });
  }

  /* -------------------------------------------------------------
     5. Material detail renderer (modal) — mirrors the Jinja markup
     ------------------------------------------------------------- */
  const SITE_LABELS = ["A", "A\u2032", "B", "B\u2032"];

  function renderMaterialDetailHTML(m) {
    const atomsRow = (m.atoms || [])
      .map((a) => `<span class="ion" data-ion="${escapeHtml(a.Atom_Key)}">${escapeHtml(a.Atom_Key)}</span>`)
      .join("");

    const atomRows = (m.atoms || [])
      .map(
        (a, i) => `
        <tr>
          <td class="t-left t-site">${SITE_LABELS[i] || ""}</td>
          <td class="t-left"><span class="ion" data-ion="${escapeHtml(a.Atom_Key)}">${escapeHtml(a.Atom_Key)}</span></td>
          <td>${sci(a.radii)}</td>
          <td>${sci(a.Electronegativity)}</td>
          <td>${sci(a.Ionization_Energy)}</td>
          <td>${sci(a.Electron_Affinity)}</td>
          <td>${sci(a.Atomic_Volume)}</td>
          <td>${sci(a.HOMO)}</td>
          <td>${sci(a.LUMO)}</td>
          <td>${escapeHtml(a.Group)}</td>
          <td>${escapeHtml(a.Period)}</td>
          <td>${sci(a.Thermal_Conductivity)}</td>
        </tr>`
      )
      .join("");

    const pattern = m.dpo_type_pattern
      ? `<span class="result__pattern">${chem(m.dpo_type_pattern)}</span>`
      : "";
    const typeLabel = escapeHtml((m.dpo_type_label || "").replace(/\s+/g, "-"));

    const confidence =
      m.mean_confidence != null
        ? `<div class="metric"><dt>Confidence</dt><dd>${fmtNum(m.mean_confidence * 100, 1)}<small>%</small></dd></div>`
        : "";

    return `
      <div class="result__header">
        <div>
          <p class="result__type">${typeLabel} DPO ${pattern}</p>
          <h3 class="formula">${chem(m.Formula)}</h3>
        </div>
        <div class="badges">
          <span class="badge ${m.stable ? "badge--stable" : "badge--unstable"}">${m.stable ? "Stable" : "Unstable"}</span>
          <span class="badge ${m.Material_Status === "Known" ? "badge--known" : "badge--predicted"}">${m.Material_Status === "Known" ? "Known" : "Predicted by ML"}</span>
        </div>
      </div>
      <dl class="metrics">
        <div class="metric metric--wide"><dt>Formula with oxidation state</dt><dd class="ion-row">${atomsRow}</dd></div>
        <div class="metric"><dt>Tolerance factor</dt><dd>${fmtNum(m.tolerance_factor, 4)}</dd></div>
        <div class="metric"><dt>Octahedral factor</dt><dd>${fmtNum(m.mu, 4)}</dd></div>
        <div class="metric"><dt>Band gap</dt><dd>${fmtNum(m.Band_Gap, 4)}<small>eV</small></dd></div>
        ${confidence}
      </dl>
      <h4 class="atoms-title">Ionic composition</h4>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>
            <th class="t-left">Site</th><th class="t-left">Ion</th><th>Radius (\u00c5)</th><th>Electronegativity</th>
            <th>Ionization energy (kJ/mol)</th><th>Electron affinity (kJ/mol)</th><th>Atomic volume (cm\u00b3/mol)</th>
            <th>HOMO (eV)</th><th>LUMO (eV)</th><th>Group</th><th>Period</th><th>Thermal cond. (W/m\u00b7K)</th>
          </tr></thead>
          <tbody>${atomRows}</tbody>
        </table>
      </div>`;
  }

  const modalOverlay = document.getElementById("materialModalOverlay");
  const modalBody = document.getElementById("materialModalBody");
  const modalClose = document.getElementById("materialModalClose");

  function openMaterialModal(material) {
    if (!modalOverlay || !modalBody) return;
    modalBody.innerHTML = renderMaterialDetailHTML(material);
    formatIons(modalBody);
    modalOverlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modalClose && modalClose.focus();
  }
  function closeMaterialModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  if (modalClose) modalClose.addEventListener("click", closeMaterialModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeMaterialModal(); });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMaterialModal(); });

  /* -------------------------------------------------------------
     6. Property-search results table (sort + paginate)
     ------------------------------------------------------------- */
  const TABLE_COLUMNS = [
    { key: "Formula", label: "Formula", type: "string" },
    { key: "dpo_type_label", label: "DPO Type", type: "string" },
    { key: "Band_Gap", label: "Band Gap (eV)", type: "number" },
    { key: "tolerance_factor", label: "Tolerance Factor", type: "number" },
    { key: "mu", label: "\u03bc", type: "number" },
    { key: "stable", label: "Stability", type: "bool" },
    { key: "Material_Status", label: "Status", type: "string" },
    { key: "mean_confidence", label: "Confidence", type: "number" },
  ];
  const PAGE_SIZE = 25;

  function createResultsTable(container, emptyMessage) {
    const state = { all: [], filtered: [], sortKey: "Formula", sortDir: "asc", page: 1, searched: false, application: null };

    function applySort() {
      state.filtered = state.all.slice();
      const col = TABLE_COLUMNS.find((c) => c.key === state.sortKey);
      const dir = state.sortDir === "asc" ? 1 : -1;
      state.filtered.sort((a, b) => {
        let av = a[state.sortKey];
        let bv = b[state.sortKey];
        if (col && col.type === "number") {
          av = typeof av === "number" ? av : -Infinity;
          bv = typeof bv === "number" ? bv : -Infinity;
          return (av - bv) * dir;
        }
        if (col && col.type === "bool") return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
        av = String(av || "").toLowerCase();
        bv = String(bv || "").toLowerCase();
        return av.localeCompare(bv) * dir;
      });
      state.page = 1;
      render();
    }

    function renderRow(m) {
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      tr.innerHTML = `
        <td>${chem(m.Formula)}</td>
        <td>${escapeHtml(m.dpo_type_label)}</td>
        <td>${fmtNum(m.Band_Gap, 4)}</td>
        <td>${fmtNum(m.tolerance_factor, 4)}</td>
        <td>${fmtNum(m.mu, 4)}</td>
        <td>${m.stable ? "Stable" : "Unstable"}</td>
        <td>${escapeHtml(m.Material_Status)}</td>
        <td>${m.mean_confidence != null ? fmtNum(m.mean_confidence * 100, 1) + "%" : "\u2014"}</td>`;
      tr.addEventListener("click", () => openMaterialModal(m));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter") openMaterialModal(m); });
      return tr;
    }

    function render() {
      if (!state.all.length) {
        container.innerHTML = state.searched
          ? '<div class="notice notice--empty"><strong>No matches</strong><p>No Double Perovskite materials were found in that range. Try different search criteria.</p></div>'
          : `<div class="notice notice--empty"><strong>No results yet</strong><p>${emptyMessage}</p></div>`;
        return;
      }

      const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
      state.page = Math.min(state.page, totalPages);
      const start = (state.page - 1) * PAGE_SIZE;
      const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

      const theadCells = TABLE_COLUMNS.map((c) => {
        const isSorted = state.sortKey === c.key;
        const arrow = isSorted ? (state.sortDir === "asc" ? "\u25b2" : "\u25bc") : "\u25b2";
        return `<th data-key="${c.key}" class="${isSorted ? "is-sorted" : ""}">${c.label}<span class="sort-arrow">${arrow}</span></th>`;
      }).join("");

      const appNote = state.application ? `<span>Application: ${escapeHtml(state.application)}</span>` : "";

      container.innerHTML = `
        <div class="table-toolbar">
          <span class="table-toolbar__count"><strong>${state.filtered.length.toLocaleString()}</strong> material${state.filtered.length === 1 ? "" : "s"} found</span>
          ${appNote}
        </div>
        <div class="ion-table-wrap">
          <table class="ion-table"><thead><tr>${theadCells}</tr></thead><tbody></tbody></table>
        </div>
        <div class="pagination">
          <button type="button" data-page="prev" ${state.page <= 1 ? "disabled" : ""}>&larr; Prev</button>
          <span>Page ${state.page} of ${totalPages}</span>
          <button type="button" data-page="next" ${state.page >= totalPages ? "disabled" : ""}>Next &rarr;</button>
        </div>`;

      const tbody = container.querySelector(".ion-table tbody");
      pageItems.forEach((m) => tbody.appendChild(renderRow(m)));

      container.querySelectorAll(".ion-table thead th").forEach((th) => {
        th.addEventListener("click", () => {
          const key = th.dataset.key;
          if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
          else { state.sortKey = key; state.sortDir = "asc"; }
          applySort();
        });
      });
      const prevBtn = container.querySelector('[data-page="prev"]');
      const nextBtn = container.querySelector('[data-page="next"]');
      if (prevBtn) prevBtn.addEventListener("click", () => { state.page -= 1; render(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { state.page += 1; render(); });
    }

    return {
      setResults(materials, application) {
        state.all = materials || [];
        state.application = application || null;
        state.searched = true;
        applySort();
      },
      showMessage(html) { container.innerHTML = html; },
    };
  }

  /* -------------------------------------------------------------
     7. Band-gap property search — POST /api/band-gap-search
     ------------------------------------------------------------- */
  const bgResultsWrapper = document.getElementById("bgResultsWrapper");
  const bgSearchBtn = document.getElementById("bgSearchBtn");
  if (bgResultsWrapper && bgSearchBtn) {
    const bgTable = createResultsTable(
      bgResultsWrapper,
      "Select an application and enter material properties to explore matching compositions."
    );
    const bgStatusToggle = document.getElementById("bgStatusToggle");
    const bgMin = document.getElementById("bgMin");
    const bgMax = document.getElementById("bgMax");

    function selectedApplication() {
      const r = document.querySelector('#applicationChoice input[name="application"]:checked');
      return r ? r.value : null;
    }

    async function runBandGapSearch() {
      const min = parseFloat(bgMin.value);
      const max = parseFloat(bgMax.value);
      bgMin.classList.toggle("is-invalid", Number.isNaN(min));
      bgMax.classList.toggle("is-invalid", Number.isNaN(max));
      if (Number.isNaN(min) || Number.isNaN(max)) {
        bgTable.showMessage(
          '<div class="notice notice--error"><strong>Missing values.</strong><p>Please provide both a minimum and maximum band gap.</p></div>'
        );
        return;
      }
      const originalLabel = bgSearchBtn.textContent;
      bgSearchBtn.disabled = true;
      bgSearchBtn.textContent = "Searching\u2026";
      try {
        const statuses = bgStatusToggle
          ? Array.from(bgStatusToggle.querySelectorAll(".segmented__btn.is-active")).map((b) => b.dataset.status)
          : [];
        const application = selectedApplication();
        const res = await fetch("/api/band-gap-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ min, max, statuses, application }),
        });
        const data = await res.json();
        if (data.error) {
          bgTable.showMessage(`<div class="notice notice--error"><strong>Search failed.</strong><p>${escapeHtml(data.error)}</p></div>`);
        } else {
          bgTable.setResults(data.materials, data.application);
        }
      } catch (err) {
        bgTable.showMessage('<div class="notice notice--error"><strong>Network error.</strong><p>Please try again.</p></div>');
      } finally {
        bgSearchBtn.disabled = false;
        bgSearchBtn.textContent = originalLabel;
      }
    }

    [bgMin, bgMax].forEach((el) => {
      el.addEventListener("input", () => el.classList.remove("is-invalid"));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") runBandGapSearch(); });
    });

    if (bgStatusToggle) {
      bgStatusToggle.querySelectorAll(".segmented__btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const on = btn.classList.toggle("is-active");
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          // Re-run automatically once a range is entered.
          if (bgMin.value !== "" && bgMax.value !== "") runBandGapSearch();
        });
      });
    }

    bgSearchBtn.addEventListener("click", runBandGapSearch);
  }
})();
