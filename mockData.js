(function () {
  const activityTypes = {
    deep_work: "Trabajo intenso",
    light_work: "Trabajo liviano",
    meeting: "Reunion",
    admin: "Administrativo",
    study: "Estudio",
    exercise: "Actividad fisica",
    leisure: "Ocio",
    family: "Familia / vinculos",
    rest: "Descanso",
    personal: "Personal"
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dayISO(offset) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function at(dayOffset, time) {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  }

  function addMinutes(iso, minutes) {
    return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
  }

  function metric(before, after) {
    const energyDelta = after.energy - before.energy;
    const moodDelta = after.mood - before.mood;
    const stressDelta = before.stress - after.stress;
    const focusDelta = after.focus - before.focus;
    return Math.round((energyDelta * 0.3 + moodDelta * 0.3 + stressDelta * 0.25 + focusDelta * 0.15) * 10) / 10;
  }

  function recovery(after, score) {
    let value = 0;
    if (after.stress >= 4 && after.energy <= 2) value += 3.5;
    if (score < -1.5) value += 2;
    else if (score < -1) value += 1.25;
    if (after.focus <= 2 && after.mood <= 2) value += 0.75;
    return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
  }

  function block(index, dayOffset, start, minutes, type, title, before, after, status, tags, taskId, note) {
    const startTime = at(dayOffset, start);
    const endTime = addMinutes(startTime, minutes);
    const score = metric(before, after);
    const completed = status === "completed" || status === "advanced";
    return {
      id: `mock-block-${dayISO(dayOffset)}-${index}`,
      title,
      activity_type: type,
      category: activityTypes[type],
      task_id: taskId || null,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: minutes,
      status,
      completion_level: status,
      mood_before: before,
      mood_after: after,
      emotional_tags: tags,
      context_tags: [type, minutes > 75 ? "largo" : "corto"],
      perceived_value: score > 1 ? 5 : score > 0 ? 4 : 3,
      difficulty: type === "deep_work" || type === "meeting" ? 4 : 2,
      autonomy: type === "meeting" ? 2 : 4,
      emotional_impact_score: score,
      productive_but_costly: completed && score < -1,
      recovery_need_score: recovery(after, score),
      note,
      created_at: startTime,
      updated_at: endTime
    };
  }

  function task(id, title, status, priority, category, offset) {
    return {
      id,
      title,
      status,
      priority,
      category,
      created_at: at(offset, "08:00"),
      updated_at: at(offset, "08:00")
    };
  }

  function moodLog(index, dayOffset, time, situation, context, impact, tags, bodySignal, note) {
    const created = at(dayOffset, time);
    return {
      id: `mock-mood-${dayISO(dayOffset)}-${index}`,
      situation,
      context,
      impact,
      body_signal: bodySignal,
      tags,
      note,
      created_at: created,
      updated_at: created
    };
  }

  function getMockData() {
    const tasks = [
      task("task-1", "Redisenar propuesta de producto", "in_progress", "high", "Trabajo intenso", -2),
      task("task-2", "Cerrar pendientes administrativos", "pending", "medium", "Administrativo", -4),
      task("task-3", "Preparar reunion semanal", "completed", "medium", "Reunion", -5),
      task("task-4", "Leer modulo de investigacion", "pending", "low", "Estudio", -3),
      task("task-5", "Planificar entrenamiento", "completed", "low", "Actividad fisica", -6),
      task("task-6", "Ordenar inbox", "blocked", "medium", "Trabajo liviano", -1),
      task("task-7", "Escribir brief creativo", "in_progress", "high", "Trabajo intenso", 0),
      task("task-8", "Agenda familiar del finde", "pending", "low", "Familia / vinculos", 0)
    ];

    const blocks = [
      block(1, 0, "08:40", 70, "deep_work", "Brief creativo con foco limpio", { energy: 4, mood: 4, stress: 2, focus: 4 }, { energy: 4, mood: 5, stress: 2, focus: 5 }, "advanced", ["En foco", "Motivado"], "task-7", "Manana rinde mas que tarde."),
      block(2, 0, "11:30", 95, "meeting", "Sincronizacion larga de equipo", { energy: 4, mood: 4, stress: 2, focus: 4 }, { energy: 2, mood: 2, stress: 5, focus: 2 }, "completed", ["Cansado", "Saturado"], "task-3", "Demasiadas decisiones juntas."),
      block(3, 0, "15:10", 45, "exercise", "Caminata fuerte", { energy: 2, mood: 3, stress: 4, focus: 2 }, { energy: 4, mood: 4, stress: 2, focus: 3 }, "completed", ["Liviano", "Tranquilo"], null, "Reseteo real."),
      block(4, 0, "20:45", 60, "leisure", "Scroll nocturno", { energy: 2, mood: 3, stress: 2, focus: 2 }, { energy: 1, mood: 2, stress: 3, focus: 1 }, "completed", ["Disperso"], null, "Descanso que no descanso."),

      block(5, -1, "09:00", 80, "deep_work", "Arquitectura de metricas", { energy: 4, mood: 4, stress: 2, focus: 5 }, { energy: 4, mood: 5, stress: 1, focus: 5 }, "completed", ["En foco", "Satisfecho"], "task-1", "Bloque palanca."),
      block(6, -1, "14:20", 120, "deep_work", "Pulir presentacion tarde", { energy: 3, mood: 3, stress: 3, focus: 3 }, { energy: 1, mood: 2, stress: 5, focus: 2 }, "completed", ["Cansado", "Ansioso"], "task-1", "Productivo, pero caro."),
      block(7, -1, "18:10", 35, "rest", "Siesta corta", { energy: 1, mood: 2, stress: 4, focus: 1 }, { energy: 3, mood: 3, stress: 2, focus: 3 }, "completed", ["Liviano"], null, "Necesaria."),

      block(8, -2, "08:30", 60, "exercise", "Entrenamiento suave", { energy: 3, mood: 3, stress: 3, focus: 2 }, { energy: 5, mood: 4, stress: 1, focus: 4 }, "completed", ["Motivado", "Tranquilo"], "task-5", "Excelente retorno."),
      block(9, -2, "10:00", 75, "deep_work", "Escritura de estrategia", { energy: 5, mood: 4, stress: 1, focus: 5 }, { energy: 4, mood: 5, stress: 2, focus: 5 }, "completed", ["En foco", "Satisfecho"], "task-1", "Entrenar antes ayudo."),
      block(10, -2, "16:30", 50, "admin", "Facturas y tramites", { energy: 3, mood: 4, stress: 2, focus: 3 }, { energy: 2, mood: 3, stress: 3, focus: 2 }, "advanced", ["Disperso"], "task-2", "Baja energia."),

      block(11, -3, "09:15", 65, "study", "Lectura concentrada", { energy: 4, mood: 3, stress: 2, focus: 4 }, { energy: 4, mood: 4, stress: 2, focus: 5 }, "advanced", ["En foco"], "task-4", "Buen modulo."),
      block(12, -3, "12:00", 100, "meeting", "Revision con stakeholders", { energy: 4, mood: 4, stress: 2, focus: 4 }, { energy: 2, mood: 2, stress: 5, focus: 2 }, "completed", ["Saturado", "Frustrado"], null, "Demasiado larga."),
      block(13, -3, "19:00", 55, "family", "Cena con familia", { energy: 2, mood: 2, stress: 4, focus: 2 }, { energy: 3, mood: 5, stress: 2, focus: 3 }, "completed", ["Satisfecho", "Tranquilo"], "task-8", "Subio animo."),

      block(14, -4, "08:45", 90, "deep_work", "Prototipo del dashboard", { energy: 4, mood: 4, stress: 2, focus: 5 }, { energy: 4, mood: 5, stress: 2, focus: 5 }, "completed", ["En foco", "Motivado"], null, "Manana ganadora."),
      block(15, -4, "13:40", 40, "light_work", "Responder mensajes", { energy: 3, mood: 3, stress: 3, focus: 3 }, { energy: 3, mood: 3, stress: 3, focus: 3 }, "completed", ["Tranquilo"], "task-6", "Estable."),
      block(16, -4, "17:10", 70, "admin", "Orden documental", { energy: 3, mood: 3, stress: 2, focus: 3 }, { energy: 2, mood: 2, stress: 3, focus: 2 }, "completed", ["Cansado"], "task-2", "No fue terrible, pero drena."),

      block(17, -5, "10:20", 45, "personal", "Plan personal semanal", { energy: 3, mood: 3, stress: 3, focus: 3 }, { energy: 4, mood: 4, stress: 2, focus: 4 }, "completed", ["Satisfecho"], null, "Claridad."),
      block(18, -5, "15:00", 110, "meeting", "Comite extendido", { energy: 4, mood: 3, stress: 3, focus: 3 }, { energy: 1, mood: 1, stress: 5, focus: 1 }, "completed", ["Saturado", "Ansioso"], null, "Drenaje silencioso total."),
      block(19, -5, "21:00", 50, "leisure", "Serie tarde", { energy: 1, mood: 2, stress: 4, focus: 1 }, { energy: 2, mood: 3, stress: 3, focus: 1 }, "completed", ["Liviano"], null, "Recupero algo."),

      block(20, -6, "08:00", 50, "exercise", "Movilidad y cardio", { energy: 2, mood: 3, stress: 4, focus: 2 }, { energy: 5, mood: 5, stress: 1, focus: 4 }, "completed", ["Motivado", "Liviano"], null, "Gran arranque."),
      block(21, -6, "09:20", 85, "deep_work", "Investigacion fuerte", { energy: 5, mood: 5, stress: 1, focus: 5 }, { energy: 4, mood: 5, stress: 1, focus: 5 }, "completed", ["En foco", "Satisfecho"], null, "Peak de semana."),
      block(22, -6, "16:45", 45, "admin", "Carga repetitiva", { energy: 3, mood: 3, stress: 2, focus: 3 }, { energy: 2, mood: 2, stress: 3, focus: 2 }, "advanced", ["Disperso"], null, "Trabajo necesario, poca chispa.")
    ];

    const moodLogs = [
      moodLog(1, 0, "10:50", "Mi hijo me contesto muy mal cuando le pedi que ordenara", "familia", -3, ["Herido", "Enojado"], "pecho apretado", "No era enorme, pero me desarmo el humor."),
      moodLog(2, 0, "13:05", "Mi pareja se enojo cuando pedi ayuda con una tarea domestica", "pareja", -4, ["Solo", "Desbordado"], "mandibula dura", "Necesito pedir ayuda sin entrar en guerra."),
      moodLog(3, 0, "17:30", "Una caminata corta me bajo la intensidad del dia", "cuerpo", 3, ["Aliviado", "Agradecido"], "respiracion mas amplia", "El cuerpo hizo de amortiguador."),
      moodLog(4, -1, "08:10", "Mensaje amable de un colega antes de empezar", "trabajo", 2, ["Acompanado"], "hombros livianos", "Arranque con menos defensa."),
      moodLog(5, -1, "19:20", "Me cruce con un auto que casi me choca y reaccione insultando", "calle", -5, ["Asustado", "Enojado", "Culpable"], "adrenalina", "Quede activado bastante rato."),
      moodLog(6, -2, "21:40", "Charla tranquila en casa despues de cenar", "familia", 3, ["Acompanado", "Aliviado"], "calma", "Recuperacion real."),
      moodLog(7, -3, "14:35", "Comentario seco en una reunion me dejo rumiando", "trabajo", -2, ["Herido"], "nudo en panza", "No fue grave, pero quedo pegado."),
      moodLog(8, -4, "12:20", "Resolvi algo pendiente y senti alivio inmediato", "otro", 2, ["Orgulloso", "Aliviado"], "aire", "Pequena victoria."),
      moodLog(9, -5, "18:45", "Discusion breve de pareja antes de cerrar el dia", "pareja", -3, ["Triste", "Solo"], "cansancio", "Llegue sin resto."),
      moodLog(10, -6, "11:45", "Me felicitaron por un avance concreto", "trabajo", 4, ["Orgulloso", "Agradecido"], "energia", "Refuerzo potente.")
    ];

    return {
      blocks: JSON.parse(JSON.stringify(blocks)),
      tasks: JSON.parse(JSON.stringify(tasks)),
      moodLogs: JSON.parse(JSON.stringify(moodLogs))
    };
  }

  window.PulseBlocksMockData = { getMockData };
})();
