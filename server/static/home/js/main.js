// ── MAIN.JS ───────────────────────────────────────────────
// Entry point. Imports and initialises every module.
// Nothing lives here except the wiring.

import { initAuth }       from "./auth.js";
import { initExpenses }   from "./expenses.js";
import { initStatistics } from "./statistics.js";
import { initModals }     from "./modals.js";
import { initProfile } from "./profile.js";

document.addEventListener("DOMContentLoaded", () => {
    initModals();     // inject dropdown + update modal DOM first
    initAuth();       // login / signup / auto-login
    initExpenses();   // table, tabs, sort, search
    initStatistics(); // statistics view
    initProfile(); // profile update
});