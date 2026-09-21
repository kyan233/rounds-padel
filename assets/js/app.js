/* Rounds: working Americano round builder for the landing page, plus form state.
   Plain JS, no dependencies. */
(function () {
  "use strict";

  // ---- Reveal on scroll (no scroll listeners) ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Americano schedule ----
  // Circle method: player 0 stays, the rest rotate one place each round.
  // Each round is chunked into groups of four per court; inside a group the
  // teams are (1st + 4th) vs (2nd + 3rd), so partners change every round.
  function schedule(players, courts) {
    var n = players.length;
    var rounds = [];
    var totalRounds = Math.max(1, n - 1);
    var order = players.slice();
    for (var r = 0; r < totalRounds; r++) {
      var playing = Math.min(courts * 4, Math.floor(n / 4) * 4);
      var matches = [];
      for (var c = 0; c < playing; c += 4) {
        var g = order.slice(c, c + 4);
        matches.push({ court: c / 4 + 1, a: [g[0], g[3]], b: [g[1], g[2]] });
      }
      rounds.push({ matches: matches, resting: order.slice(playing) });
      // rotate everyone except the first player
      var rest = order.slice(1);
      rest.unshift(rest.pop());
      order = [order[0]].concat(rest);
    }
    return rounds;
  }

  var form = document.getElementById("builder-form");
  if (!form) return;
  var namesEl = document.getElementById("names");
  var courtsEl = document.getElementById("courts");
  var namesField = namesEl.closest(".field");
  var out = document.getElementById("rounds");
  var courtsOut = document.getElementById("courts-out");
  var roundLabel = document.getElementById("round-label");
  var restingEl = document.getElementById("resting");
  var boardEl = document.getElementById("board");
  var prevBtn = document.getElementById("prev");
  var nextBtn = document.getElementById("next");

  var state = { players: [], rounds: [], idx: 0, scores: {} };

  function parseNames(text) {
    return text.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean)
      .filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  function scoreKey(r, m, side) { return r + ":" + m + ":" + side; }

  function render() {
    var round = state.rounds[state.idx];
    roundLabel.textContent = "Round " + (state.idx + 1) + " of " + state.rounds.length;
    prevBtn.disabled = state.idx === 0;
    nextBtn.disabled = state.idx === state.rounds.length - 1;
    courtsOut.innerHTML = "";
    round.matches.forEach(function (m, mi) {
      var el = document.createElement("div");
      el.className = "court";
      el.innerHTML =
        '<div class="label">Court ' + m.court + "</div>" +
        teamRow(m.a, scoreKey(state.idx, mi, "a")) +
        teamRow(m.b, scoreKey(state.idx, mi, "b"));
      courtsOut.appendChild(el);
    });
    restingEl.textContent = round.resting.length ? "Sitting out: " + round.resting.join(", ") : "";
    renderBoard();
  }

  function teamRow(team, key) {
    var v = state.scores[key];
    return '<div class="team"><span class="names">' + esc(team[0]) + " + " + esc(team[1]) + "</span>" +
      '<input type="number" inputmode="numeric" min="0" max="99" aria-label="Points for ' + esc(team[0]) + " and " + esc(team[1]) + '" data-key="' + key + '" value="' + (v == null ? "" : v) + '" placeholder="0"></div>';
  }

  function renderBoard() {
    var pts = {};
    state.players.forEach(function (p) { pts[p] = 0; });
    state.rounds.forEach(function (round, ri) {
      round.matches.forEach(function (m, mi) {
        var a = Number(state.scores[scoreKey(ri, mi, "a")] || 0);
        var b = Number(state.scores[scoreKey(ri, mi, "b")] || 0);
        m.a.forEach(function (p) { pts[p] += a; });
        m.b.forEach(function (p) { pts[p] += b; });
      });
    });
    var rows = state.players.slice().sort(function (x, y) { return pts[y] - pts[x] || x.localeCompare(y); });
    boardEl.innerHTML = rows.map(function (p, i) {
      var lead = i === 0 && pts[p] > 0 ? ' class="lead"' : "";
      return "<li" + lead + "><span>" + esc(p) + '</span><span class="pts">' + pts[p] + "</span></li>";
    }).join("");
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var players = parseNames(namesEl.value);
    var courts = Number(courtsEl.value);
    namesField.classList.remove("has-error");
    if (players.length < 4) {
      namesField.classList.add("has-error");
      namesEl.focus();
      return;
    }
    state = { players: players, rounds: schedule(players, courts), idx: 0, scores: {} };
    out.hidden = false;
    render();
    if (window.matchMedia("(max-width: 860px)").matches) {
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  courtsOut.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t && t.dataset && t.dataset.key) {
      state.scores[t.dataset.key] = t.value === "" ? null : Number(t.value);
      renderBoard();
    }
  });
  prevBtn.addEventListener("click", function () { if (state.idx > 0) { state.idx--; render(); } });
  nextBtn.addEventListener("click", function () { if (state.idx < state.rounds.length - 1) { state.idx++; render(); } });

  // ---- Early-access form: show thanks state after the redirect back ----
  var thanks = document.getElementById("thanks");
  var signup = document.getElementById("signup-form");
  if (thanks && signup && /[?&]joined=1/.test(location.search)) {
    signup.hidden = true;
    thanks.hidden = false;
    thanks.scrollIntoView({ block: "center" });
  }
})();
