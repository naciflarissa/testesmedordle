const availableDates = ["Sun Jan 18 2026", "Mon Jan 19 2026", "Tue Jan 20 2026"];
let currentSelectedDate = localStorage.getItem("MED_SelectedDate") || new Date().toDateString();
if (!availableDates.includes(currentSelectedDate)) currentSelectedDate = availableDates[0];

const dateToIndexMap = { "Sun Jan 18 2026": 0, "Mon Jan 19 2026": 1, "Tue Jan 20 2026": 2 };
const dailyIndex = dateToIndexMap[currentSelectedDate];
const answer = cases[dailyIndex];
const maxAttempts = 10;
const storageKey = "MEDordle_" + currentSelectedDate.replace(/ /g, "_");

let state = JSON.parse(localStorage.getItem(storageKey)) || {
  guesses: [], finished: false, won: false, startTime: null, endTime: null
};

const input = document.getElementById("guessInput");
const autocomplete = document.getElementById("autocomplete");
const rowsContainer = document.getElementById("rows");
const resultContainer = document.getElementById("result");
const attemptsSpan = document.getElementById("attempts");
const timerSpan = document.getElementById("liveTimer");
const guessBtn = document.getElementById("guessBtn");
const daySelect = document.getElementById("day-select");

let timerInterval;

availableDates.forEach(dateStr => {
    const opt = document.createElement("option");
    opt.value = dateStr;
    opt.textContent = new Date(dateStr).toLocaleDateString('pt-BR');
    if(dateStr === currentSelectedDate) opt.selected = true;
    daySelect.appendChild(opt);
});

daySelect.onchange = (e) => {
    localStorage.setItem("MED_SelectedDate", e.target.value);
    window.location.reload();
};

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    const now = state.finished ? state.endTime : Date.now();
    const diff = now - state.startTime;
    timerSpan.textContent = formatDuration(diff);
  }, 1000);
}

function initUI() {
    updateUI();
    rowsContainer.innerHTML = "";
    state.guesses.forEach(guessName => {
      const guessData = cases.find(c => c.name === guessName);
      if (guessData) renderRow(guessData);
    });
    if (state.startTime && !state.finished) startTimer();
    else if (state.finished) {
      timerSpan.textContent = formatDuration(state.endTime - state.startTime);
      endGame(state.won);
    }
}
initUI();

input.addEventListener("input", () => {
  const val = input.value.toLowerCase();
  autocomplete.innerHTML = ""; autocomplete.classList.add("hidden");
  if (!val) return;
  const matches = cases.filter(c => c.name.toLowerCase().includes(val) && !state.guesses.includes(c.name));
  if (matches.length > 0) {
    autocomplete.classList.remove("hidden");
    matches.forEach(c => {
      const div = document.createElement("div");
      div.textContent = c.name;
      div.onclick = () => { input.value = c.name; autocomplete.classList.add("hidden"); };
      autocomplete.appendChild(div);
    });
  }
});

guessBtn.onclick = () => {
  if (state.finished) return;
  const guessData = cases.find(c => c.name.toLowerCase() === input.value.toLowerCase());
  if (!guessData || state.guesses.includes(guessData.name)) return;
  if (state.guesses.length === 0 && !state.startTime) { state.startTime = Date.now(); startTimer(); }
  state.guesses.push(guessData.name);
  renderRow(guessData);
  input.value = ""; updateUI();
  if (guessData.name === answer.name) {
    state.finished = true; state.won = true; state.endTime = Date.now();
    clearInterval(timerInterval); endGame(true);
  } else if (state.guesses.length >= maxAttempts) {
    state.finished = true; state.endTime = Date.now();
    clearInterval(timerInterval); endGame(false);
  }
  saveState();
};

function updateUI() { attemptsSpan.textContent = `${state.guesses.length} / ${maxAttempts}`; }
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }

function renderRow(guess) {
  const row = document.createElement("div");
  row.className = "row";
  const getComparisonData = (arr1, arr2) => {
    const normalize = (s) => s.toLowerCase().trim();
    const nArr2 = arr2.map(normalize);
    const matches = arr1.filter(i => nArr2.includes(normalize(i)));
    if (matches.length === arr2.length && arr1.length === arr2.length) return { status: "success", count: 0 };
    return { status: matches.length > 0 ? "partial" : "error", count: matches.length };
  };
  const symp = getComparisonData(guess.symptoms, answer.symptoms);
  const book = getComparisonData(guess.booklets, answer.booklets);
  row.innerHTML = `
    <div class="cell" data-label="Diagnóstico" style="border:1px solid #45b1c2">${guess.name}</div>
    <div class="cell ${symp.status}" data-label="Sintomas">${guess.symptoms.join(", ")}${symp.count > 0 ? `<span class="match-count">${symp.count}</span>` : ''}</div>
    <div class="cell ${guess.group === answer.group ? 'success' : 'error'}" data-label="Grupo de Risco">${guess.group}</div>
    <div class="cell ${guess.area === answer.area ? 'success' : 'error'}" data-label="Área">${guess.area}</div>
    <div class="cell ${book.status}" data-label="Apostilas">${guess.booklets.join(", ")}${book.count > 0 ? `<span class="match-count">${book.count}</span>` : ''}</div>
  `;
  rowsContainer.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function endGame(won) {
  resultContainer.classList.remove("hidden");
  input.disabled = true; guessBtn.disabled = true;
  const durationText = timerSpan.textContent;
  const commonContent = `
    <div style="display: flex; gap: 20px; margin-bottom: 10px; font-size: 1.1rem;">
      <div style="background: rgba(69, 177, 194, 0.1); padding: 8px 15px; border-radius: 5px; border: 1px solid var(--accent);"><strong>Tentativas:</strong> ${state.guesses.length}/${maxAttempts}</div>
      <div style="background: rgba(69, 177, 194, 0.1); padding: 8px 15px; border-radius: 5px; border: 1px solid var(--accent);"><strong>Tempo:</strong> ${durationText}</div>
    </div>
    <span class="answer-highlight" style="color: ${won ? 'var(--success)' : 'var(--error)'}">${answer.name}</span>
    <hr style="border: 0; border-top: 1px solid #333; width: 100%; margin: 15px 0;">
    <p>${answer.summary}</p>
    <button id="shareBtn" class="share-btn">Compartilhar Resultado</button>
  `;
  resultContainer.innerHTML = won ? `<h2>Parabéns!🎈</h2>${commonContent}` : `<h2>Fim de jogo 😔</h2>${commonContent}`;
  document.getElementById("shareBtn").onclick = () => {
    const text = `MEDordle (${new Date(currentSelectedDate).toLocaleDateString('pt-BR')})\nResultado: ${state.guesses.length}/${maxAttempts}\nTempo: ${durationText}\nDiagnóstico: ${answer.name}`;
    navigator.clipboard.writeText(text); alert("Resultado copiado!");
  };
}