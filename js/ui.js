class GameUI {
  constructor(engine) {
    this.engine = engine;
    this.currentView = "dashboard";
    this.selectedHorse = null;
    this.selectedRace = null;
    this.raceAnimation = null;
    this.animationFrame = null;
  }

  init() {
    this.bindNav();
    if (this.engine.loadGame()) {
      this.showView("dashboard");
      this.showToast("Game loaded!", "info");
    } else {
      this.showView("newgame");
    }
  }

  bindNav() {
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.engine.state) return;
        this.showView(btn.dataset.nav);
      });
    });
  }

  showView(view) {
    this.currentView = view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-nav="${view}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const main = document.getElementById("main-content");
    switch (view) {
      case "newgame": main.innerHTML = this.renderNewGame(); this.bindNewGame(); break;
      case "dashboard": main.innerHTML = this.renderDashboard(); break;
      case "stable": main.innerHTML = this.renderStable(); this.bindStable(); break;
      case "races": main.innerHTML = this.renderRaces(); this.bindRaces(); break;
      case "auction": main.innerHTML = this.renderAuction(); this.bindAuction(); break;
      case "breeding": main.innerHTML = this.renderBreeding(); this.bindBreeding(); break;
      case "jockeys": main.innerHTML = this.renderJockeys(); this.bindJockeys(); break;
      case "finances": main.innerHTML = this.renderFinances(); break;
      case "stats": main.innerHTML = this.renderStats(); break;
    }
    this.updateTopBar();
  }

  updateTopBar() {
    if (!this.engine.state) return;
    const s = this.engine.state;
    document.getElementById("top-stable-name").textContent = s.stableName;
    document.getElementById("top-balance").textContent = `£${s.finances.balance.toLocaleString()}`;
    document.getElementById("top-date").textContent =
      `Week ${s.calendar.week}, ${GAME_DATA.months[s.calendar.month]} ${s.calendar.year}`;
    document.getElementById("top-horses").textContent = `${s.horses.length} horses`;
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ── New Game ──
  renderNewGame() {
    return `
      <div class="new-game-screen">
        <div class="logo-section">
          <h1 class="game-title">🏇 CHAMPION TRAINER</h1>
          <p class="game-subtitle">Horse Racing Management Simulator</p>
        </div>
        <div class="new-game-form card">
          <h2>New Game</h2>
          <div class="form-group">
            <label>Stable Name</label>
            <input type="text" id="stable-name-input" placeholder="Enter your stable name..." maxlength="30" value="Newmarket Racing" />
          </div>
          <div class="form-group">
            <label>Difficulty</label>
            <div class="difficulty-options">
              <button class="diff-btn" data-diff="easy">
                <span class="diff-icon">🟢</span>
                <span class="diff-label">Easy</span>
                <span class="diff-desc">£200k, 4 horses</span>
              </button>
              <button class="diff-btn active" data-diff="normal">
                <span class="diff-icon">🟡</span>
                <span class="diff-label">Normal</span>
                <span class="diff-desc">£100k, 3 horses</span>
              </button>
              <button class="diff-btn" data-diff="hard">
                <span class="diff-icon">🔴</span>
                <span class="diff-label">Hard</span>
                <span class="diff-desc">£50k, 2 horses</span>
              </button>
            </div>
          </div>
          <button class="btn btn-primary btn-large" id="start-game-btn">Start Career</button>
          ${this.engine.loadGame() !== false ? `<button class="btn btn-secondary" id="continue-game-btn" style="margin-top:10px;width:100%">Continue Saved Game</button>` : ""}
        </div>
      </div>`;
  }

  bindNewGame() {
    let diff = "normal";
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".diff-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        diff = btn.dataset.diff;
      });
    });
    document.getElementById("start-game-btn").addEventListener("click", () => {
      const name = document.getElementById("stable-name-input").value.trim() || "My Stable";
      this.engine.newGame(name, diff);
      this.showView("dashboard");
      this.showToast("Welcome to Champion Trainer! Good luck!", "success");
    });
    const contBtn = document.getElementById("continue-game-btn");
    if (contBtn) {
      contBtn.addEventListener("click", () => {
        if (this.engine.loadGame()) {
          this.showView("dashboard");
          this.showToast("Game loaded!", "info");
        }
      });
    }
  }

  // ── Dashboard ──
  renderDashboard() {
    const s = this.engine.state;
    const weeklyExpenses = this.engine.calculateWeeklyExpenses();
    const notifications = s.notifications || [];
    const champRaces = s.currentRaces.filter((r) => r.isChampionship);

    return `
      <div class="dashboard">
        <div class="dash-header">
          <h2>${s.stableName}</h2>
          <button class="btn btn-primary btn-advance" id="advance-week-btn">
            Advance Week ▶
          </button>
        </div>

        ${notifications.length > 0 ? `
        <div class="notifications card">
          <h3>This Week</h3>
          ${notifications.map((n) => `<div class="notif notif-${n.type}">${n.text}</div>`).join("")}
        </div>` : ""}

        ${champRaces.length > 0 ? `
        <div class="card championship-alert">
          <h3>🏆 Championship Race This Week!</h3>
          ${champRaces.map((r) => `
            <div class="champ-race">
              <strong>${r.name}</strong> at ${r.track} — ${HorseGenerator.formatDistance(r.distance)} — Prize: £${r.prize.toLocaleString()}
            </div>
          `).join("")}
        </div>` : ""}

        <div class="dash-grid">
          <div class="card dash-card">
            <h3>Finances</h3>
            <div class="stat-row"><span>Balance</span><span class="stat-val ${s.finances.balance < 0 ? "negative" : ""}">£${s.finances.balance.toLocaleString()}</span></div>
            <div class="stat-row"><span>Weekly Cost</span><span class="stat-val">-£${weeklyExpenses.toLocaleString()}</span></div>
            <div class="stat-row"><span>Career Earnings</span><span class="stat-val">£${s.finances.totalEarnings.toLocaleString()}</span></div>
          </div>

          <div class="card dash-card">
            <h3>Stable</h3>
            <div class="stat-row"><span>Horses</span><span class="stat-val">${s.horses.length}</span></div>
            <div class="stat-row"><span>Fit to Race</span><span class="stat-val">${s.horses.filter((h) => h.fitness >= 30 && !h.injured).length}</span></div>
            <div class="stat-row"><span>Injured</span><span class="stat-val">${s.horses.filter((h) => h.injured).length}</span></div>
          </div>

          <div class="card dash-card">
            <h3>Career</h3>
            <div class="stat-row"><span>Total Wins</span><span class="stat-val">${s.stats.totalWins}</span></div>
            <div class="stat-row"><span>Group Wins</span><span class="stat-val">${s.stats.groupWins}</span></div>
            <div class="stat-row"><span>Best Rating</span><span class="stat-val">${s.stats.bestRating}</span></div>
          </div>

          <div class="card dash-card">
            <h3>Races This Week</h3>
            <div class="stat-row"><span>Available</span><span class="stat-val">${s.currentRaces.length}</span></div>
            <div class="stat-row"><span>Entered</span><span class="stat-val">${s.currentRaces.filter((r) => r.playerEntries.length > 0).length}</span></div>
            <div class="stat-row"><span>Jockeys</span><span class="stat-val">${s.retainedJockeys.length}</span></div>
          </div>
        </div>

        <div class="card">
          <h3>Your Horses</h3>
          <div class="horse-summary-grid">
            ${s.horses.map((h) => `
              <div class="horse-mini-card ${h.injured ? "injured" : ""}">
                <div class="horse-mini-color" style="background:${h.coat.color}"></div>
                <div class="horse-mini-info">
                  <strong>${h.name}</strong>
                  <span>${h.age}yo ${h.sex} | R:${h.rating} | F:${h.fitness}%</span>
                  <span>${h.injured ? `🤕 Injured (${h.injuryWeeksLeft}w)` : GAME_DATA.trainingRegimes.find((r) => r.id === h.training)?.icon + " " + GAME_DATA.trainingRegimes.find((r) => r.id === h.training)?.name}</span>
                </div>
                <div class="horse-mini-form">${h.form.slice(-5).map((f) => `<span class="form-dot form-${f <= 1 ? "win" : f <= 3 ? "place" : "other"}">${f}</span>`).join("")}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
  }

  // ── Stable ──
  renderStable() {
    const s = this.engine.state;
    if (this.selectedHorse) {
      return this.renderHorseDetail(this.selectedHorse);
    }
    return `
      <div class="stable-view">
        <h2>Your Stable (${s.horses.length}/20)</h2>
        <div class="horse-grid">
          ${s.horses.map((h) => `
            <div class="card horse-card ${h.injured ? "injured" : ""}" data-horse-id="${h.id}">
              <div class="horse-card-header">
                <div class="horse-color-swatch" style="background:${h.coat.color}; border: 2px solid ${h.coat.mane}"></div>
                <div>
                  <h3>${h.name}</h3>
                  <span class="horse-subtitle">${h.age}yo ${h.coat.name} ${h.sex}</span>
                </div>
                <div class="horse-rating">R${h.rating}</div>
              </div>
              <div class="horse-stats-mini">
                <div class="stat-bar-group">
                  <label>SPD</label><div class="stat-bar"><div class="stat-fill speed" style="width:${h.stats.speed}%"></div></div>
                </div>
                <div class="stat-bar-group">
                  <label>STA</label><div class="stat-bar"><div class="stat-fill stamina" style="width:${h.stats.stamina}%"></div></div>
                </div>
                <div class="stat-bar-group">
                  <label>ACC</label><div class="stat-bar"><div class="stat-fill accel" style="width:${h.stats.acceleration}%"></div></div>
                </div>
                <div class="stat-bar-group">
                  <label>TMP</label><div class="stat-bar"><div class="stat-fill temp" style="width:${h.stats.temperament}%"></div></div>
                </div>
              </div>
              <div class="horse-card-footer">
                <span>Fitness: ${h.fitness}%</span>
                <span>${h.injured ? `🤕 ${h.injuryWeeksLeft}w` : h.form.slice(-3).map((f) => f <= 1 ? "🥇" : f <= 3 ? "🥈" : "·").join("")}</span>
                <span>£${HorseGenerator.calculateValue(h).toLocaleString()}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  renderHorseDetail(horse) {
    const value = HorseGenerator.calculateValue(horse);
    const distLabel = HorseGenerator.getDistanceLabel(horse.distancePreference.ideal);
    const bestGround = Object.entries(horse.groundPreference).sort((a, b) => b[1] - a[1])[0];
    return `
      <div class="horse-detail">
        <button class="btn btn-secondary btn-back" id="back-to-stable">← Back to Stable</button>
        <div class="card horse-detail-card">
          <div class="horse-detail-header">
            <div class="horse-color-large" style="background:${horse.coat.color}; border: 3px solid ${horse.coat.mane}"></div>
            <div>
              <h2>${horse.name}</h2>
              <p>${horse.age}yo ${horse.coat.name} ${horse.sex} | Sire: ${horse.sire} | Dam: ${horse.dam}</p>
              <p>Rating: <strong>${horse.rating}</strong> | Potential: <strong>${horse.potential}</strong> | Value: <strong>£${value.toLocaleString()}</strong></p>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <h3>Attributes</h3>
              ${["speed", "stamina", "acceleration", "jumping", "temperament"].map((stat) => `
                <div class="stat-bar-group">
                  <label>${stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
                  <div class="stat-bar"><div class="stat-fill ${stat}" style="width:${horse.stats[stat]}%"></div></div>
                  <span class="stat-num">${horse.stats[stat]}</span>
                </div>
              `).join("")}
            </div>

            <div class="detail-section">
              <h3>Condition</h3>
              <div class="condition-bars">
                <div class="stat-bar-group"><label>Fitness</label><div class="stat-bar"><div class="stat-fill fitness" style="width:${horse.fitness}%"></div></div><span class="stat-num">${horse.fitness}%</span></div>
                <div class="stat-bar-group"><label>Morale</label><div class="stat-bar"><div class="stat-fill morale" style="width:${horse.morale}%"></div></div><span class="stat-num">${horse.morale}%</span></div>
                <div class="stat-bar-group"><label>Health</label><div class="stat-bar"><div class="stat-fill health" style="width:${horse.health}%"></div></div><span class="stat-num">${horse.health}%</span></div>
              </div>
              ${horse.injured ? `<div class="injury-badge">🤕 Injured — ${horse.injuryWeeksLeft} weeks remaining</div>` : ""}
              <p><strong>Preferred Distance:</strong> ${distLabel} (${HorseGenerator.formatDistance(horse.distancePreference.ideal)})</p>
              <p><strong>Best Ground:</strong> ${bestGround[0]}</p>
              <p><strong>Maturity:</strong> ${Math.floor(horse.maturity * 100)}%</p>
            </div>

            <div class="detail-section">
              <h3>Training</h3>
              <div class="training-options">
                ${GAME_DATA.trainingRegimes.map((r) => `
                  <button class="training-btn ${horse.training === r.id ? "active" : ""} ${horse.injured && r.id !== "rest" ? "disabled" : ""}"
                    data-training="${r.id}" ${horse.injured && r.id !== "rest" ? "disabled" : ""}>
                    <span class="training-icon">${r.icon}</span>
                    <span class="training-name">${r.name}</span>
                    <span class="training-desc">${r.description}</span>
                  </button>
                `).join("")}
              </div>
            </div>

            <div class="detail-section">
              <h3>Career Record</h3>
              <div class="career-stats">
                <div class="stat-row"><span>Runs</span><span>${horse.careerStats.runs}</span></div>
                <div class="stat-row"><span>Wins</span><span>${horse.careerStats.wins}</span></div>
                <div class="stat-row"><span>Places</span><span>${horse.careerStats.places}</span></div>
                <div class="stat-row"><span>Shows</span><span>${horse.careerStats.shows}</span></div>
                <div class="stat-row"><span>Earnings</span><span>£${horse.careerStats.earnings.toLocaleString()}</span></div>
                <div class="stat-row"><span>Win Rate</span><span>${horse.careerStats.runs > 0 ? Math.floor((horse.careerStats.wins / horse.careerStats.runs) * 100) : 0}%</span></div>
              </div>
              <div class="form-history">
                <strong>Form:</strong> ${horse.form.length > 0 ? horse.form.map((f) => `<span class="form-dot form-${f <= 1 ? "win" : f <= 3 ? "place" : "other"}">${f}</span>`).join("") : "No races yet"}
              </div>
            </div>
          </div>

          <div class="horse-actions">
            <button class="btn btn-danger" id="sell-horse-btn" data-id="${horse.id}">Sell Horse (≈£${Math.floor(value * 0.8).toLocaleString()})</button>
          </div>
        </div>
      </div>`;
  }

  bindStable() {
    document.querySelectorAll(".horse-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.horseId);
        this.selectedHorse = this.engine.state.horses.find((h) => h.id === id);
        this.showView("stable");
      });
    });
    const backBtn = document.getElementById("back-to-stable");
    if (backBtn) {
      backBtn.addEventListener("click", () => { this.selectedHorse = null; this.showView("stable"); });
    }
    document.querySelectorAll(".training-btn:not(.disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.selectedHorse) {
          this.selectedHorse.training = btn.dataset.training;
          document.querySelectorAll(".training-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.engine.saveGame();
          this.showToast(`Training set to ${btn.querySelector(".training-name").textContent}`, "success");
        }
      });
    });
    const sellBtn = document.getElementById("sell-horse-btn");
    if (sellBtn) {
      sellBtn.addEventListener("click", () => {
        if (confirm(`Are you sure you want to sell ${this.selectedHorse.name}?`)) {
          const result = this.engine.sellHorse(parseInt(sellBtn.dataset.id));
          this.showToast(result.message, result.success ? "success" : "error");
          this.selectedHorse = null;
          this.showView("stable");
        }
      });
    }
  }

  // ── Races ──
  renderRaces() {
    const s = this.engine.state;
    if (this.selectedRace) return this.renderRaceDetail(this.selectedRace);
    return `
      <div class="races-view">
        <h2>Race Card — Week ${s.calendar.week}, ${GAME_DATA.months[s.calendar.month]} ${s.calendar.year}</h2>
        <div class="race-list">
          ${s.currentRaces.map((r) => `
            <div class="card race-card ${r.isChampionship ? "championship" : ""}" data-race-id="${r.id}">
              <div class="race-card-header">
                <h3>${r.isChampionship ? "🏆 " : ""}${r.name}</h3>
                <span class="race-class-badge class-${Math.max(0, r.class.class)}">${r.class.name}</span>
              </div>
              <div class="race-info">
                <span>📍 ${r.track}</span>
                <span>📏 ${HorseGenerator.formatDistance(r.distance)}</span>
                <span>🏟️ ${r.surface}</span>
                <span>🌱 ${r.ground}</span>
                <span>💰 £${r.prize.toLocaleString()}</span>
                <span>🐴 ${r.runners.length + r.playerEntries.length} runners</span>
                ${r.ageRestriction ? `<span>📋 ${r.ageRestriction}yo only</span>` : ""}
              </div>
              ${r.playerEntries.length > 0 ? `<div class="race-entries">Your entries: ${r.playerEntries.map((e) => e.horse.name).join(", ")}</div>` : ""}
            </div>
          `).join("")}
        </div>
      </div>`;
  }

  renderRaceDetail(race) {
    const s = this.engine.state;
    const eligibleHorses = s.horses.filter((h) => {
      const check = RaceEngine.canEnterRace(h, race);
      return check.ok && !race.playerEntries.find((e) => e.horse.id === h.id);
    });
    return `
      <div class="race-detail">
        <button class="btn btn-secondary btn-back" id="back-to-races">← Back to Races</button>
        <div class="card">
          <div class="race-detail-header">
            <h2>${race.isChampionship ? "🏆 " : ""}${race.name}</h2>
            <span class="race-class-badge class-${Math.max(0, race.class.class)}">${race.class.name}</span>
          </div>
          <div class="race-info-detail">
            <div class="stat-row"><span>Track</span><span>${race.track}</span></div>
            <div class="stat-row"><span>Distance</span><span>${HorseGenerator.formatDistance(race.distance)} (${HorseGenerator.getDistanceLabel(race.distance)})</span></div>
            <div class="stat-row"><span>Surface</span><span>${race.surface}</span></div>
            <div class="stat-row"><span>Ground</span><span>${race.ground}</span></div>
            <div class="stat-row"><span>Prize</span><span>£${race.prize.toLocaleString()}</span></div>
            <div class="stat-row"><span>Runners</span><span>${race.runners.length + race.playerEntries.length}</span></div>
          </div>
        </div>

        ${race.playerEntries.length > 0 ? `
        <div class="card">
          <h3>Your Entries</h3>
          ${race.playerEntries.map((e) => `
            <div class="entry-row">
              <span class="horse-color-swatch-sm" style="background:${e.horse.coat.color}"></span>
              <strong>${e.horse.name}</strong> (R${e.horse.rating}) — Jockey: ${e.jockey?.name || "TBA"}
            </div>
          `).join("")}
          <button class="btn btn-primary btn-large" id="run-race-btn" data-race-id="${race.id}" style="margin-top:15px">
            🏁 Run Race!
          </button>
        </div>` : ""}

        ${eligibleHorses.length > 0 ? `
        <div class="card">
          <h3>Enter a Horse</h3>
          <div class="entry-grid">
            ${eligibleHorses.map((h) => {
              const distFit = HorseGenerator.getDistanceFitness(h, race.distance);
              const groundFit = HorseGenerator.getGroundFitness(h, race.ground);
              return `
              <div class="entry-option" data-horse-id="${h.id}">
                <div class="entry-horse-info">
                  <span class="horse-color-swatch-sm" style="background:${h.coat.color}"></span>
                  <strong>${h.name}</strong>
                  <span>${h.age}yo | R${h.rating} | F:${h.fitness}%</span>
                </div>
                <div class="entry-suitability">
                  <span class="suit-badge ${distFit >= 0.9 ? "good" : distFit >= 0.7 ? "ok" : "poor"}">Dist: ${Math.floor(distFit * 100)}%</span>
                  <span class="suit-badge ${groundFit >= 0.9 ? "good" : groundFit >= 0.7 ? "ok" : "poor"}">Ground: ${Math.floor(groundFit * 100)}%</span>
                </div>
                <div class="jockey-select">
                  <select class="jockey-picker" data-for-horse="${h.id}">
                    ${s.retainedJockeys.map((j) => `<option value="${j.id}">${j.name} (Skill: ${j.skill})</option>`).join("")}
                    <option value="0">Freelance Jockey</option>
                  </select>
                </div>
                <button class="btn btn-primary btn-enter" data-horse-id="${h.id}">Enter</button>
              </div>`;
            }).join("")}
          </div>
        </div>` : `
        <div class="card"><p>No eligible horses for this race.</p></div>`}

        <div class="card">
          <h3>Other Runners</h3>
          <div class="runners-list">
            ${race.runners.slice(0, 12).map((r, i) => `
              <div class="runner-row">
                <span class="runner-num">${i + 1}</span>
                <span class="horse-color-swatch-sm" style="background:${r.horse.coat.color}"></span>
                <span class="runner-name">${r.horse.name}</span>
                <span>${r.horse.age}yo ${r.horse.coat.name}</span>
                <span>J: ${r.jockey?.name || "TBA"}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
  }

  bindRaces() {
    document.querySelectorAll(".race-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = parseInt(card.dataset.raceId);
        this.selectedRace = this.engine.state.currentRaces.find((r) => r.id === id);
        this.showView("races");
      });
    });
    const backBtn = document.getElementById("back-to-races");
    if (backBtn) {
      backBtn.addEventListener("click", () => { this.selectedRace = null; this.showView("races"); });
    }
    document.querySelectorAll(".btn-enter").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const horseId = parseInt(btn.dataset.horseId);
        const jockeySelect = document.querySelector(`.jockey-picker[data-for-horse="${horseId}"]`);
        const jockeyId = jockeySelect ? parseInt(jockeySelect.value) : 0;
        const result = this.engine.enterRace(this.selectedRace.id, horseId, jockeyId || null);
        this.showToast(result.message, result.success ? "success" : "error");
        if (result.success) this.showView("races");
      });
    });
    const runBtn = document.getElementById("run-race-btn");
    if (runBtn) {
      runBtn.addEventListener("click", () => {
        const raceId = parseInt(runBtn.dataset.raceId);
        this.startRaceAnimation(raceId);
      });
    }
  }

  // ── Race Animation ──
  startRaceAnimation(raceId) {
    const result = this.engine.runRace(raceId);
    if (!result) { this.showToast("Could not run race", "error"); return; }

    const main = document.getElementById("main-content");
    const race = result.race;
    const allRunners = [...race.runners, ...race.playerEntries];
    const playerIds = race.playerEntries.map((e) => e.horse.id);

    main.innerHTML = `
      <div class="race-animation-view">
        <div class="race-anim-header">
          <h2>${race.isChampionship ? "🏆 " : ""}${race.name}</h2>
          <p>${race.track} — ${HorseGenerator.formatDistance(race.distance)} — ${race.ground}</p>
        </div>
        <div class="race-track-container">
          <canvas id="race-canvas" width="900" height="400"></canvas>
        </div>
        <div class="race-commentary" id="race-commentary"></div>
        <div class="race-positions" id="race-positions"></div>
        <div class="race-controls">
          <button class="btn btn-secondary" id="race-speed-btn">Speed: 1x</button>
          <button class="btn btn-secondary" id="race-skip-btn">Skip to End</button>
        </div>
      </div>`;

    const canvas = document.getElementById("race-canvas");
    const ctx = canvas.getContext("2d");
    const comDiv = document.getElementById("race-commentary");
    const posDiv = document.getElementById("race-positions");
    let step = 0;
    let speed = 1;
    let skipped = false;
    const totalSteps = result.positions.length;

    document.getElementById("race-speed-btn").addEventListener("click", (e) => {
      speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
      e.target.textContent = `Speed: ${speed}x`;
    });
    document.getElementById("race-skip-btn").addEventListener("click", () => { skipped = true; });

    const colors = allRunners.map((r) => r.horse.coat.color);
    const names = allRunners.map((r) => r.horse.name);
    const ids = allRunners.map((r) => r.horse.id);

    const animate = () => {
      if (step >= totalSteps || skipped) {
        this.showRaceResults(result, race, playerIds);
        return;
      }

      for (let s = 0; s < speed && step < totalSteps; s++) step++;

      const snapshot = result.positions[Math.min(step - 1, totalSteps - 1)];
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Track background
      ctx.fillStyle = "#2d5a1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Track lanes
      const laneHeight = Math.min(30, (canvas.height - 60) / allRunners.length);
      const startY = 30;

      // Track markings
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([5, 5]);
      for (let q = 1; q <= 3; q++) {
        const x = 60 + (canvas.width - 120) * (q / 4);
        ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, canvas.height - 10); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Finish line
      const finishX = canvas.width - 60;
      ctx.strokeStyle = "white";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(finishX, 10); ctx.lineTo(finishX, canvas.height - 10); ctx.stroke();
      ctx.lineWidth = 1;

      // Draw horses
      const sorted = [...snapshot].sort((a, b) => b.position - a.position);
      snapshot.forEach((s, i) => {
        const x = 60 + (canvas.width - 120) * (s.position / 100);
        const y = startY + i * laneHeight + laneHeight / 2;
        const isPlayer = playerIds.includes(s.id);

        // Lane background
        if (isPlayer) {
          ctx.fillStyle = "rgba(255,215,0,0.1)";
          ctx.fillRect(0, startY + i * laneHeight, canvas.width, laneHeight);
        }

        // Horse body
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isPlayer ? "#FFD700" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isPlayer ? 2 : 1;
        ctx.stroke();

        // Silks dot
        ctx.fillStyle = isPlayer ? "#FFD700" : "#fff";
        ctx.beginPath();
        ctx.arc(x - 4, y - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Name label
        ctx.fillStyle = isPlayer ? "#FFD700" : "#ddd";
        ctx.font = isPlayer ? "bold 10px monospace" : "9px monospace";
        ctx.fillText(names[i].substring(0, 14), x + 16, y + 3);
      });

      // Progress bar
      const progress = step / totalSteps;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(60, canvas.height - 18, canvas.width - 120, 10);
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(60, canvas.height - 18, (canvas.width - 120) * progress, 10);

      // Commentary
      const latestComm = result.commentary.filter((c) => c.step <= step);
      if (latestComm.length > 0) {
        comDiv.textContent = latestComm[latestComm.length - 1].text;
      }

      // Live positions
      const topRunners = sorted.slice(0, 5);
      posDiv.innerHTML = topRunners.map((s, i) => {
        const name = names[ids.indexOf(s.id)];
        const isP = playerIds.includes(s.id);
        return `<span class="${isP ? "player-pos" : ""}">${i + 1}. ${name}</span>`;
      }).join(" | ");

      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  showRaceResults(result, race, playerIds) {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    const main = document.getElementById("main-content");
    main.innerHTML = `
      <div class="race-results-view">
        <h2>${race.isChampionship ? "🏆 " : ""}${race.name} — Results</h2>
        <p>${race.track} — ${HorseGenerator.formatDistance(race.distance)} — ${race.ground} — Prize: £${race.prize.toLocaleString()}</p>

        <div class="card">
          <div class="results-table">
            ${result.results.map((r) => {
              const isPlayer = playerIds.includes(r.horse.id);
              return `
              <div class="result-row ${isPlayer ? "player-result" : ""} ${r.position <= 3 ? "podium" : ""}">
                <span class="result-pos">${r.position <= 3 ? ["🥇", "🥈", "🥉"][r.position - 1] : r.position}</span>
                <span class="horse-color-swatch-sm" style="background:${r.horse.coat.color}"></span>
                <span class="result-name">${r.horse.name}</span>
                <span class="result-jockey">${r.jockey?.name || ""}</span>
                <span class="result-gap">${r.gap || ""}</span>
                ${r.position === 1 ? `<span class="result-prize">£${race.prize.toLocaleString()}</span>` : ""}
                ${r.position === 2 ? `<span class="result-prize">£${Math.floor(race.prize * 0.35).toLocaleString()}</span>` : ""}
                ${r.position === 3 ? `<span class="result-prize">£${Math.floor(race.prize * 0.15).toLocaleString()}</span>` : ""}
              </div>`;
            }).join("")}
          </div>
        </div>

        ${result.updates && result.updates.length > 0 ? `
        <div class="card">
          <h3>Your Results</h3>
          ${result.updates.map((u) => `<div class="notif notif-${u.type}">${u.horse}: ${u.text}</div>`).join("")}
        </div>` : ""}

        <div class="race-result-actions">
          <button class="btn btn-primary" id="results-to-races">Back to Races</button>
          <button class="btn btn-secondary" id="results-to-dash">Dashboard</button>
        </div>
      </div>`;

    document.getElementById("results-to-races").addEventListener("click", () => {
      this.selectedRace = null;
      this.showView("races");
    });
    document.getElementById("results-to-dash").addEventListener("click", () => {
      this.showView("dashboard");
    });
    this.updateTopBar();
  }

  // ── Auction ──
  renderAuction() {
    const s = this.engine.state;
    return `
      <div class="auction-view">
        <h2>Horse Auction</h2>
        <p>Balance: £${s.finances.balance.toLocaleString()}</p>
        <div class="auction-grid">
          ${s.auctionHorses.map((h) => {
            const distLabel = HorseGenerator.getDistanceLabel(h.distancePreference.ideal);
            return `
            <div class="card auction-card">
              <div class="auction-card-header">
                <div class="horse-color-swatch" style="background:${h.coat.color}; border: 2px solid ${h.coat.mane}"></div>
                <div>
                  <h3>${h.name}</h3>
                  <span>${h.age}yo ${h.coat.name} ${h.sex}</span>
                </div>
              </div>
              <div class="horse-stats-mini">
                <div class="stat-bar-group"><label>SPD</label><div class="stat-bar"><div class="stat-fill speed" style="width:${h.stats.speed}%"></div></div></div>
                <div class="stat-bar-group"><label>STA</label><div class="stat-bar"><div class="stat-fill stamina" style="width:${h.stats.stamina}%"></div></div></div>
                <div class="stat-bar-group"><label>ACC</label><div class="stat-bar"><div class="stat-fill accel" style="width:${h.stats.acceleration}%"></div></div></div>
                <div class="stat-bar-group"><label>TMP</label><div class="stat-bar"><div class="stat-fill temp" style="width:${h.stats.temperament}%"></div></div></div>
              </div>
              <div class="auction-info">
                <span>Preferred: ${distLabel} (${HorseGenerator.formatDistance(h.distancePreference.ideal)})</span>
                <span>Sire: ${h.sire}</span>
              </div>
              <div class="auction-price">
                <span class="price-tag">£${h.auctionPrice.toLocaleString()}</span>
                <button class="btn btn-primary btn-buy" data-horse-id="${h.id}" ${s.finances.balance < h.auctionPrice ? "disabled" : ""}>
                  Buy
                </button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  bindAuction() {
    document.querySelectorAll(".btn-buy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.horseId);
        const horse = this.engine.state.auctionHorses.find((h) => h.id === id);
        if (!horse) return;
        if (confirm(`Buy ${horse.name} for £${horse.auctionPrice.toLocaleString()}?`)) {
          const result = this.engine.buyHorse(horse);
          this.showToast(result.message, result.success ? "success" : "error");
          this.showView("auction");
        }
      });
    });
  }

  // ── Breeding ──
  renderBreeding() {
    const s = this.engine.state;
    const mares = s.horses.filter((h) => h.sex === "Filly" && h.age >= 4);
    return `
      <div class="breeding-view">
        <h2>Breeding</h2>
        <p>Select a mare and a stallion to breed a foal.</p>

        <div class="breeding-grid">
          <div class="card">
            <h3>Your Mares</h3>
            ${mares.length === 0 ? "<p>No eligible mares (need fillies aged 4+)</p>" : ""}
            ${mares.map((m) => `
              <div class="breed-option" data-mare-id="${m.id}">
                <span class="horse-color-swatch-sm" style="background:${m.coat.color}"></span>
                <strong>${m.name}</strong>
                <span>${m.age}yo | SPD:${m.stats.speed} STA:${m.stats.stamina} POT:${m.potential}</span>
              </div>
            `).join("")}
          </div>

          <div class="card">
            <h3>Available Stallions</h3>
            ${s.breedingStallions.map((st) => `
              <div class="breed-option" data-stallion-id="${st.id}">
                <span class="horse-color-swatch-sm" style="background:${st.coat.color}"></span>
                <strong>${st.name}</strong>
                <span>${st.age}yo | SPD:${st.stats.speed} STA:${st.stats.stamina} POT:${st.potential}</span>
                <span class="stud-fee">Fee: £${st.studFee.toLocaleString()}</span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="card breed-action-card" id="breed-selection" style="display:none">
          <h3>Breed</h3>
          <p id="breed-summary"></p>
          <button class="btn btn-primary" id="breed-btn">Breed!</button>
        </div>
      </div>`;
  }

  bindBreeding() {
    let selectedMare = null;
    let selectedStallion = null;

    const updateSelection = () => {
      const card = document.getElementById("breed-selection");
      if (selectedMare && selectedStallion) {
        card.style.display = "block";
        document.getElementById("breed-summary").textContent =
          `${selectedMare.name} × ${selectedStallion.name} — Stud Fee: £${selectedStallion.studFee.toLocaleString()}`;
      } else {
        card.style.display = "none";
      }
    };

    document.querySelectorAll("[data-mare-id]").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll("[data-mare-id]").forEach((e) => e.classList.remove("selected"));
        el.classList.add("selected");
        selectedMare = this.engine.state.horses.find((h) => h.id === parseInt(el.dataset.mareId));
        updateSelection();
      });
    });
    document.querySelectorAll("[data-stallion-id]").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll("[data-stallion-id]").forEach((e) => e.classList.remove("selected"));
        el.classList.add("selected");
        selectedStallion = this.engine.state.breedingStallions.find((h) => h.id === parseInt(el.dataset.stallionId));
        updateSelection();
      });
    });

    const breedBtn = document.getElementById("breed-btn");
    if (breedBtn) {
      breedBtn.addEventListener("click", () => {
        if (!selectedMare || !selectedStallion) return;
        const result = this.engine.breedHorse(selectedMare, selectedStallion);
        this.showToast(result.message, result.success ? "success" : "error");
        if (result.success) this.showView("breeding");
      });
    }
  }

  // ── Jockeys ──
  renderJockeys() {
    const s = this.engine.state;
    return `
      <div class="jockeys-view">
        <h2>Jockeys</h2>

        <div class="card">
          <h3>Retained Jockeys (${s.retainedJockeys.length}/5)</h3>
          ${s.retainedJockeys.length === 0 ? "<p>No jockeys retained. Hire from the pool below.</p>" : ""}
          <div class="jockey-grid">
            ${s.retainedJockeys.map((j) => `
              <div class="jockey-card retained">
                <h4>${j.name}</h4>
                <div class="jockey-stats">
                  <div class="stat-row"><span>Skill</span><span>${j.skill}</span></div>
                  <div class="stat-row"><span>Experience</span><span>${j.experience}</span></div>
                  <div class="stat-row"><span>Style</span><span>${j.style}</span></div>
                  <div class="stat-row"><span>Weekly Fee</span><span>£${j.retainerFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Record</span><span>${j.wins}/${j.rides}</span></div>
                </div>
                <button class="btn btn-danger btn-release" data-jockey-id="${j.id}">Release</button>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="card">
          <h3>Available Jockeys</h3>
          <div class="jockey-grid">
            ${s.jockeys.map((j) => `
              <div class="jockey-card">
                <h4>${j.name}</h4>
                <div class="jockey-stats">
                  <div class="stat-row"><span>Skill</span><span>${j.skill}</span></div>
                  <div class="stat-row"><span>Experience</span><span>${j.experience}</span></div>
                  <div class="stat-row"><span>Style</span><span>${j.style}</span></div>
                  <div class="stat-row"><span>Weekly Fee</span><span>£${j.retainerFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Record</span><span>${j.wins}/${j.rides}</span></div>
                </div>
                <button class="btn btn-primary btn-hire" data-jockey-id="${j.id}">Retain</button>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;
  }

  bindJockeys() {
    document.querySelectorAll(".btn-hire").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.jockeyId);
        const jockey = this.engine.state.jockeys.find((j) => j.id === id);
        if (!jockey) return;
        const result = this.engine.retainJockey(jockey);
        this.showToast(result.message, result.success ? "success" : "error");
        this.showView("jockeys");
      });
    });
    document.querySelectorAll(".btn-release").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.jockeyId);
        this.engine.releaseJockey(id);
        this.showToast("Jockey released", "info");
        this.showView("jockeys");
      });
    });
  }

  // ── Finances ──
  renderFinances() {
    const s = this.engine.state;
    const weekly = this.engine.calculateWeeklyExpenses();
    return `
      <div class="finances-view">
        <h2>Finances</h2>
        <div class="dash-grid">
          <div class="card dash-card">
            <h3>Balance</h3>
            <div class="big-number ${s.finances.balance < 0 ? "negative" : ""}">£${s.finances.balance.toLocaleString()}</div>
          </div>
          <div class="card dash-card">
            <h3>Career Earnings</h3>
            <div class="big-number">£${s.finances.totalEarnings.toLocaleString()}</div>
          </div>
          <div class="card dash-card">
            <h3>Total Expenses</h3>
            <div class="big-number negative">£${s.finances.totalExpenses.toLocaleString()}</div>
          </div>
          <div class="card dash-card">
            <h3>Weekly Cost</h3>
            <div class="big-number">£${weekly.toLocaleString()}</div>
          </div>
        </div>
        <div class="card">
          <h3>Weekly Breakdown</h3>
          <div class="stat-row"><span>Horse upkeep (${s.horses.length} × £${GAME_DATA.weeklyExpenses.perHorse})</span><span>£${(s.horses.length * GAME_DATA.weeklyExpenses.perHorse).toLocaleString()}</span></div>
          <div class="stat-row"><span>Stable costs</span><span>£${GAME_DATA.weeklyExpenses.stableUpkeep.toLocaleString()}</span></div>
          <div class="stat-row"><span>Jockey retainers (${s.retainedJockeys.length})</span><span>£${s.retainedJockeys.reduce((sum, j) => sum + j.retainerFee, 0).toLocaleString()}</span></div>
          <div class="stat-row total"><span>Total</span><span>£${weekly.toLocaleString()}/week</span></div>
        </div>
      </div>`;
  }

  // ── Stats ──
  renderStats() {
    const s = this.engine.state;
    return `
      <div class="stats-view">
        <h2>Career Statistics</h2>
        <div class="dash-grid">
          <div class="card dash-card">
            <h3>Races</h3>
            <div class="big-number">${s.stats.totalRaces}</div>
          </div>
          <div class="card dash-card">
            <h3>Wins</h3>
            <div class="big-number">${s.stats.totalWins}</div>
          </div>
          <div class="card dash-card">
            <h3>Group Wins</h3>
            <div class="big-number">${s.stats.groupWins}</div>
          </div>
          <div class="card dash-card">
            <h3>Championship Wins</h3>
            <div class="big-number">${s.stats.champWins}</div>
          </div>
        </div>

        <div class="card">
          <h3>Best Rating Achieved</h3>
          <div class="big-number">${s.stats.bestRating}</div>
        </div>

        ${s.raceResults.length > 0 ? `
        <div class="card">
          <h3>Recent Results</h3>
          ${s.raceResults.slice(-10).reverse().map((r) => `
            <div class="result-history-row">
              <strong>${r.raceName}</strong> at ${r.track} (${r.date})
              <span>1st: ${r.top3[0]?.name || "—"} | 2nd: ${r.top3[1]?.name || "—"} | 3rd: ${r.top3[2]?.name || "—"}</span>
            </div>
          `).join("")}
        </div>` : ""}
      </div>`;
  }
}

// ── Boot ──
document.addEventListener("DOMContentLoaded", () => {
  const engine = new GameEngine();
  const ui = new GameUI(engine);
  ui.init();

  document.getElementById("advance-week-btn")?.addEventListener("click", () => {
    const updates = engine.advanceWeek();
    ui.showView("dashboard");
    if (updates.length > 0) {
      updates.forEach((u) => ui.showToast(u.text, u.type));
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.id === "advance-week-btn") {
      const updates = engine.advanceWeek();
      ui.showView("dashboard");
      if (updates.length > 0) {
        updates.forEach((u) => ui.showToast(u.text, u.type));
      }
    }
  });

  document.getElementById("new-game-menu-btn")?.addEventListener("click", () => {
    if (confirm("Start a new game? Current progress will be lost.")) {
      localStorage.removeItem("startersOrders_save");
      ui.showView("newgame");
    }
  });
});
