(function () {
  const STORAGE = {
    blocks: "pulseblocks.blocks",
    tasks: "pulseblocks.tasks",
    currentBlock: "pulseblocks.currentBlock",
    moodLogs: "pulseblocks.moodLogs",
    settings: "pulseblocks.settings"
  };

  const activityTypes = {
    deep_work: { label: "Trabajo intenso", color: "168 58% 61%", icon: "target", description: "Foco alto, bateria medida." },
    light_work: { label: "Trabajo liviano", color: "205 74% 68%", icon: "spark", description: "Tareas livianas y ritmo amable." },
    meeting: { label: "Reunion", color: "12 86% 70%", icon: "users", description: "Conversaciones, acuerdos y friccion social." },
    admin: { label: "Administrativo", color: "44 88% 67%", icon: "clipboard", description: "Orden, papeles, inbox, tramites." },
    study: { label: "Estudio", color: "265 72% 76%", icon: "book", description: "Aprender sin incendiar el foco." },
    exercise: { label: "Actividad fisica", color: "135 72% 67%", icon: "zap", description: "Movimiento que reinicia el sistema." },
    leisure: { label: "Ocio", color: "322 78% 72%", icon: "play", description: "Placer, juego o pausa pasiva." },
    family: { label: "Familia / vinculos", color: "28 89% 70%", icon: "heart", description: "Contacto humano que acomoda el dia." },
    rest: { label: "Descanso", color: "190 72% 74%", icon: "moon", description: "Recuperacion deliberada." },
    personal: { label: "Personal", color: "86 62% 69%", icon: "compass", description: "Cuidado, planes y vida propia." }
  };

  const tabs = [
    { id: "today", label: "Hoy", icon: "sun" },
    { id: "mood", label: "Mood", icon: "heart" },
    { id: "tasks", label: "Tareas", icon: "check" },
    { id: "balance", label: "Reportes", icon: "chart" },
    { id: "history", label: "Historial", icon: "archive" },
    { id: "settings", label: "Ajustes", icon: "settings" }
  ];

  const defaultSettings = {
    appName: "PulseBlocks",
    tagline: "Productividad con bateria humana incluida.",
    eyebrow: "Wellness productivity dashboard",
    tabTitles: { today: "Hoy", mood: "Mood", tasks: "Tareas", balance: "Reportes", history: "Historial", settings: "Ajustes" },
    density: "comfortable",
    accent: "mint",
    animations: true,
    notifications: false
  };

  const emotionalTags = ["En foco", "Satisfecho", "Cansado", "Ansioso", "Liviano", "Frustrado", "Motivado", "Saturado", "Tranquilo", "Disperso"];
  const feelingTags = ["Herido", "Enojado", "Asustado", "Triste", "Agradecido", "Culpable", "Aliviado", "Orgulloso", "Solo", "Acompanado", "Desbordado"];
  const quickStarts = [
    { type: "deep_work", title: "Foco 25'", mood: { energy: 4, mood: 3, stress: 2, focus: 4 } },
    { type: "admin", title: "Tramite express", mood: { energy: 3, mood: 3, stress: 3, focus: 3 } },
    { type: "rest", title: "Reset suave", mood: { energy: 2, mood: 3, stress: 4, focus: 2 } },
    { type: "exercise", title: "Mover el cuerpo", mood: { energy: 3, mood: 3, stress: 3, focus: 2 } }
  ];
  const state = {
    blocks: [], tasks: [], moodLogs: [], currentBlock: null, settings: structuredClone(defaultSettings),
    activeTab: "today", selectedDay: todayISO(), timerId: null, reminderTimerId: null, chartPoints: [],
    moodPanelOpen: false, taskPanelOpen: false, editingBlockId: null, editingTaskId: null,
    editingMoodId: null, confirmDeleteKey: null
  };

  function init() {
    loadState();
    ensureRecurringTasks();
    applySettings();
    bindGlobalEvents();
    render();
    startTicker();
    startReminderWatcher();
  }

  function loadState() {
    state.blocks = readJSON(STORAGE.blocks, []);
    state.tasks = readJSON(STORAGE.tasks, []);
    state.moodLogs = readJSON(STORAGE.moodLogs, []);
    state.currentBlock = readJSON(STORAGE.currentBlock, null);
    const storedSettings = readJSON(STORAGE.settings, {});
    state.settings = {
      ...structuredClone(defaultSettings),
      ...storedSettings,
      tabTitles: { ...defaultSettings.tabTitles, ...(storedSettings.tabTitles || {}) }
    };
    state.activeTab = storedSettings.activeTab || "today";
    state.selectedDay = storedSettings.selectedDay || todayISO();
  }

  function saveState() {
    localStorage.setItem(STORAGE.blocks, JSON.stringify(state.blocks));
    localStorage.setItem(STORAGE.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE.moodLogs, JSON.stringify(state.moodLogs));
    localStorage.setItem(STORAGE.currentBlock, JSON.stringify(state.currentBlock));
    localStorage.setItem(STORAGE.settings, JSON.stringify({ ...state.settings, activeTab: state.activeTab, selectedDay: state.selectedDay }));
  }

  function render() {
    renderTabs();
    document.getElementById("sidebarDate").textContent = formatDate(todayISO());
    document.getElementById("pageTitle").textContent = tabLabel(state.activeTab);
    const app = document.getElementById("app");
    if (state.activeTab === "today") app.innerHTML = renderToday();
    if (state.activeTab === "mood") app.innerHTML = renderMood();
    if (state.activeTab === "tasks") app.innerHTML = renderTasks();
    if (state.activeTab === "balance") app.innerHTML = renderBalance();
    if (state.activeTab === "history") app.innerHTML = renderHistory();
    if (state.activeTab === "settings") app.innerHTML = renderSettings();
    renderMoodBubble();
    if (state.activeTab === "balance") requestAnimationFrame(drawBalanceCharts);
    if (state.activeTab === "mood") requestAnimationFrame(drawMoodCharts);
  }

  function renderTabs() {
    document.getElementById("tabs").innerHTML = tabs.map((tab) => `
      <button class="tab-button ${state.activeTab === tab.id ? "active" : ""}" type="button" data-action="tab" data-tab="${tab.id}">
        <span class="tab-icon">${icon(tab.icon)}</span><span>${tabLabel(tab.id)}</span>
      </button>
    `).join("");
  }

  function renderToday() {
    const todayBlocks = dayBlocks(state.selectedDay);
    const todayLogs = dayMoodLogs(state.selectedDay);
    return `
      <div class="grid two-col">
        <div class="grid">
          ${state.currentBlock ? renderActiveTimer() : renderStartForm()}
          ${renderFinishPanel()}
        </div>
        <div class="card pad">
          <div class="card-header">
            <div><h2>Bloques de hoy</h2><p class="muted">Lo que hiciste y como quedo la bateria.</p></div>
            <span class="badge">${todayBlocks.length} bloques</span>
          </div>
          <div class="block-list">${todayBlocks.length ? todayBlocks.map(renderBlockItem).join("") : `<div class="empty">Todavia no hay bloques. El dia esta en blanco, con buena caligrafia.</div>`}</div>
          <div class="soft-divider"></div>
          <div class="card-header compact">
            <div><h3>Bitacora emocional</h3><p class="muted">Situaciones repentinas que movieron el mood.</p></div>
            <span class="badge">${todayLogs.length} eventos</span>
          </div>
          <div class="block-list">${todayLogs.length ? todayLogs.map(renderMoodLogItem).join("") : `<div class="empty">Sin eventos repentinos registrados. El radar esta tranquilo.</div>`}</div>
        </div>
      </div>
    `;
  }

  function renderStartForm() {
    return `
      <section class="card pad">
        <div class="card-header"><div><h2>Iniciar bloque</h2><p class="muted">Elegi que vas a hacer y registra como llegas.</p></div></div>
        <div class="quick-grid" aria-label="Inicios rapidos">
          ${quickStarts.map((item) => `<button class="quick-card" type="button" data-action="quick-start" data-type="${item.type}" data-title="${item.title}">
            <span class="quick-icon">${activityTypes[item.type].label.slice(0, 2)}</span>
            <strong>${item.title}</strong>
            <small>${activityTypes[item.type].label}</small>
          </button>`).join("")}
        </div>
        <form class="form-grid" data-form="start-block">
          <input type="hidden" name="activity_type" value="deep_work">
          <div class="field">
            <label>Tipo de actividad</label>
            <div class="activity-grid">${Object.entries(activityTypes).map(([id, type]) => `
              <button class="activity-card ${id === "deep_work" ? "selected" : ""}" type="button" data-action="select-activity" data-value="${id}" style="--activity-color:${type.color}">
                <strong>${type.label}</strong><small>${type.description}</small>
              </button>`).join("")}</div>
          </div>
          <div class="field"><label for="blockTitle">Titulo opcional</label><input id="blockTitle" name="title" placeholder="Ej: escribir propuesta sin mirar el inbox"></div>
          <div class="field"><label for="taskSelect">Tarea asociada</label><select id="taskSelect" name="task_id"><option value="">Sin tarea asociada</option>${state.tasks.filter((task) => task.status !== "completed").map((task) => `<option value="${task.id}">${escapeHTML(task.title)}</option>`).join("")}</select></div>
          ${renderMoodInputs("before", { energy: 3, mood: 3, stress: 3, focus: 3 })}
          <button class="primary-button" type="submit">Empezar bloque</button>
        </form>
      </section>
    `;
  }

  function renderActiveTimer() {
    const block = state.currentBlock;
    const type = activityTypes[block.activity_type];
    return `
      <section class="card pad timer-card">
        <div class="timer-content">
          <div class="card-header">
            <div><h2>${escapeHTML(block.title)}</h2><p class="muted">${type.label} iniciado a las ${formatTime(block.start_time)}.</p></div>
            <span class="badge ${block.paused ? "warn" : "good"}">${block.paused ? "Pausado" : "Activo"}</span>
          </div>
          <div class="timer" id="timerDisplay">${formatSeconds(elapsedSeconds(block))}</div>
          <div class="timer-meta">
            <span class="badge" style="--dot-color:${type.color}"><span class="dot"></span>${type.label}</span>
            ${block.task_id ? `<span class="badge">${escapeHTML(taskTitle(block.task_id))}</span>` : ""}
          </div>
          <div class="action-row">
            <button class="ghost-button" type="button" data-action="${block.paused ? "resume-block" : "pause-block"}">${block.paused ? "Reanudar" : "Pausar"}</button>
            <button class="ghost-button" type="button" data-action="edit-block" data-id="${block.id}">Editar</button>
            <button class="primary-button" type="button" data-action="open-finish">Finalizar</button>
            <button class="danger-button" type="button" data-action="cancel-block">Cancelar bloque</button>
          </div>
          ${state.editingBlockId === block.id ? renderEditCurrentBlockForm(block) : ""}
        </div>
      </section>
    `;
  }

  function renderFinishPanel() {
    if (!state.currentBlock || !state.currentBlock.finishing) return "";
    return `
      <section class="card pad">
        <div class="card-header"><div><h2>Cerrar bloque</h2><p class="muted">Un cierre rapido. Sin ceremonia, con datos utiles.</p></div></div>
        <form class="form-grid" data-form="finish-block">
          <div class="field"><label for="completion">Estado</label><select id="completion" name="completion_level">
            <option value="completed">Completado</option><option value="advanced">Avance</option><option value="blocked">Bloqueado</option><option value="cancelled">Cancelado</option>
          </select></div>
          ${renderMoodInputs("after", { energy: 3, mood: 3, stress: 3, focus: 3 })}
          <div class="field"><label>Tags emocionales</label><div class="chip-row">${emotionalTags.map((tag) => `<button class="chip" type="button" data-action="tag" data-tag="${tag}">${tag}</button>`).join("")}</div></div>
          <div class="field"><label for="note">Nota opcional</label><textarea id="note" name="note" placeholder="Que conviene recordar de este bloque?"></textarea></div>
          <button class="primary-button" type="submit">Guardar cierre</button>
        </form>
      </section>
    `;
  }

  function renderMoodInputs(prefix, values) {
    const labels = { energy: "Energia", mood: "Animo", stress: "Estres", focus: "Foco" };
    return `<div class="mood-grid">${Object.entries(labels).map(([key, label]) => `
      <div class="range-wrap">
        <div class="range-head"><span>${label}</span><span data-range-value="${prefix}_${key}">${values[key]}</span></div>
        <div class="range-control">
          <span class="range-feedback" aria-hidden="true"></span>
          <input type="range" min="1" max="5" value="${values[key]}" name="${prefix}_${key}" data-metric="${key}" aria-label="${label}">
        </div>
      </div>
    `).join("")}</div>`;
  }

  function renderMood() {
    const logs = dayMoodLogs(state.selectedDay);
    const allWeek = lastDays(7).flatMap((day) => dayMoodLogs(day));
    const positive = logs.filter((log) => log.impact > 0).length;
    const negative = logs.filter((log) => log.impact < 0).length;
    const totalShift = sum(logs, "impact");
    const strongest = logs.slice().sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))[0];
    return `
      <div class="grid">
        <section class="pdf-cover card pad">
          <div>
            <p class="eyebrow">Mood Lab</p>
            <h2>Bitacora emocional como bloque propio</h2>
            <p class="muted">Para desbordes, alegrias fuertes, discusiones, sustos y pequenos milagros del dia.</p>
          </div>
          <div class="action-row no-print">
            <button class="primary-button" type="button" data-action="mood-bubble">Registrar ahora</button>
            <button class="ghost-button" type="button" data-action="export-pdf">PDF</button>
          </div>
        </section>
        <section class="stats-grid">
          ${renderStat("Eventos de hoy", String(logs.length))}
          ${renderStat("Mood shift", signed(totalShift))}
          ${renderStat("Subidas", String(positive))}
          ${renderStat("Bajadas", String(negative))}
          ${renderStat("Promedio semana", signed(avg(allWeek.map((log) => log.impact))))}
          ${renderStat("Evento mas intenso", strongest ? signed(strongest.impact) : "0")}
        </section>
        <section class="grid two-col">
          <div class="card pad">
            <div class="card-header"><div><h2>Curva de mood</h2><p class="muted">Como se acumularon los golpes y chispazos del dia.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="moodImpactChart">PNG</button></div>
            <canvas class="dashboard-chart" id="moodImpactChart"></canvas>
          </div>
          <div class="card pad">
            <div class="card-header"><div><h2>Contextos</h2><p class="muted">Donde se movio mas la bateria emocional.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="moodContextBars">PNG</button></div>
            <canvas class="dashboard-chart" id="moodContextBars"></canvas>
          </div>
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Eventos de hoy</h2><p class="muted">No todo es tarea. Algunas cosas pasan y te cambian el tablero.</p></div><input type="date" value="${state.selectedDay}" data-action="select-day"></div>
          <div class="block-list">${logs.length ? logs.map(renderMoodLogItem).join("") : `<div class="empty">Todavia no cargaste eventos mood para este dia.</div>`}</div>
        </section>
      </div>
    `;
  }

  function renderTasks() {
    const sortedTasks = state.tasks.slice().sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return new Date(b.created_at) - new Date(a.created_at);
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });
    return `
      <div class="grid two-col">
        <section class="card pad">
          <div class="card-header"><div><h2>${state.editingTaskId ? "Editar tarea" : "Nueva tarea"}</h2><p class="muted">Que hacer, cuando y si se repite. Nada mas.</p></div></div>
          ${renderTaskForm(state.tasks.find((task) => task.id === state.editingTaskId))}
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Tareas</h2><p class="muted">Primero lo proximo. Despues, el resto.</p></div></div>
          <div class="task-list">${sortedTasks.length ? sortedTasks.map(renderTaskItem).join("") : `<div class="empty">No hay tareas. Silencio raro, pero aprovechable.</div>`}</div>
        </section>
      </div>
    `;
  }

  function renderTaskForm(task = null, compact = false) {
    const editing = Boolean(task);
    return `
      <form class="form-grid ${compact ? "compact-form" : ""}" data-form="${editing ? "edit-task" : "create-task"}">
        ${editing ? `<input type="hidden" name="id" value="${task.id}">` : ""}
        <div class="field"><label>Titulo</label><input name="title" required value="${editing ? escapeHTML(task.title) : ""}" placeholder="Ej: tomar medicacion"></div>
        <div class="form-row">
          <div class="field"><label>Categoria</label><select name="category">${Object.values(activityTypes).map((type) => `<option ${editing && task.category === type.label ? "selected" : ""}>${type.label}</option>`).join("")}</select></div>
          <div class="field"><label>Prioridad</label><select name="priority">
            ${["low", "medium", "high"].map((priority) => `<option value="${priority}" ${(!editing && priority === "medium") || (editing && task.priority === priority) ? "selected" : ""}>${translatePriority(priority)}</option>`).join("")}
          </select></div>
        </div>
        <div class="field"><label>Programar para</label><input type="datetime-local" name="scheduled_at" value="${editing ? toDateTimeLocal(task.scheduled_at) : ""}"></div>
        <div class="form-row">
          <div class="field"><label>Repetir</label><select name="recurrence">
            ${[["none", "No repetir"], ["daily", "Cada dia"], ["weekdays", "Dias habiles"], ["weekly", "Cada semana"]].map(([value, label]) => `<option value="${value}" ${(editing ? task.recurrence : "none") === value ? "selected" : ""}>${label}</option>`).join("")}
          </select></div>
          <div class="field"><label>Aviso</label><select name="reminder_minutes">
            ${[[0, "En el momento"], [5, "5 min antes"], [15, "15 min antes"], [30, "30 min antes"], [60, "1 hora antes"]].map(([value, label]) => `<option value="${value}" ${Number(editing ? task.reminder_minutes : 0) === value ? "selected" : ""}>${label}</option>`).join("")}
          </select></div>
        </div>
        <div class="action-row">
          <button class="primary-button" type="submit">${editing ? "Guardar tarea" : "Crear tarea"}</button>
          ${editing ? `<button class="ghost-button" type="button" data-action="cancel-edit-task">Cancelar</button>` : ""}
        </div>
      </form>
    `;
  }

  function renderTaskItem(task) {
    const deleteKey = `task:${task.id}`;
    const schedule = task.scheduled_at ? `${formatDateTime(task.scheduled_at)}${task.recurrence && task.recurrence !== "none" ? ` · ${recurrenceLabel(task.recurrence)}` : ""}` : "Sin horario";
    return `
      <div class="list-item">
        <div class="item-top">
          <div><div class="item-title">${escapeHTML(task.title)}</div><div class="muted">${task.category} · prioridad ${translatePriority(task.priority)} · ${schedule}</div></div>
          <span class="badge ${task.status === "completed" ? "good" : task.status === "blocked" ? "bad" : ""}">${translateStatus(task.status)}</span>
        </div>
        <div class="action-row">
          ${["pending", "in_progress", "completed", "blocked"].map((status) => `<button class="chip ${task.status === status ? "selected" : ""}" type="button" data-action="task-status" data-id="${task.id}" data-status="${status}">${translateStatus(status)}</button>`).join("")}
          <button class="chip" type="button" data-action="edit-task" data-id="${task.id}">Editar</button>
          <button class="${state.confirmDeleteKey === deleteKey ? "danger-button" : "chip"}" type="button" data-action="${state.confirmDeleteKey === deleteKey ? "confirm-delete-task" : "ask-delete"}" data-kind="task" data-id="${task.id}">${state.confirmDeleteKey === deleteKey ? "Confirmar eliminar" : "Eliminar"}</button>
        </div>
      </div>
    `;
  }

  function renderBalance() {
    const blocks = dayBlocks(state.selectedDay).filter((block) => block.mood_after);
    const moodLogs = dayMoodLogs(state.selectedDay);
    const summary = calculateDailySummary(blocks);
    const groups = groupBlocksByActivity(blocks);
    const moodShift = sum(moodLogs, "impact");
    return `
      <div class="grid">
        <section class="pdf-cover card pad">
          <div>
            <p class="eyebrow">Reporte PulseBlocks</p>
            <h2>Balance de ${formatDate(state.selectedDay)}</h2>
            <p class="muted">Bloques, graficos y bitacora emocional en una sola foto del dia.</p>
          </div>
          <button class="primary-button no-print" type="button" data-action="export-pdf">Exportar PDF</button>
        </section>
        <section class="stats-grid">
          ${renderStat("Tiempo registrado", formatMinutes(summary.totalMinutes))}
          ${renderStat("Bloques", String(summary.count))}
          ${renderStat("Balance promedio", signed(summary.avgImpact))}
          ${renderStat("Carga del dia", summary.loadLabel)}
          ${renderStat("Eventos mood", String(moodLogs.length))}
          ${renderStat("Impacto situacional", signed(moodShift))}
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Timeline emocional</h2><p class="muted">Mismo dia, otra lectura: tiempo + impacto.</p></div><input type="date" value="${state.selectedDay}" data-action="select-day"></div>
          <div class="timeline">${renderUnifiedTimeline(blocks, moodLogs)}</div>
        </section>
        <section class="dashboard-grid">
          <div class="card pad">
            <div class="card-header"><div><h2>Impacto por actividad</h2><p class="muted">Que te suma y que te cobra peaje.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="activityImpactChart">PNG</button></div>
            <canvas class="dashboard-chart" id="activityImpactChart"></canvas>
          </div>
          <div class="card pad">
            <div class="card-header"><div><h2>Mood situacional</h2><p class="muted">Eventos repentinos acumulados por hora.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="moodTrendChart">PNG</button></div>
            <canvas class="dashboard-chart" id="moodTrendChart"></canvas>
          </div>
          <div class="card pad">
            <div class="card-header"><div><h2>Contextos sensibles</h2><p class="muted">Familia, pareja, calle, trabajo y cuerpo.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="contextChart">PNG</button></div>
            <canvas class="dashboard-chart" id="contextChart"></canvas>
          </div>
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Matriz Hice / Senti</h2><p class="muted">Promedios por actividad. La agenda tambien confiesa.</p></div></div>
          <div class="matrix-wrap">${renderMatrix(groups)}</div>
        </section>
        <section class="grid two-col">
          <div class="card pad">
            <div class="card-header"><div><h2>Cuadrantes</h2><p class="muted">Duracion contra impacto emocional. Click en un punto para verlo.</p></div><button class="ghost-button no-print" type="button" data-action="export-chart" data-chart="quadrantChart">PNG</button></div>
            <div class="chart-wrap"><canvas id="quadrantChart"></canvas><div class="chart-detail" id="chartDetail"></div></div>
          </div>
          <div class="card pad">
            <div class="card-header"><div><h2>Insights</h2><p class="muted">Recomendaciones automaticas, sin palmadas vacias.</p></div></div>
            <div class="insights">${generateInsights(blocks, moodLogs).map((text) => `<div class="list-item">${text}</div>`).join("")}</div>
          </div>
        </section>
      </div>
    `;
  }

  function renderHistory() {
    const days = lastDays(7);
    return `
      <div class="grid two-col">
        <section class="card pad">
          <div class="card-header"><div><h2>Historial / Debug</h2><p class="muted">Cargar, limpiar, exportar. Aqui vive el boton grande de reset mental.</p></div></div>
          <div class="action-row">
            <button class="primary-button" type="button" data-action="load-seed">Cargar datos de prueba</button>
            <button class="danger-button" type="button" data-action="clear-storage">Limpiar almacenamiento</button>
            <button class="ghost-button" type="button" data-action="export-json">Exportar JSON</button>
            <button class="ghost-button" type="button" data-action="export-pdf">Exportar PDF</button>
          </div>
          <div class="stats-grid" style="margin-top:16px">
            ${renderStat("Bloques totales", String(state.blocks.length))}
            ${renderStat("Tareas", String(state.tasks.length))}
            ${renderStat("Eventos mood", String(state.moodLogs.length))}
          </div>
          <h3 style="margin-top:18px">Ultimos 7 dias</h3>
          <div class="block-list">${days.map(renderDaySummary).join("")}</div>
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Snapshot</h2><p class="muted">Estado actual legible para debug.</p></div></div>
          <pre class="debug">${escapeHTML(JSON.stringify({ blocks: state.blocks, tasks: state.tasks, moodLogs: state.moodLogs, currentBlock: state.currentBlock }, null, 2))}</pre>
        </section>
      </div>
    `;
  }

  function renderSettings() {
    const s = state.settings;
    return `
      <div class="grid two-col">
        <section class="card pad">
          <div class="card-header"><div><h2>Identidad y titulos</h2><p class="muted">Cambialos para que la app hable como vos.</p></div></div>
          <form class="form-grid" data-form="settings">
            <div class="field"><label>Nombre de la app</label><input name="appName" value="${escapeHTML(s.appName)}"></div>
            <div class="field"><label>Frase corta</label><input name="tagline" value="${escapeHTML(s.tagline)}"></div>
            <div class="field"><label>Linea superior</label><input name="eyebrow" value="${escapeHTML(s.eyebrow)}"></div>
            <div class="form-row">
              ${tabs.map((tab) => `<div class="field"><label>${tab.label}</label><input name="tab_${tab.id}" value="${escapeHTML(s.tabTitles[tab.id])}"></div>`).join("")}
            </div>
            <button class="primary-button" type="submit">Guardar ajustes</button>
          </form>
        </section>
        <section class="grid">
          <div class="card pad">
            <div class="card-header"><div><h2>Experiencia</h2><p class="muted">Pocas decisiones, cambios visibles.</p></div></div>
            <form class="form-grid" data-form="settings">
              <div class="field"><label>Densidad</label><select name="density"><option value="comfortable" ${s.density === "comfortable" ? "selected" : ""}>Comoda</option><option value="compact" ${s.density === "compact" ? "selected" : ""}>Compacta</option></select></div>
              <div class="field"><label>Color principal</label><select name="accent"><option value="mint" ${s.accent === "mint" ? "selected" : ""}>Menta</option><option value="coral" ${s.accent === "coral" ? "selected" : ""}>Coral</option><option value="sun" ${s.accent === "sun" ? "selected" : ""}>Sol</option></select></div>
              <label class="toggle-row"><input type="checkbox" name="animations" ${s.animations ? "checked" : ""}><span>Animaciones suaves</span></label>
              <button class="primary-button" type="submit">Aplicar experiencia</button>
            </form>
          </div>
          <div class="card pad">
            <div class="card-header"><div><h2>Avisos de tareas</h2><p class="muted">Siempre hay aviso en la app. El sistema es opcional.</p></div></div>
            <div class="action-row"><button class="ghost-button" type="button" data-action="request-notifications">${notificationStatusLabel()}</button></div>
          </div>
        </section>
      </div>
      <section class="settings-help">
        <div class="card pad help-intro">
          <div>
            <p class="eyebrow">Guia de uso</p>
            <h2>Aprende PulseBlocks a tu ritmo</h2>
            <p class="muted">Mira el recorrido completo en video o consulta la guia visual cuando necesites recordar una funcion.</p>
          </div>
        </div>
        <div class="help-media-grid">
          <article class="card pad help-media-card">
            <div class="card-header">
              <div><h2>PulseBlocks explicado</h2><p class="muted">Un recorrido en video por el uso diario de la app.</p></div>
              <span class="badge">Video</span>
            </div>
            <video class="help-video" controls preload="metadata">
              <source src="assets/pulseblocks-explicado.mp4" type="video/mp4">
              Tu navegador no puede reproducir este video.
            </video>
          </article>
          <article class="card pad help-media-card">
            <div class="card-header">
              <div><h2>Guia visual de inicio</h2><p class="muted">Bloques, escalas emocionales, Mood, tareas, reportes y seguridad en una sola lamina.</p></div>
              <a class="ghost-button" href="assets/guia-productividad-emocional.png" target="_blank" rel="noopener">Ampliar</a>
            </div>
            <a class="guide-image-link" href="assets/guia-productividad-emocional.png" target="_blank" rel="noopener" aria-label="Abrir guia visual ampliada">
              <img class="help-guide-image" src="assets/guia-productividad-emocional.png" alt="Guia de inicio de PulseBlocks con conceptos, bloques, escalas emocionales, Mood, tareas, reportes e instalacion" loading="lazy">
            </a>
          </article>
        </div>
      </section>
    `;
  }

  function bindGlobalEvents() {
    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("input", handleInput);
    document.getElementById("quickSeed").addEventListener("click", loadSeedData);
    document.getElementById("exportTop").addEventListener("click", exportJSON);
    document.getElementById("exportPdfTop").addEventListener("click", exportPDF);
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "tab") { state.activeTab = target.dataset.tab; saveState(); render(); }
    if (action === "select-activity") selectActivity(target);
    if (action === "pause-block") pauseBlock();
    if (action === "resume-block") resumeBlock();
    if (action === "cancel-block") cancelBlock();
    if (action === "open-finish") openFinishBlock();
    if (action === "tag") target.classList.toggle("selected");
    if (action === "task-status") updateTaskStatus(target.dataset.id, target.dataset.status);
    if (action === "edit-task") { state.editingTaskId = target.dataset.id; state.activeTab = "tasks"; state.taskPanelOpen = false; render(); }
    if (action === "cancel-edit-task") { state.editingTaskId = null; render(); }
    if (action === "edit-mood") { state.editingMoodId = target.dataset.id; render(); }
    if (action === "cancel-edit-mood") { state.editingMoodId = null; render(); }
    if (action === "ask-delete") { state.confirmDeleteKey = `${target.dataset.kind}:${target.dataset.id}`; render(); }
    if (action === "confirm-delete-task") deleteTask(target.dataset.id);
    if (action === "confirm-delete-mood") deleteMoodLog(target.dataset.id);
    if (action === "load-seed") loadSeedData();
    if (action === "clear-storage") clearStorage();
    if (action === "export-json") exportJSON();
    if (action === "export-pdf") exportPDF();
    if (action === "export-chart") exportChart(target.dataset.chart);
    if (action === "quick-start") quickStartBlock(target.dataset.type, target.dataset.title);
    if (action === "edit-block") { state.editingBlockId = target.dataset.id; render(); }
    if (action === "cancel-edit-block") { state.editingBlockId = null; render(); }
    if (action === "mood-bubble") { state.moodPanelOpen = !state.moodPanelOpen; state.taskPanelOpen = false; renderMoodBubble(); }
    if (action === "task-bubble") { state.taskPanelOpen = !state.taskPanelOpen; state.moodPanelOpen = false; renderMoodBubble(); }
    if (action === "close-mood-panel") { state.moodPanelOpen = false; renderMoodBubble(); }
    if (action === "close-task-panel") { state.taskPanelOpen = false; renderMoodBubble(); }
    if (action === "request-notifications") requestNotificationPermission();
    if (action === "history-day") {
      state.selectedDay = target.dataset.day;
      state.activeTab = "balance";
      saveState();
      render();
    }
  }

  function handleSubmit(event) {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === "start-block") startBlock(new FormData(form));
    if (form.dataset.form === "finish-block") finishBlock(form, new FormData(form));
    if (form.dataset.form === "edit-block") updateBlock(form, new FormData(form));
    if (form.dataset.form === "edit-current-block") updateCurrentBlock(new FormData(form));
    if (form.dataset.form === "create-task") createTask(new FormData(form));
    if (form.dataset.form === "edit-task") updateTask(new FormData(form));
    if (form.dataset.form === "mood-log") createMoodLog(form, new FormData(form));
    if (form.dataset.form === "edit-mood") updateMoodLog(form, new FormData(form));
    if (form.dataset.form === "settings") updateSettings(new FormData(form));
  }

  function handleInput(event) {
    if (event.target.matches("input[type='range']")) {
      const value = event.target.closest(".range-wrap")?.querySelector(`[data-range-value="${event.target.name}"]`);
      if (value) value.textContent = event.target.value;
      showRangeFeedback(event.target);
    }
    if (event.target.matches("[data-action='select-day']")) {
      state.selectedDay = event.target.value || todayISO();
      saveState();
      render();
    }
    if (event.target.matches("[data-task-select]")) {
      const form = event.target.closest("form");
      const titleInput = form?.querySelector("[data-task-title-input]");
      const task = state.tasks.find((item) => item.id === event.target.value);
      if (titleInput) {
        titleInput.value = task?.title || "";
        titleInput.disabled = !task;
      }
    }
  }

  function selectActivity(button) {
    const form = button.closest("form");
    form.querySelector("[name='activity_type']").value = button.dataset.value;
    form.querySelectorAll(".activity-card").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
  }

  function startBlock(data) {
    const type = data.get("activity_type") || "deep_work";
    const title = data.get("title").trim() || activityTypes[type].label;
    state.currentBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : `block-${Date.now()}`,
      title,
      activity_type: type,
      category: activityTypes[type].label,
      task_id: data.get("task_id") || null,
      start_time: new Date().toISOString(),
      end_time: null,
      duration_minutes: 0,
      status: "advanced",
      completion_level: "advanced",
      mood_before: moodFromData(data, "before"),
      mood_after: null,
      emotional_tags: [],
      context_tags: [],
      perceived_value: 3,
      difficulty: 3,
      autonomy: 3,
      emotional_impact_score: 0,
      productive_but_costly: false,
      recovery_need_score: 0,
      note: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      paused: false,
      pausedSeconds: 0,
      pauseStartedAt: null,
      finishing: false
    };
    saveState();
    toast("Bloque iniciado. El motor esta encendido, pero con medidor humano.");
    render();
  }

  function quickStartBlock(type, title) {
    if (state.currentBlock) {
      toast("Ya hay un bloque activo. Primero cerra ese motorcito.");
      return;
    }
    const preset = quickStarts.find((item) => item.type === type) || quickStarts[0];
    const now = new Date().toISOString();
    state.currentBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : `block-${Date.now()}`,
      title: title || preset.title,
      activity_type: type,
      category: activityTypes[type].label,
      task_id: null,
      start_time: now,
      end_time: null,
      duration_minutes: 0,
      status: "advanced",
      completion_level: "advanced",
      mood_before: preset.mood,
      mood_after: null,
      emotional_tags: ["Rapido"],
      context_tags: ["quick_start"],
      perceived_value: 3,
      difficulty: 3,
      autonomy: 4,
      emotional_impact_score: 0,
      productive_but_costly: false,
      recovery_need_score: 0,
      note: "Inicio rapido.",
      created_at: now,
      updated_at: now,
      paused: false,
      pausedSeconds: 0,
      pauseStartedAt: null,
      finishing: false
    };
    saveState();
    toast("Bloque rapido iniciado. Menos formulario, mas vida real.");
    render();
  }

  function pauseBlock() {
    if (!state.currentBlock || state.currentBlock.paused) return;
    state.currentBlock.paused = true;
    state.currentBlock.pauseStartedAt = new Date().toISOString();
    saveState();
    render();
  }

  function resumeBlock() {
    if (!state.currentBlock || !state.currentBlock.paused) return;
    state.currentBlock.pausedSeconds += Math.floor((Date.now() - new Date(state.currentBlock.pauseStartedAt).getTime()) / 1000);
    state.currentBlock.paused = false;
    state.currentBlock.pauseStartedAt = null;
    saveState();
    render();
  }

  function cancelBlock() {
    state.currentBlock = null;
    saveState();
    toast("Bloque cancelado. No todo intento necesita volverse estadistica.");
    render();
  }

  function openFinishBlock() {
    if (!state.currentBlock) return;
    state.currentBlock.finishing = true;
    saveState();
    render();
  }

  function finishBlock(form, data) {
    if (!state.currentBlock) return;
    if (state.currentBlock.paused) resumeBlock();
    const now = new Date().toISOString();
    const block = { ...state.currentBlock };
    delete block.paused;
    delete block.pausedSeconds;
    delete block.pauseStartedAt;
    delete block.finishing;
    block.end_time = now;
    block.duration_minutes = Math.max(1, Math.round(elapsedSeconds(state.currentBlock) / 60));
    block.status = data.get("completion_level");
    block.completion_level = data.get("completion_level");
    block.mood_after = moodFromData(data, "after");
    block.emotional_tags = [...form.querySelectorAll(".chip.selected")].map((chip) => chip.dataset.tag);
    block.note = data.get("note").trim();
    block.updated_at = now;
    block.emotional_impact_score = calculateEmotionalImpactScore(block);
    block.productive_but_costly = ["completed", "advanced"].includes(block.completion_level) && block.emotional_impact_score < -1;
    block.recovery_need_score = calculateRecoveryNeedScore(block);
    state.blocks.unshift(block);
    if (block.task_id && block.completion_level === "completed") updateTaskStatus(block.task_id, "completed", false);
    state.currentBlock = null;
    saveState();
    toast(feedbackFor(block));
    render();
  }

  function updateBlock(form, data) {
    const id = data.get("id");
    const block = state.blocks.find((item) => item.id === id);
    if (!block) return;
    const type = data.get("activity_type") || block.activity_type;
    const start = fromDateTimeLocal(data.get("start_time"));
    const end = fromDateTimeLocal(data.get("end_time"));
    block.title = data.get("title").trim() || activityTypes[type].label;
    block.activity_type = type;
    block.category = activityTypes[type].label;
    block.task_id = data.get("task_id") || null;
    updateAssociatedTaskTitle(block.task_id, data.get("task_title"));
    block.start_time = start || block.start_time;
    block.end_time = end || block.end_time;
    block.duration_minutes = block.end_time ? Math.max(1, Math.round((new Date(block.end_time) - new Date(block.start_time)) / 60000)) : block.duration_minutes;
    block.status = data.get("completion_level");
    block.completion_level = data.get("completion_level");
    block.mood_before = moodFromData(data, "before");
    block.mood_after = moodFromData(data, "after");
    block.emotional_tags = [...form.querySelectorAll(".chip.selected")].map((chip) => chip.dataset.tag);
    block.note = data.get("note").trim();
    block.updated_at = new Date().toISOString();
    block.emotional_impact_score = calculateEmotionalImpactScore(block);
    block.productive_but_costly = ["completed", "advanced"].includes(block.completion_level) && block.emotional_impact_score < -1;
    block.recovery_need_score = calculateRecoveryNeedScore(block);
    state.editingBlockId = null;
    saveState();
    toast("Bloque editado. Los numeros ya se recalcularon.");
    render();
  }

  function updateCurrentBlock(data) {
    const block = state.currentBlock;
    if (!block || block.id !== data.get("id")) return;
    const type = data.get("activity_type") || block.activity_type;
    block.title = data.get("title").trim() || activityTypes[type].label;
    block.activity_type = type;
    block.category = activityTypes[type].label;
    block.task_id = data.get("task_id") || null;
    updateAssociatedTaskTitle(block.task_id, data.get("task_title"));
    block.updated_at = new Date().toISOString();
    state.editingBlockId = null;
    saveState();
    toast("Bloque activo y tarea actualizados.");
    render();
  }

  function updateAssociatedTaskTitle(taskId, value) {
    if (!taskId) return;
    const title = String(value || "").trim();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || !title || task.title === title) return;
    task.title = title;
    task.updated_at = new Date().toISOString();
  }

  function createTask(data) {
    const title = data.get("title").trim();
    if (!title) return;
    const scheduledAt = fromDateTimeLocal(data.get("scheduled_at"));
    state.tasks.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
      title,
      status: "pending",
      priority: data.get("priority"),
      category: data.get("category"),
      scheduled_at: scheduledAt,
      recurrence: data.get("recurrence") || "none",
      recurrence_parent_id: null,
      reminder_minutes: Number(data.get("reminder_minutes") || 0),
      notified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    state.taskPanelOpen = false;
    saveState();
    toast("Tarea creada. Ya tiene una casa y dejo de rondar por la cabeza.");
    render();
  }

  function updateTask(data) {
    const task = state.tasks.find((item) => item.id === data.get("id"));
    if (!task) return;
    task.title = data.get("title").trim() || task.title;
    task.priority = data.get("priority");
    task.category = data.get("category");
    task.scheduled_at = fromDateTimeLocal(data.get("scheduled_at"));
    task.recurrence = data.get("recurrence") || "none";
    task.reminder_minutes = Number(data.get("reminder_minutes") || 0);
    task.notified = false;
    task.updated_at = new Date().toISOString();
    state.editingTaskId = null;
    saveState();
    toast("Tarea actualizada.");
    render();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((task) => task.id !== id);
    state.blocks.forEach((block) => { if (block.task_id === id) block.task_id = null; });
    state.confirmDeleteKey = null;
    state.editingTaskId = null;
    saveState();
    toast("Tarea eliminada.");
    render();
  }

  function createMoodLog(form, data) {
    const situation = data.get("situation").trim();
    if (!situation) return;
    const impact = Number(data.get("impact"));
    const log = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mood-${Date.now()}`,
      situation,
      context: data.get("context"),
      impact,
      body_signal: data.get("body_signal").trim(),
      tags: [...form.querySelectorAll(".chip.selected")].map((chip) => chip.dataset.tag),
      note: data.get("note").trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.moodLogs.unshift(log);
    state.moodPanelOpen = false;
    saveState();
    toast(impact < 0 ? "Evento registrado. Eso tambien cuenta en la bateria." : "Evento registrado. Esa chispa suma al mapa del dia.");
    render();
  }

  function updateMoodLog(form, data) {
    const log = state.moodLogs.find((item) => item.id === data.get("id"));
    if (!log) return;
    log.situation = data.get("situation").trim() || log.situation;
    log.context = data.get("context");
    log.impact = Number(data.get("impact"));
    log.body_signal = data.get("body_signal").trim();
    log.tags = [...form.querySelectorAll(".chip.selected")].map((chip) => chip.dataset.tag);
    log.note = data.get("note").trim();
    log.updated_at = new Date().toISOString();
    state.editingMoodId = null;
    saveState();
    toast("Evento mood actualizado.");
    render();
  }

  function deleteMoodLog(id) {
    state.moodLogs = state.moodLogs.filter((log) => log.id !== id);
    state.confirmDeleteKey = null;
    state.editingMoodId = null;
    saveState();
    toast("Evento mood eliminado.");
    render();
  }

  function updateTaskStatus(id, status, shouldRender = true) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.status = status;
    task.updated_at = new Date().toISOString();
    if (status === "completed") spawnNextRecurringTask(task);
    saveState();
    if (shouldRender) render();
  }

  function ensureRecurringTasks() {
    state.tasks.forEach((task) => {
      task.recurrence ||= "none";
      task.reminder_minutes = Number(task.reminder_minutes || 0);
      task.notified = Boolean(task.notified);
      if (task.status === "completed") spawnNextRecurringTask(task, false);
    });
    saveState();
  }

  function spawnNextRecurringTask(task, persist = true) {
    if (!task.scheduled_at || !task.recurrence || task.recurrence === "none") return;
    const next = nextRecurringDate(task.scheduled_at, task.recurrence);
    const seriesId = task.series_id || task.id;
    if (state.tasks.some((item) => item.series_id === seriesId && item.scheduled_at === next)) return;
    state.tasks.push({
      ...task,
      id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random()}`,
      status: "pending",
      scheduled_at: next,
      recurrence_parent_id: task.id,
      series_id: seriesId,
      notified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (persist) saveState();
  }

  function nextRecurringDate(iso, recurrence) {
    const date = new Date(iso);
    if (recurrence === "weekly") date.setDate(date.getDate() + 7);
    else {
      date.setDate(date.getDate() + 1);
      if (recurrence === "weekdays") {
        while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
      }
    }
    return date.toISOString();
  }

  function startReminderWatcher() {
    clearInterval(state.reminderTimerId);
    checkTaskReminders();
    state.reminderTimerId = setInterval(checkTaskReminders, 15000);
  }

  function checkTaskReminders() {
    const now = Date.now();
    let changed = false;
    state.tasks.forEach((task) => {
      if (!task.scheduled_at || task.notified || !["pending", "in_progress"].includes(task.status)) return;
      const trigger = new Date(task.scheduled_at).getTime() - Number(task.reminder_minutes || 0) * 60000;
      if (now >= trigger && now - trigger < 86400000) {
        task.notified = true;
        changed = true;
        notifyTask(task);
      }
    });
    if (changed) saveState();
  }

  function notifyTask(task) {
    toast(`Tarea: ${task.title}`);
    playReminderTone();
    if (state.settings.notifications && "Notification" in window && Notification.permission === "granted") {
      new Notification(state.settings.appName, { body: `Es hora de: ${task.title}`, icon: "icon.svg" });
    }
  }

  function playReminderTone() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 720;
      gain.gain.setValueAtTime(0.08, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.45);
    } catch {}
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return toast("Este navegador no ofrece notificaciones del sistema.");
    const permission = await Notification.requestPermission();
    state.settings.notifications = permission === "granted";
    saveState();
    render();
    toast(permission === "granted" ? "Notificaciones activadas." : "Seguimos con avisos dentro de la app.");
  }

  function updateSettings(data) {
    if (data.has("appName")) {
      state.settings.appName = data.get("appName").trim() || defaultSettings.appName;
      state.settings.tagline = data.get("tagline").trim() || defaultSettings.tagline;
      state.settings.eyebrow = data.get("eyebrow").trim() || defaultSettings.eyebrow;
      tabs.forEach((tab) => { state.settings.tabTitles[tab.id] = data.get(`tab_${tab.id}`).trim() || tab.label; });
    }
    if (data.has("density")) {
      state.settings.density = data.get("density");
      state.settings.accent = data.get("accent");
      state.settings.animations = data.has("animations");
    }
    saveState();
    applySettings();
    toast("Ajustes aplicados.");
    render();
  }

  function applySettings() {
    document.documentElement.dataset.density = state.settings.density;
    document.documentElement.dataset.accent = state.settings.accent;
    document.documentElement.classList.toggle("no-motion", !state.settings.animations);
    document.title = state.settings.appName;
    const brand = document.getElementById("brandName");
    const tagline = document.getElementById("brandTagline");
    const eyebrow = document.getElementById("appEyebrow");
    if (brand) brand.textContent = state.settings.appName;
    if (tagline) tagline.textContent = state.settings.tagline;
    if (eyebrow) eyebrow.textContent = state.settings.eyebrow;
  }

  function tabLabel(id) {
    return state.settings.tabTitles[id] || tabs.find((tab) => tab.id === id)?.label || id;
  }

  function notificationStatusLabel() {
    if (!("Notification" in window)) return "No disponible en este navegador";
    if (Notification.permission === "granted") return "Notificaciones activadas";
    if (Notification.permission === "denied") return "Permiso bloqueado por el navegador";
    return "Activar notificaciones del sistema";
  }

  function calculateDeltas(block) {
    if (!block.mood_after) return { energy_delta: 0, mood_delta: 0, stress_delta: 0, focus_delta: 0 };
    return {
      energy_delta: block.mood_after.energy - block.mood_before.energy,
      mood_delta: block.mood_after.mood - block.mood_before.mood,
      stress_delta: block.mood_before.stress - block.mood_after.stress,
      focus_delta: block.mood_after.focus - block.mood_before.focus
    };
  }

  function calculateEmotionalImpactScore(block) {
    const d = calculateDeltas(block);
    return round1(d.energy_delta * 0.3 + d.mood_delta * 0.3 + d.stress_delta * 0.25 + d.focus_delta * 0.15);
  }

  function calculateRecoveryNeedScore(block) {
    let score = 0;
    if (block.mood_after.stress >= 4 && block.mood_after.energy <= 2) score += 3.5;
    if (block.emotional_impact_score < -1.5) score += 2;
    else if (block.emotional_impact_score < -1) score += 1.25;
    if (block.mood_after.mood <= 2 && block.mood_after.focus <= 2) score += 0.75;
    return Math.max(0, Math.min(5, round1(score)));
  }

  function calculateDailySummary(blocks) {
    const totalMinutes = sum(blocks, "duration_minutes");
    const avgImpact = blocks.length ? round1(sum(blocks, "emotional_impact_score") / blocks.length) : 0;
    const best = blocks.slice().sort((a, b) => b.emotional_impact_score - a.emotional_impact_score)[0];
    const worst = blocks.slice().sort((a, b) => a.emotional_impact_score - b.emotional_impact_score)[0];
    return { totalMinutes, count: blocks.length, avgImpact, best, worst, loadLabel: totalMinutes > 360 ? "Alta" : totalMinutes > 180 ? "Media" : "Suave" };
  }

  function groupBlocksByActivity(blocks) {
    const groups = {};
    blocks.forEach((block) => {
      const key = block.activity_type;
      groups[key] ||= { type: key, label: activityTypes[key].label, blocks: [], total: 0 };
      groups[key].blocks.push(block);
      groups[key].total += block.duration_minutes;
    });
    return Object.values(groups).map((group) => {
      const deltas = group.blocks.map(calculateDeltas);
      return {
        ...group,
        energy: avg(deltas.map((d) => d.energy_delta)),
        mood: avg(deltas.map((d) => d.mood_delta)),
        stress: avg(deltas.map((d) => d.stress_delta)),
        focus: avg(deltas.map((d) => d.focus_delta)),
        impact: avg(group.blocks.map((block) => block.emotional_impact_score))
      };
    }).sort((a, b) => b.impact - a.impact);
  }

  function generateInsights(blocks, moodLogs = []) {
    if (!blocks.length && !moodLogs.length) return ["Carga datos de prueba, cerra un bloque o registra un evento para que PulseBlocks empiece a leer patrones."];
    if (!blocks.length) {
      const shift = sum(moodLogs, "impact");
      return [
        `Hoy la bitacora marco un movimiento situacional de ${signed(shift)}.`,
        shift < 0 ? "Hay ruido emocional fuera de los bloques. No es falta de productividad: es contexto pegando en la bateria." : "Hubo eventos que sumaron mood. Conviene mirar que situaciones los habilitaron.",
        "Cuando aparezca un bloque, el balance va a cruzar lo que hiciste con lo que te paso."
      ];
    }
    const groups = groupBlocksByActivity(blocks);
    const best = groups[0];
    const worst = groups[groups.length - 1];
    const returnPerMinute = groups.slice().sort((a, b) => (b.impact / Math.max(1, b.total)) - (a.impact / Math.max(1, a.total)))[0];
    const costly = blocks.filter((block) => block.productive_but_costly);
    const recovery = blocks.filter((block) => block.recovery_need_score >= 3);
    const moodShift = sum(moodLogs, "impact");
    const hardestContext = moodLogs.length ? moodLogs.slice().sort((a, b) => a.impact - b.impact)[0] : null;
    return [
      `Tu mejor actividad por impacto promedio fue ${best.label}: ${signed(best.impact)}. Buena senal para repetir.`,
      `${worst.label} aparece como drenaje silencioso con impacto ${signed(worst.impact)}.`,
      `Tu mayor retorno emocional por minuto vino de ${returnPerMinute.label}. Este bloque fue una palanca.`,
      costly.length ? `Alta produccion, pero ojo: ${costly.length} bloque(s) productivos salieron caros.` : "No hubo bloques productivos pero costosos. El motor no tiro humo.",
      recovery.length ? "Tu agenda pide una estacion de servicio emocional: hay senales de recuperacion pendiente." : "La recuperacion del dia se ve razonable.",
      moodLogs.length ? `Los eventos repentinos movieron el mood ${signed(moodShift)}. ${hardestContext.impact < 0 ? `El golpe mas fuerte vino de ${hardestContext.context}.` : "Hoy jugaron bastante a favor."}` : "Sin bitacora situacional hoy: solo estamos leyendo bloques.",
      `Manana proba ubicar trabajo intenso despues de ${best.label}, cuando la bateria viene mejor predispuesta.`
    ];
  }

  function drawBalanceCharts() {
    drawActivityImpactChart();
    drawMoodTrendChart("moodTrendChart", dayMoodLogs(state.selectedDay));
    drawContextChart("contextChart", dayMoodLogs(state.selectedDay));
    drawQuadrantChart();
  }

  function drawMoodCharts() {
    drawMoodTrendChart("moodImpactChart", dayMoodLogs(state.selectedDay));
    drawContextChart("moodContextBars", dayMoodLogs(state.selectedDay));
  }

  function drawActivityImpactChart() {
    const canvas = document.getElementById("activityImpactChart");
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const { w, h } = canvas._pulseSize;
    const groups = groupBlocksByActivity(dayBlocks(state.selectedDay).filter((block) => block.mood_after)).slice(0, 7);
    drawPanelBase(ctx, w, h, "Impacto promedio");
    if (!groups.length) return drawEmptyChart(ctx, w, h, "Sin bloques completos");
    const pad = 42;
    const center = h / 2;
    const max = Math.max(1, ...groups.map((group) => Math.abs(group.impact)));
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(pad, center);
    ctx.lineTo(w - pad, center);
    ctx.stroke();
    const barH = Math.min(26, (h - pad * 2) / groups.length - 8);
    groups.forEach((group, index) => {
      const y = pad + index * ((h - pad * 2) / groups.length) + 8;
      const x0 = w / 2;
      const width = (Math.abs(group.impact) / max) * (w / 2 - pad - 20);
      const x = group.impact >= 0 ? x0 : x0 - width;
      ctx.fillStyle = group.impact >= 0 ? "rgba(126,237,155,.82)" : "rgba(255,118,118,.82)";
      roundRect(ctx, x, y, width, barH, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(246,247,251,.86)";
      ctx.font = "12px Inter";
      ctx.fillText(group.label.slice(0, 18), pad, y - 4);
      ctx.fillText(signed(group.impact), group.impact >= 0 ? x + width + 6 : x - 34, y + barH - 7);
    });
  }

  function drawMoodTrendChart(id, logs) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const { w, h } = canvas._pulseSize;
    drawPanelBase(ctx, w, h, "Mood acumulado");
    if (!logs.length) return drawEmptyChart(ctx, w, h, "Sin eventos mood");
    const pad = 42;
    const points = [];
    let cumulative = 0;
    logs.forEach((log) => {
      cumulative += log.impact;
      points.push({ value: cumulative, at: log.created_at, log });
    });
    const min = Math.min(-5, ...points.map((p) => p.value));
    const max = Math.max(5, ...points.map((p) => p.value));
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.stroke();
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = pad + (index / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = h - pad - ((point.value - min) / (max - min)) * (h - pad * 2);
      point.x = x;
      point.y = y;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(101,215,187,.9)";
    ctx.lineWidth = 3;
    ctx.stroke();
    points.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = point.log.impact >= 0 ? "rgb(126,237,155)" : "rgb(255,118,118)";
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(246,247,251,.72)";
    ctx.font = "12px Inter";
    ctx.fillText(`Final ${signed(points[points.length - 1].value)}`, pad, 24);
  }

  function drawContextChart(id, logs) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = setupCanvas(canvas);
    const { w, h } = canvas._pulseSize;
    drawPanelBase(ctx, w, h, "Impacto por contexto");
    if (!logs.length) return drawEmptyChart(ctx, w, h, "Sin eventos mood");
    const groups = {};
    logs.forEach((log) => { groups[log.context] = (groups[log.context] || 0) + log.impact; });
    const entries = Object.entries(groups).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
    const pad = 42;
    const max = Math.max(1, ...entries.map((entry) => Math.abs(entry[1])));
    const colW = (w - pad * 2) / entries.length;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.stroke();
    entries.forEach(([label, value], index) => {
      const barMax = h / 2 - pad - 14;
      const height = (Math.abs(value) / max) * barMax;
      const x = pad + index * colW + colW * 0.22;
      const y = value >= 0 ? h / 2 - height : h / 2;
      ctx.fillStyle = value >= 0 ? "rgba(126,237,155,.82)" : "rgba(255,118,118,.82)";
      roundRect(ctx, x, y, colW * 0.54, height, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(246,247,251,.78)";
      ctx.font = "12px Inter";
      ctx.fillText(label.slice(0, 9), x - 4, h - 18);
      ctx.fillText(signed(value), x, value >= 0 ? y - 6 : y + height + 16);
    });
  }

  function drawQuadrantChart() {
    const canvas = document.getElementById("quadrantChart");
    if (!canvas) return;
    const detail = document.getElementById("chartDetail");
    const blocks = dayBlocks(state.selectedDay).filter((block) => block.mood_after);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(320, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    const ctx = canvas.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = rect.width;
    const h = rect.height;
    const pad = 42;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(pad, pad, w - pad * 1.35, h - pad * 1.35);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(w / 2, pad);
    ctx.lineTo(w / 2, h - pad);
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(246,247,251,0.72)";
    ctx.font = "12px Inter";
    ctx.fillText("Palancas", pad + 10, h / 2 - 12);
    ctx.fillText("Nutritivas", w / 2 + 10, h / 2 - 12);
    ctx.fillText("Neutras", pad + 10, h - pad - 12);
    ctx.fillText("Drenajes silenciosos", w / 2 + 10, h - pad - 12);
    ctx.fillText("Duracion", w - 96, h - 12);
    ctx.save();
    ctx.translate(14, 128);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Impacto emocional", 0, 0);
    ctx.restore();
    const maxMinutes = Math.max(60, ...blocks.map((block) => block.duration_minutes));
    const impactMin = -3;
    const impactMax = 3;
    state.chartPoints = blocks.map((block) => {
      const x = pad + (block.duration_minutes / maxMinutes) * (w - pad * 2);
      const y = h - pad - ((block.emotional_impact_score - impactMin) / (impactMax - impactMin)) * (h - pad * 2);
      const color = activityTypes[block.activity_type].color;
      ctx.beginPath();
      ctx.fillStyle = `hsl(${color})`;
      ctx.shadowColor = `hsla(${color}, .55)`;
      ctx.shadowBlur = 14;
      ctx.arc(x, y, block.productive_but_costly ? 8 : 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return { x, y, block };
    });
    canvas.onclick = (event) => {
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const point = state.chartPoints.find((item) => Math.hypot(item.x - x, item.y - y) < 14);
      if (point && detail) detail.innerHTML = `<span class="badge">${escapeHTML(point.block.title)}</span> ${formatMinutes(point.block.duration_minutes)} - impacto ${signed(point.block.emotional_impact_score)}`;
    };
    if (!blocks.length && detail) detail.textContent = "Sin puntos todavia.";
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, rect.width || 320);
    const height = rect.height || 300;
    canvas.width = Math.floor(width * devicePixelRatio);
    canvas.height = Math.floor(height * devicePixelRatio);
    canvas._pulseSize = { w: width, h: height };
    const ctx = canvas.getContext("2d");
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }

  function drawPanelBase(ctx, w, h, label) {
    ctx.fillStyle = "rgba(0,0,0,.14)";
    roundRect(ctx, 0, 0, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(246,247,251,.62)";
    ctx.font = "12px Inter";
    ctx.fillText(label, 16, 22);
  }

  function drawEmptyChart(ctx, w, h, label) {
    ctx.fillStyle = "rgba(246,247,251,.58)";
    ctx.font = "14px Inter";
    ctx.textAlign = "center";
    ctx.fillText(label, w / 2, h / 2);
    ctx.textAlign = "left";
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function loadSeedData() {
    const data = window.PulseBlocksMockData.getMockData();
    state.blocks = data.blocks;
    state.tasks = data.tasks;
    state.moodLogs = data.moodLogs || [];
    state.currentBlock = null;
    state.selectedDay = todayISO();
    ensureRecurringTasks();
    saveState();
    toast("Datos de prueba cargados. Ahora si, aparecen patrones con personalidad.");
    render();
  }

  function clearStorage() {
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    state.blocks = [];
    state.tasks = [];
    state.moodLogs = [];
    state.currentBlock = null;
    state.settings = structuredClone(defaultSettings);
    state.activeTab = "today";
    state.selectedDay = todayISO();
    applySettings();
    toast("Almacenamiento limpio. Volvimos a estado zen.");
    render();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ blocks: state.blocks, tasks: state.tasks, moodLogs: state.moodLogs, currentBlock: state.currentBlock, settings: state.settings }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pulseblocks-export-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!["balance", "mood"].includes(state.activeTab)) state.activeTab = "balance";
    saveState();
    render();
    toast("Preparando PDF. En la ventana que aparece elegi Guardar como PDF.");
    setTimeout(() => window.print(), 180);
  }

  function exportChart(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return toast("No encontre ese grafico para exportar.");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `pulseblocks-${id}-${state.selectedDay}.png`;
    link.click();
    toast("Grafico exportado como PNG.");
  }

  function renderMoodBubble() {
    let mount = document.getElementById("moodBubbleMount");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "moodBubbleMount";
      document.body.appendChild(mount);
    }
    mount.innerHTML = `
      <div class="mood-bubble-wrap no-print">
        ${state.moodPanelOpen ? renderMoodPanel() : ""}
        ${state.taskPanelOpen ? renderQuickTaskPanel() : ""}
        <div class="quick-bubble-row">
          <button class="quick-bubble task-bubble" type="button" data-action="task-bubble" aria-label="Crear tarea"><span>+</span><strong>Tarea</strong></button>
          <button class="quick-bubble mood-bubble" type="button" data-action="mood-bubble" aria-label="Abrir bitacora de sentimientos"><span>+</span><strong>Mood</strong></button>
        </div>
      </div>
    `;
  }

  function renderQuickTaskPanel() {
    return `
      <section class="mood-panel card pad">
        <div class="card-header">
          <div><h2>Tarea rapida</h2><p class="muted">Anotala, programala y segui.</p></div>
          <button class="icon-button" type="button" data-action="close-task-panel" aria-label="Cerrar tarea">x</button>
        </div>
        ${renderTaskForm(null, true)}
      </section>
    `;
  }

  function renderMoodPanel() {
    return `
      <section class="mood-panel card pad">
        <div class="card-header">
          <div><h2>Bitacora rapida</h2><p class="muted">Para cosas repentinas que te suben o te pinchan el mood.</p></div>
          <button class="icon-button" type="button" data-action="close-mood-panel" aria-label="Cerrar bitacora">x</button>
        </div>
        <form class="form-grid" data-form="mood-log">
          <div class="field">
            <label for="situation">¿Que paso?</label>
            <textarea id="situation" name="situation" required placeholder="Ej: mi hijo me dijo una mala palabra, me encerraron con el auto, pedi ayuda y termino mal"></textarea>
          </div>
          <div class="field"><label for="context">Contexto</label><select id="context" name="context">
            <option value="familia">Familia</option><option value="pareja">Pareja</option><option value="calle">Calle / transito</option><option value="trabajo">Trabajo</option><option value="cuerpo">Cuerpo</option><option value="otro">Otro</option>
          </select></div>
          <div class="range-wrap">
            <div class="range-head"><span>Impacto en mood</span><span data-range-value="impact">0</span></div>
            <div class="range-control">
              <span class="range-feedback" aria-hidden="true"></span>
              <input type="range" min="-5" max="5" value="0" name="impact" data-metric="impact" aria-label="Impacto en mood">
            </div>
          </div>
          <div class="field"><label>Que aparecio?</label><div class="chip-row">${feelingTags.map((tag) => `<button class="chip" type="button" data-action="tag" data-tag="${tag}">${tag}</button>`).join("")}</div></div>
          <div class="field"><label for="bodySignal">Senal corporal</label><input id="bodySignal" name="body_signal" placeholder="Ej: pecho apretado, mandibula dura, alivio"></div>
          <div class="field"><label for="moodNote">Nota opcional</label><textarea id="moodNote" name="note" placeholder="Que necesitabas en ese momento?"></textarea></div>
          <button class="primary-button" type="submit">Guardar evento</button>
        </form>
      </section>
    `;
  }

  function renderUnifiedTimeline(blocks, moodLogs) {
    const items = [
      ...blocks.map((block) => ({ type: "block", at: block.start_time, html: renderBlockItem(block) })),
      ...moodLogs.map((log) => ({ type: "mood", at: log.created_at, html: renderMoodLogItem(log) }))
    ].sort((a, b) => new Date(a.at) - new Date(b.at));
    return items.length ? items.map((item) => item.html).join("") : `<div class="empty">No hay bloques ni eventos para este dia.</div>`;
  }

  function renderBlockItem(block) {
    const type = activityTypes[block.activity_type] || activityTypes.personal;
    return `
      <div class="list-item">
        <div class="item-top">
          <div>
            <div class="item-title"><span class="dot" style="--dot-color:${type.color}"></span>${escapeHTML(block.title)}</div>
            <div class="muted">${formatTime(block.start_time)} - ${formatMinutes(block.duration_minutes)} - ${type.label}</div>
          </div>
          <div class="timer-meta">
            <span class="badge ${block.emotional_impact_score > 0.5 ? "good" : block.emotional_impact_score < -0.5 ? "bad" : ""}">${signed(block.emotional_impact_score)}</span>
            ${block.productive_but_costly ? `<span class="badge warn">Productivo pero costoso</span>` : ""}
            <button class="chip no-print" type="button" data-action="edit-block" data-id="${block.id}">Editar</button>
          </div>
        </div>
        <div class="chip-row">${(block.emotional_tags || []).map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}</div>
        ${state.editingBlockId === block.id ? renderEditBlockForm(block) : ""}
      </div>
    `;
  }

  function renderEditBlockForm(block) {
    const before = block.mood_before || { energy: 3, mood: 3, stress: 3, focus: 3 };
    const after = block.mood_after || { energy: 3, mood: 3, stress: 3, focus: 3 };
    const associatedTask = state.tasks.find((task) => task.id === block.task_id);
    return `
      <form class="edit-block-form form-grid no-print" data-form="edit-block">
        <input type="hidden" name="id" value="${block.id}">
        <div class="form-row">
          <div class="field"><label>Titulo</label><input name="title" value="${escapeHTML(block.title)}"></div>
          <div class="field"><label>Actividad</label><select name="activity_type">${Object.entries(activityTypes).map(([id, type]) => `<option value="${id}" ${id === block.activity_type ? "selected" : ""}>${type.label}</option>`).join("")}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Inicio</label><input type="datetime-local" name="start_time" value="${toDateTimeLocal(block.start_time)}"></div>
          <div class="field"><label>Fin</label><input type="datetime-local" name="end_time" value="${toDateTimeLocal(block.end_time)}"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Tarea asociada</label><select name="task_id" data-task-select><option value="">Sin tarea</option>${state.tasks.map((task) => `<option value="${task.id}" ${task.id === block.task_id ? "selected" : ""}>${escapeHTML(task.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Estado</label><select name="completion_level">
            ${["completed", "advanced", "blocked", "cancelled"].map((status) => `<option value="${status}" ${status === block.completion_level ? "selected" : ""}>${translateStatus(status)}</option>`).join("")}
          </select></div>
        </div>
        <div class="field"><label>Nombre de la tarea asociada</label><input name="task_title" data-task-title-input value="${escapeHTML(associatedTask?.title || "")}" ${associatedTask ? "" : "disabled"} placeholder="Selecciona una tarea para editar su nombre"></div>
        <h3>Mood inicial</h3>
        ${renderMoodInputs("before", before)}
        <h3>Mood final</h3>
        ${renderMoodInputs("after", after)}
        <div class="field"><label>Tags emocionales</label><div class="chip-row">${emotionalTags.map((tag) => `<button class="chip ${(block.emotional_tags || []).includes(tag) ? "selected" : ""}" type="button" data-action="tag" data-tag="${tag}">${tag}</button>`).join("")}</div></div>
        <div class="field"><label>Nota</label><textarea name="note">${escapeHTML(block.note || "")}</textarea></div>
        <div class="action-row">
          <button class="primary-button" type="submit">Guardar cambios</button>
          <button class="ghost-button" type="button" data-action="cancel-edit-block">Cancelar</button>
        </div>
      </form>
    `;
  }

  function renderEditCurrentBlockForm(block) {
    const associatedTask = state.tasks.find((task) => task.id === block.task_id);
    return `
      <form class="edit-block-form form-grid no-print" data-form="edit-current-block">
        <input type="hidden" name="id" value="${block.id}">
        <div class="form-row">
          <div class="field"><label>Titulo del bloque</label><input name="title" required value="${escapeHTML(block.title)}"></div>
          <div class="field"><label>Actividad</label><select name="activity_type">${Object.entries(activityTypes).map(([id, type]) => `<option value="${id}" ${id === block.activity_type ? "selected" : ""}>${type.label}</option>`).join("")}</select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Tarea asociada</label><select name="task_id" data-task-select><option value="">Sin tarea</option>${state.tasks.map((task) => `<option value="${task.id}" ${task.id === block.task_id ? "selected" : ""}>${escapeHTML(task.title)}</option>`).join("")}</select></div>
          <div class="field"><label>Nombre de la tarea</label><input name="task_title" data-task-title-input value="${escapeHTML(associatedTask?.title || "")}" ${associatedTask ? "" : "disabled"} placeholder="Selecciona una tarea para editarla"></div>
        </div>
        <div class="action-row">
          <button class="primary-button" type="submit">Guardar cambios</button>
          <button class="ghost-button" type="button" data-action="cancel-edit-block">Cancelar</button>
        </div>
      </form>
    `;
  }

  function renderMoodLogItem(log) {
    const deleteKey = `mood:${log.id}`;
    return `
      <div class="list-item mood-log-item">
        <div class="item-top">
          <div>
            <div class="item-title"><span class="mood-pip ${log.impact >= 0 ? "up" : "down"}">${log.impact >= 0 ? "+" : "-"}</span>${escapeHTML(log.situation)}</div>
            <div class="muted">${formatTime(log.created_at)} - ${escapeHTML(log.context)}${log.body_signal ? ` - ${escapeHTML(log.body_signal)}` : ""}</div>
          </div>
          <span class="badge ${log.impact >= 0 ? "good" : "bad"}">Mood ${signed(log.impact)}</span>
        </div>
        <div class="chip-row">${(log.tags || []).map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}</div>
        <div class="action-row no-print">
          <button class="chip" type="button" data-action="edit-mood" data-id="${log.id}">Editar</button>
          <button class="${state.confirmDeleteKey === deleteKey ? "danger-button" : "chip"}" type="button" data-action="${state.confirmDeleteKey === deleteKey ? "confirm-delete-mood" : "ask-delete"}" data-kind="mood" data-id="${log.id}">${state.confirmDeleteKey === deleteKey ? "Confirmar eliminar" : "Eliminar"}</button>
        </div>
        ${state.editingMoodId === log.id ? renderEditMoodForm(log) : ""}
      </div>
    `;
  }

  function renderEditMoodForm(log) {
    return `
      <form class="edit-block-form form-grid no-print" data-form="edit-mood">
        <input type="hidden" name="id" value="${log.id}">
        <div class="field"><label>¿Que paso?</label><textarea name="situation" required>${escapeHTML(log.situation)}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Contexto</label><select name="context">${["familia", "pareja", "calle", "trabajo", "cuerpo", "otro"].map((context) => `<option value="${context}" ${log.context === context ? "selected" : ""}>${context}</option>`).join("")}</select></div>
          <div class="range-wrap"><div class="range-head"><span>Impacto</span><span data-range-value="impact">${log.impact}</span></div><div class="range-control"><span class="range-feedback" aria-hidden="true"></span><input type="range" min="-5" max="5" value="${log.impact}" name="impact" data-metric="impact"></div></div>
        </div>
        <div class="field"><label>Que aparecio</label><div class="chip-row">${feelingTags.map((tag) => `<button class="chip ${(log.tags || []).includes(tag) ? "selected" : ""}" type="button" data-action="tag" data-tag="${tag}">${tag}</button>`).join("")}</div></div>
        <div class="field"><label>Senal corporal</label><input name="body_signal" value="${escapeHTML(log.body_signal || "")}"></div>
        <div class="field"><label>Nota</label><textarea name="note">${escapeHTML(log.note || "")}</textarea></div>
        <div class="action-row"><button class="primary-button" type="submit">Guardar cambios</button><button class="ghost-button" type="button" data-action="cancel-edit-mood">Cancelar</button></div>
      </form>
    `;
  }

  function renderMatrix(groups) {
    if (!groups.length) return `<div class="empty">Sin matriz por ahora.</div>`;
    return `<table><thead><tr><th>Actividad</th><th>Tiempo</th><th>Energia</th><th>Animo</th><th>Estres</th><th>Foco</th><th>Impacto</th><th>Bloques</th></tr></thead><tbody>
      ${groups.map((g) => `<tr><td>${g.label}</td><td>${formatMinutes(g.total)}</td><td>${signed(g.energy)}</td><td>${signed(g.mood)}</td><td>${signed(g.stress)}</td><td>${signed(g.focus)}</td><td>${signed(g.impact)}</td><td>${g.blocks.length}</td></tr>`).join("")}
    </tbody></table>`;
  }

  function renderStat(label, value) {
    return `<div class="stat"><span>${label}</span><strong>${escapeHTML(String(value))}</strong></div>`;
  }

  function renderDaySummary(day) {
    const blocks = dayBlocks(day).filter((block) => block.mood_after);
    const moodLogs = dayMoodLogs(day);
    const summary = calculateDailySummary(blocks);
    const costly = blocks.filter((block) => block.productive_but_costly).length;
    const moodShift = sum(moodLogs, "impact");
    return `<button class="list-item" type="button" data-action="history-day" data-day="${day}">
      <div class="item-top"><strong>${formatDate(day)}</strong><span class="badge">${formatMinutes(summary.totalMinutes)}</span></div>
      <div class="muted">Impacto ${signed(summary.avgImpact)} - mood ${signed(moodShift)} - ${costly} costosos</div>
    </button>`;
  }

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function moodFromData(data, prefix) {
    return { energy: Number(data.get(`${prefix}_energy`)), mood: Number(data.get(`${prefix}_mood`)), stress: Number(data.get(`${prefix}_stress`)), focus: Number(data.get(`${prefix}_focus`)) };
  }
  function elapsedSeconds(block) {
    const end = block.paused && block.pauseStartedAt ? new Date(block.pauseStartedAt).getTime() : Date.now();
    return Math.max(0, Math.floor((end - new Date(block.start_time).getTime()) / 1000) - (block.pausedSeconds || 0));
  }
  function startTicker() {
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      const el = document.getElementById("timerDisplay");
      if (el && state.currentBlock) el.textContent = formatSeconds(elapsedSeconds(state.currentBlock));
    }, 1000);
  }
  function dayBlocks(day) {
    return state.blocks.filter((block) => dayKey(block.start_time) === day).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }
  function dayMoodLogs(day) {
    return state.moodLogs.filter((log) => dayKey(log.created_at) === day).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  function dayKey(iso) {
    return localISO(new Date(iso));
  }
  function lastDays(count) {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      return localISO(date);
    });
  }
  function todayISO() { return localISO(new Date()); }
  function localISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function formatTime(iso) { return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
  function formatDate(day) { return new Date(`${day}T12:00:00`).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" }); }
  function formatDateTime(iso) { return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }
  function formatSeconds(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function toDateTimeLocal(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
  function fromDateTimeLocal(value) {
    return value ? new Date(value).toISOString() : null;
  }
  function showRangeFeedback(input) {
    const feedback = input.closest(".range-control")?.querySelector(".range-feedback");
    if (!feedback) return;
    const value = Number(input.value);
    const min = Number(input.min);
    const max = Number(input.max);
    const percent = ((value - min) / Math.max(1, max - min)) * 100;
    feedback.textContent = describeRange(input.dataset.metric || input.name, value);
    feedback.style.left = `${percent}%`;
    feedback.classList.toggle("edge-left", percent <= 5);
    feedback.classList.toggle("edge-right", percent >= 95);
    feedback.classList.add("visible");
    clearTimeout(input._feedbackTimer);
    input._feedbackTimer = setTimeout(() => feedback.classList.remove("visible"), 1500);
  }
  function describeRange(metric, value) {
    const scale = {
      energy: ["Agotado", "Energia baja", "Energia media", "Con energia", "Energia muy alta"],
      mood: ["Animo muy bajo", "Animo bajo", "Animo neutro", "Buen animo", "Animo muy alto"],
      stress: ["Muy tranquilo", "Poca tension", "Estres medio", "Estres alto", "Estres muy alto"],
      focus: ["Muy disperso", "Poco foco", "Foco funcional", "Buen foco", "Foco total"]
    };
    if (metric === "impact") {
      if (value <= -4) return "Golpe muy fuerte";
      if (value <= -2) return "Impacto negativo";
      if (value < 0) return "Molestia leve";
      if (value === 0) return "Sin cambio";
      if (value < 2) return "Suma un poco";
      if (value < 4) return "Impacto positivo";
      return "Alegria muy fuerte";
    }
    return (scale[metric] || [])[Math.max(0, Math.min(4, value - 1))] || String(value);
  }
  function signed(value) { return `${value > 0 ? "+" : ""}${round1(value)}`; }
  function round1(value) { return Math.round(value * 10) / 10; }
  function avg(values) { return values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0; }
  function sum(items, key) { return items.reduce((total, item) => total + (Number(item[key]) || 0), 0); }
  function taskTitle(id) { return (state.tasks.find((task) => task.id === id) || {}).title || "Tarea"; }
  function translateStatus(status) { return ({ pending: "Pendiente", in_progress: "En progreso", completed: "Completada", blocked: "Bloqueada", advanced: "Avance", cancelled: "Cancelado" })[status] || status; }
  function translatePriority(priority) { return ({ low: "baja", medium: "media", high: "alta" })[priority] || priority; }
  function recurrenceLabel(value) { return ({ daily: "diaria", weekdays: "dias habiles", weekly: "semanal", none: "sin repetir" })[value] || value; }
  function feedbackFor(block) {
    if (block.productive_but_costly) return "Alta produccion, pero ojo: hay humo saliendo del motor.";
    if (block.emotional_impact_score > 0.6) return "Este bloque te sumo energia. Buena senal para repetir.";
    if (block.emotional_impact_score < -0.6) return "Bloque costoso. Tu bateria pide que la miren con respeto.";
    return "Bloque estable. No dreno, no disparo fuegos artificiales.";
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }
  function toast(message) {
    const region = document.getElementById("toastRegion");
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    region.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }
  function icon(name) {
    const icons = {
      sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
      check: '<svg viewBox="0 0 24 24"><path d="m4 12 4 4L20 6"/></svg>',
      chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-7"/></svg>',
      archive: '<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M6 7v13h12V7"/><path d="M9 11h6"/></svg>'
      ,settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>'
    };
    return icons[name] || icons.sun;
  }

  window.addEventListener("DOMContentLoaded", init);
})();
