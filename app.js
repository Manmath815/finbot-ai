/* ═══════════════════════════════════════════════════════
   FinBot AI — Digital Financial Literacy
   Frontend JavaScript
════════════════════════════════════════════════════════ */
"use strict";

// ─────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────
const State = {
  theme: localStorage.getItem("theme") || "light",
  language: localStorage.getItem("language") || "en",
  chatCount: parseInt(localStorage.getItem("chatCount") || "0"),
  sipChartInst: null,
  emiChartInst: null,
  budgetPieInst: null,
  budgetChartInst: null,
  growthChartInst: null,
};

// ─────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(State.theme);
  setupNavigation();
  setupChat();
  setupThemeToggle();
  setupRangeLinks();
  setupLanguageSelect();
  renderTopicCards();
  renderLearnGrid();
  initDashboardCharts();
  updateChatCountDisplay();
  renderQuickPrompts();
  activateTab("chat");
});

// ─────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll("[data-tab]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activateTab(link.dataset.tab);
    });
  });
}

function activateTab(tabName) {
  // Sections
  document.querySelectorAll(".tab-section").forEach(s => s.classList.remove("active"));
  const section = document.getElementById(`tab-${tabName}`);
  if (section) section.classList.add("active");

  // Nav links
  document.querySelectorAll("[data-tab]").forEach(l => {
    l.classList.toggle("active", l.dataset.tab === tabName);
  });

  // Close mobile nav
  const navMenu = document.getElementById("navMenu");
  if (navMenu.classList.contains("show")) {
    new bootstrap.Collapse(navMenu).hide();
  }

  // Initialize charts when dashboard is opened
  if (tabName === "dashboard") {
    setTimeout(() => initDashboardCharts(), 100);
  }
}

// ─────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
  localStorage.setItem("theme", theme);
  State.theme = theme;

  // Reinit charts with new colors
  setTimeout(() => {
    initDashboardCharts();
    if (State.sipChartInst) calculateSIP();
    if (State.emiChartInst) calculateEMI();
  }, 100);
}

function setupThemeToggle() {
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    applyTheme(State.theme === "dark" ? "light" : "dark");
  });
}

function isDark() { return State.theme === "dark"; }
function getChartColors() {
  return {
    grid: isDark() ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    text: isDark() ? "#8892a4" : "#6b7280",
    bg: isDark() ? "#1a1d27" : "#ffffff",
  };
}

// ─────────────────────────────────────────────────────
// LANGUAGE
// ─────────────────────────────────────────────────────
function setupLanguageSelect() {
  ["langSelect", "langSelectMobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = State.language;
      el.addEventListener("change", (e) => {
        State.language = e.target.value;
        localStorage.setItem("language", State.language);
        const other = id === "langSelect" ? "langSelectMobile" : "langSelect";
        const otherEl = document.getElementById(other);
        if (otherEl) otherEl.value = State.language;
        showToast("Language preference saved! FinBot will respond accordingly 🌐");
      });
    }
  });
}

// ─────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────
function setupChat() {
  const input = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const clearBtn = document.getElementById("clearChatBtn");

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    input.addEventListener("input", () => {
      // Auto resize
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
      // Char count
      const count = input.value.length;
      const el = document.getElementById("charCount");
      if (el) {
        el.textContent = `${count}/1000`;
        el.className = `char-count${count > 900 ? " warning" : ""}`;
      }
    });
  }

  sendBtn?.addEventListener("click", sendMessage);
  clearBtn?.addEventListener("click", clearChat);
}

async function sendMessage() {
  const input = document.getElementById("userInput");
  const message = input?.value.trim();
  if (!message) return;

  input.value = "";
  input.style.height = "auto";
  document.getElementById("charCount").textContent = "0/1000";

  appendMessage(message, "user");
  setTyping(true);
  disableSend(true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language: State.language }),
    });
    const data = await res.json();
    setTyping(false);
    disableSend(false);

    if (data.response) {
      appendMessage(data.response, "bot");
      if (data.status === "fallback") {
        showToast("⚠️ Using offline mode — check API credentials", "warning");
      }
      // Update chat count
      State.chatCount++;
      localStorage.setItem("chatCount", State.chatCount);
      updateChatCountDisplay();
    } else {
      appendMessage("Sorry, something went wrong. Please try again.", "bot");
    }
  } catch (err) {
    setTyping(false);
    disableSend(false);
    appendMessage("Network error. Please check your connection and try again.", "bot");
    console.error("Chat error:", err);
  }
}

function appendMessage(text, role) {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = `message ${role}-message animate-in`;

  const avatarIcon = role === "bot" ? "bi-robot" : "bi-person-fill";
  const avatarStyle = role === "bot"
    ? "background:linear-gradient(135deg,var(--primary),#6366f1);color:#fff;"
    : "background:linear-gradient(135deg,var(--success),#15803d);color:#fff;";

  const renderedText = role === "bot" ? markdownToHtml(text) : escapeHtml(text);
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  div.innerHTML = `
    <div class="msg-avatar" style="${avatarStyle}">
      <i class="bi ${avatarIcon}"></i>
    </div>
    <div class="msg-content">
      <div class="msg-bubble">${role === "bot" ? `<div class="rendered-content">${renderedText}</div>` : renderedText}</div>
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function setTyping(show) {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.classList.toggle("d-none", !show);
}

function disableSend(disabled) {
  const btn = document.getElementById("sendBtn");
  const input = document.getElementById("userInput");
  if (btn) btn.disabled = disabled;
  if (input) input.disabled = disabled;
}

async function clearChat() {
  if (!confirm("Clear chat history?")) return;
  try {
    await fetch("/api/clear-history", { method: "POST" });
  } catch (_) {}
  const container = document.getElementById("chatMessages");
  if (container) container.innerHTML = "";
  appendMessage("Chat cleared! I'm ready to help you with your financial questions. What would you like to know? 😊", "bot");
  State.chatCount = 0;
  localStorage.setItem("chatCount", 0);
  updateChatCountDisplay();
}

function updateChatCountDisplay() {
  const el = document.getElementById("totalChats");
  if (el) el.textContent = State.chatCount;
}

// Quick Prompts
function renderQuickPrompts() {
  document.querySelectorAll(".qp-btn[data-msg]").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById("userInput");
      if (input) {
        input.value = btn.dataset.msg;
        input.dispatchEvent(new Event("input"));
        activateTab("chat");
        sendMessage();
      }
    });
  });
}

// ─────────────────────────────────────────────────────
// SIP CALCULATOR
// ─────────────────────────────────────────────────────
function calculateSIP() {
  const amount = parseFloat(document.getElementById("sipAmount").value) || 5000;
  const rate   = parseFloat(document.getElementById("sipRate").value) || 12;
  const years  = parseInt(document.getElementById("sipYears").value) || 10;

  fetch("/api/sip-calculator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ monthly_investment: amount, annual_rate: rate, years }),
  })
  .then(r => r.json())
  .then(data => {
    const result = document.getElementById("sipResult");
    if (!result) return;
    result.classList.remove("d-none");

    result.innerHTML = `
      <div class="result-grid">
        <div class="result-item">
          <div class="result-label">Maturity Value</div>
          <div class="result-value big">${formatCurrency(data.maturity_value)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Invested</div>
          <div class="result-value">${formatCurrency(data.total_invested)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Gains</div>
          <div class="result-value" style="color:var(--success)">${formatCurrency(data.total_gains)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Gain %</div>
          <div class="result-value">${data.gain_percentage}%</div>
        </div>
      </div>
      <div class="mt-2 p-2 rounded" style="background:var(--success-light);color:var(--success);font-size:0.78rem;font-weight:600;">
        💡 Wealth multiplier: ${(data.maturity_value / data.total_invested).toFixed(2)}x your investment!
      </div>
    `;

    // Chart
    const chartEl = document.getElementById("sipChart");
    if (chartEl) {
      chartEl.classList.remove("d-none");
      if (State.sipChartInst) State.sipChartInst.destroy();
      const colors = getChartColors();
      State.sipChartInst = new Chart(chartEl, {
        type: "bar",
        data: {
          labels: data.breakdown.map(b => `Yr ${b.year}`),
          datasets: [
            {
              label: "Invested",
              data: data.breakdown.map(b => b.invested),
              backgroundColor: "rgba(37,99,235,0.6)",
              borderRadius: 4,
            },
            {
              label: "Value",
              data: data.breakdown.map(b => b.value),
              backgroundColor: "rgba(22,163,74,0.6)",
              borderRadius: 4,
            },
          ],
        },
        options: chartOptions("bar", colors, "₹", true),
      });
    }
  })
  .catch(err => console.error("SIP calc error:", err));
}

// ─────────────────────────────────────────────────────
// EMI CALCULATOR
// ─────────────────────────────────────────────────────
function calculateEMI() {
  const principal = parseFloat(document.getElementById("emiPrincipal").value) || 500000;
  const rate      = parseFloat(document.getElementById("emiRate").value) || 10;
  const years     = parseInt(document.getElementById("emiYears").value) || 5;

  fetch("/api/emi-calculator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ principal, annual_rate: rate, years }),
  })
  .then(r => r.json())
  .then(data => {
    const result = document.getElementById("emiResult");
    if (!result) return;
    result.classList.remove("d-none");

    result.innerHTML = `
      <div class="result-grid">
        <div class="result-item">
          <div class="result-label">Monthly EMI</div>
          <div class="result-value big">${formatCurrency(data.emi)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Payment</div>
          <div class="result-value">${formatCurrency(data.total_payment)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Interest</div>
          <div class="result-value red">${formatCurrency(data.total_interest)}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Interest %</div>
          <div class="result-value red">${data.interest_percentage}%</div>
        </div>
      </div>
    `;

    const chartEl = document.getElementById("emiChart");
    if (chartEl) {
      chartEl.classList.remove("d-none");
      if (State.emiChartInst) State.emiChartInst.destroy();
      const colors = getChartColors();
      State.emiChartInst = new Chart(chartEl, {
        type: "doughnut",
        data: {
          labels: ["Principal", "Total Interest"],
          datasets: [{
            data: [data.principal, data.total_interest],
            backgroundColor: ["rgba(37,99,235,0.8)", "rgba(220,38,38,0.8)"],
            borderColor: isDark() ? "#1a1d27" : "#fff",
            borderWidth: 3,
          }],
        },
        options: chartOptions("doughnut", colors, "₹", true),
      });
    }
  })
  .catch(err => console.error("EMI calc error:", err));
}

// ─────────────────────────────────────────────────────
// COMPOUND INTEREST
// ─────────────────────────────────────────────────────
function calculateCI() {
  const p = parseFloat(document.getElementById("ciPrincipal").value) || 100000;
  const r = parseFloat(document.getElementById("ciRate").value) / 100;
  const t = parseFloat(document.getElementById("ciYears").value) || 5;
  const n = parseInt(document.getElementById("ciFreq").value) || 4;

  const A = p * Math.pow(1 + r/n, n*t);
  const interest = A - p;

  const result = document.getElementById("ciResult");
  if (!result) return;
  result.classList.remove("d-none");
  result.innerHTML = `
    <div class="result-grid">
      <div class="result-item">
        <div class="result-label">Maturity Amount</div>
        <div class="result-value big">${formatCurrency(A)}</div>
      </div>
      <div class="result-item">
        <div class="result-label">Interest Earned</div>
        <div class="result-value" style="color:var(--success)">${formatCurrency(interest)}</div>
      </div>
      <div class="result-item">
        <div class="result-label">Effective Rate</div>
        <div class="result-value">${(Math.pow(1 + r/n, n) - 1).toFixed(4) * 100 | 0}% p.a.</div>
      </div>
      <div class="result-item">
        <div class="result-label">Multiplier</div>
        <div class="result-value">${(A/p).toFixed(2)}x</div>
      </div>
    </div>
    <div class="mt-2 p-2 rounded" style="background:var(--surface-2);font-size:0.77rem;color:var(--text-muted);">
      Formula: A = P(1 + r/n)^(n×t) = ${formatCurrency(p)}(1 + ${(r/n*100).toFixed(3)}%)^${n*t}
    </div>
  `;
}

// ─────────────────────────────────────────────────────
// BUDGET PLANNER
// ─────────────────────────────────────────────────────
function calculateBudget() {
  const income = parseFloat(document.getElementById("budgetIncome").value) || 50000;
  const needs   = income * 0.5;
  const wants   = income * 0.3;
  const savings = income * 0.2;

  document.getElementById("needsAmt").textContent   = formatCurrency(needs);
  document.getElementById("wantsAmt").textContent   = formatCurrency(wants);
  document.getElementById("savingsAmt").textContent = formatCurrency(savings);

  const result = document.getElementById("budgetResult");
  result.classList.remove("d-none");

  const chartEl = document.getElementById("budgetPieChart");
  if (chartEl) {
    if (State.budgetPieInst) State.budgetPieInst.destroy();
    const colors = getChartColors();
    State.budgetPieInst = new Chart(chartEl, {
      type: "doughnut",
      data: {
        labels: ["Needs (50%)", "Wants (30%)", "Savings (20%)"],
        datasets: [{
          data: [50, 30, 20],
          backgroundColor: ["rgba(37,99,235,0.8)", "rgba(217,119,6,0.8)", "rgba(22,163,74,0.8)"],
          borderColor: isDark() ? "#1a1d27" : "#fff",
          borderWidth: 3,
        }],
      },
      options: chartOptions("doughnut", colors, "%", false),
    });
  }
}

// ─────────────────────────────────────────────────────
// FINANCIAL GOALS
// ─────────────────────────────────────────────────────
async function generateGoals() {
  const income   = document.getElementById("gIncome").value;
  const expenses = document.getElementById("gExpenses").value;
  const age      = document.getElementById("gAge").value;

  if (!income || !expenses || !age) {
    showToast("Please fill in all fields to generate your plan", "warning");
    return;
  }

  const checked = [...document.querySelectorAll(".goal-check input:checked")].map(i => i.value);
  if (checked.length === 0) {
    showToast("Please select at least one financial goal", "warning");
    return;
  }

  const resultDiv = document.getElementById("goalsResult");
  resultDiv.innerHTML = `
    <div class="text-center p-4">
      <div class="spinner-ring mx-auto mb-3"></div>
      <div class="text-muted">FinBot AI is building your personalized plan...</div>
    </div>
  `;
  resultDiv.style.display = "flex";
  resultDiv.style.alignItems = "flex-start";
  showLoading(true);

  try {
    const res = await fetch("/api/financial-goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthly_income: parseFloat(income),
        monthly_expenses: parseFloat(expenses),
        age: parseInt(age),
        goals: checked.join(", "),
      }),
    });
    const data = await res.json();
    showLoading(false);

    if (data.plan) {
      resultDiv.innerHTML = `
        <div class="w-100">
          <div class="d-flex align-items-center gap-2 mb-3">
            <div class="bot-avatar"><i class="bi bi-robot"></i></div>
            <div><strong>Your Personalized Financial Plan</strong><br><small class="text-muted">Generated by IBM Watsonx Granite AI</small></div>
          </div>
          <div class="rendered-content">${markdownToHtml(data.plan)}</div>
          <div class="mt-3 pt-3" style="border-top:1px solid var(--border)">
            <button class="btn btn-sm btn-primary" onclick="activateTab('chat')">
              <i class="bi bi-chat-dots"></i> Ask FinBot for more details
            </button>
          </div>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<div class="text-danger"><i class="bi bi-x-circle"></i> Error: ${data.error || "Unknown error"}</div>`;
    }
  } catch (err) {
    showLoading(false);
    resultDiv.innerHTML = `<div class="text-danger"><i class="bi bi-x-circle"></i> Network error. Please check connection.</div>`;
  }
}

// ─────────────────────────────────────────────────────
// SCAM CHECKER
// ─────────────────────────────────────────────────────
async function checkScam() {
  const scenario = document.getElementById("scamScenario").value.trim();
  if (!scenario) {
    showToast("Please describe the scenario you want to check", "warning");
    return;
  }

  const resultDiv = document.getElementById("scamResult");
  resultDiv.innerHTML = `
    <div class="text-center p-4">
      <div class="spinner-ring mx-auto mb-3"></div>
      <div class="text-muted">Analyzing for fraud indicators...</div>
    </div>
  `;
  resultDiv.style.cssText = "display:flex;align-items:flex-start;";
  showLoading(true);

  try {
    const res = await fetch("/api/scam-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    const data = await res.json();
    showLoading(false);

    if (data.analysis) {
      const risk = data.risk_level || "MEDIUM";
      const riskIcons = { LOW: "✅", MEDIUM: "⚠️", HIGH: "🚨", CRITICAL: "🆘" };
      resultDiv.innerHTML = `
        <div class="w-100">
          <div class="risk-badge risk-${risk}">
            ${riskIcons[risk] || "⚠️"} RISK LEVEL: ${risk}
          </div>
          <div class="rendered-content">${markdownToHtml(data.analysis)}</div>
          <div class="mt-3 p-2 rounded" style="background:var(--surface-2);font-size:0.78rem;">
            <strong>🆘 Report fraud:</strong> Call <strong>1930</strong> or visit
            <a href="https://cybercrime.gov.in" target="_blank" class="text-primary">cybercrime.gov.in</a>
          </div>
        </div>
      `;
    }
  } catch (err) {
    showLoading(false);
    resultDiv.innerHTML = `<div class="text-danger">Network error. Please try again.</div>`;
  }
}

function loadScamExample(n) {
  const examples = {
    1: "I got an SMS saying my bank KYC is expired and I need to click this link http://kycupdate-bank.xyz to update it or my account will be blocked",
    2: "I received a call saying I won ₹25 lakh in a lucky draw and they need me to pay ₹15,000 as processing fee to release the prize money",
    3: "A company offered me a work-from-home job paying ₹50,000/month. They asked me to pay ₹3,000 registration fee and provide my Aadhaar and bank account number",
    4: "Someone called saying they are from SBI fraud prevention team and asked for my debit card number, expiry date and CVV to stop a fraudulent transaction",
  };
  const el = document.getElementById("scamScenario");
  if (el) el.value = examples[n] || "";
}

// ─────────────────────────────────────────────────────
// DASHBOARD CHARTS
// ─────────────────────────────────────────────────────
function initDashboardCharts() {
  const colors = getChartColors();

  // Budget Donut
  const budgetEl = document.getElementById("budgetChart");
  if (budgetEl) {
    if (State.budgetChartInst) State.budgetChartInst.destroy();
    State.budgetChartInst = new Chart(budgetEl, {
      type: "doughnut",
      data: {
        labels: ["Needs (50%)", "Wants (30%)", "Savings (20%)"],
        datasets: [{
          data: [50, 30, 20],
          backgroundColor: ["rgba(37,99,235,0.85)", "rgba(217,119,6,0.85)", "rgba(22,163,74,0.85)"],
          borderColor: isDark() ? "#1a1d27" : "#ffffff",
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        ...chartOptions("doughnut", colors, "%", false),
        plugins: {
          ...chartOptions("doughnut", colors, "%", false).plugins,
          legend: { position: "bottom", labels: { color: colors.text, font: { size: 11 }, padding: 12 } },
        },
      },
    });
  }

  // SIP Growth Bar
  const growthEl = document.getElementById("growthChart");
  if (growthEl) {
    if (State.growthChartInst) State.growthChartInst.destroy();
    const sipData = generateSIPPreview(5000, 0.12, 20);
    State.growthChartInst = new Chart(growthEl, {
      type: "line",
      data: {
        labels: sipData.map(d => `Yr ${d.year}`),
        datasets: [
          {
            label: "Invested",
            data: sipData.map(d => d.invested),
            borderColor: "rgba(37,99,235,0.8)",
            backgroundColor: "rgba(37,99,235,0.08)",
            fill: true, tension: 0.4, pointRadius: 3,
          },
          {
            label: "Maturity Value",
            data: sipData.map(d => d.value),
            borderColor: "rgba(22,163,74,0.8)",
            backgroundColor: "rgba(22,163,74,0.08)",
            fill: true, tension: 0.4, pointRadius: 3,
          },
        ],
      },
      options: {
        ...chartOptions("line", colors, "₹", true),
        plugins: {
          ...chartOptions("line", colors, "₹", true).plugins,
          legend: { position: "bottom", labels: { color: colors.text, font: { size: 11 }, padding: 12 } },
        },
      },
    });
  }
}

function generateSIPPreview(monthly, annualRate, years) {
  const r = annualRate / 12;
  const result = [];
  for (let y = 1; y <= years; y++) {
    const m = y * 12;
    const val = monthly * (((1 + r) ** m - 1) / r) * (1 + r);
    result.push({ year: y, value: Math.round(val), invested: monthly * m });
  }
  return result;
}

function chartOptions(type, colors, prefix = "", abbreviated = false) {
  const abbrev = (val) => {
    if (!abbreviated) return `${prefix}${val}%`;
    if (val >= 1e7) return `${prefix}${(val/1e7).toFixed(1)}Cr`;
    if (val >= 1e5) return `${prefix}${(val/1e5).toFixed(1)}L`;
    if (val >= 1000) return `${prefix}${(val/1000).toFixed(0)}K`;
    return `${prefix}${val}`;
  };

  const base = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark() ? "#2d3347" : "#fff",
        titleColor: isDark() ? "#e8eaf0" : "#1a1d23",
        bodyColor: isDark() ? "#8892a4" : "#6b7280",
        borderColor: isDark() ? "#2d3347" : "#e2e6ed",
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw;
            return abbreviated
              ? ` ${ctx.dataset.label}: ${abbrev(val)}`
              : ` ${ctx.dataset.label || ctx.label}: ${val}%`;
          },
        },
      },
    },
  };

  if (type === "doughnut") return base;

  return {
    ...base,
    scales: {
      x: { grid: { color: colors.grid }, ticks: { color: colors.text, font: { size: 11 } } },
      y: {
        grid: { color: colors.grid },
        ticks: { color: colors.text, font: { size: 11 }, callback: abbreviated ? abbrev : undefined },
      },
    },
  };
}

// ─────────────────────────────────────────────────────
// TOPIC CARDS
// ─────────────────────────────────────────────────────
const TOPICS = [
  { icon: "📱", title: "UPI & Digital Payments", desc: "BHIM, GPay, PhonePe, Paytm safety", color: "var(--primary)", prompt: "Explain UPI and how to use it safely" },
  { icon: "🚨", title: "Avoiding Online Scams", desc: "Phishing, OTP fraud, KYC scams", color: "#dc2626", prompt: "What are common online financial scams and how to avoid them?" },
  { icon: "📈", title: "SIP & Mutual Funds", desc: "Start investing with ₹500/month", color: "#16a34a", prompt: "How do SIP and mutual funds work? How should I start?" },
  { icon: "💰", title: "Compound Interest", desc: "Make your money work for you", color: "#d97706", prompt: "Explain compound interest with real examples in rupees" },
  { icon: "📊", title: "Budgeting Basics", desc: "50/30/20 rule & more", color: "#7c3aed", prompt: "Teach me budgeting using the 50/30/20 rule" },
  { icon: "🏛️", title: "Government Schemes", desc: "PPF, NPS, Sukanya Samriddhi", color: "#0891b2", prompt: "What are the best government savings schemes in India?" },
  { icon: "⭐", title: "CIBIL & Credit Score", desc: "Build and maintain good credit", color: "#ea580c", prompt: "How can I improve my CIBIL score?" },
  { icon: "🏠", title: "Home Loan Guide", desc: "EMI, eligibility, tax benefits", color: "#be185d", prompt: "Guide me through the home loan process in India" },
  { icon: "📋", title: "Income Tax Basics", desc: "Slabs, 80C, ITR filing guide", color: "#065f46", prompt: "Explain income tax slabs and 80C deductions simply" },
  { icon: "👴", title: "Retirement Planning", desc: "EPF, NPS, pension strategies", color: "#1d4ed8", prompt: "How should I plan for retirement in India?" },
  { icon: "🛡️", title: "Insurance Essentials", desc: "Life, health, term insurance", color: "#6d28d9", prompt: "What insurance policies should every Indian have?" },
  { icon: "💼", title: "Small Business Finance", desc: "GST, business loans, working capital", color: "#b45309", prompt: "Explain GST basics and financing options for small businesses" },
];

function renderTopicCards() {
  const container = document.getElementById("topicCardsContainer");
  if (!container) return;

  const parent = container.parentNode;
  parent.innerHTML = '<div class="col-12"><h5 class="section-title"><i class="bi bi-mortarboard-fill"></i> Financial Knowledge Areas</h5></div>';

  TOPICS.forEach((t, i) => {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3";
    col.innerHTML = `
      <div class="topic-card animate-in" style="animation-delay:${i * 0.05}s" onclick="topicClick('${t.prompt.replace(/'/g, "\\'")}')">
        <div class="topic-card-icon">${t.icon}</div>
        <div class="topic-card-title">${t.title}</div>
        <div class="topic-card-desc">${t.desc}</div>
      </div>
    `;
    parent.appendChild(col);
  });
}

function topicClick(prompt) {
  activateTab("chat");
  const input = document.getElementById("userInput");
  if (input) {
    input.value = prompt;
    input.dispatchEvent(new Event("input"));
    sendMessage();
  }
}

// ─────────────────────────────────────────────────────
// LEARN GRID
// ─────────────────────────────────────────────────────
const LEARN_CONTENT = [
  {
    title: "UPI Safety Guide",
    subtitle: "Digital Payments",
    emoji: "🔐",
    colorA: "#2563eb", colorB: "#6366f1",
    tags: ["UPI", "Payments", "Security"],
    desc: "Learn how to use UPI safely, avoid payment frauds, and protect your digital wallet.",
    prompt: "Give me a complete guide on UPI safety — tips, common mistakes, and how to report issues",
  },
  {
    title: "Scam Prevention 101",
    subtitle: "Fraud Awareness",
    emoji: "🚨",
    colorA: "#dc2626", colorB: "#9f1239",
    tags: ["Scams", "Fraud", "OTP"],
    desc: "Recognize phishing, vishing, KYC scams, and lottery frauds before it's too late.",
    prompt: "Explain all types of online financial scams with real examples and warning signs",
  },
  {
    title: "Beginner's Investment Guide",
    subtitle: "Investing Basics",
    emoji: "📈",
    colorA: "#16a34a", colorB: "#0d9488",
    tags: ["SIP", "Mutual Funds", "Stocks"],
    desc: "Start your investment journey with SIP, mutual funds, and PPF — from just ₹500.",
    prompt: "Create a step-by-step beginner investment guide for someone earning ₹30,000 per month",
  },
  {
    title: "The Power of Compounding",
    subtitle: "Interest & Growth",
    emoji: "💰",
    colorA: "#d97706", colorB: "#c2410c",
    tags: ["Compound Interest", "Growth", "Savings"],
    desc: "Understand why starting early gives you a massive advantage in wealth creation.",
    prompt: "Show me how compound interest works with examples of investing at age 25 vs 35",
  },
  {
    title: "Budget Like a Pro",
    subtitle: "Personal Finance",
    emoji: "📊",
    colorA: "#7c3aed", colorB: "#db2777",
    tags: ["Budgeting", "50/30/20", "Savings"],
    desc: "Master the 50/30/20 rule, zero-based budgeting, and envelope method.",
    prompt: "Teach me 3 effective budgeting strategies for a monthly salary of ₹40,000",
  },
  {
    title: "Government Schemes Guide",
    subtitle: "Social Security",
    emoji: "🏛️",
    colorA: "#0891b2", colorB: "#0369a1",
    tags: ["PPF", "NPS", "PM Schemes"],
    desc: "PPF, Sukanya Samriddhi, Atal Pension Yojana, PMJDY — all you need to know.",
    prompt: "List and explain all important government savings and pension schemes in India",
  },
  {
    title: "Credit Score Mastery",
    subtitle: "CIBIL & Credit",
    emoji: "⭐",
    colorA: "#ea580c", colorB: "#be185d",
    tags: ["CIBIL", "Credit Score", "Loans"],
    desc: "Build, maintain, and improve your CIBIL score for better loan eligibility.",
    prompt: "How does CIBIL score work and what steps can improve it from 650 to 750+?",
  },
  {
    title: "Insurance for Everyone",
    subtitle: "Financial Protection",
    emoji: "🛡️",
    colorA: "#065f46", colorB: "#14532d",
    tags: ["Life Insurance", "Health", "Term Plan"],
    desc: "Why term insurance is essential, how to choose health insurance, and PMSBY.",
    prompt: "Explain what insurance a 30-year-old with a family in India must have",
  },
];

function renderLearnGrid() {
  const grid = document.getElementById("learnGrid");
  if (!grid) return;

  LEARN_CONTENT.forEach((item, i) => {
    const col = document.createElement("div");
    col.className = "col-sm-6 col-lg-4 col-xl-3";
    col.innerHTML = `
      <div class="learn-card animate-in" style="animation-delay:${i * 0.06}s;--color-a:${item.colorA};--color-b:${item.colorB}"
           onclick="learnClick('${item.prompt.replace(/'/g, "\\'")}')">
        <div class="learn-card-top">
          <div style="font-size:2rem;margin-bottom:0.3rem">${item.emoji}</div>
          <div class="learn-card-title">${item.title}</div>
          <div class="learn-card-subtitle">${item.subtitle}</div>
        </div>
        <div class="learn-card-body">
          <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${item.desc}</p>
          <div>${item.tags.map(t => `<span class="learn-tag">${t}</span>`).join("")}</div>
        </div>
      </div>
    `;
    grid.appendChild(col);
  });
}

function learnClick(prompt) {
  activateTab("chat");
  const input = document.getElementById("userInput");
  if (input) {
    input.value = prompt;
    input.dispatchEvent(new Event("input"));
    sendMessage();
  }
}

// ─────────────────────────────────────────────────────
// RANGE SLIDER SYNC
// ─────────────────────────────────────────────────────
function setupRangeLinks() {
  const pairs = [
    ["sipAmount", "sipAmountRange"],
    ["sipRate",   "sipRateRange"],
    ["sipYears",  "sipYearsRange"],
    ["emiPrincipal", "emiPrincipalRange"],
    ["emiRate",   "emiRateRange"],
    ["emiYears",  "emiYearsRange"],
  ];

  pairs.forEach(([inputId, rangeId]) => {
    const input = document.getElementById(inputId);
    const range = document.getElementById(rangeId);
    if (!input || !range) return;
    input.addEventListener("input", () => { range.value = input.value; });
    range.addEventListener("input", () => { input.value = range.value; });
  });
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────
function formatCurrency(n) {
  if (n >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n/1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function markdownToHtml(text) {
  // Safe minimal markdown renderer
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    // Code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // HR
    .replace(/^---$/gm, "<hr>")
    // Unordered lists
    .replace(/^\s*[-*•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Line breaks and paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[huplibr])(.+)$/, "<p>$1</p>");
}

function showToast(message, type = "info") {
  const toast = document.getElementById("appToast");
  const body  = document.getElementById("toastBody");
  if (!toast || !body) return;
  body.textContent = message;
  toast.className = `toast show border-0`;
  toast.style.background = type === "warning" ? "var(--warning-light)" : "var(--surface)";
  toast.style.color = type === "warning" ? "var(--warning)" : "var(--text)";
  setTimeout(() => toast.classList.remove("show"), 3500);
}

function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.toggle("d-none", !show);
}
