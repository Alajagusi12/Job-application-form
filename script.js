(() => {
  "use strict";
  // Leave "" for demo mode, or set "http://127.0.0.1:5000/apply" (app.py) or a Formspree URL.
  const ENDPOINT = "";
  const DRAFT = "tw.pro.draft", THEME = "tw.pro.theme";
  const $ = (id) => document.getElementById(id), $$ = (s) => [...document.querySelectorAll(s)];
  const form = $("applyForm"), steps = $$(".step"), dots = $$(".dot");
  const stepRules = [["full-name", "email", "tel"], ["position", "experience", "startDate", "salary"], ["skills", "linkedin", "portfolio", "cv"], ["message", "agreement"]];
  const textIds = ["full-name", "email", "tel", "experience", "startDate", "salary", "linkedin", "portfolio", "message"];
  let cur = 0, skills = [];

  const val = (id) => $(id).value.trim();
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const urlOk = (v) => { try { return /^https?:$/.test(new URL(v).protocol); } catch { return false; } };
  const link = (id) => () => !val(id) || urlOk(val(id)) || "Enter a full link starting with https://";
  $("startDate").min = today();

  const rules = {
    "full-name": () => val("full-name").split(/\s+/).filter(Boolean).length >= 2 || "Enter your first and last name",
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email")) || "Enter a valid email address",
    tel: () => { const v = val("tel"), d = v.replace(/\D/g, ""); return (d.length >= 10 && d.length <= 15 && /^[+\d][\d\s()-]*$/.test(v)) || "Enter a valid phone number"; },
    position: () => !!form.querySelector("input[name=position]:checked") || "Choose a role",
    experience: () => { const v = $("experience").value; return (v !== "" && +v >= 0 && +v <= 50) || "Enter a number from 0 to 50"; },
    startDate: () => (!!$("startDate").value && $("startDate").value >= today()) || "Pick a date from today onward",
    salary: () => !val("salary") || +val("salary") > 0 || "Enter a positive number",
    skills: () => skills.length >= 1 || "Add at least one skill",
    linkedin: link("linkedin"), portfolio: link("portfolio"),
    cv: () => {
      const f = $("cv").files[0];
      if (!f) return "Upload your CV";
      if (!/\.(pdf|docx?)$/i.test(f.name)) return "Use a PDF, DOC or DOCX file";
      return f.size <= 5 * 1024 * 1024 || "File must be under 5 MB";
    },
    message: () => val("message").length >= 30 || "Write at least 30 characters",
    agreement: () => $("agreement").checked || "Please confirm to continue"
  };

  function validate(rule) {
    const res = rules[rule](), ok = res === true, box = form.querySelector(`[data-rule="${rule}"]`);
    box.classList.toggle("invalid", !ok);
    box.querySelector(".error").textContent = ok ? "" : res;
    return ok;
  }
  const validateStep = (n) => stepRules[n].map(validate).every(Boolean);

  function go(n) {
    cur = n;
    steps.forEach((s, i) => (s.hidden = i !== n));
    dots.forEach((d, i) => { d.classList.toggle("active", i === n); d.classList.toggle("done", i < n); });
    $("barFill").style.width = ((n + 1) / steps.length) * 100 + "%";
    $("backBtn").hidden = n === 0;
    $("nextBtn").hidden = n === steps.length - 1;
    $("submitBtn").hidden = n !== steps.length - 1;
    if (n === steps.length - 1) buildReview();
    const first = steps[n].querySelector("input:not([type=hidden]),select,textarea"); if (first && n !== 1) first.focus({ preventScroll: true });
  }

  function buildReview() {
    const dl = $("review"); dl.innerHTML = "";
    const pos = form.querySelector("input[name=position]:checked"), f = $("cv").files[0];
    [["Name", val("full-name")], ["Email", val("email")], ["Phone", val("tel")], ["Role", pos ? pos.value : "-"],
     ["Experience", val("experience") + " yr(s)"], ["Available", val("startDate")], ["Work style", $("mode").value],
     ["Skills", skills.join(", ")], ["CV", f ? f.name : "-"]].forEach(([k, v]) => {
      const row = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = k; dd.textContent = v; row.append(dt, dd); dl.appendChild(row);
    });
  }

  // Skill chips
  function renderChips() {
    const box = $("chips"); box.innerHTML = "";
    skills.forEach((s, i) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = s + " ✕";
      b.setAttribute("aria-label", "Remove " + s);
      b.addEventListener("click", () => { skills.splice(i, 1); renderChips(); saveDraft(); });
      box.appendChild(b);
    });
    $("skillsValue").value = skills.join(", ");
  }
  function addSkill(raw) {
    const v = raw.trim().replace(/,+$/, "").slice(0, 30);
    if (v && skills.length < 10 && !skills.some((s) => s.toLowerCase() === v.toLowerCase())) { skills.push(v); renderChips(); saveDraft(); }
    $("skillInput").value = "";
    if ($("skillsValue").closest(".field").classList.contains("invalid")) validate("skills");
  }
  $("skillInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(e.target.value); }
    if (e.key === "Backspace" && !e.target.value && skills.length) { skills.pop(); renderChips(); saveDraft(); }
  });
  $("skillInput").addEventListener("blur", (e) => { if (e.target.value.trim()) addSkill(e.target.value); });

  // Navigation + live validation
  $("nextBtn").addEventListener("click", () => { if (validateStep(cur)) go(cur + 1); });
  $("backBtn").addEventListener("click", () => go(cur - 1));
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !/TEXTAREA|BUTTON/.test(e.target.tagName) && e.target.id !== "skillInput" && cur < steps.length - 1) { e.preventDefault(); $("nextBtn").click(); }
  });
  const recheck = (e) => { const b = e.target.closest(".field"); if (b && b.dataset.rule && b.classList.contains("invalid")) validate(b.dataset.rule); };
  form.addEventListener("input", (e) => {
    recheck(e); if (e.target.id === "message") $("counter").textContent = `${e.target.value.length} / 600`; saveDraft();
  });
  form.addEventListener("change", (e) => { recheck(e); saveDraft(); });
  form.addEventListener("blur", (e) => { const b = e.target.closest && e.target.closest(".field"); if (b && b.dataset.rule && e.target.value && e.target.type !== "radio") validate(b.dataset.rule); }, true);
  $("cv").addEventListener("change", () => {
    const f = $("cv").files[0];
    $("drop").classList.toggle("has", !!f && rules.cv() === true);
    $("fileInfo").textContent = f ? `${f.name} · ${(f.size / 1024).toFixed(0)} KB` : "PDF, DOC or DOCX · max 5 MB";
    validate("cv"); meter();
  });
  ["dragenter", "dragover"].forEach((t) => $("drop").addEventListener(t, () => $("drop").classList.add("over")));
  ["dragleave", "drop"].forEach((t) => $("drop").addEventListener(t, () => $("drop").classList.remove("over")));

  // Draft autosave (files cannot be stored)
  const SCORE = [["full-name", 10, "Add your full name"], ["email", 10, "Add your email"], ["tel", 10, "Add your phone number"],
    ["position", 10, "Choose a role"], ["experience", 5, "Enter your experience"], ["startDate", 5, "Pick your start date"],
    ["cv", 15, "Upload your CV"], ["linkedin", 5, "Add your LinkedIn link"], ["portfolio", 5, "Add a GitHub or portfolio link"], ["message", 10, "Write your message"]];
  function meter() {
    let pts = 0, tip = "";
    SCORE.forEach(([r, w, t]) => {
      const ok = rules[r]() === true && (r !== "linkedin" && r !== "portfolio" || !!val(r));
      if (ok) pts += w; else if (!tip) tip = `${t} (+${w})`;
    });
    const sk = Math.min(skills.length, 5) * 3; pts += sk;
    if (sk < 15 && !tip) tip = `Add more skills (+${15 - sk})`;
    $("mPct").textContent = pts + "%";
    $("mFg").style.strokeDashoffset = 113.1 * (1 - pts / 100);
    $("mLabel").textContent = pts < 40 ? "Getting started" : pts < 75 ? "Looking good" : pts < 100 ? "Strong application" : "Outstanding";
    $("mTip").textContent = pts === 100 ? "Ready to submit. Great work!" : tip || "Keep going.";
  }
  function saveDraft() {
    meter();
    const pos = form.querySelector("input[name=position]:checked");
    try { localStorage.setItem(DRAFT, JSON.stringify({ t: Object.fromEntries(textIds.map((id) => [id, $(id).value])), skills, pos: pos && pos.value, mode: $("mode").value })); } catch {}
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || "null"); if (!d) return;
      textIds.forEach((id) => { if (d.t[id]) $(id).value = d.t[id]; });
      skills = Array.isArray(d.skills) ? d.skills.slice(0, 10) : []; renderChips();
      if (d.pos) { const r = [...form.querySelectorAll("input[name=position]")].find((x) => x.value === d.pos); if (r) r.checked = true; }
      if (d.mode) $("mode").value = d.mode;
      $("counter").textContent = `${$("message").value.length} / 600`;
    } catch {}
  }

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    for (let n = 0; n < steps.length; n++) if (!validateStep(n)) return go(n);
    const btn = $("submitBtn"); btn.disabled = true; btn.textContent = "Submitting…";
    try {
      let ref = "TW-" + Date.now().toString(36).toUpperCase();
      if (ENDPOINT) {
        const res = await fetch(ENDPOINT, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Server error");
        const data = await res.json().catch(() => ({})); if (data.ref) ref = data.ref;
      } else await new Promise((r) => setTimeout(r, 900));
      $("sName").textContent = val("full-name").split(/\s+/)[0]; $("sRef").textContent = ref;
      $("formCard").hidden = true; $("success").hidden = false; window.scrollTo({ top: 0, behavior: "smooth" });
      try { localStorage.removeItem(DRAFT); } catch {}
    } catch { alert("Sorry, we could not send your application. Please check your connection and try again."); }
    finally { btn.disabled = false; btn.textContent = "Submit Application →"; }
  });
  $("copyBtn").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("sRef").textContent); $("copyBtn").textContent = "Copied ✓"; } catch {} });
  $("printBtn").addEventListener("click", () => window.print());
  $("againBtn").addEventListener("click", () => {
    form.reset(); skills = []; renderChips(); $("drop").classList.remove("has"); $("fileInfo").textContent = "PDF, DOC or DOCX · max 5 MB";
    $("counter").textContent = "0 / 600"; meter(); $("copyBtn").textContent = "Copy reference";
    $("success").hidden = true; $("formCard").hidden = false; go(0);
  });

  // Theme
  function theme(t) { document.documentElement.dataset.theme = t; $("themeBtn").textContent = t === "dark" ? "☀️" : "🌙"; try { localStorage.setItem(THEME, t); } catch {} }
  let saved = null; try { saved = localStorage.getItem(THEME); } catch {}
  theme(saved || "dark");
  $("themeBtn").addEventListener("click", () => theme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

  loadDraft(); meter(); go(0);
})();