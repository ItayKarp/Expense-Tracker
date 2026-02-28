// ── STATISTICS.JS ─────────────────────────────────────────
// Handles loading and rendering the statistics view.

import { apiFetchStatistics } from "./api.js";
import { switchView }         from "./ui.js";

async function loadStatistics() {
    const contentEl = document.getElementById("statistics-content");
    contentEl.textContent = "> LOADING STATISTICS...";

    try {
        const { response, data } = await apiFetchStatistics();

        if (response.ok) {
            contentEl.innerHTML = `<pre style="font-size:11px;color:#555;letter-spacing:0.03em;line-height:1.7">${JSON.stringify(data, null, 2)}</pre>`;
        } else {
            contentEl.textContent = `> ERR: ${data.detail || "FAILED TO LOAD"}`.toUpperCase();
        }
    } catch {
        contentEl.textContent = "> ERR: CONNECTION FAILED";
    }
}

export function initStatistics() {
    document.addEventListener("click", (e) => {
        const sideBtn = e.target.closest(".sidebar-btn");
        if (sideBtn?.dataset.view === "statistics-view") {
            switchView("statistics-view");
            loadStatistics();
        }
    });
}