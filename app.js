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
    { id: "history", label: "Historial", icon: "archive" }
  ];

  const emotionalTags = ["En foco", "Satisfecho", "Cansado", "Ansioso", "Liviano", "Frustrado", "Motivado", "Saturado", "Tranquilo", "Disperso"];
  const feelingTags = ["Herido", "Enojado", "Asustado", "Triste", "Agradecido", "Culpable", "Aliviado", "Orgulloso", "Solo", "Acompanado", "Desbordado"];
  const quickStarts = [
    { type: "deep_work", title: "Foco 25'", mood: { energy: 4, mood: 3, stress: 2, focus: 4 } },
    { type: "admin", title: "Tramite express", mood: { energy: 3, mood: 3, stress: 3, focus: 3 } },
    { type: "rest", title: "Reset suave", mood: { energy: 2, mood: 3, stress: 4, focus: 2 } },
    { type: "exercise", title: "Mover el cuerpo", mood: { energy: 3, mood: 3, stress: 3, focus: 2 } }
  ];
  const state = { blocks: [], tasks: [], moodLogs: [], currentBlock: null, activeTab: "today", selectedDay: todayISO(), timerId: null, chartPoints: [], moodPanelOpen: false };

  function init() {
    loadState();
    bindGlobalEvents();
    render();
    startTicker();
  }

  function loadState() {
    state.blocks = readJSON(STORAGE.blocks, []);
    state.tasks = readJSON(STORAGE.tasks, []);
    state.moodLogs = readJSON(STORAGE.moodLogs, []);
    state.currentBlock = readJSON(STORAGE.currentBlock, null);
    const settings = readJSON(STORAGE.settings, {});
    state.activeTab = settings.activeTab || "today";
    state.selectedDay = settings.selectedDay || todayISO();
  }

  function saveState() {
    localStorage.setItem(STORAGE.blocks, JSON.stringify(state.blocks));
    localStorage.setItem(STORAGE.tasks, JSON.stringify(state.tasks));
    localStorage.setItem(STORAGE.moodLogs, JSON.stringify(state.moodLogs));
    localStorage.setItem(STORAGE.currentBlock, JSON.stringify(state.currentBlock));
    localStorage.setItem(STORAGE.settings, JSON.stringify({ activeTab: state.activeTab, selectedDay: state.selectedDay }));
  }

  function render() {
    renderTabs();
    document.getElementById("sidebarDate").textContent = formatDate(todayISO());
    document.getElementById("pageTitle").textContent = tabs.find((tab) => tab.id === state.activeTab).label;
    const app = document.getElementById("app");
    if (state.activeTab === "today") app.innerHTML = renderToday();
    if (state.activeTab === "mood") app.innerHTML = renderMood();
    if (state.activeTab === "tasks") app.innerHTML = renderTasks();
    if (state.activeTab === "balance") app.innerHTML = renderBalance();
    if (state.activeTab === "history") app.innerHTML = renderHistory();
    renderMoodBubble();
    if (state.activeTab === "balance") requestAnimationFrame(drawBalanceCharts);
    if (state.activeTab === "mood") requestAnimationFrame(drawMoodCharts);
  }

  function renderTabs() {
    document.getElementById("tabs").innerHTML = tabs.map((tab) => `
      <button class="tab-button ${state.activeTab === tab.id ? "active" : ""}" type="button" data-action="tab" data-tab="${tab.id}">
        <span class="tab-icon">${icon(tab.icon)}</span><span>${tab.label}</span>
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
            <button class="primary-button" type="button" data-action="open-finish">Finalizar</button>
            <button class="danger-button" type="button" data-action="cancel-block">Cancelar bloque</button>
          </div>
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
        <input type="range" min="1" max="5" value="${values[key]}" name="${prefix}_${key}" aria-label="${label}">
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
    return `
      <div class="grid two-col">
        <section class="card pad">
          <div class="card-header"><div><h2>Nueva tarea</h2><p class="muted">Simple, accionable y lista para asociar a un bloque.</p></div></div>
          <form class="form-grid" data-form="create-task">
            <div class="field"><label for="taskTitle">Titulo</label><input id="taskTitle" name="title" required placeholder="Ej: ordenar la estrategia de manana"></div>
            <div class="field"><label for="taskCategory">Categoria</label><select id="taskCategory" name="category">${Object.values(activityTypes).map((type) => `<option>${type.label}</option>`).join("")}</select></div>
            <div class="field"><label for="priority">Prioridad</label><select id="priority" name="priority"><option value="medium">Media</option><option value="high">Alta</option><option value="low">Baja</option></select></div>
            <button class="primary-button" type="submit">Crear tarea</button>
          </form>
        </section>
        <section class="card pad">
          <div class="card-header"><div><h2>Tareas</h2><p class="muted">Estados claros para que nada quede flotando en la cabeza.</p></div></div>
          <div class="task-list">${state.tasks.length ? state.tasks.map(renderTaskItem).join("") : `<div class="empty">No hay tareas. Silencio raro, pero aprovechable.</div>`}</div>
        </section>
      </div>
    `;
  }

  function renderTaskItem(task) {
    return `
      <div class="list-item">
        <div class="item-top">
          <div><div class="item-title">${escapeHTML(task.title)}</div><div class="muted">${task.category} - prioridad ${translatePriority(task.priority)}</div></div>
          <span class="badge ${task.status === "completed" ? "good" : task.status === "blocked" ? "bad" : ""}">${translateStatus(task.status)}</span>
        </div>
        <div class="action-row">
          ${["pending", "in_progress", "completed", "blocked"].map((status) => `<button class="chip ${task.status === status ? "selected" : ""}" type="button" data-action="task-status" data-id="${task.id}" data-status="${status}">${translateStatus(status)}</button>`).join("")}
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
    if (action === "load-seed") loadSeedData();
    if (action === "clear-storage") clearStorage();
    if (action === "export-json") exportJSON();
    if (action === "export-pdf") exportPDF();
    if (action === "export-chart") exportChart(target.dataset.chart);
    if (action === "quick-start") quickStartBlock(target.dataset.type, target.dataset.title);
    if (action === "mood-bubble") { state.moodPanelOpen = !state.moodPanelOpen; renderMoodBubble(); }
    if (action === "close-mood-panel") { state.moodPanelOpen = false; renderMoodBubble(); }
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
    if (form.dataset.form === "create-task") createTask(new FormData(form));
    if (form.dataset.form === "mood-log") createMoodLog(form, new FormData(form));
  }

  function handleInput(event) {
    if (event.target.matches("input[type='range']")) {
      const value = document.querySelector(`[data-range-value="${event.target.name}"]`);
      if (value) value.textContent = event.target.value;
    }
    if (event.target.matches("[data-action='select-day']")) {
      state.selectedDay = event.target.value || todayISO();
      saveState();
      render();
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

  function createTask(data) {
    const title = data.get("title").trim();
    if (!title) return;
    state.tasks.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`,
      title,
      status: "pending",
      priority: data.get("priority"),
      category: data.get("category"),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    saveState();
    toast("Tarea creada. Ya tiene una casa y dejo de rondar por la cabeza.");
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

  function updateTaskStatus(id, status, shouldRender = true) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.status = status;
    task.updated_at = new Date().toISOString();
    saveState();
    if (shouldRender) render();
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
    state.activeTab = "today";
    state.selectedDay = todayISO();
    toast("Almacenamiento limpio. Volvimos a estado zen.");
    render();
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ blocks: state.blocks, tasks: state.tasks, moodLogs: state.moodLogs, currentBlock: state.currentBlock }, null, 2)], { type: "application/json" });
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
        <button class="mood-bubble" type="button" data-action="mood-bubble" aria-label="Abrir bitacora de sentimientos">
          <span>+</span><strong>Mood</strong>
        </button>
      </div>
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
            <input type="range" min="-5" max="5" value="0" name="impact" aria-label="Impacto en mood">
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
          </div>
        </div>
        <div class="chip-row">${(block.emotional_tags || []).map((tag) => `<span class="badge">${escapeHTML(tag)}</span>`).join("")}</div>
      </div>
    `;
  }

  function renderMoodLogItem(log) {
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
      </div>
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
  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }
  function formatSeconds(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  function signed(value) { return `${value > 0 ? "+" : ""}${round1(value)}`; }
  function round1(value) { return Math.round(value * 10) / 10; }
  function avg(values) { return values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0; }
  function sum(items, key) { return items.reduce((total, item) => total + (Number(item[key]) || 0), 0); }
  function taskTitle(id) { return (state.tasks.find((task) => task.id === id) || {}).title || "Tarea"; }
  function translateStatus(status) { return ({ pending: "Pendiente", in_progress: "En progreso", completed: "Completada", blocked: "Bloqueada", advanced: "Avance", cancelled: "Cancelado" })[status] || status; }
  function translatePriority(priority) { return ({ low: "baja", medium: "media", high: "alta" })[priority] || priority; }
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
    };
    return icons[name] || icons.sun;
  }

  window.addEventListener("DOMContentLoaded", init);
})();
