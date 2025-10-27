/*  Ascensão — Dicas & Orientações
 *  Mantém o mesmo comportamento do Fundação:
 *  - Drip de dicas lendo window.DATA_DICAS (JSON)
 *  - Tabs únicas controladas por JS (sem fallback inline)
 *  - Karvonen (208 - 0.7*idade) com tabela de zonas
 *  - TMB (Mifflin-St Jeor) + necessidade calórica com FA
 */

(function () {
  "use strict";

  // ---------- Utilidades ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const fmt = (n, d = 0) => Number(n).toFixed(d);
  const storageKey = (k) => `evo360:${window.NIVEL || "ascensao"}:${k}`;

  // Cache-bust para JSON (evita stale)
  const jsonURL = (() => {
    const base = window.DATA_DICAS || "../../data/ascensao.json";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}cb=${Date.now()}`;
  })();

  // ---------- DRIP de Dicas ----------
  let dicas = [];
  let idx = 0;

  async function loadDicas() {
    try {
      const res = await fetch(jsonURL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("JSON não é array");
      dicas = data;
      // Recupera progresso local se existir
      const saved = localStorage.getItem(storageKey("dicaIndex"));
      idx = saved ? clamp(parseInt(saved, 10), 0, dicas.length - 1) : 0;
      renderDica();
    } catch (err) {
      console.error("[Dicas] Falha ao carregar JSON:", err);
      $("#dicaTexto").textContent = "Não consegui carregar as dicas agora. Verifica o caminho do JSON.";
      $("#dicaMeta").textContent = String(err);
    }
  }

  function renderDica() {
    if (!dicas.length) return;
    const item = dicas[idx];
    $("#dicaTexto").textContent = item?.texto || "—";
    $("#dicaIndex").textContent = `${idx + 1}/${dicas.length}`;
    $("#dicaMeta").textContent = item?.tag ? `Tema: ${item.tag}` : "";
    localStorage.setItem(storageKey("dicaIndex"), String(idx));
  }

  function bindDrip() {
    $("#btnPrev")?.addEventListener("click", () => {
      if (!dicas.length) return;
      idx = (idx - 1 + dicas.length) % dicas.length;
      renderDica();
    });
    $("#btnNext")?.addEventListener("click", () => {
      if (!dicas.length) return;
      idx = (idx + 1) % dicas.length;
      renderDica();
    });
  }

  // ---------- Tabs ----------
  function bindTabs() {
    const buttons = $$(".tab-btn");
    const panels = $$(".tab-panel");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetSel = btn.getAttribute("data-tab-target");
        if (!targetSel) return;

        // desmarca tudo
        buttons.forEach((b) => b.setAttribute("aria-selected", "false"));
        panels.forEach((p) => p.classList.remove("active"));

        // ativa atual
        btn.setAttribute("aria-selected", "true");
        const panel = $(targetSel);
        panel?.classList.add("active");
      });
    });
  }

  // ---------- Karvonen ----------
  function fcMax208(age) {
    return 208 - 0.7 * age;
  }

  function karvonen(age, fcr, intensity) {
    const fmax = fcMax208(age);
    return ((fmax - fcr) * intensity) + fcr;
  }

  function renderKarvonenTable(age, fcr) {
    const table = $("#k_table");
    const out = $("#k_out");
    const tbody = $("#k_table tbody");

    const zonas = [
      { nome: "Recuperação", i0: 0.50, i1: 0.60 },
      { nome: "Aeróbio leve", i0: 0.60, i1: 0.70 },
      { nome: "Aeróbio moderado", i0: 0.70, i1: 0.80 },
      { nome: "Limiar/forte", i0: 0.80, i1: 0.90 },
      { nome: "Alta intensidade", i0: 0.90, i1: 0.95 },
    ];

    const fmax = fcMax208(age);
    out.style.display = "block";
    out.innerHTML = `FC<sub>máx</sub> estimada: <b>${fmt(fmax, 0)} bpm</b>`;

    tbody.innerHTML = zonas.map(z => {
      const lo = karvonen(age, fcr, z.i0);
      const hi = karvonen(age, fcr, z.i1);
      return `<tr>
        <td>${z.nome}</td>
        <td>${fmt(z.i0*100,0)}–${fmt(z.i1*100,0)}%</td>
        <td>${fmt(lo,0)}–${fmt(hi,0)} bpm</td>
      </tr>`;
    }).join("");

    table.style.display = "table";
  }

  function bindKarvonen() {
    const idade = $("#k_idade");
    const fcr = $("#k_fcr");
    const btn = $("#k_calcBtn");
    const clr = $("#k_clearBtn");
    const table = $("#k_table");
    const out = $("#k_out");

    btn?.addEventListener("click", () => {
      const a = clamp(parseInt(idade.value, 10), 10, 90);
      const r = clamp(parseInt(fcr.value, 10), 30, 120);
      if (Number.isNaN(a) || Number.isNaN(r)) return;
      renderKarvonenTable(a, r);
    });

    clr?.addEventListener("click", () => {
      idade.value = "";
      fcr.value = "";
      table.style.display = "none";
      out.style.display = "none";
      $("#k_table tbody").innerHTML = "";
    });
  }

  // ---------- TMB ----------
  function tmbMifflin({ sexo, peso, altura, idade }) {
    // peso(kg), altura(cm), idade(anos)
    const base = 10 * peso + 6.25 * altura - 5 * idade;
    return sexo === "M" ? base + 5 : base - 161;
  }

  function bindTMB() {
    const sexo = $("#t_sexo");
    const idade = $("#t_idade");
    const altura = $("#t_altura");
    const peso = $("#t_peso");
    const atv = $("#t_atividade");
    const btn = $("#t_calcBtn");
    const clr = $("#t_clearBtn");
    const out = $("#t_out");

    btn?.addEventListener("click", () => {
      const s = sexo.value;
      const i = clamp(parseInt(idade.value, 10), 10, 90);
      const h = clamp(parseFloat(altura.value), 120, 250);
      const p = clamp(parseFloat(peso.value), 30, 250);
      const fa = parseFloat(atv.value || "1.2");

      if ([s,i,h,p,fa].some(v => Number.isNaN(v))) return;

      const tmb = tmbMifflin({ sexo: s, peso: p, altura: h, idade: i });
      const tdee = tmb * fa;

      out.style.display = "block";
      out.innerHTML = `
        <b>TMB</b>: ${fmt(tmb,0)} kcal/dia<br/>
        <b>Necessidade estimada (com atividade)</b>: ${fmt(tdee,0)} kcal/dia
      `;
    });

    clr?.addEventListener("click", () => {
      sexo.value = "F";
      idade.value = "";
      altura.value = "";
      peso.value = "";
      atv.value = "1.2";
      out.style.display = "none";
      out.innerHTML = "";
    });
  }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    bindDrip();
    bindTabs();
    bindKarvonen();
    bindTMB();
    loadDicas();
  });
})();