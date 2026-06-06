/**
 * ClassBuddy - Classroom Interactive Tools Core Script
 * Authored with pure Vanilla JS and Web Audio API
 */

document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================================================
  // STATE & DATA STORES (LocalStorage Sync)
  // ==========================================================================
  let state = {
    roster: JSON.parse(localStorage.getItem("classbuddy_roster")) || [
      "林俊傑", "周杰倫", "蔡依林", "張惠妹", "陳奕迅", 
      "王力宏", "鄧紫棋", "蕭敬騰", "楊丞琳", "田馥甄",
      "五月天", "徐佳瑩", "林宥嘉", "韋禮安", "周興哲",
      "張韶涵", "梁靜茹", "戴佩妮", "光良", "品冠"
    ],
    teams: JSON.parse(localStorage.getItem("classbuddy_teams")) || [
      { id: "1", name: "閃電隊", score: 0, color: "#ff5e7e" },
      { id: "2", name: "暴風隊", score: 0, color: "#3b82f6" },
      { id: "3", name: "火焰隊", score: 0, color: "#10b981" },
      { id: "4", name: "寒冰隊", score: 0, color: "#f59e0b" }
    ],
    drawnNames: [],
    soundEnabled: localStorage.getItem("classbuddy_sound") !== "false",
    activeTab: "picker-tab",
    pickerMode: "wheel", // 'wheel' or 'slot'
    isDrawing: false,
    attendance: JSON.parse(localStorage.getItem("classbuddy_attendance")) || {}
  };

  const presetClassA = [
    "陳小明", "林美玲", "張大同", "王智慧", "李強森", 
    "吳美麗", "蔡志明", "趙天宇", "孫悟淨", "豬八戒",
    "沙悟淨", "唐三藏", "劉備", "關羽", "張飛", 
    "曹操", "孫權", "周瑜", "諸葛亮", "司馬懿"
  ];
  
  const presetClassB = [
    "小叮噹", "大雄", "靜香", "胖虎", "小夫", "哆啦美", "小杉", "王聰明"
  ];

  function saveState() {
    localStorage.setItem("classbuddy_roster", JSON.stringify(state.roster));
    localStorage.setItem("classbuddy_teams", JSON.stringify(state.teams));
    localStorage.setItem("classbuddy_sound", state.soundEnabled);
    localStorage.setItem("classbuddy_attendance", JSON.stringify(state.attendance));
    updateRosterCountDisplay();
  }

  // ==========================================================================
  // AUDIO ENGINE (Web Audio API Synthesizer)
  // ==========================================================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playSynthSound(type) {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;

      if (type === "tick") {
        // High click sound for spinner or timer
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
      } 
      else if (type === "click") {
        // Simple menu button click
        osc.type = "triangle";
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.09);
      } 
      else if (type === "scoreUp") {
        // Rising positive sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } 
      else if (type === "scoreDown") {
        // Falling sound
        osc.type = "sine";
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.25);
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.31);
      }
      else if (type === "buzzer") {
        // Low annoying square alarm sound
        osc.type = "square";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(180, now + 0.3);
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
      } 
      else if (type === "win") {
        // Celebratory arpeggio chord chime
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major arpeggio
        notes.forEach((freq, idx) => {
          const oscNode = audioCtx.createOscillator();
          const gainN = audioCtx.createGain();
          oscNode.connect(gainN);
          gainN.connect(audioCtx.destination);
          
          oscNode.type = "triangle";
          oscNode.frequency.setValueAtTime(freq, now + idx * 0.08);
          gainN.gain.setValueAtTime(0, now);
          gainN.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
          gainN.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
          
          oscNode.start(now + idx * 0.08);
          oscNode.stop(now + idx * 0.08 + 0.6);
        });
      }
    } catch(err) {
      console.warn("Audio synthesis error:", err);
    }
  }

  // ==========================================================================
  // TAB NAVIGATION
  // ==========================================================================
  const navBtns = document.querySelectorAll(".nav-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const tabTitle = document.getElementById("current-tab-title");

  const tabTitlesMap = {
    "picker-tab": "班級抽籤工具 🎯",
    "scoreboard-tab": "小組積分榮譽榜 🏆",
    "timer-tab": "上課計時與碼表 ⏳",
    "noise-tab": "教室環境分貝監測 🔊",
    "group-tab": "隨機團隊分組器 👥",
    "rollcall-tab": "線上點名系統 📋"
  };

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      playSynthSound("click");
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    navBtns.forEach(btn => {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    tabPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    state.activeTab = tabId;
    tabTitle.textContent = tabTitlesMap[tabId] || "班級助手";
    
    // Custom actions per tab switch
    if (tabId === "noise-tab") {
      // Noise monitor tab activated
    } else if (tabId === "rollcall-tab") {
      initRollcall();
    } else {
      // Deactivate microphone if moving away from noise tab to save resource/privacy
      stopMicrophone();
    }
  }

  // Sound toggle button click
  const soundToggleBtn = document.getElementById("sound-toggle-btn");
  const soundOnIcon = document.getElementById("sound-on-icon");
  const soundOffIcon = document.getElementById("sound-off-icon");

  function updateSoundIcons() {
    if (state.soundEnabled) {
      soundOnIcon.classList.remove("hidden");
      soundOffIcon.classList.add("hidden");
    } else {
      soundOnIcon.classList.add("hidden");
      soundOffIcon.classList.remove("hidden");
    }
  }
  
  soundToggleBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    updateSoundIcons();
    saveState();
    playSynthSound("tick");
  });

  updateSoundIcons();

  // ==========================================================================
  // STUDENT ROSTER MANAGEMENT MODAL
  // ==========================================================================
  const rosterTriggerBtn = document.getElementById("roster-trigger-btn");
  const rosterModal = document.getElementById("roster-modal");
  const closeRosterBtn = document.getElementById("close-roster-btn");
  const rosterTextarea = document.getElementById("roster-textarea");
  const saveRosterBtn = document.getElementById("save-roster-btn");
  const rosterCountSpan = document.getElementById("roster-count");

  function updateRosterCountDisplay() {
    rosterCountSpan.textContent = state.roster.length;
  }

  rosterTriggerBtn.addEventListener("click", () => {
    playSynthSound("click");
    rosterTextarea.value = state.roster.join("\n");
    rosterModal.classList.add("active");
  });

  closeRosterBtn.addEventListener("click", () => {
    rosterModal.classList.remove("active");
  });

  saveRosterBtn.addEventListener("click", () => {
    const list = rosterTextarea.value
      .split("\n")
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (list.length === 0) {
      alert("名單不能為空！至少需包含一名學生名稱。");
      return;
    }
    
    state.roster = list;
    saveState();
    rosterModal.classList.remove("active");
    playSynthSound("win");
    
    // Re-draw wheel if active
    if (state.activeTab === "picker-tab") {
      initWheel();
    } else if (state.activeTab === "rollcall-tab") {
      initRollcall();
    }
  });

  // Preset Class Loaders
  document.getElementById("preset-class1").addEventListener("click", () => {
    rosterTextarea.value = presetClassA.join("\n");
    playSynthSound("click");
  });
  
  document.getElementById("preset-class2").addEventListener("click", () => {
    rosterTextarea.value = presetClassB.join("\n");
    playSynthSound("click");
  });

  updateRosterCountDisplay();

  // ==========================================================================
  // TAB 1: RANDOM NAME PICKER LOGIC
  // ==========================================================================
  const subTabBtns = document.querySelectorAll("[data-picker-mode]");
  const wheelView = document.getElementById("wheel-view");
  const slotView = document.getElementById("slot-view");
  const drawBtn = document.getElementById("draw-btn");
  const resetPickerBtn = document.getElementById("reset-picker-btn");
  const excludeDrawnChk = document.getElementById("exclude-drawn-chk");
  const drawnCountSpan = document.getElementById("drawn-count");
  const drawnListUl = document.getElementById("drawn-list");
  
  // Winner Reveal Elements
  const winnerModal = document.getElementById("winner-modal");
  const winnerNameDiv = document.getElementById("winner-name");
  const closeWinnerBtn = document.getElementById("close-winner-btn");

  subTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (state.isDrawing) return;
      playSynthSound("click");
      const mode = btn.getAttribute("data-picker-mode");
      
      subTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      if (mode === "wheel") {
        wheelView.classList.add("active");
        slotView.classList.remove("active");
      } else {
        wheelView.classList.remove("active");
        slotView.classList.add("active");
      }
      
      state.pickerMode = mode;
    });
  });

  // CANVAS LUCKY WHEEL DRAWING
  const canvas = document.getElementById("wheel-canvas");
  const ctx = canvas.getContext("2d");
  let startAngle = 0;
  let arc = 0;
  let spinAngleStart = 10;
  let spinTime = 0;
  let spinTimeTotal = 0;
  let selectedStudent = "";
  
  const niceWheelColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4", "#84cc16", "#ef4444"];

  function getEligibleRoster() {
    if (excludeDrawnChk.checked) {
      const remaining = state.roster.filter(name => !state.drawnNames.includes(name));
      return remaining.length > 0 ? remaining : state.roster; // If all drawn, reset automatically
    }
    return state.roster;
  }

  function initWheel() {
    const list = getEligibleRoster();
    arc = Math.PI / (list.length / 2);
    drawWheel();
  }

  function drawWheel() {
    const list = getEligibleRoster();
    const len = list.length;
    
    ctx.clearRect(0, 0, 450, 450);
    
    const outsideRadius = 210;
    const textRadius = 150;
    const insideRadius = 40;
    
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    
    for(let i = 0; i < len; i++) {
      const angle = startAngle + i * arc;
      ctx.fillStyle = niceWheelColors[i % niceWheelColors.length];
      
      ctx.beginPath();
      ctx.arc(225, 225, outsideRadius, angle, angle + arc, false);
      ctx.arc(225, 225, insideRadius, angle + arc, angle, true);
      ctx.stroke();
      ctx.fill();
      
      ctx.save();
      
      // Paint texts
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Outfit, Fredoka, sans-serif";
      ctx.translate(225 + Math.cos(angle + arc / 2) * textRadius, 225 + Math.sin(angle + arc / 2) * textRadius);
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      const text = list[i];
      ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
      ctx.restore();
    }
    
    // Draw Center Bezel Circle
    ctx.fillStyle = "#0f131a";
    ctx.beginPath();
    ctx.arc(225, 225, insideRadius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.stroke();
    
    // Cute small center star or dot
    ctx.fillStyle = varColor("--primary");
    ctx.beginPath();
    ctx.arc(225, 225, 12, 0, Math.PI*2);
    ctx.fill();
  }

  function varColor(cssVarName) {
    return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
  }

  let spinTimeout = null;
  let lastTickAngle = 0;

  function rotateWheel() {
    spinTime += 30;
    if (spinTime >= spinTimeTotal) {
      stopRotateWheel();
      return;
    }
    const spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
    startAngle += (spinAngle * Math.PI / 180);
    drawWheel();
    
    // Audio ticks for wheel spinning
    const currentSegmentIndex = Math.floor((Math.PI * 2 - (startAngle % (Math.PI * 2))) / arc);
    if (currentSegmentIndex !== lastTickAngle) {
      playSynthSound("tick");
      lastTickAngle = currentSegmentIndex;
    }
    
    spinTimeout = requestAnimationFrame(rotateWheel);
  }

  function stopRotateWheel() {
    state.isDrawing = false;
    const list = getEligibleRoster();
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd);
    
    selectedStudent = list[(index + list.length) % list.length];
    revealWinner(selectedStudent);
  }

  function easeOut(t, b, c, d) {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
  }

  // SLOT MACHINE CYLINDER DRAWING
  const slotMachine = document.querySelector(".slot-machine");
  const slotStrip = document.getElementById("slot-strip");
  
  function spinSlot() {
    const list = getEligibleRoster();
    
    // Generate spinning items array randomly
    const totalSpinsCount = 30;
    slotStrip.innerHTML = "";
    
    // Pop slot cylinder with names
    for (let i = 0; i < totalSpinsCount; i++) {
      const item = document.createElement("div");
      item.classList.add("slot-item");
      item.textContent = list[Math.floor(Math.random() * list.length)];
      slotStrip.appendChild(item);
    }
    
    // Place winning final target element at the bottom
    selectedStudent = list[Math.floor(Math.random() * list.length)];
    const finalItem = document.createElement("div");
    finalItem.classList.add("slot-item");
    finalItem.textContent = "🎉 " + selectedStudent;
    slotStrip.appendChild(finalItem);
    
    // Position strip to zero
    slotStrip.style.transition = "none";
    slotStrip.style.transform = "translateY(0px)";
    
    // Force browser reflow to register style reset
    slotStrip.offsetHeight;
    
    // Animate downward pulling physics
    const translateDist = (totalSpinsCount) * 108; // 108px is item height
    slotStrip.style.transition = "transform 3.5s cubic-bezier(0.12, 0.8, 0.2, 1)";
    slotStrip.style.transform = `translateY(-${translateDist}px)`;
    
    // Synthetic rhythmic ticking sound
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      if (tickCount < totalSpinsCount) {
        playSynthSound("tick");
        tickCount++;
      } else {
        clearInterval(tickInterval);
      }
    }, 110);
    
    setTimeout(() => {
      state.isDrawing = false;
      revealWinner(selectedStudent);
    }, 3600);
  }

  // TRIGGER WINNER REVEAL
  function revealWinner(name) {
    if (excludeDrawnChk.checked) {
      if (!state.drawnNames.includes(name)) {
        state.drawnNames.push(name);
        updateDrawnListDisplay();
      }
    }
    
    // Confetti celebration chimes
    playSynthSound("win");
    winnerNameDiv.textContent = name;
    winnerModal.classList.add("active");
  }

  closeWinnerBtn.addEventListener("click", () => {
    winnerModal.classList.remove("active");
    
    // Redraw wheel to reflect excluded state immediately if enabled
    initWheel();
  });

  // Action Draw trigger
  drawBtn.addEventListener("click", () => {
    if (state.isDrawing) return;
    
    const rosterList = getEligibleRoster();
    if (rosterList.length === 0) {
      alert("沒有可抽籤的學生！請在名單管理中新增學生或重置排除清單。");
      return;
    }
    
    state.isDrawing = true;
    
    if (state.pickerMode === "wheel") {
      spinAngleStart = Math.random() * 10 + 10;
      spinTime = 0;
      spinTimeTotal = Math.random() * 3000 + 4000;
      rotateWheel();
    } else {
      // Pull lever animation
      const lever = document.querySelector(".slot-lever");
      lever.classList.add("pulled");
      playSynthSound("click");
      
      setTimeout(() => {
        lever.classList.remove("pulled");
      }, 350);
      
      spinSlot();
    }
  });

  // Exclude drawn behavior change
  excludeDrawnChk.addEventListener("change", () => {
    initWheel();
  });

  // Reset Drawer State
  resetPickerBtn.addEventListener("click", () => {
    playSynthSound("click");
    state.drawnNames = [];
    updateDrawnListDisplay();
    initWheel();
    
    // Reset slot machines text
    slotStrip.style.transition = "none";
    slotStrip.style.transform = "translateY(0px)";
    slotStrip.innerHTML = '<div class="slot-item">❓ 點擊開始</div>';
  });

  function updateDrawnListDisplay() {
    drawnCountSpan.textContent = state.drawnNames.length;
    drawnListUl.innerHTML = "";
    
    if (state.drawnNames.length === 0) {
      drawnListUl.innerHTML = '<li class="empty-text">尚無抽籤紀錄</li>';
      return;
    }
    
    state.drawnNames.forEach((name, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="drawn-index">#${index + 1}</span>
        <span class="drawn-name">${name}</span>
      `;
      drawnListUl.appendChild(li);
    });
    
    // Scroll list to bottom
    drawnListUl.scrollTop = drawnListUl.scrollHeight;
  }

  // Initialize Name Picker wheel
  initWheel();

  // ==========================================================================
  // TAB 2: SCOREBOARD LOGIC
  // ==========================================================================
  const addTeamBtn = document.getElementById("add-team-btn");
  const resetScoresBtn = document.getElementById("reset-scores-btn");
  const autoSortChk = document.getElementById("auto-sort-chk");
  const teamsGrid = document.getElementById("teams-grid");
  
  // Add Team Modal
  const addTeamModal = document.getElementById("add-team-modal");
  const closeAddTeamBtn = document.getElementById("close-add-team-btn");
  const newTeamNameInput = document.getElementById("new-team-name");
  const colorCircles = document.querySelectorAll(".color-circle");
  const saveTeamBtn = document.getElementById("save-team-btn");
  
  let selectedTeamColor = "#ff5e7e";

  colorCircles.forEach(circle => {
    circle.addEventListener("click", () => {
      colorCircles.forEach(c => c.classList.remove("active"));
      circle.classList.add("active");
      selectedTeamColor = circle.getAttribute("data-color");
      playSynthSound("tick");
    });
  });

  addTeamBtn.addEventListener("click", () => {
    playSynthSound("click");
    newTeamNameInput.value = "";
    addTeamModal.classList.add("active");
  });

  closeAddTeamBtn.addEventListener("click", () => {
    addTeamModal.classList.remove("active");
  });

  saveTeamBtn.addEventListener("click", () => {
    const name = newTeamNameInput.value.trim();
    if (!name) {
      alert("請輸入小組名稱！");
      return;
    }
    
    const newTeam = {
      id: Date.now().toString(),
      name: name,
      score: 0,
      color: selectedTeamColor
    };
    
    state.teams.push(newTeam);
    saveState();
    renderTeams();
    addTeamModal.classList.remove("active");
    playSynthSound("win");
  });

  resetScoresBtn.addEventListener("click", () => {
    if (confirm("確定要重置所有小組的分數嗎？")) {
      playSynthSound("scoreDown");
      state.teams.forEach(t => t.score = 0);
      saveState();
      renderTeams();
    }
  });

  autoSortChk.addEventListener("change", () => {
    playSynthSound("click");
    renderTeams();
  });

  function adjustScore(teamId, delta) {
    const team = state.teams.find(t => t.id === teamId);
    if (!team) return;
    
    team.score += delta;
    saveState();
    
    // Play synthesis feedback sounds
    if (delta > 0) {
      playSynthSound("scoreUp");
    } else {
      playSynthSound("scoreDown");
    }
    
    // Trigger milestone celebration confetti for highly positive rounds
    if (team.score > 0 && team.score % 10 === 0 && delta > 0) {
      playSynthSound("win");
    }

    // Dynamic numeric scaling bounce effect
    const scoreDiv = document.querySelector(`[data-team-id="${teamId}"] .team-score`);
    if (scoreDiv) {
      scoreDiv.textContent = team.score;
      const animationClass = delta > 0 ? "animate-up" : "animate-down";
      scoreDiv.classList.add(animationClass);
      
      setTimeout(() => {
        scoreDiv.classList.remove(animationClass);
      }, 200);
    }
    
    // Auto sort grid after updating scores if checked
    if (autoSortChk.checked) {
      setTimeout(() => {
        renderTeams();
      }, 350);
    }
  }

  function deleteTeam(teamId) {
    if (confirm("確定要刪除此組別嗎？")) {
      playSynthSound("scoreDown");
      state.teams = state.teams.filter(t => t.id !== teamId);
      saveState();
      renderTeams();
    }
  }

  function renderTeams() {
    teamsGrid.innerHTML = "";
    
    let displayList = [...state.teams];
    if (autoSortChk.checked) {
      displayList.sort((a, b) => b.score - a.score);
    }
    
    displayList.forEach((team, index) => {
      const card = document.createElement("div");
      card.classList.add("team-card");
      card.setAttribute("data-team-id", team.id);
      
      // Calculate gold, silver, bronze borders for top ranks if sorting enabled
      if (autoSortChk.checked && team.score > 0) {
        if (index === 0) card.style.borderColor = "gold";
        else if (index === 1) card.style.borderColor = "silver";
        else if (index === 2) card.style.borderColor = "#cd7f32";
      }

      card.innerHTML = `
        <div class="team-color-bar" style="background-color: ${team.color}"></div>
        <div class="team-rank">Rank ${index + 1}</div>
        <button class="team-delete-btn" title="刪除小組">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
        <div class="team-name">${team.name}</div>
        <div class="team-score-wrapper">
          <div class="team-score">${team.score}</div>
        </div>
        <div class="team-controls">
          <button class="btn btn-score" onclick="event.stopPropagation(); adjustScore('${team.id}', -1)">-1</button>
          <button class="btn btn-score" onclick="event.stopPropagation(); adjustScore('${team.id}', 1)">+1</button>
          <button class="btn btn-score btn-score-big" onclick="event.stopPropagation(); adjustScore('${team.id}', 5)">🌟 表現優異 +5</button>
        </div>
      `;
      
      card.querySelector(".team-delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteTeam(team.id);
      });
      
      teamsGrid.appendChild(card);
    });
  }

  // Bind local functions to window object for absolute modular ease in onclicks
  window.adjustScore = adjustScore;

  renderTeams();

  // ==========================================================================
  // TAB 3: SMART TIMER & STOPWATCH
  // ==========================================================================
  // COUNTDOWN TIMER
  const timerDisplay = document.getElementById("timer-display");
  const timerProgress = document.getElementById("timer-progress");
  const timerBox = document.querySelector(".timer-box");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const setterMin = document.getElementById("setter-min");
  const setterSec = document.getElementById("setter-sec");
  const applyTimeBtn = document.getElementById("apply-time-btn");
  
  const timerPlayBtn = document.getElementById("timer-play-btn");
  const timerPauseBtn = document.getElementById("timer-pause-btn");
  const timerResetBtn = document.getElementById("timer-reset-btn");

  let timerDuration = 300; // 5 min in seconds default
  let timerTimeLeft = 300;
  let timerInterval = null;
  let isTimerRunning = false;

  // Render Display Strings
  function updateTimerDisplay() {
    const min = Math.floor(timerTimeLeft / 60);
    const sec = timerTimeLeft % 60;
    timerDisplay.textContent = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    
    // Update SVG Stroke Progress ring
    const perimeter = 553; // 2 * PI * 88
    const progress = (timerDuration - timerTimeLeft) / timerDuration;
    const offset = perimeter * progress;
    timerProgress.style.strokeDashoffset = offset;
    
    // Set visual alerts based on time left
    timerBox.classList.remove("warning", "danger");
    if (isTimerRunning) {
      if (timerTimeLeft <= 10) {
        timerBox.classList.add("danger");
      } else if (timerTimeLeft <= 30) {
        timerBox.classList.add("warning");
      }
    }
  }

  function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    timerPlayBtn.disabled = true;
    timerPauseBtn.disabled = false;
    
    let lastTime = performance.now();
    
    function tick(now) {
      if (!isTimerRunning) return;
      
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 1.0) {
        lastTime = now;
        timerTimeLeft--;
        
        // play ticks in final danger zones
        if (timerTimeLeft <= 10 && timerTimeLeft > 0) {
          playSynthSound("tick");
        }
        
        if (timerTimeLeft <= 0) {
          timerTimeLeft = 0;
          stopTimer();
          playSynthSound("buzzer");
          alert("⏱️ 時間到！");
        }
        
        updateTimerDisplay();
      }
      timerInterval = requestAnimationFrame(tick);
    }
    
    timerInterval = requestAnimationFrame(tick);
  }

  function stopTimer() {
    isTimerRunning = false;
    cancelAnimationFrame(timerInterval);
    timerPlayBtn.disabled = false;
    timerPauseBtn.disabled = true;
    timerBox.classList.remove("warning", "danger");
  }

  function resetTimer() {
    stopTimer();
    timerTimeLeft = timerDuration;
    updateTimerDisplay();
  }

  // Event listners for timers
  timerPlayBtn.addEventListener("click", () => {
    playSynthSound("click");
    startTimer();
  });
  
  timerPauseBtn.addEventListener("click", () => {
    playSynthSound("click");
    stopTimer();
  });
  
  timerResetBtn.addEventListener("click", () => {
    playSynthSound("click");
    resetTimer();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      playSynthSound("click");
      const seconds = parseInt(btn.getAttribute("data-time"));
      timerDuration = seconds;
      timerTimeLeft = seconds;
      stopTimer();
      updateTimerDisplay();
    });
  });

  applyTimeBtn.addEventListener("click", () => {
    playSynthSound("click");
    const min = parseInt(setterMin.value) || 0;
    const sec = parseInt(setterSec.value) || 0;
    const totalSec = (min * 60) + sec;
    
    if (totalSec <= 0) {
      alert("時間必須大於0！");
      return;
    }
    
    timerDuration = totalSec;
    timerTimeLeft = totalSec;
    stopTimer();
    updateTimerDisplay();
  });

  // Initial draw
  updateTimerDisplay();

  // STOPWATCH LOGIC
  const swDisplay = document.getElementById("stopwatch-display");
  const swPlayBtn = document.getElementById("sw-play-btn");
  const swLapBtn = document.getElementById("sw-lap-btn");
  const swResetBtn = document.getElementById("sw-reset-btn");
  const lapList = document.getElementById("lap-list");

  let swTime = 0; // milliseconds
  let isSwRunning = false;
  let swInterval = null;
  let lapCounter = 1;

  function updateSwDisplay() {
    const ms = Math.floor((swTime % 1000) / 10);
    const sec = Math.floor((swTime / 1000) % 60);
    const min = Math.floor((swTime / 60000) % 60);
    
    swDisplay.textContent = 
      `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  }

  function startSw() {
    if (isSwRunning) return;
    
    isSwRunning = true;
    swPlayBtn.textContent = "暫停";
    swLapBtn.disabled = false;
    
    let lastTime = performance.now();
    
    function tick(now) {
      if (!isSwRunning) return;
      
      const elapsed = now - lastTime;
      lastTime = now;
      swTime += elapsed;
      
      updateSwDisplay();
      swInterval = requestAnimationFrame(tick);
    }
    
    swInterval = requestAnimationFrame(tick);
  }

  function stopSw() {
    isSwRunning = false;
    cancelAnimationFrame(swInterval);
    swPlayBtn.textContent = "開始";
    swLapBtn.disabled = true;
  }

  swPlayBtn.addEventListener("click", () => {
    playSynthSound("click");
    if (isSwRunning) {
      stopSw();
    } else {
      startSw();
    }
  });

  swResetBtn.addEventListener("click", () => {
    playSynthSound("click");
    stopSw();
    swTime = 0;
    lapCounter = 1;
    updateSwDisplay();
    lapList.innerHTML = '<li class="empty-text">尚無計圈資料</li>';
  });

  swLapBtn.addEventListener("click", () => {
    playSynthSound("scoreUp");
    if (lapList.querySelector(".empty-text")) {
      lapList.innerHTML = "";
    }
    
    const ms = Math.floor((swTime % 1000) / 10);
    const sec = Math.floor((swTime / 1000) % 60);
    const min = Math.floor((swTime / 60000) % 60);
    const timeStr = `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="lap-num">計圈 ${lapCounter}</span>
      <span class="lap-val">${timeStr}</span>
    `;
    lapList.appendChild(li);
    lapCounter++;
    
    // Scroll to bottom
    lapList.scrollTop = lapList.scrollHeight;
  });

  // ==========================================================================
  // TAB 4: CLASSROOM NOISE MONITOR LOGIC (BUBBLE EDITION 🧼)
  // ==========================================================================
  const micToggleBtn = document.getElementById("mic-toggle-btn");
  const visualizerCanvas = document.getElementById("noise-bubble-canvas");
  const vctx = visualizerCanvas.getContext("2d");
  
  const noiseThresholdRange = document.getElementById("noise-threshold-range");
  const thresholdValSpan = document.getElementById("threshold-val");
  const noiseSensitivityRange = document.getElementById("noise-sensitivity-range");
  const sensitivityValSpan = document.getElementById("sensitivity-val");
  const noiseAlarmBanner = document.getElementById("noise-alarm-banner");

  let micStream = null;
  let analyser = null;
  let micAudioCtx = null;
  let micSource = null;
  let isMicActive = false;
  let noiseInterval = null;
  
  let bubbles = [];

  // Bubble Physics Object
  class Bubble {
    constructor(canvasWidth, canvasHeight, currentVolume) {
      this.canvasWidth = canvasWidth;
      this.canvasHeight = canvasHeight;
      this.x = Math.random() * canvasWidth;
      this.y = canvasHeight + 25;
      
      // Radius size grows with higher volume at spawn
      let baseSize = 10;
      let maxExtraSize = 40;
      this.targetRadius = baseSize + (currentVolume * maxExtraSize);
      this.radius = 2; // Expands fast from tiny
      
      // Floating speed, larger bubbles drift up slightly faster
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -(0.8 + Math.random() * 1.2 + (this.targetRadius / 25));
      
      // Vibrant translucent bubble colors
      const colors = [
        "rgba(139, 92, 246, 0.45)",  // Purple
        "rgba(6, 182, 212, 0.45)",   // Cyan
        "rgba(236, 72, 153, 0.45)",  // Pink
        "rgba(16, 185, 129, 0.45)",  // Green
        "rgba(245, 158, 11, 0.45)"   // Orange
      ];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.opacity = 0.85;
      
      // Shaking offsets caused by voice vibration
      this.shakeX = 0;
      this.shakeY = 0;
      
      // Floating wave offset (sin float)
      this.waveOffset = Math.random() * Math.PI * 2;
      this.waveSpeed = 0.015 + Math.random() * 0.025;
      
      this.state = "floating"; // 'floating', 'popping'
      this.popParticles = [];
      this.popTimer = 0;
    }

    update(currentVolume, popThreshold, currentDb) {
      if (this.state === "floating") {
        // Grow to target size quickly
        if (this.radius < this.targetRadius) {
          this.radius += (this.targetRadius - this.radius) * 0.15;
        }
        
        // Float wave calculations
        this.waveOffset += this.waveSpeed;
        let waveX = Math.sin(this.waveOffset) * 0.6;
        
        // Noise vibration shake!
        // If sound amplitude is high, add rapid physical vibration
        if (currentVolume > 0.15) {
          let shakeIntensity = currentVolume * 24; // louder = shake harder
          this.shakeX = (Math.random() - 0.5) * shakeIntensity;
          this.shakeY = (Math.random() - 0.5) * shakeIntensity;
        } else {
          // Damp back to rest
          this.shakeX *= 0.8;
          this.shakeY *= 0.8;
        }
        
        // Move upward
        this.x += this.vx + waveX;
        this.y += this.vy;
        
        // Horizontal screen boundary wrap
        if (this.x < -this.radius) this.x = this.canvasWidth + this.radius;
        if (this.x > this.canvasWidth + this.radius) this.x = -this.radius;
        
        // Pop check if volume gets too loud
        if (currentDb >= popThreshold) {
          // Large bubbles pop easier
          if (Math.random() < 0.25 || this.radius > 20) {
            this.pop();
          }
        }
        
        // Fade out when floating above screen
        if (this.y < -this.radius) {
          this.opacity -= 0.05;
          if (this.opacity <= 0) {
            return false;
          }
        }
      } 
      else if (this.state === "popping") {
        this.popTimer++;
        // Splattering pop particles
        this.popParticles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha *= 0.85; // fast fade
        });
        
        if (this.popTimer > 15) {
          return false; // delete popped bubble
        }
      }
      return true;
    }

    pop() {
      this.state = "popping";
      
      // Synthesize cute bubble pop sound at slightly random high pitches!
      try {
        if (state.soundEnabled && audioCtx) {
          const now = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gainN = audioCtx.createGain();
          osc.connect(gainN);
          gainN.connect(audioCtx.destination);
          
          osc.type = "sine";
          // High pitch popping chirp
          const startFreq = 900 + Math.random() * 600;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.04);
          
          gainN.gain.setValueAtTime(0.08, now);
          gainN.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          
          osc.start(now);
          osc.stop(now + 0.05);
        }
      } catch (e) {
        console.warn("Pop synth error:", e);
      }
      
      // Populate pop droplet vectors
      const count = 8 + Math.floor(this.radius / 3);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.5 + Math.random() * 3.5 + (this.radius / 12);
        this.popParticles.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2 + 1,
          alpha: 0.9
        });
      }
    }

    draw(ctx) {
      const renderX = this.x + this.shakeX;
      const renderY = this.y + this.shakeY;
      
      if (this.state === "floating") {
        ctx.save();
        
        // 3D Glass Bezel Radial Soap Bubble Gradient
        const gradient = ctx.createRadialGradient(
          renderX - this.radius * 0.35, 
          renderY - this.radius * 0.35, 
          this.radius * 0.1, 
          renderX, 
          renderY, 
          this.radius
        );
        
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        gradient.addColorStop(0.35, this.color);
        gradient.addColorStop(0.85, "rgba(255, 255, 255, 0.04)");
        gradient.addColorStop(0.95, "rgba(255, 255, 255, 0.25)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.4)");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(renderX, renderY, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // specular glossy reflect arc
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(renderX - this.radius * 0.38, renderY - this.radius * 0.38, this.radius * 0.14, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      } 
      else if (this.state === "popping") {
        ctx.save();
        this.popParticles.forEach(p => {
          ctx.fillStyle = this.color.replace(/[\d\.]+\)$/, `${p.alpha})`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }
  }

  noiseThresholdRange.addEventListener("input", (e) => {
    thresholdValSpan.textContent = e.target.value;
  });

  noiseSensitivityRange.addEventListener("input", (e) => {
    sensitivityValSpan.textContent = e.target.value;
  });

  micToggleBtn.addEventListener("click", () => {
    playSynthSound("click");
    if (isMicActive) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  });

  async function startMicrophone() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = micAudioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      micSource = micAudioCtx.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      
      isMicActive = true;
      micToggleBtn.textContent = "🎤 關閉麥克風";
      micToggleBtn.classList.remove("btn-primary");
      micToggleBtn.classList.add("btn-secondary");
      
      monitorNoise();
    } catch (err) {
      alert("無法啟動麥克風！請確認您的麥克風已連接且已授權麥克風存取權。");
      console.error("Microphone access error:", err);
    }
  }

  function stopMicrophone() {
    isMicActive = false;
    micToggleBtn.textContent = "🎤 啟動麥克風";
    micToggleBtn.classList.remove("btn-secondary");
    micToggleBtn.classList.add("btn-primary");
    
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }
    if (micAudioCtx) {
      micAudioCtx.close();
    }
    
    cancelAnimationFrame(noiseInterval);
    bubbles = [];
    vctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    noiseAlarmBanner.classList.remove("active");
  }

  function monitorNoise() {
    if (!isMicActive) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function update() {
      if (!isMicActive) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let total = 0;
      for (let i = 0; i < bufferLength; i++) {
        total += dataArray[i];
      }
      const average = total / bufferLength;
      
      // Scale with multiplier sensitivity
      const sensitivity = parseFloat(noiseSensitivityRange.value);
      let volume = (average / 255) * sensitivity; // 0.0 - 1.0+
      
      // Map to approximate decibel range (30db up to 100db)
      let db = Math.min(100, Math.max(30, Math.floor(volume * 70 + 30)));
      
      const threshold = parseInt(noiseThresholdRange.value);
      
      // 1. Spawning new bubbles based on volume
      if (volume > 0.05 && db < threshold) {
        // Spawn probability scales with loudness
        let spawnChance = Math.min(0.9, volume * 2.0);
        if (Math.random() < spawnChance) {
          bubbles.push(new Bubble(visualizerCanvas.width, visualizerCanvas.height, volume));
        }
      }
      
      // 2. Alert threshold popped bubbles
      if (db >= threshold) {
        noiseAlarmBanner.classList.add("active");
        
        // Pop any bubble in floating state
        let poppedAny = false;
        bubbles.forEach(b => {
          if (b.state === "floating") {
            b.pop();
            poppedAny = true;
          }
        });
        
        // play heavy sound drop warning once
        if (poppedAny) {
          playSynthSound("scoreDown");
        }
      } else {
        noiseAlarmBanner.classList.remove("active");
      }
      
      // 3. Clear canvas & animate / draw bubbles
      vctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
      
      // Glass background backing
      vctx.fillStyle = "rgba(10, 14, 22, 0.35)";
      vctx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
      
      // Render decibel levels top right
      vctx.fillStyle = db >= threshold ? "#ff5e7e" : "#a78bfa";
      vctx.font = "bold 15px Outfit, sans-serif";
      vctx.textAlign = "right";
      vctx.fillText(`音量分貝: ${db} dB / 閥值: ${threshold} dB`, visualizerCanvas.width - 20, 30);
      
      // Render state dot top left
      vctx.beginPath();
      vctx.fillStyle = db >= threshold ? "#ef4444" : "#10b981";
      vctx.arc(30, 25, 5, 0, Math.PI * 2);
      vctx.fill();
      
      vctx.fillStyle = "rgba(255,255,255,0.4)";
      vctx.font = "13px Outfit, sans-serif";
      vctx.textAlign = "left";
      vctx.fillText("泡泡麥克風監測中...", 44, 29);
      
      // Update and draw active bubble instances
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const active = bubbles[i].update(volume, threshold, db);
        if (!active) {
          bubbles.splice(i, 1);
        } else {
          bubbles[i].draw(vctx);
        }
      }
      
      noiseInterval = requestAnimationFrame(update);
    }
    
    noiseInterval = requestAnimationFrame(update);
  }

  // ==========================================================================
  // TAB 5: QUICK GROUP GENERATOR LOGIC
  // ==========================================================================
  const generateGroupsBtn = document.getElementById("generate-groups-btn");
  const groupModeParams = document.getElementById("group-mode-param");
  const groupsBoard = document.getElementById("groups-board");
  const modeParamLabel = document.getElementById("mode-param-label");
  const groupRadios = document.querySelectorAll('input[name="group-mode"]');

  groupRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      playSynthSound("click");
      if (radio.value === "count") {
        modeParamLabel.textContent = "分組數量";
        groupModeParams.value = 4;
      } else {
        modeParamLabel.textContent = "每組上限人數";
        groupModeParams.value = 5;
      }
    });
  });

  // Fisher-Yates Shuffling algorithm
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  generateGroupsBtn.addEventListener("click", () => {
    playSynthSound("win");
    
    if (state.roster.length === 0) {
      alert("學生名單不能為空！請先在名單管理中新增學生名冊。");
      return;
    }
    
    const mode = document.querySelector('input[name="group-mode"]:checked').value;
    const param = parseInt(groupModeParams.value) || 1;
    
    if (param <= 0) {
      alert("設定數值必須大於 0！");
      return;
    }
    
    const shuffledList = shuffle(state.roster);
    let finalGroups = [];
    
    if (mode === "count") {
      // Divide roster into fixed N groups
      const groupCount = Math.min(param, shuffledList.length);
      for (let i = 0; i < groupCount; i++) {
        finalGroups.push({
          name: `第 ${i + 1} 組`,
          members: []
        });
      }
      
      shuffledList.forEach((student, index) => {
        const groupIdx = index % groupCount;
        finalGroups[groupIdx].members.push(student);
      });
    } 
    else {
      // Divide roster so each group has at most size S
      const maxGroupSize = param;
      const groupCount = Math.ceil(shuffledList.length / maxGroupSize);
      
      for (let i = 0; i < groupCount; i++) {
        finalGroups.push({
          name: `第 ${i + 1} 組`,
          members: shuffledList.slice(i * maxGroupSize, (i + 1) * maxGroupSize)
        });
      }
    }
    
    renderGroups(finalGroups);
  });

  function renderGroups(groups) {
    groupsBoard.innerHTML = "";
    
    const niceCardColors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];
    
    groups.forEach((group, index) => {
      const card = document.createElement("div");
      card.classList.add("group-card");
      
      const themeColor = niceCardColors[index % niceCardColors.length];
      card.style.borderColor = themeColor;
      card.style.borderStyle = "solid";
      card.style.borderWidth = "2px";
      
      // Slide staggered anim delay
      card.style.animationDelay = `${index * 0.05}s`;
      
      const membersHTML = group.members.map((m, idx) => `
        <div class="group-member">
          <span class="member-num">${idx + 1}</span>
          <span>${m}</span>
        </div>
      `).join("");
      
      card.innerHTML = `
        <div class="group-card-title" style="color: ${themeColor}">${group.name} (${group.members.length}人)</div>
        <div class="group-card-members">
          ${membersHTML || '<div class="empty-text">無組員</div>'}
        </div>
      `;
      
      groupsBoard.appendChild(card);
    });
  }

  // ==========================================================================
  // GOOGLE CLASSROOM SYNC INTEGRATION
  // ==========================================================================
  let googleAccessToken = null;
  let tokenClient = null;

  const clientIdInput = document.getElementById("classroom-client-id");
  const saveClientIdBtn = document.getElementById("save-client-id-btn");
  const connectClassroomBtn = document.getElementById("connect-classroom-btn");
  const disconnectClassroomBtn = document.getElementById("disconnect-classroom-btn");
  const classroomConfigArea = document.getElementById("classroom-config-area");
  const classroomActionArea = document.getElementById("classroom-action-area");
  const classroomCoursesArea = document.getElementById("classroom-courses-area");
  const courseSelect = document.getElementById("classroom-course-select");
  const importRosterBtn = document.getElementById("import-classroom-roster-btn");

  // Load saved client ID
  const savedClientId = localStorage.getItem("classbuddy_classroom_client_id") || "YOUR_GOOGLE_CLIENT_ID";
  if (savedClientId) {
    clientIdInput.value = savedClientId;
  }

  saveClientIdBtn.addEventListener("click", () => {
    const val = clientIdInput.value.trim();
    if (!val) {
      alert("請輸入有效的 Client ID！");
      return;
    }
    localStorage.setItem("classbuddy_classroom_client_id", val);
    alert("Client ID 儲存成功！");
    playSynthSound("win");
  });

  function initGoogleOAuth() {
    const clientId = localStorage.getItem("classbuddy_classroom_client_id");
    if (!clientId) {
      alert("請先輸入並儲存您的 Google OAuth Client ID！");
      return false;
    }

    try {
      // Initialize GIS token client
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly",
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            googleAccessToken = tokenResponse.access_token;
            classroomActionArea.classList.add("hidden");
            classroomConfigArea.classList.add("hidden");
            classroomCoursesArea.classList.remove("hidden");
            fetchClassroomCourses();
          }
        },
        error_callback: (err) => {
          console.error("GIS OAuth Error:", err);
          alert("登入失敗，請確認 Client ID 與 Google Cloud 設定是否正確！");
        }
      });
      return true;
    } catch (e) {
      console.error("Google GIS script not loaded or invalid client id", e);
      alert("初始化 Google 登入失敗！請確認是否加載了 Google SDK 且 Client ID 格式正確。");
      return false;
    }
  }

  connectClassroomBtn.addEventListener("click", () => {
    playSynthSound("click");
    if (initGoogleOAuth()) {
      tokenClient.requestAccessToken({ prompt: "consent" });
    }
  });

  async function fetchClassroomCourses() {
    courseSelect.innerHTML = '<option value="">載入中...</option>';
    try {
      const response = await fetch("https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE", {
        headers: {
          "Authorization": `Bearer ${googleAccessToken}`
        }
      });
      if (!response.ok) throw new Error("取得課程失敗");
      const data = await response.json();
      
      courseSelect.innerHTML = "";
      if (!data.courses || data.courses.length === 0) {
        courseSelect.innerHTML = '<option value="">無啟用中的課程</option>';
        return;
      }
      
      data.courses.forEach(course => {
        const opt = document.createElement("option");
        opt.value = course.id;
        opt.textContent = `${course.name} ${course.section ? `(${course.section})` : ""}`;
        courseSelect.appendChild(opt);
      });
    } catch (e) {
      console.error(e);
      alert("無法獲取 Classroom 課程清單，請確認您的帳號是否有啟用 Classroom。");
      logoutGoogle();
    }
  }

  importRosterBtn.addEventListener("click", async () => {
    const courseId = courseSelect.value;
    if (!courseId) {
      alert("請選擇一個課程！");
      return;
    }
    
    playSynthSound("click");
    importRosterBtn.disabled = true;
    importRosterBtn.textContent = "📥 正在下載學生名冊...";
    
    try {
      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/students`, {
        headers: {
          "Authorization": `Bearer ${googleAccessToken}`
        }
      });
      if (!response.ok) throw new Error("取得學生名單失敗");
      const data = await response.json();
      
      if (!data.students || data.students.length === 0) {
        alert("此課程中沒有任何學生！");
        importRosterBtn.disabled = false;
        importRosterBtn.textContent = "📥 匯入此課程名冊";
        return;
      }
      
      // Extract names
      const studentNames = data.students.map(s => s.profile.name.fullName);
      
      // Load names to textarea and state
      rosterTextarea.value = studentNames.join("\n");
      
      alert(`匯入成功！共載入 ${studentNames.length} 位學生。\n請點擊下方的「儲存變更」以完成儲存。`);
      playSynthSound("win");
    } catch (e) {
      console.error(e);
      alert("獲取學生名冊失敗，請重試！");
    } finally {
      importRosterBtn.disabled = false;
      importRosterBtn.textContent = "📥 匯入此課程名冊";
    }
  });

  function logoutGoogle() {
    googleAccessToken = null;
    classroomCoursesArea.classList.add("hidden");
    classroomActionArea.classList.remove("hidden");
    classroomConfigArea.classList.remove("hidden");
    courseSelect.innerHTML = '<option value="">載入課程中...</option>';
  }

  disconnectClassroomBtn.addEventListener("click", () => {
    playSynthSound("click");
    logoutGoogle();
  });

  // ==========================================================================
  // TAB 6: ONLINE ROLL-CALL LOGIC
  // ==========================================================================
  const rcGrid = document.getElementById("rollcall-grid");
  const rcStatTotal = document.getElementById("rc-stat-total");
  const rcStatPresent = document.getElementById("rc-stat-present");
  const rcStatExcused = document.getElementById("rc-stat-excused");
  const rcStatAbsent = document.getElementById("rc-stat-absent");

  const rcAllPresentBtn = document.getElementById("rc-all-present-btn");
  const rcResetBtn = document.getElementById("rc-reset-btn");
  const rcExportCsvBtn = document.getElementById("rc-export-csv-btn");
  const rcCopyTextBtn = document.getElementById("rc-copy-text-btn");

  // Load attendance state on load
  state.attendance = JSON.parse(localStorage.getItem("classbuddy_attendance")) || {};

  // Clean up attendance status for removed students or initialize new ones
  function syncAttendanceState() {
    const newAttendance = {};
    state.roster.forEach(name => {
      // Keep existing status if present, otherwise default to "present"
      newAttendance[name] = state.attendance[name] || "present";
    });
    state.attendance = newAttendance;
    saveState();
  }

  function initRollcall() {
    syncAttendanceState();
    renderRollcallGrid();
    updateRollcallStats();
  }

  function updateRollcallStats() {
    const total = state.roster.length;
    let present = 0;
    let excused = 0;
    let absent = 0;

    Object.values(state.attendance).forEach(status => {
      if (status === "present") present++;
      else if (status === "excused") excused++;
      else if (status === "absent") absent++;
    });

    rcStatTotal.textContent = total;
    rcStatPresent.textContent = present;
    rcStatExcused.textContent = excused;
    rcStatAbsent.textContent = absent;
  }

  function setStudentStatus(name, status) {
    state.attendance[name] = status;
    saveState();
    updateRollcallStats();

    // Play feedback sound
    if (status === "present") {
      playSynthSound("click");
    } else if (status === "excused") {
      playSynthSound("tick");
    } else if (status === "absent") {
      playSynthSound("scoreDown");
    }

    // Update the specific student card DOM classes and badge
    const card = document.querySelector(`[data-rc-student="${name}"]`);
    if (card) {
      card.className = `rc-student-card status-${status}`;
      const badge = card.querySelector(".rc-status-badge");
      if (badge) {
        if (status === "present") badge.textContent = "出席";
        else if (status === "excused") badge.textContent = "請假";
        else if (status === "absent") badge.textContent = "缺席";
      }
    }
  }

  function renderRollcallGrid() {
    rcGrid.innerHTML = "";
    if (state.roster.length === 0) {
      rcGrid.innerHTML = '<div class="empty-text">尚無學生名冊，請先匯入或新增學生名單！</div>';
      return;
    }

    state.roster.forEach(name => {
      const status = state.attendance[name] || "present";
      const card = document.createElement("div");
      card.classList.add("rc-student-card", `status-${status}`);
      card.setAttribute("data-rc-student", name);

      let statusText = "出席";
      if (status === "excused") statusText = "請假";
      else if (status === "absent") statusText = "缺席";

      card.innerHTML = `
        <div class="rc-student-name">${name}</div>
        <div class="rc-status-badge">${statusText}</div>
        <div class="rc-switch-group">
          <button class="rc-switch-btn btn-present" title="標記出席">出席</button>
          <button class="rc-switch-btn btn-excused" title="標記請假">請假</button>
          <button class="rc-switch-btn btn-absent" title="標記缺席">缺席</button>
        </div>
      `;

      card.querySelector(".btn-present").addEventListener("click", () => setStudentStatus(name, "present"));
      card.querySelector(".btn-excused").addEventListener("click", () => setStudentStatus(name, "excused"));
      card.querySelector(".btn-absent").addEventListener("click", () => setStudentStatus(name, "absent"));

      rcGrid.appendChild(card);
    });
  }

  rcAllPresentBtn.addEventListener("click", () => {
    playSynthSound("win");
    state.roster.forEach(name => {
      state.attendance[name] = "present";
    });
    saveState();
    renderRollcallGrid();
    updateRollcallStats();
  });

  rcResetBtn.addEventListener("click", () => {
    if (confirm("確定要重置所有點名狀態嗎？")) {
      playSynthSound("scoreDown");
      state.roster.forEach(name => {
        state.attendance[name] = "present";
      });
      saveState();
      renderRollcallGrid();
      updateRollcallStats();
    }
  });

  rcExportCsvBtn.addEventListener("click", () => {
    playSynthSound("win");
    let csvContent = "\uFEFF姓名,出缺席狀態\n"; // UTF-8 BOM for Excel Chinese characters
    state.roster.forEach(name => {
      const status = state.attendance[name] || "present";
      let statusText = "出席";
      if (status === "excused") statusText = "請假";
      else if (status === "absent") statusText = "缺席";
      csvContent += `"${name}","${statusText}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `ClassBuddy_點名記錄_${date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  rcCopyTextBtn.addEventListener("click", () => {
    playSynthSound("win");
    const date = new Date().toLocaleDateString("zh-TW", { year: 'numeric', month: '2-digit', day: '2-digit' });
    let presentList = [];
    let excusedList = [];
    let absentList = [];

    state.roster.forEach(name => {
      const status = state.attendance[name] || "present";
      if (status === "present") presentList.push(name);
      else if (status === "excused") excusedList.push(name);
      else if (status === "absent") absentList.push(name);
    });

    const report = `📋 ClassBuddy 點名報告 (${date})
=========================
應到人數：${state.roster.length} 人
實到人數：${presentList.length} 人
請假人數：${excusedList.length} 人
缺席人數：${absentList.length} 人
=========================
✅ 出席名單 (${presentList.length}人)：
${presentList.join("、") || "（無）"}

⏳ 請假名單 (${excusedList.length}人)：
${excusedList.join("、") || "（無）"}

❌ 缺席名單 (${absentList.length}人)：
${absentList.join("、") || "（無）"}`;

    navigator.clipboard.writeText(report).then(() => {
      alert("點名報告已成功複製至剪貼簿！");
    }).catch(err => {
      console.error("Failed to copy report: ", err);
      alert("複製失敗，請手動複製！");
    });
  });

});
