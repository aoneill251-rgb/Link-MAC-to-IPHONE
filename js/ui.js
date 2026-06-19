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
    setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
  }

  flag(code) {
    const flags = { GB: "🇬🇧", IE: "🇮🇪", FR: "🇫🇷", US: "🇺🇸", AU: "🇦🇺", JP: "🇯🇵", HK: "🇭🇰", UAE: "🇦🇪", IT: "🇮🇹", BR: "🇧🇷" };
    return flags[code] || "";
  }

  horseSVG(coat, size = 60) {
    const c = coat.color;
    const m = coat.mane;
    return `<svg viewBox="0 0 200 150" width="${size}" height="${size * 0.75}" style="flex-shrink:0">
      <path d="M160,45 C158,35 150,25 140,22 L138,15 C137,12 133,10 130,12 L128,18 C122,16 115,18 110,22 L100,28 C90,24 75,26 65,32 C55,38 48,48 50,60 L42,72 C38,78 36,85 38,92 L35,110 C34,115 37,118 40,118 L48,118 L50,108 C52,100 55,92 60,85 L65,80 C70,88 75,95 75,105 L75,118 L83,118 L85,105 C87,95 90,88 95,82 C100,88 105,95 106,105 L106,118 L114,118 L115,102 C116,92 118,85 122,78 L130,85 L130,118 L138,118 L140,100 C142,90 145,82 148,76 L155,82 L155,118 L163,118 L163,95 C168,85 170,75 168,65 C166,55 163,50 160,45Z" fill="${c}" stroke="${m}" stroke-width="1.5"/>
      <path d="M135,14 C132,8 128,5 126,8 L128,18 C131,16 134,15 135,14Z" fill="${m}"/>
      <path d="M50,60 C45,58 38,62 35,68 C38,65 42,63 48,64 L50,60Z" fill="${m}" opacity="0.7"/>
      <circle cx="125" cy="24" r="2.5" fill="#1a1a1a"/>
      <ellipse cx="133" cy="16" rx="3" ry="1.5" fill="${m}" opacity="0.5"/>
    </svg>`;
  }

  silksSVG(color1, color2, size = 24) {
    return `<svg viewBox="0 0 30 36" width="${size}" height="${size * 1.2}" style="flex-shrink:0">
      <path d="M5,8 L15,2 L25,8 L25,28 L20,32 L15,30 L10,32 L5,28Z" fill="${color1}" stroke="${color2}" stroke-width="1.5"/>
      <path d="M10,12 L15,8 L20,12 L20,22 L15,18 L10,22Z" fill="${color2}" opacity="0.8"/>
      <line x1="15" y1="2" x2="15" y2="8" stroke="${color2}" stroke-width="1"/>
    </svg>`;
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
            <input type="text" id="stable-name-input" placeholder="Enter your stable name..." maxlength="30" value="Douro Racing" />
          </div>
          <div class="form-group">
            <label>Difficulty</label>
            <div class="difficulty-options">
              <button class="diff-btn" data-diff="easy">
                <span class="diff-icon">🟢</span><span class="diff-label">Easy</span><span class="diff-desc">£200k, 4 horses</span>
              </button>
              <button class="diff-btn active" data-diff="normal">
                <span class="diff-icon">🟡</span><span class="diff-label">Normal</span><span class="diff-desc">£100k, 3 horses</span>
              </button>
              <button class="diff-btn" data-diff="hard">
                <span class="diff-icon">🔴</span><span class="diff-label">Hard</span><span class="diff-desc">£50k, 2 horses</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Racing Silks</label>
            <div class="silks-picker">
              <div class="silks-preview" id="silks-preview"></div>
              <div class="silks-colors">
                <div><label>Primary</label><input type="color" id="silks-primary" value="#f59e0b" /></div>
                <div><label>Secondary</label><input type="color" id="silks-secondary" value="#000000" /></div>
              </div>
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
    const preview = document.getElementById("silks-preview");
    const primaryInput = document.getElementById("silks-primary");
    const secondaryInput = document.getElementById("silks-secondary");
    const updatePreview = () => {
      if (preview) preview.innerHTML = this.silksSVG(primaryInput.value, secondaryInput.value, 48);
    };
    updatePreview();
    if (primaryInput) primaryInput.addEventListener("input", updatePreview);
    if (secondaryInput) secondaryInput.addEventListener("input", updatePreview);
    document.getElementById("start-game-btn").addEventListener("click", () => {
      const name = document.getElementById("stable-name-input").value.trim() || "My Stable";
      const silksColor = primaryInput ? primaryInput.value : "#f59e0b";
      const silksSecondary = secondaryInput ? secondaryInput.value : "#000000";
      this.engine.newGame(name, diff, silksColor, silksSecondary);
      this.showView("dashboard");
      this.showToast("Welcome to Champion Trainer! Good luck!", "success");
    });
    const contBtn = document.getElementById("continue-game-btn");
    if (contBtn) {
      contBtn.addEventListener("click", () => {
        if (this.engine.loadGame()) { this.showView("dashboard"); this.showToast("Game loaded!", "info"); }
      });
    }
  }

  // ── Dashboard ──
  renderDashboard() {
    const s = this.engine.state;
    const weeklyExpenses = this.engine.calculateWeeklyExpenses();
    const notifications = s.notifications || [];
    const champRaces = s.currentRaces.filter((r) => r.isChampionship);
    const isFlatSeason = GAME_DATA.rules.flatSeasonMonths.includes(s.calendar.month);
    const isNHSeason = GAME_DATA.rules.nhSeasonMonths.includes(s.calendar.month);
    const seasonText = isFlatSeason && isNHSeason ? "Flat & NH Season" : isFlatSeason ? "Flat Season" : isNHSeason ? "NH Season" : "AW Only";

    return `
      <div class="dashboard">
        <div class="dash-header">
          <div>
            <h2>${s.stableName}</h2>
            <span class="season-badge">${seasonText}</span>
          </div>
          <button class="btn btn-primary btn-advance" id="advance-week-btn">Advance Week ▶</button>
        </div>

        ${notifications.length > 0 ? `
        <div class="notifications card">
          <h3>This Week</h3>
          ${notifications.map((n) => `<div class="notif notif-${n.type}">${n.text}</div>`).join("")}
        </div>` : ""}

        ${champRaces.length > 0 ? `
        <div class="card championship-alert">
          <h3>Championship Race${champRaces.length > 1 ? "s" : ""} This Week!</h3>
          ${champRaces.map((r) => `
            <div class="champ-race">
              <strong>${this.flag(r.country)} ${r.name}</strong> at ${r.track} — ${HorseGenerator.formatDistance(r.distance)} — Prize: £${r.prize.toLocaleString()}
              ${r.sexRestriction ? ` (${r.sexRestriction} only)` : ""}${r.ageRestriction ? ` (${r.ageRestriction}yo)` : ""}
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
            <h3>This Week</h3>
            <div class="stat-row"><span>Races</span><span class="stat-val">${s.currentRaces.length}</span></div>
            <div class="stat-row"><span>Entered</span><span class="stat-val">${s.currentRaces.filter((r) => r.playerEntries.length > 0).length}</span></div>
            <div class="stat-row"><span>Retained Jockeys</span><span class="stat-val">${s.retainedJockeys.length}</span></div>
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
                  <span>${h.injured ? `Injured (${h.injuryWeeksLeft}w)` : GAME_DATA.trainingRegimes.find((r) => r.id === h.training)?.icon + " " + GAME_DATA.trainingRegimes.find((r) => r.id === h.training)?.name}</span>
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
    if (this.selectedHorse) return this.renderHorseDetail(this.selectedHorse);
    const auctionHorses = s.playerAuctionHorses || [];
    return `
      <div class="stable-view">
        <h2>Your Stable (${s.horses.length}/20)</h2>
        <div class="horse-grid">
          ${s.horses.map((h) => `
            <div class="card horse-card ${h.injured ? "injured" : ""}" data-horse-id="${h.id}">
              <div class="horse-card-header">
                ${this.horseSVG(h.coat, 50)}
                <div>
                  <h3>${h.name}</h3>
                  <span class="horse-subtitle">${h.age}yo ${h.coat.name} ${h.sex}</span>
                  <span class="horse-owner-line">${this.silksSVG(s.silksColor || "#f59e0b", s.silksSecondary || "#000", 14)} ${s.stableName}</span>
                </div>
                <div class="horse-rating">R${h.rating}</div>
              </div>
              <div class="horse-stats-mini">
                <div class="stat-bar-group"><label>SPD</label><div class="stat-bar"><div class="stat-fill speed" style="width:${h.stats.speed}%"></div></div><span class="stat-num">${h.stats.speed}</span></div>
                <div class="stat-bar-group"><label>STA</label><div class="stat-bar"><div class="stat-fill stamina" style="width:${h.stats.stamina}%"></div></div><span class="stat-num">${h.stats.stamina}</span></div>
                <div class="stat-bar-group"><label>ACC</label><div class="stat-bar"><div class="stat-fill accel" style="width:${h.stats.acceleration}%"></div></div><span class="stat-num">${h.stats.acceleration}</span></div>
                <div class="stat-bar-group"><label>TMP</label><div class="stat-bar"><div class="stat-fill temp" style="width:${h.stats.temperament}%"></div></div><span class="stat-num">${h.stats.temperament}</span></div>
              </div>
              <div class="horse-card-footer">
                <span>Fit: ${h.fitness}%</span>
                <span>${h.injured ? `Injured ${h.injuryWeeksLeft}w` : h.form.slice(-3).map((f) => f <= 1 ? "1" : f <= 3 ? "2" : "·").join("")}</span>
                <span>£${HorseGenerator.calculateValue(h).toLocaleString()}</span>
              </div>
              <div class="horse-card-actions">
                <button class="btn btn-primary btn-sm btn-enter-race" data-horse-id="${h.id}" ${h.injured || h.fitness < 30 ? "disabled" : ""}>Enter Race</button>
              </div>
            </div>
          `).join("")}
        </div>
        ${auctionHorses.length > 0 ? `
        <div class="card" style="margin-top:20px">
          <h3>At Auction</h3>
          ${auctionHorses.map((h) => `
            <div class="auction-listing">
              ${this.horseSVG(h.coat, 36)}
              <div class="auction-listing-info">
                <strong>${h.name}</strong> — ${h.age}yo ${h.sex}
                <span>Guide: £${h.auctionPrice.toLocaleString()} | Current bid: ${h.currentBid > 0 ? `£${h.currentBid.toLocaleString()} (${h.bidderName})` : "No bids yet"} | ${h.auctionWeeksLeft}w left</span>
              </div>
            </div>
          `).join("")}
        </div>` : ""}
      </div>`;
  }

  renderHorseDetail(horse) {
    const s = this.engine.state;
    const value = HorseGenerator.calculateValue(horse);
    const distLabel = HorseGenerator.getDistanceLabel(horse.distancePreference.ideal);
    const bestGround = Object.entries(horse.groundPreference).sort((a, b) => b[1] - a[1])[0];
    return `
      <div class="horse-detail">
        <button class="btn btn-secondary btn-back" id="back-to-stable">← Back to Stable</button>
        <div class="card horse-detail-card">
          <div class="horse-detail-header">
            ${this.horseSVG(horse.coat, 80)}
            <div>
              <h2>${horse.name}</h2>
              <p>${horse.age}yo ${horse.coat.name} ${horse.sex} | by <strong>${horse.sire}</strong> out of <strong>${horse.dam}</strong></p>
              <p>Rating: <strong>${horse.rating}</strong> | Value: <strong>£${value.toLocaleString()}</strong></p>
              <p class="horse-owner-line">${this.silksSVG(s.silksColor || "#f59e0b", s.silksSecondary || "#000", 16)} Owner: <strong>${s.stableName}</strong></p>
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
              ${horse.injured ? `<div class="injury-badge">Injured — ${horse.injuryWeeksLeft} weeks remaining</div>` : ""}
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
                <div class="stat-row"><span>2nds</span><span>${horse.careerStats.places}</span></div>
                <div class="stat-row"><span>3rds</span><span>${horse.careerStats.shows}</span></div>
                <div class="stat-row"><span>Earnings</span><span>£${horse.careerStats.earnings.toLocaleString()}</span></div>
                <div class="stat-row"><span>Win Rate</span><span>${horse.careerStats.runs > 0 ? Math.floor((horse.careerStats.wins / horse.careerStats.runs) * 100) : 0}%</span></div>
              </div>
              <div class="form-history">
                <strong>Form:</strong> ${horse.form.length > 0 ? horse.form.map((f) => `<span class="form-dot form-${f <= 1 ? "win" : f <= 3 ? "place" : "other"}">${f}</span>`).join("") : "No races yet"}
              </div>
            </div>
          </div>
          <div class="horse-actions">
            <button class="btn btn-primary" id="enter-race-btn" data-id="${horse.id}" ${horse.injured || horse.fitness < 30 ? "disabled" : ""}>Enter Race</button>
            <button class="btn btn-danger" id="sell-horse-btn" data-id="${horse.id}">Send to Auction (Guide: ~£${value.toLocaleString()})</button>
          </div>
        </div>
      </div>`;
  }

  bindStable() {
    document.querySelectorAll(".horse-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-enter-race")) return;
        const id = parseInt(card.dataset.horseId);
        this.selectedHorse = this.engine.state.horses.find((h) => h.id === id);
        this.showView("stable");
      });
    });
    document.querySelectorAll(".btn-enter-race").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectedRace = null;
        this.showView("races");
        this.showToast("Select a race to enter your horse", "info");
      });
    });
    const backBtn = document.getElementById("back-to-stable");
    if (backBtn) backBtn.addEventListener("click", () => { this.selectedHorse = null; this.showView("stable"); });
    document.querySelectorAll(".training-btn:not(.disabled)").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this.selectedHorse) {
          this.selectedHorse.training = btn.dataset.training;
          document.querySelectorAll(".training-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.engine.saveGame();
          this.showToast(`Training: ${btn.querySelector(".training-name").textContent}`, "success");
        }
      });
    });
    const enterRaceBtn = document.getElementById("enter-race-btn");
    if (enterRaceBtn) {
      enterRaceBtn.addEventListener("click", () => {
        this.selectedRace = null;
        this.showView("races");
        this.showToast("Select a race to enter your horse", "info");
      });
    }
    const sellBtn = document.getElementById("sell-horse-btn");
    if (sellBtn) {
      sellBtn.addEventListener("click", () => {
        if (confirm(`Send ${this.selectedHorse.name} to auction? Bidding runs for 2 weeks.`)) {
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
                <h3>${r.isChampionship ? this.flag(r.country) + " " : ""}${r.name}</h3>
                <span class="race-class-badge class-${Math.max(0, r.class.class)}">${r.class.name}</span>
              </div>
              <div class="race-info">
                <span>${r.track}</span>
                <span>${HorseGenerator.formatDistance(r.distance)}</span>
                <span>${r.surface}</span>
                <span>${r.ground}</span>
                <span>£${r.prize.toLocaleString()}</span>
                <span>${r.runners.length + r.playerEntries.length} runners</span>
                ${r.ageRestriction ? `<span>${r.ageRestriction}yo only</span>` : ""}
                ${r.sexRestriction ? `<span>${r.sexRestriction} only</span>` : ""}
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
      const check = RaceEngine.canEnterRace(h, race, s);
      return check.ok && !race.playerEntries.find((e) => e.horse.id === h.id);
    });
    return `
      <div class="race-detail">
        <button class="btn btn-secondary btn-back" id="back-to-races">← Back to Races</button>
        <div class="card">
          <div class="race-detail-header">
            <h2>${race.isChampionship ? this.flag(race.country) + " " : ""}${race.name}</h2>
            <span class="race-class-badge class-${Math.max(0, race.class.class)}">${race.class.name}</span>
          </div>
          <div class="race-info-detail">
            <div class="stat-row"><span>Track</span><span>${race.track}</span></div>
            <div class="stat-row"><span>Distance</span><span>${HorseGenerator.formatDistance(race.distance)} (${HorseGenerator.getDistanceLabel(race.distance)})</span></div>
            <div class="stat-row"><span>Surface</span><span>${race.surface}</span></div>
            <div class="stat-row"><span>Going</span><span>${race.ground}</span></div>
            <div class="stat-row"><span>Prize</span><span>£${race.prize.toLocaleString()} (1st: £${Math.floor(race.prize * GAME_DATA.rules.prizeDistribution[1]).toLocaleString()})</span></div>
            <div class="stat-row"><span>Runners</span><span>${race.runners.length + race.playerEntries.length}</span></div>
            ${race.sexRestriction ? `<div class="stat-row"><span>Conditions</span><span>${race.sexRestriction} only</span></div>` : ""}
            ${race.ageRestriction ? `<div class="stat-row"><span>Age</span><span>${race.ageRestriction} year olds</span></div>` : ""}
            <div class="stat-row"><span>Type</span><span>${race.class.type === "handicap" ? "Handicap" : race.class.type === "pattern" ? "Pattern/Group" : "Conditions"}</span></div>
          </div>
        </div>

        ${race.playerEntries.length > 0 ? `
        <div class="card">
          <h3>Your Entries</h3>
          ${race.playerEntries.map((e) => `
            <div class="entry-row">
              <span class="horse-color-swatch-sm" style="background:${e.horse.coat.color}"></span>
              <strong>${e.horse.name}</strong> (R${e.horse.rating}, ${HorseGenerator.formatWeight(e.weight)})
              — J: ${e.jockey?.name || "TBA"} ${e.jockey?.nationality ? this.flag(e.jockey.nationality) : ""}
            </div>
          `).join("")}
          <button class="btn btn-primary btn-large" id="run-race-btn" data-race-id="${race.id}" style="margin-top:15px">Run Race!</button>
        </div>` : ""}

        ${eligibleHorses.length > 0 ? `
        <div class="card">
          <h3>Enter a Horse</h3>
          <div class="entry-grid">
            ${eligibleHorses.map((h) => {
              const distFit = HorseGenerator.getDistanceFitness(h, race.distance);
              const groundFit = HorseGenerator.getGroundFitness(h, race.ground);
              const weight = HorseGenerator.calculateWeight(h, race);
              return `
              <div class="entry-option" data-horse-id="${h.id}">
                <div class="entry-horse-info">
                  <span class="horse-color-swatch-sm" style="background:${h.coat.color}"></span>
                  <strong>${h.name}</strong>
                  <span>${h.age}yo ${h.sex} | R${h.rating} | F:${h.fitness}% | ${HorseGenerator.formatWeight(weight)}</span>
                </div>
                <div class="entry-suitability">
                  <span class="suit-badge ${distFit >= 0.9 ? "good" : distFit >= 0.7 ? "ok" : "poor"}">Dist: ${Math.floor(distFit * 100)}%</span>
                  <span class="suit-badge ${groundFit >= 0.9 ? "good" : groundFit >= 0.7 ? "ok" : "poor"}">Going: ${Math.floor(groundFit * 100)}%</span>
                </div>
                <div class="jockey-select">
                  <select class="jockey-picker" data-for-horse="${h.id}">
                    ${s.retainedJockeys.map((j) => `<option value="${j.id}">${j.name} ${this.flag(j.nationality)} (${j.skill})</option>`).join("")}
                    <option value="0">Freelance Jockey</option>
                  </select>
                </div>
                <button class="btn btn-primary btn-enter" data-horse-id="${h.id}">Enter</button>
              </div>`;
            }).join("")}
          </div>
        </div>` : `<div class="card"><p>No eligible horses for this race.</p></div>`}

        <div class="card">
          <h3>Declared Runners</h3>
          <div class="runners-list">
            <div class="runner-row runner-header">
              <span class="runner-num">#</span><span></span><span class="runner-name">Horse</span>
              <span>Age</span><span>Trainer</span><span>Jockey</span><span>Wgt</span><span>Owner</span>
            </div>
            ${race.runners.map((r, i) => `
              <div class="runner-row">
                <span class="runner-num">${i + 1}</span>
                <span class="horse-color-swatch-sm" style="background:${r.horse.coat.color}"></span>
                <span class="runner-name">${r.horse.name}</span>
                <span>${r.horse.age}yo</span>
                <span class="runner-trainer">${r.horse.trainer || "—"}</span>
                <span>${r.jockey?.name || "—"} ${r.jockey?.nationality ? this.flag(r.jockey.nationality) : ""}</span>
                <span>${HorseGenerator.formatWeight(r.weight || 126)}</span>
                <span class="runner-owner">${r.horse.aiOwner || "—"}</span>
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
    if (backBtn) backBtn.addEventListener("click", () => { this.selectedRace = null; this.showView("races"); });
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
    if (runBtn) runBtn.addEventListener("click", () => this.startRaceAnimation(parseInt(runBtn.dataset.raceId)));
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
          <h2>${race.isChampionship ? this.flag(race.country) + " " : ""}${race.name}</h2>
          <p>${race.track} — ${HorseGenerator.formatDistance(race.distance)} — Going: ${race.ground}</p>
        </div>
        <div class="race-track-container"><canvas id="race-canvas" width="900" height="400"></canvas></div>
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
    let step = 0, speed = 1, skipped = false;
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
      if (step >= totalSteps || skipped) { this.showRaceResults(result, race, playerIds); return; }
      for (let s = 0; s < speed && step < totalSteps; s++) step++;

      const snapshot = result.positions[Math.min(step - 1, totalSteps - 1)];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#2d5a1e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const laneHeight = Math.min(30, (canvas.height - 60) / allRunners.length);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.setLineDash([5, 5]);
      for (let q = 1; q <= 3; q++) {
        const x = 60 + (canvas.width - 120) * (q / 4);
        ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, canvas.height - 10); ctx.stroke();
      }
      ctx.setLineDash([]);

      const finishX = canvas.width - 60;
      ctx.strokeStyle = "white"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(finishX, 10); ctx.lineTo(finishX, canvas.height - 10); ctx.stroke();
      ctx.lineWidth = 1;

      const sorted = [...snapshot].sort((a, b) => b.position - a.position);
      snapshot.forEach((s, i) => {
        const x = 60 + (canvas.width - 120) * (s.position / 100);
        const y = 30 + i * laneHeight + laneHeight / 2;
        const isPlayer = playerIds.includes(s.id);

        if (isPlayer) {
          ctx.fillStyle = "rgba(255,215,0,0.1)";
          ctx.fillRect(0, 30 + i * laneHeight, canvas.width, laneHeight);
        }
        ctx.fillStyle = colors[i];
        ctx.beginPath(); ctx.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = isPlayer ? "#FFD700" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isPlayer ? 2 : 1; ctx.stroke();
        ctx.fillStyle = isPlayer ? "#FFD700" : "#fff";
        ctx.beginPath(); ctx.arc(x - 4, y - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = isPlayer ? "#FFD700" : "#ddd";
        ctx.font = isPlayer ? "bold 10px monospace" : "9px monospace";
        ctx.fillText(names[i].substring(0, 14), x + 16, y + 3);
      });

      const progress = step / totalSteps;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(60, canvas.height - 18, canvas.width - 120, 10);
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(60, canvas.height - 18, (canvas.width - 120) * progress, 10);

      const latestComm = result.commentary.filter((c) => c.step <= step);
      if (latestComm.length > 0) comDiv.textContent = latestComm[latestComm.length - 1].text;

      posDiv.innerHTML = sorted.slice(0, 5).map((s, i) => {
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
    const pd = GAME_DATA.rules.prizeDistribution;
    main.innerHTML = `
      <div class="race-results-view">
        <h2>${race.isChampionship ? this.flag(race.country) + " " : ""}${race.name} — Result</h2>
        <p>${race.track} — ${HorseGenerator.formatDistance(race.distance)} — Going: ${race.ground} — Total Prize: £${race.prize.toLocaleString()}</p>
        <div class="card">
          <div class="results-table">
            <div class="result-row result-header">
              <span class="result-pos">Pos</span><span></span><span class="result-name">Horse</span>
              <span class="result-jockey">Jockey</span><span class="result-trainer">Trainer</span>
              <span class="result-wgt">Wgt</span><span class="result-gap">Dist</span><span class="result-prize">Prize</span>
            </div>
            ${result.results.map((r) => {
              const isPlayer = playerIds.includes(r.horse.id);
              const prize = pd[r.position] ? Math.floor(race.prize * pd[r.position]) : 0;
              return `
              <div class="result-row ${isPlayer ? "player-result" : ""} ${r.position <= 3 ? "podium" : ""}">
                <span class="result-pos">${r.position}</span>
                <span class="horse-color-swatch-sm" style="background:${r.horse.coat.color}"></span>
                <span class="result-name">${r.horse.name}${isPlayer ? " *" : ""}</span>
                <span class="result-jockey">${r.jockey?.name || "—"} ${r.jockey?.nationality ? this.flag(r.jockey.nationality) : ""}</span>
                <span class="result-trainer">${r.horse.trainer || (isPlayer ? this.engine.state.stableName : "—")}</span>
                <span class="result-wgt">${HorseGenerator.formatWeight(r.weight || 126)}</span>
                <span class="result-gap">${r.gap || "—"}</span>
                <span class="result-prize">${prize > 0 ? "£" + prize.toLocaleString() : ""}</span>
              </div>`;
            }).join("")}
          </div>
        </div>

        ${result.updates && result.updates.length > 0 ? `
        <div class="card">
          <h3>Your Results</h3>
          ${result.updates.map((u) => `<div class="notif notif-${u.type}"><strong>${u.horse}:</strong> ${u.text}</div>`).join("")}
        </div>` : ""}

        <div class="race-result-actions">
          <button class="btn btn-primary" id="results-to-races">Back to Races</button>
          <button class="btn btn-secondary" id="results-to-dash">Dashboard</button>
        </div>
      </div>`;

    document.getElementById("results-to-races").addEventListener("click", () => { this.selectedRace = null; this.showView("races"); });
    document.getElementById("results-to-dash").addEventListener("click", () => this.showView("dashboard"));
    this.updateTopBar();
  }

  // ── Auction ──
  renderAuction() {
    const s = this.engine.state;
    const playerAuction = s.playerAuctionHorses || [];
    return `
      <div class="auction-view">
        <h2>Horse Auction</h2>
        <p>Balance: £${s.finances.balance.toLocaleString()}</p>
        ${playerAuction.length > 0 ? `
        <div class="card" style="border-color:var(--accent);margin-bottom:20px">
          <h3>Your Horses at Auction</h3>
          ${playerAuction.map((h) => `
            <div class="auction-listing">
              ${this.horseSVG(h.coat, 40)}
              <div class="auction-listing-info">
                <strong>${h.name}</strong> — ${h.age}yo ${h.sex} | Guide: £${h.auctionPrice.toLocaleString()}
                <span>Current bid: ${h.currentBid > 0 ? `£${h.currentBid.toLocaleString()} (${h.bidderName})` : "No bids yet"} | ${h.auctionWeeksLeft} week${h.auctionWeeksLeft !== 1 ? "s" : ""} remaining</span>
              </div>
            </div>
          `).join("")}
        </div>` : ""}
        <h3>Horses for Sale</h3>
        <div class="auction-grid">
          ${s.auctionHorses.map((h) => {
            const distLabel = HorseGenerator.getDistanceLabel(h.distancePreference.ideal);
            return `
            <div class="card auction-card">
              <div class="auction-card-header">
                ${this.horseSVG(h.coat, 50)}
                <div><h3>${h.name}</h3><span>${h.age}yo ${h.coat.name} ${h.sex}</span></div>
              </div>
              <div class="horse-stats-mini">
                <div class="stat-bar-group"><label>SPD</label><div class="stat-bar"><div class="stat-fill speed" style="width:${h.stats.speed}%"></div></div></div>
                <div class="stat-bar-group"><label>STA</label><div class="stat-bar"><div class="stat-fill stamina" style="width:${h.stats.stamina}%"></div></div></div>
                <div class="stat-bar-group"><label>ACC</label><div class="stat-bar"><div class="stat-fill accel" style="width:${h.stats.acceleration}%"></div></div></div>
                <div class="stat-bar-group"><label>TMP</label><div class="stat-bar"><div class="stat-fill temp" style="width:${h.stats.temperament}%"></div></div></div>
              </div>
              <div class="auction-info">
                <span>Distance: ${distLabel} (${HorseGenerator.formatDistance(h.distancePreference.ideal)})</span>
                <span>by ${h.sire} out of ${h.dam}</span>
              </div>
              <div class="auction-price">
                <span class="price-tag">£${h.auctionPrice.toLocaleString()}</span>
                <button class="btn btn-primary btn-buy" data-horse-id="${h.id}" ${s.finances.balance < h.auctionPrice ? "disabled" : ""}>Buy</button>
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
    const currentMonth = s.calendar.month;
    const inSeason = GAME_DATA.rules.breedingSeason.includes(currentMonth);

    return `
      <div class="breeding-view">
        <h2>Breeding</h2>
        ${!inSeason ? `<div class="card" style="border-color:var(--warning)"><p>Breeding season is <strong>February — June</strong>. Currently ${GAME_DATA.months[currentMonth]}.</p></div>` : ""}
        <p>Select a mare and a stallion to breed a foal.</p>
        <div class="breeding-grid">
          <div class="card">
            <h3>Your Mares</h3>
            ${mares.length === 0 ? "<p>No eligible mares (need fillies aged 4+)</p>" : ""}
            ${mares.map((m) => `
              <div class="breed-option" data-mare-id="${m.id}">
                <span class="horse-color-swatch-sm" style="background:${m.coat.color}"></span>
                <strong>${m.name}</strong>
                <span>${m.age}yo | SPD:${m.stats.speed} STA:${m.stats.stamina}</span>
              </div>
            `).join("")}
          </div>
          <div class="card">
            <h3>Available Stallions</h3>
            ${s.breedingStallions.map((st) => `
              <div class="breed-option" data-stallion-id="${st.id}">
                <span class="horse-color-swatch-sm" style="background:${st.coat.color}"></span>
                <strong>${st.name}</strong>
                <span>${st.age}yo | SPD:${st.stats.speed} STA:${st.stats.stamina}</span>
                <span class="stud-fee">Fee: £${st.studFee.toLocaleString()}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="card breed-action-card" id="breed-selection" style="display:none">
          <h3>Breed</h3>
          <p id="breed-summary"></p>
          <button class="btn btn-primary" id="breed-btn" ${!inSeason ? "disabled" : ""}>Breed!</button>
        </div>
      </div>`;
  }

  bindBreeding() {
    let selectedMare = null, selectedStallion = null;
    const updateSelection = () => {
      const card = document.getElementById("breed-selection");
      if (selectedMare && selectedStallion) {
        card.style.display = "block";
        document.getElementById("breed-summary").textContent =
          `${selectedMare.name} x ${selectedStallion.name} — Stud Fee: £${selectedStallion.studFee.toLocaleString()}`;
      } else card.style.display = "none";
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
                <h4>${this.flag(j.nationality)} ${j.name}</h4>
                <div class="jockey-stats">
                  <div class="stat-row"><span>Skill</span><span>${j.skill}</span></div>
                  <div class="stat-row"><span>Experience</span><span>${j.experience}</span></div>
                  <div class="stat-row"><span>Style</span><span>${j.style}</span></div>
                  <div class="stat-row"><span>Weekly Fee</span><span>£${j.retainerFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Ride Fee</span><span>£${j.rideFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Record</span><span>${j.wins} wins / ${j.rides} rides (${j.rides > 0 ? Math.floor(j.wins / j.rides * 100) : 0}%)</span></div>
                  ${j.nh ? `<div class="stat-row"><span>Type</span><span>National Hunt</span></div>` : ""}
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
                <h4>${this.flag(j.nationality)} ${j.name}</h4>
                <div class="jockey-stats">
                  <div class="stat-row"><span>Skill</span><span>${j.skill}</span></div>
                  <div class="stat-row"><span>Experience</span><span>${j.experience}</span></div>
                  <div class="stat-row"><span>Style</span><span>${j.style}</span></div>
                  <div class="stat-row"><span>Weekly Fee</span><span>£${j.retainerFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Ride Fee</span><span>£${j.rideFee.toLocaleString()}</span></div>
                  <div class="stat-row"><span>Record</span><span>${j.wins} wins / ${j.rides} rides (${j.rides > 0 ? Math.floor(j.wins / j.rides * 100) : 0}%)</span></div>
                  ${j.nh ? `<div class="stat-row"><span>Type</span><span>National Hunt</span></div>` : ""}
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
        this.engine.releaseJockey(parseInt(btn.dataset.jockeyId));
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
          <div class="card dash-card"><h3>Balance</h3><div class="big-number ${s.finances.balance < 0 ? "negative" : ""}">£${s.finances.balance.toLocaleString()}</div></div>
          <div class="card dash-card"><h3>Career Earnings</h3><div class="big-number">£${s.finances.totalEarnings.toLocaleString()}</div></div>
          <div class="card dash-card"><h3>Total Expenses</h3><div class="big-number negative">£${s.finances.totalExpenses.toLocaleString()}</div></div>
          <div class="card dash-card"><h3>Weekly Cost</h3><div class="big-number">£${weekly.toLocaleString()}</div></div>
        </div>
        <div class="card">
          <h3>Weekly Breakdown</h3>
          <div class="stat-row"><span>Horse upkeep (${s.horses.length} x £${GAME_DATA.weeklyExpenses.perHorse})</span><span>£${(s.horses.length * GAME_DATA.weeklyExpenses.perHorse).toLocaleString()}</span></div>
          <div class="stat-row"><span>Stable costs</span><span>£${GAME_DATA.weeklyExpenses.stableUpkeep.toLocaleString()}</span></div>
          <div class="stat-row"><span>Jockey retainers (${s.retainedJockeys.length})</span><span>£${s.retainedJockeys.reduce((sum, j) => sum + j.retainerFee, 0).toLocaleString()}</span></div>
          <div class="stat-row total"><span>Total</span><span>£${weekly.toLocaleString()}/week</span></div>
        </div>
        <div class="card">
          <h3>Prize Money Distribution (per race)</h3>
          <div class="stat-row"><span>1st</span><span>56.7%</span></div>
          <div class="stat-row"><span>2nd</span><span>21.7%</span></div>
          <div class="stat-row"><span>3rd</span><span>10.8%</span></div>
          <div class="stat-row"><span>4th</span><span>5.4%</span></div>
          <div class="stat-row"><span>5th-6th</span><span>2.7% each</span></div>
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
          <div class="card dash-card"><h3>Races</h3><div class="big-number">${s.stats.totalRaces}</div></div>
          <div class="card dash-card"><h3>Wins</h3><div class="big-number">${s.stats.totalWins}</div></div>
          <div class="card dash-card"><h3>Group Wins</h3><div class="big-number">${s.stats.groupWins}</div></div>
          <div class="card dash-card"><h3>Championship Wins</h3><div class="big-number">${s.stats.champWins}</div></div>
        </div>
        <div class="card"><h3>Best Rating Achieved</h3><div class="big-number">${s.stats.bestRating}</div></div>
        ${s.raceResults.length > 0 ? `
        <div class="card">
          <h3>Recent Results</h3>
          ${s.raceResults.slice(-10).reverse().map((r) => `
            <div class="result-history-row">
              <strong>${r.raceName}</strong> at ${r.track} (${r.date})
              <span>1st: ${r.top3[0]?.name || "—"} (J: ${r.top3[0]?.jockey || "—"}, T: ${r.top3[0]?.trainer || "—"}) | 2nd: ${r.top3[1]?.name || "—"} | 3rd: ${r.top3[2]?.name || "—"}</span>
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

  document.addEventListener("click", (e) => {
    if (e.target.id === "advance-week-btn") {
      const updates = engine.advanceWeek();
      ui.showView("dashboard");
      if (updates.length > 0) updates.forEach((u) => ui.showToast(u.text, u.type));
    }
  });

  document.getElementById("new-game-menu-btn")?.addEventListener("click", () => {
    if (confirm("Start a new game? Current progress will be lost.")) {
      localStorage.removeItem("startersOrders_save");
      ui.showView("newgame");
    }
  });
});
