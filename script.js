const STORAGE_VERSION = 3;
const DEFAULT_BUDGET = 2500;

const incomeCategories = ["Salary", "Freelance", "Gift", "Other"];
const expenseCategories = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
];
const allCategories = [...new Set([...incomeCategories, ...expenseCategories])];

const form = document.getElementById("transaction-form");
const typeSelect = document.getElementById("transaction-type");
const categorySelect = document.getElementById("category-select");
const amountInput = document.getElementById("amount-input");
const dateInput = document.getElementById("date-input");
const descriptionInput = document.getElementById("description-input");
const submitButton = document.getElementById("submit-transaction-btn");
const tableBody = document.getElementById("transaction-table-body");
const incomeTotalEl = document.getElementById("income-total");
const expenseTotalEl = document.getElementById("expense-total");
const balanceTotalEl = document.getElementById("balance-total");
const budgetLeftTotalEl = document.getElementById("budget-left-total");
const budgetInput = document.getElementById("budget-input");
const saveBudgetBtn = document.getElementById("save-budget-btn");
const exportDataBtn = document.getElementById("export-data-btn");
const importDataBtn = document.getElementById("import-data-btn");
const importFileInput = document.getElementById("import-file-input");
const resetBtn = document.getElementById("reset-btn");
const filterMonthInput = document.getElementById("filter-month");
const filterTypeInput = document.getElementById("filter-type");
const filterCategoryInput = document.getElementById("filter-category");
const searchInput = document.getElementById("search-input");
const categoryBreakdownEl = document.getElementById("category-breakdown");
const insightListEl = document.getElementById("insight-list");
const cashflowChartEl = document.getElementById("cashflow-chart");
const savingsRateEl = document.getElementById("savings-rate");
const savingsRateBarEl = document.getElementById("savings-rate-bar");
const averageMonthlySpendEl = document.getElementById("average-monthly-spend");
const expenseCountEl = document.getElementById("expense-count");
const largestExpenseEl = document.getElementById("largest-expense");
const paceStatusEl = document.getElementById("pace-status");
const spentToDateEl = document.getElementById("spent-to-date");
const projectedMonthSpendEl = document.getElementById("projected-month-spend");
const projectionRemainingEl = document.getElementById("projection-remaining");
const dailySpendingRateEl = document.getElementById("daily-spending-rate");
const spendingAccrualChartEl = document.getElementById("spending-accrual-chart");
const safetyGaugeEl = document.getElementById("safety-gauge");
const gaugeProgressEl = document.getElementById("gauge-progress");
const safetyScoreEl = document.getElementById("safety-score");
const safetyLevelEl = document.getElementById("safety-level");
const safetyStatusEl = document.getElementById("safety-status");
const safetyDescriptionEl = document.getElementById("safety-description");
const nextMonthPredictionEl = document.getElementById("next-month-prediction");
const nextMonthComparisonEl = document.getElementById("next-month-comparison");
const safeDailyLimitEl = document.getElementById("safe-daily-limit");
const safeDaysLeftEl = document.getElementById("safe-days-left");
const overspendRiskEl = document.getElementById("overspend-risk");
const overspendDetailEl = document.getElementById("overspend-detail");
const detailDialog = document.getElementById("detail-dialog");
const detailTitleEl = document.getElementById("detail-title");
const detailExplanationEl = document.getElementById("detail-explanation");
const detailMetricsEl = document.getElementById("detail-metrics");
const detailTableBodyEl = document.getElementById("detail-table-body");
const closeDetailBtn = document.getElementById("close-detail-btn");
const detailActionBarEl = document.getElementById("detail-action-bar");
const detailBudgetInput = document.getElementById("detail-budget-input");
const detailSaveBudgetBtn = document.getElementById("detail-save-budget-btn");
const appShell = document.getElementById("app-shell");
const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authTitleEl = document.getElementById("auth-title");
const authIntroEl = document.getElementById("auth-intro");
const authSubmitBtn = document.getElementById("auth-submit-btn");
const authModeBtn = document.getElementById("auth-mode-btn");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
const authPasswordField = document.getElementById("auth-password-field");
const authConfirmPasswordField = document.getElementById("auth-confirm-password-field");
const authConfirmPasswordInput = document.getElementById("auth-confirm-password");
const authMessageEl = document.getElementById("auth-message");
const backendSetupMessageEl = document.getElementById("backend-setup-message");
const signedInEmailEl = document.getElementById("signed-in-email");
const signOutBtn = document.getElementById("sign-out-btn");

let editingTransactionId = null;
let monthlyBudget = DEFAULT_BUDGET;
let transactions = [];
let activeDrilldownType = null;
let currentUser = null;
let authMode = "signin";

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPreviousMonthKey(currentMonthKey) {
  const [year, month] = currentMonthKey.split("-").map(Number);
  const previousDate = new Date(year, month - 2, 1);
  return `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeTransaction(item) {
  if (!item || typeof item !== "object") return null;

  const amount = Number(item.amount);
  const rawDate = String(item.date || "").trim();
  const date = rawDate.slice(0, 10);
  const type = item.type;
  const category = String(item.category || "Other").trim();
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const hasValidDateFormat =
    /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ||
    (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(rawDate) &&
      Number.isFinite(Date.parse(rawDate.replace(" ", "T"))));

  if (
    !hasValidDateFormat ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    (type !== "income" && type !== "expense") ||
    !category ||
    category.length > 80
  ) {
    return null;
  }

  return {
    id: String(item.id || makeId()),
    type,
    category,
    amount: Number(amount.toFixed(2)),
    date,
    description: String(item.description || "").trim().slice(0, 80),
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openDetailDialog(title, explanation, metrics, items = [], options = {}) {
  detailTitleEl.textContent = title;
  detailExplanationEl.textContent = explanation;
  detailActionBarEl.hidden = !options.editBudget;
  if (options.editBudget) {
    detailBudgetInput.value = monthlyBudget;
  }
  detailMetricsEl.innerHTML = metrics
    .map(
      ([label, value]) => `
        <div class="detail-metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `
    )
    .join("");

  const sortedItems = [...items].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  detailTableBodyEl.innerHTML = sortedItems.length
    ? sortedItems
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.date)}</td>
              <td>${escapeHtml(item.category)}</td>
              <td><span class="type-badge ${item.type}">${escapeHtml(item.type)}</span></td>
              <td class="${item.type === "income" ? "income-text" : "expense-text"}">${formatCurrency(item.amount)}</td>
              <td>${escapeHtml(item.description || "No note")}</td>
              <td class="action-cell">
                <button type="button" class="edit-btn detail-edit-btn" data-id="${item.id}">Edit</button>
                <button type="button" class="delete-btn detail-delete-btn" data-id="${item.id}">Delete</button>
              </td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="6" class="empty-state">No transactions match this view.</td></tr>';

  if (typeof detailDialog.showModal === "function") {
    if (!detailDialog.open) detailDialog.showModal();
  } else {
    detailDialog.setAttribute("open", "");
  }
}

function getMonthLabel(monthKey) {
  if (!monthKey) return "Selected period";
  const date = new Date(`${monthKey}-01T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function openDrilldown(type) {
  activeDrilldownType = type;
  const filteredItems = getFilteredTransactions();
  const monthKey = filterMonthInput.value || getCurrentMonthKey();
  const monthItems = transactions.filter((item) => item.date.startsWith(monthKey));
  const incomeItems = filteredItems.filter((item) => item.type === "income");
  const expenseItems = filteredItems.filter((item) => item.type === "expense");
  const totals = calculateTotals(filteredItems);
  const monthTotals = calculateTotals(monthItems);

  const categoryTotals = expenseItems.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount);
    return accumulator;
  }, {});
  const largestExpense = expenseItems.reduce(
    (largest, item) => (Number(item.amount) > largest.amount ? item : largest),
    { amount: 0, category: "None", date: "", description: "" }
  );

  const detailByType = {
    insight: [
      "Dashboard Insights",
      "Calculated from the same filtered transactions currently shown in the dashboard.",
      [
        ["Income", formatCurrency(totals.income)],
        ["Expenses", formatCurrency(totals.expense)],
        ["Largest category", Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"],
      ],
      filteredItems,
    ],
    income: [
      "Income Details",
      "This view lists all income transactions included by the active month, type, category, and search filters.",
      [["Total income", formatCurrency(totals.income)], ["Transactions", String(incomeItems.length)]],
      incomeItems,
    ],
    expense: [
      "Expense Details",
      "This view lists all expenses included by the active dashboard filters.",
      [["Total expenses", formatCurrency(totals.expense)], ["Transactions", String(expenseItems.length)], ["Largest", formatCurrency(largestExpense.amount)]],
      expenseItems,
    ],
    balance: [
      "Balance Details",
      "Balance is total income minus total expense for the current filtered view.",
      [["Income", formatCurrency(totals.income)], ["Expenses", formatCurrency(totals.expense)], ["Balance", formatCurrency(totals.balance)]],
      filteredItems,
    ],
    budget: [
      "Budget Details",
      `Budget left is the monthly budget minus expenses for ${getMonthLabel(monthKey)}.`,
      [["Monthly budget", formatCurrency(monthlyBudget)], ["Month expenses", formatCurrency(monthTotals.expense)], ["Budget left", formatCurrency(monthlyBudget - monthTotals.expense)]],
      monthItems.filter((item) => item.type === "expense"),
      { editBudget: true },
    ],
    savings: [
      "Savings Rate",
      "Savings rate is the filtered income remaining after expenses, divided by filtered income.",
      [["Income", formatCurrency(totals.income)], ["Expenses", formatCurrency(totals.expense)], ["Savings", formatCurrency(totals.income - totals.expense)]],
      filteredItems,
    ],
    "average-spend": [
      "Average Monthly Spending",
      "Average spending is total filtered expenses divided by the number of months represented in the filtered transactions.",
      [["Filtered expenses", formatCurrency(totals.expense)], ["Months represented", String(new Set(filteredItems.map((item) => item.date.slice(0, 7))).size || 1)], ["Average", formatCurrency(totals.expense / (new Set(filteredItems.map((item) => item.date.slice(0, 7))).size || 1))]],
      expenseItems,
    ],
    "expense-count": [
      "Expense Transactions",
      "Every expense transaction included in the selected dashboard view.",
      [["Expense count", String(expenseItems.length)], ["Total", formatCurrency(totals.expense)]],
      expenseItems,
    ],
    "largest-expense": [
      "Largest Expense",
      "The largest individual expense in the selected filtered view.",
      [["Amount", formatCurrency(largestExpense.amount)], ["Category", largestExpense.category || "None"], ["Date", largestExpense.date || "No data"]],
      largestExpense.amount ? [largestExpense] : [],
    ],
    "spent-to-date": [
      "Spent to Date",
      `Actual expenses recorded through ${getMonthLabel(monthKey)}.`,
      [["Spent", formatCurrency(monthTotals.expense)], ["Transactions", String(monthItems.filter((item) => item.type === "expense").length)], ["Budget", formatCurrency(monthlyBudget)]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    "projected-spend": [
      "Projected Month-End Spending",
      "Projection uses selected-month expenses divided by elapsed days, multiplied by the number of days in the month.",
      [["Current spend", formatCurrency(monthTotals.expense)], ["Projected", spentToDateEl.textContent], ["Daily pace", dailySpendingRateEl.textContent]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    "projection-remaining": [
      "Remaining Budget Projection",
      "Projected month-end spending subtracted from the configured monthly budget.",
      [["Budget", formatCurrency(monthlyBudget)], ["Projected spend", projectedMonthSpendEl.textContent], ["Projection remaining", projectionRemainingEl.textContent]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    "daily-rate": [
      "Daily Spending Pace",
      "Actual selected-month expense total divided by elapsed days in the selected month.",
      [["Month to date", formatCurrency(monthTotals.expense)], ["Pace", dailySpendingRateEl.textContent], ["Month budget", formatCurrency(monthlyBudget)]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    safety: [
      "Spending Safety Assessment",
      "Safety compares projected month-end spending with the monthly budget. Above 100% is at risk, 85-100% is stable, and below 85% is safe.",
      [["Safety score", safetyScoreEl.textContent], ["Level", safetyLevelEl.textContent], ["Projected spend", projectedMonthSpendEl.textContent]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    "next-month": [
      "Next-Month Prediction",
      "The estimate uses a weighted trend of the last three months: 50% latest month, 30% previous month, and 20% oldest month.",
      [["Prediction", nextMonthPredictionEl.textContent], ["Monthly budget", formatCurrency(monthlyBudget)], ["Comparison", nextMonthComparisonEl.textContent]],
      transactions.filter((item) => item.type === "expense").slice(0, 30),
    ],
    "safe-daily": [
      "Safe Daily Limit",
      "Remaining budget is divided by the number of remaining days in the selected month.",
      [["Budget", formatCurrency(monthlyBudget)], ["Spent", formatCurrency(monthTotals.expense)], ["Safe daily limit", safeDailyLimitEl.textContent], ["Days", safeDaysLeftEl.textContent]],
      monthItems.filter((item) => item.type === "expense"),
    ],
    "overspend-risk": [
      "Overspend Risk",
      "Risk is based on projected month-end spending relative to the monthly budget.",
      [["Risk", overspendRiskEl.textContent], ["Projected spend", projectedMonthSpendEl.textContent], ["Budget", formatCurrency(monthlyBudget)]],
      monthItems.filter((item) => item.type === "expense"),
    ],
  };

  if (categoryTotals[type]) {
    const categoryItems = expenseItems.filter((item) => item.category === type);
    detailByType[type] = [
      `${type} Spending`,
      `All expense transactions categorized as ${type}.`,
      [["Category total", formatCurrency(categoryTotals[type])], ["Transactions", String(categoryItems.length)]],
      categoryItems,
    ];
  }

  if (type.startsWith("month:")) {
    const key = type.slice(6);
    const monthFiltered = transactions.filter((item) => item.date.startsWith(key));
    const monthResult = calculateTotals(monthFiltered);
    detailByType[type] = [
      `${getMonthLabel(key)} Cash Flow`,
      "Income and expenses recorded for this month.",
      [["Income", formatCurrency(monthResult.income)], ["Expenses", formatCurrency(monthResult.expense)], ["Net", formatCurrency(monthResult.balance)]],
      monthFiltered,
    ];
  }

  const detail = detailByType[type];
  if (detail) openDetailDialog(...detail);
}

function getFormCategoryOptions(type) {
  return type === "income" ? incomeCategories : expenseCategories;
}

function populateCategories() {
  const selectedType = typeSelect.value;
  const options = getFormCategoryOptions(selectedType);
  const currentValue = categorySelect.value || options[0];

  categorySelect.innerHTML = options
    .map(
      (category) =>
        `<option value="${category}" ${currentValue === category ? "selected" : ""}>${category}</option>`
    )
    .join("");
}

function populateFilterCategories() {
  const selectedCategory = filterCategoryInput.value || "all";

  filterCategoryInput.innerHTML = [
    '<option value="all">All categories</option>',
    ...allCategories.map(
      (category) =>
        `<option value="${category}" ${selectedCategory === category ? "selected" : ""}>${category}</option>`
    ),
  ].join("");
}

function calculateTotals(filteredItems = transactions) {
  let income = 0;
  let expense = 0;

  filteredItems.forEach((item) => {
    const amount = Number(item.amount);

    if (item.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  return {
    income,
    expense,
    balance: income - expense,
  };
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getFilteredTransactions() {
  const selectedMonth = filterMonthInput.value || getCurrentMonthKey();
  const selectedType = filterTypeInput.value;
  const selectedCategory = filterCategoryInput.value;
  const searchTerm = searchInput.value.trim().toLowerCase();

  return transactions.filter((item) => {
    const matchesMonth = !selectedMonth || item.date.startsWith(selectedMonth);
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const searchableText = `${item.category} ${item.description} ${item.type}`.toLowerCase();
    const matchesSearch = !searchTerm || searchableText.includes(searchTerm);

    return matchesMonth && matchesType && matchesCategory && matchesSearch;
  });
}

function getBudgetStatusText(filteredItems) {
  const total = calculateTotals(filteredItems);
  const remaining = monthlyBudget - total.expense;

  if (remaining >= 0) {
    return `You have ${formatCurrency(remaining)} left in your budget.`;
  }

  return `You are ${formatCurrency(Math.abs(remaining))} over budget.`;
}

function renderSummary(filteredItems) {
  const totals = calculateTotals(filteredItems);
  const budgetLeft = monthlyBudget - totals.expense;

  incomeTotalEl.textContent = formatCurrency(totals.income);
  expenseTotalEl.textContent = formatCurrency(totals.expense);
  balanceTotalEl.textContent = formatCurrency(totals.balance);
  budgetLeftTotalEl.textContent = formatCurrency(budgetLeft);
  budgetLeftTotalEl.classList.toggle("warning", budgetLeft < 0);
  budgetLeftTotalEl.classList.toggle("safe", budgetLeft >= 0);
  budgetLeftTotalEl.title = getBudgetStatusText(filteredItems);
}

function renderBreakdown(filteredItems) {
  const expenses = filteredItems.filter((item) => item.type === "expense");

  if (!expenses.length) {
    categoryBreakdownEl.innerHTML = '<div class="empty-breakdown">No expense data yet.</div>';
    return;
  }

  const totals = expenses.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount);
    return accumulator;
  }, {});

  const sortedEntries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const maxAmount = Math.max(...sortedEntries.map(([, amount]) => amount), 1);

  categoryBreakdownEl.innerHTML = sortedEntries
    .map(([category, amount]) => {
      const width = (amount / maxAmount) * 100;
      return `
        <div class="breakdown-item drillable" data-drilldown="${escapeHtml(category)}" tabindex="0" role="button" aria-label="View ${escapeHtml(category)} spending details">
          <div class="breakdown-meta">
            <span>${escapeHtml(category)}</span>
            <strong>${formatCurrency(amount)}</strong>
          </div>
          <div class="bar-track">
            <span class="bar-fill" style="width: ${width}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderInsights(filteredItems) {
  const totals = calculateTotals(filteredItems);
  const expenses = filteredItems.filter((item) => item.type === "expense");
  const categoryTotals = expenses.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount);
    return accumulator;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topIncome = filteredItems
    .filter((item) => item.type === "income")
    .reduce((accumulator, item) => {
      accumulator[item.category] = (accumulator[item.category] || 0) + Number(item.amount);
      return accumulator;
    }, {});

  const bestIncomeSource = Object.entries(topIncome).sort((a, b) => b[1] - a[1])[0];
  const averageExpense = expenses.length ? totals.expense / expenses.length : 0;
  const monthKey = filterMonthInput.value || getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);
  const monthEndDay = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth =
    monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const elapsedDays = isCurrentMonth ? now.getDate() : monthEndDay;
  const comparisonDays = isCurrentMonth ? elapsedDays : monthEndDay;
  const previousMonth = getPreviousMonthKey(monthKey);
  const selectedCategory = filterCategoryInput.value;
  const searchTerm = searchInput.value.trim().toLowerCase();
  const matchesComparisonFilters = (item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const searchableText = `${item.category} ${item.description} ${item.type}`.toLowerCase();
    return matchesCategory && (!searchTerm || searchableText.includes(searchTerm));
  };
  const sumMonthExpenses = (key, throughDay) =>
    transactions
      .filter(
        (item) =>
          item.type === "expense" &&
          item.date.startsWith(key) &&
          Number(item.date.slice(8, 10)) <= throughDay &&
          matchesComparisonFilters(item)
      )
      .reduce((sum, item) => sum + Number(item.amount), 0);
  const currentMonthSpend = sumMonthExpenses(monthKey, elapsedDays);
  const previousMonthSpend = sumMonthExpenses(previousMonth, comparisonDays);
  const changeAmount = currentMonthSpend - previousMonthSpend;
  const changePercent = previousMonthSpend > 0
    ? (changeAmount / previousMonthSpend) * 100
    : null;
  const monthProjection = isCurrentMonth && elapsedDays > 0
    ? (currentMonthSpend / elapsedDays) * monthEndDay
    : currentMonthSpend;
  const monthBudgetUse = monthlyBudget > 0
    ? (monthProjection / monthlyBudget) * 100
    : 0;
  const topCategoryShare = topCategory && totals.expense
    ? (topCategory[1] / totals.expense) * 100
    : 0;
  const expensesByDay = expenses.reduce((accumulator, item) => {
    const day = new Date(`${item.date}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
    });
    accumulator[day] = (accumulator[day] || 0) + 1;
    return accumulator;
  }, {});
  const busiestDay = Object.entries(expensesByDay).sort((a, b) => b[1] - a[1])[0];
  const recurring = new Map();
  transactions
    .filter((item) => item.type === "expense" && matchesComparisonFilters(item))
    .forEach((item) => {
      const key = `${item.category}|${Number(item.amount).toFixed(2)}`;
      const months = recurring.get(key) || new Set();
      months.add(item.date.slice(0, 7));
      recurring.set(key, months);
    });
  const repeatedCharge = [...recurring.entries()]
    .filter(([, months]) => months.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)[0];

  const insightItems = [
    {
      label: "Month-over-month spend",
      value: previousMonthSpend > 0
        ? `${changeAmount > 0 ? "Up" : "Down"} ${formatCurrency(Math.abs(changeAmount))} (${Math.abs(changePercent).toFixed(1)}%)`
        : currentMonthSpend > 0 ? "New spending in this period" : "No comparison data",
    },
    {
      label: "Projected budget use",
      value: `${monthBudgetUse.toFixed(1)}% of ${formatCurrency(monthlyBudget)}`,
    },
    {
      label: "Largest category share",
      value: topCategory
        ? `${topCategory[0]} · ${topCategoryShare.toFixed(1)}% of spend`
        : "No spending yet",
    },
    {
      label: "Average transaction",
      value: `${formatCurrency(averageExpense)} across ${expenses.length} expense${expenses.length === 1 ? "" : "s"}`,
    },
    {
      label: "Busiest expense day",
      value: busiestDay
        ? `${busiestDay[0]} · ${busiestDay[1]} transaction${busiestDay[1] === 1 ? "" : "s"}`
        : "No spending yet",
    },
    {
      label: "Possible recurring charge",
      value: repeatedCharge
        ? `${repeatedCharge[0].split("|")[0]} · ${formatCurrency(Number(repeatedCharge[0].split("|")[1]))} in ${repeatedCharge[1].size} months`
        : "No repeated amount/category pattern yet",
    },
    {
      label: "Top income source",
      value: bestIncomeSource
        ? `${bestIncomeSource[0]} — ${formatCurrency(bestIncomeSource[1])}`
        : "No income in this view",
    },
  ];

  insightListEl.innerHTML = insightItems
    .map(
      (insight) => `
        <li class="insight-item drillable" tabindex="0" role="button" data-drilldown="insight" aria-label="View insight details">
          <span>${escapeHtml(insight.label)}</span>
          <strong>${escapeHtml(insight.value)}</strong>
        </li>
      `
    )
    .join("");
}

function getMonthKeys(count = 6) {
  const keys = [];
  const now = new Date();

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return keys;
}

function renderSpendingAccrual() {
  const monthKey = filterMonthInput.value || getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const daysInMonth = monthEnd.getDate();
  const now = new Date();
  const isCurrentMonth =
    monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isFutureMonth = monthStart > new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const elapsedDays = isFutureMonth
    ? 0
    : isCurrentMonth
      ? now.getDate()
      : daysInMonth;

  const monthExpenses = transactions.filter(
    (item) => item.type === "expense" && item.date.startsWith(monthKey)
  );
  const spentToDate = monthExpenses.reduce(
    (total, item) => total + Number(item.amount),
    0
  );
  const projectedSpend = elapsedDays > 0
    ? (spentToDate / elapsedDays) * daysInMonth
    : 0;
  const projectedRemaining = monthlyBudget - projectedSpend;
  const dailyRate = elapsedDays > 0 ? spentToDate / elapsedDays : 0;

  spentToDateEl.textContent = formatCurrency(spentToDate);
  projectedMonthSpendEl.textContent = formatCurrency(projectedSpend);
  projectionRemainingEl.textContent = formatCurrency(projectedRemaining);
  dailySpendingRateEl.textContent = `${formatCurrency(dailyRate)}/day`;

  if (isFutureMonth) {
    paceStatusEl.textContent = "No data yet";
    paceStatusEl.className = "period-badge";
  } else if (projectedSpend > monthlyBudget) {
    const excess = projectedSpend - monthlyBudget;
    paceStatusEl.textContent = `Over by ${formatCurrency(excess)}`;
    paceStatusEl.className = "period-badge pace-danger";
  } else {
    paceStatusEl.textContent = "Within pace";
    paceStatusEl.className = "period-badge pace-safe";
  }
  projectionRemainingEl.className = projectedRemaining < 0 ? "negative" : "positive";

  const cumulativeByDay = Array(daysInMonth + 1).fill(0);
  monthExpenses.forEach((item) => {
    const day = Number(String(item.date).slice(8, 10)) || 0;
    cumulativeByDay[day] = (cumulativeByDay[day] || 0) + Number(item.amount);
  });

  for (let day = 1; day <= daysInMonth; day += 1) {
    cumulativeByDay[day] += cumulativeByDay[day - 1];
  }

  const width = 800;
  const height = 240;
  const padding = { top: 18, right: 18, bottom: 34, left: 62 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yMaximum = Math.max(
    monthlyBudget,
    projectedSpend,
    ...cumulativeByDay.slice(0, elapsedDays + 1),
    1
  ) * 1.12;

  const pointForDay = (day, value) => {
    const x = padding.left + (day / daysInMonth) * chartWidth;
    const y = padding.top + chartHeight - (value / yMaximum) * chartHeight;
    return [x, y];
  };

  const actualPoints = Array.from({ length: elapsedDays + 1 }, (_, day) => {
    const [x, y] = pointForDay(day, cumulativeByDay[day]);
    return `${x},${y}`;
  }).join(" ");

  const [projectionStartX, projectionStartY] = pointForDay(0, 0);
  const [projectionEndX, projectionEndY] = pointForDay(daysInMonth, projectedSpend);
  const [budgetStartX, budgetStartY] = pointForDay(0, monthlyBudget);
  const [budgetEndX, budgetEndY] = pointForDay(daysInMonth, monthlyBudget);

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = padding.top + chartHeight - ratio * chartHeight;
      const value = yMaximum * ratio;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="accrual-grid-line"></line>
        <text x="${padding.left - 8}" y="${y + 4}" class="accrual-axis-label" text-anchor="end">${formatCurrency(value)}</text>
      `;
    })
    .join("");

  const xLabels = [1, Math.ceil(daysInMonth / 3), Math.ceil(daysInMonth * 2 / 3), daysInMonth]
    .filter((day, index, days) => days.indexOf(day) === index)
    .map((day) => {
      const [x] = pointForDay(day, 0);
      return `<text x="${x}" y="${height - 8}" class="accrual-axis-label" text-anchor="middle">Day ${day}</text>`;
    })
    .join("");

  spendingAccrualChartEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Actual spending and projected month-end spending chart">
      ${gridLines}
      ${xLabels}
      <line x1="${budgetStartX}" y1="${budgetStartY}" x2="${budgetEndX}" y2="${budgetEndY}" class="budget-limit-line"></line>
      ${elapsedDays > 0 ? `<polyline points="${actualPoints}" class="actual-accrual-line"></polyline>` : ""}
      ${elapsedDays > 0 && !isFutureMonth ? `<line x1="${projectionStartX}" y1="${projectionStartY}" x2="${projectionEndX}" y2="${projectionEndY}" class="projected-accrual-line"></line>` : ""}
      ${elapsedDays > 0 ? (() => {
        const lastPoint = actualPoints.split(" ");
        const [lastX, lastY] = lastPoint[lastPoint.length - 1].split(",");
        return `<circle cx="${lastX}" cy="${lastY}" r="5" class="actual-accrual-dot"></circle>`;
      })() : ""}
    </svg>
  `;
}

function renderPredictionsAndSafety() {
  const monthKey = filterMonthInput.value || getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);
  const monthEnd = new Date(year, month, 0);
  const daysInMonth = monthEnd.getDate();
  const now = new Date();
  const isCurrentMonth =
    monthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isFutureMonth = monthEnd > new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const elapsedDays = isFutureMonth
    ? 0
    : isCurrentMonth
      ? now.getDate()
      : daysInMonth;

  const monthExpenses = transactions.filter(
    (item) => item.type === "expense" && item.date.startsWith(monthKey)
  );
  const spentToDate = monthExpenses.reduce(
    (total, item) => total + Number(item.amount),
    0
  );
  const projectedSpend = elapsedDays > 0
    ? (spentToDate / elapsedDays) * daysInMonth
    : 0;
  const forecastUtilization = monthlyBudget > 0
    ? projectedSpend / monthlyBudget
    : 1;
  const actualUtilization = monthlyBudget > 0
    ? spentToDate / monthlyBudget
    : 1;
  const utilization = isFutureMonth ? actualUtilization : forecastUtilization;
  const remainingBudget = Math.max(0, monthlyBudget - spentToDate);
  const remainingDays = isCurrentMonth
    ? Math.max(0, daysInMonth - now.getDate())
    : isFutureMonth
      ? daysInMonth
      : 0;
  const safetyScore = isFutureMonth
    ? 100
    : Math.max(0, Math.min(100, Math.round((1 - utilization) * 100)));

  const gaugeLength = 251;
  gaugeProgressEl.style.strokeDasharray = String(gaugeLength);
  gaugeProgressEl.style.strokeDashoffset = String(
    gaugeLength * (1 - safetyScore / 100)
  );

  let safetyLevel;
  let safetyStatus;
  let safetyDescription;

  if (isFutureMonth) {
    safetyLevel = "Safe";
    safetyStatus = "No spending forecasted yet";
    safetyDescription = "This is a future month, so the score is safe until expenses are recorded.";
  } else if (utilization > 1 || spentToDate > monthlyBudget) {
    safetyLevel = "At risk";
    safetyStatus = "Budget intervention recommended";
    const overage = Math.max(
      0,
      projectedSpend - monthlyBudget,
      spentToDate - monthlyBudget
    );
    safetyDescription = `Spending is forecast to exceed or has already exceeded the budget by ${formatCurrency(overage)}. Reduce flexible spending now.`;
  } else if (utilization >= 0.85) {
    safetyLevel = "Stable";
    safetyStatus = "Monitor spending closely";
    safetyDescription = `You have ${formatCurrency(remainingBudget)} left with ${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining. Keep daily spending within the limit below.`;
  } else {
    safetyLevel = "Safe";
    safetyStatus = "Your budget is on track";
    safetyDescription = `At the current pace, spending is forecast to finish ${formatCurrency(Math.max(0, monthlyBudget - projectedSpend))} below the budget limit.`;
  }

  safetyScoreEl.textContent = isFutureMonth ? "--" : String(safetyScore);
  safetyLevelEl.textContent = safetyLevel;
  safetyStatusEl.textContent = safetyStatus;
  safetyDescriptionEl.textContent = safetyDescription;
  safetyGaugeEl.dataset.level = safetyLevel.toLowerCase();

  const previousMonths = [1, 2, 3].map((offset) => {
    const date = new Date(year, month - 1 - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthExpense = transactions
      .filter((item) => item.type === "expense" && item.date.startsWith(key))
      .reduce((total, item) => total + Number(item.amount), 0);
    return monthExpense;
  });

  const nextMonthPrediction =
    previousMonths[0] * 0.5 +
    previousMonths[1] * 0.3 +
    previousMonths[2] * 0.2;
  const nextMonthDifference = nextMonthPrediction - monthlyBudget;
  nextMonthPredictionEl.textContent = formatCurrency(nextMonthPrediction);

  if (previousMonths.every((amount) => amount === 0)) {
    nextMonthComparisonEl.textContent = "Add earlier spending for a prediction";
  } else if (nextMonthDifference > 0) {
    nextMonthComparisonEl.textContent = `${formatCurrency(nextMonthDifference)} above monthly budget`;
  } else {
    nextMonthComparisonEl.textContent = `${formatCurrency(Math.abs(nextMonthDifference))} below monthly budget`;
  }

  const safeDailyLimit = remainingDays > 0
    ? remainingBudget / remainingDays
    : remainingBudget;

  safeDailyLimitEl.textContent = `${formatCurrency(safeDailyLimit)}/day`;
  safeDaysLeftEl.textContent = remainingDays > 0
    ? `${remainingDays} days left in selected month`
    : "No remaining days";

  if (isFutureMonth) {
    overspendRiskEl.textContent = "Unknown";
    overspendRiskEl.className = "unknown";
    overspendDetailEl.textContent = "Waiting for month spending";
  } else if (utilization > 1) {
    overspendRiskEl.textContent = "High";
    overspendRiskEl.className = "negative";
    overspendDetailEl.textContent = "Immediate spending reduction needed";
  } else if (utilization > 0.85) {
    overspendRiskEl.textContent = "Moderate";
    overspendRiskEl.className = "neutral";
    overspendDetailEl.textContent = "Reduce flexible spending";
  } else {
    overspendRiskEl.textContent = "Low";
    overspendRiskEl.className = "positive";
    overspendDetailEl.textContent = "Comfortable budget buffer";
  }
}

function renderAnalytics(filteredItems) {
  const monthKeys = getMonthKeys(6);
  const trend = monthKeys.map((monthKey) => {
    const monthItems = transactions.filter((item) => item.date.startsWith(monthKey));
    const totals = calculateTotals(monthItems);
    return {
      monthKey,
      income: totals.income,
      expense: totals.expense,
    };
  });

  const maximum = Math.max(
    1,
    ...trend.flatMap((month) => [month.income, month.expense])
  );

  cashflowChartEl.innerHTML = trend
    .map((month) => {
      const incomeWidth = (month.income / maximum) * 100;
      const expenseWidth = (month.expense / maximum) * 100;
      const label = new Date(`${month.monthKey}-01T00:00:00`).toLocaleDateString(
        "en-US",
        { month: "short" }
      );

      return `
        <div class="cashflow-month drillable" data-drilldown="month:${month.monthKey}" tabindex="0" role="button" title="${label}: ${formatCurrency(month.income)} income, ${formatCurrency(month.expense)} expenses">
          <div class="cashflow-bars">
            <span class="cashflow-bar income-bar" style="height: ${incomeWidth}%"></span>
            <span class="cashflow-bar expense-bar" style="height: ${expenseWidth}%"></span>
          </div>
          <span class="cashflow-label">${label}</span>
        </div>
      `;
    })
    .join("");

  const totals = calculateTotals(filteredItems);
  const expenseItems = filteredItems.filter((item) => item.type === "expense");
  const activeMonthCount = new Set(
    filteredItems.map((item) => item.date.slice(0, 7))
  ).size;
  const monthsTracked = activeMonthCount || 1;
  const savingsRate = totals.income > 0
    ? Math.max(-100, ((totals.income - totals.expense) / totals.income) * 100)
    : 0;
  const averageMonthlySpend = totals.expense / monthsTracked;
  const largestExpense = expenseItems.reduce(
    (largest, item) => Math.max(largest, Number(item.amount) || 0),
    0
  );

  savingsRateEl.textContent = `${savingsRate.toFixed(1)}%`;
  savingsRateEl.className = savingsRate >= 20 ? "positive" : savingsRate >= 0 ? "neutral" : "negative";
  savingsRateBarEl.style.width = `${Math.min(100, Math.max(0, savingsRate))}%`;
  averageMonthlySpendEl.textContent = formatCurrency(averageMonthlySpend);
  expenseCountEl.textContent = String(expenseItems.length);
  largestExpenseEl.textContent = formatCurrency(largestExpense);
}

function renderTransactions() {
  const filteredTransactions = getFilteredTransactions();
  renderSummary(filteredTransactions);
  renderBreakdown(filteredTransactions);
  renderInsights(filteredTransactions);
  renderAnalytics(filteredTransactions);
  renderSpendingAccrual();
  renderPredictionsAndSafety();

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  tableBody.innerHTML = "";

  if (!sortedTransactions.length) {
    const emptyMessage = transactions.length === 0
      ? "Welcome to your private dashboard. Add your first income or expense above to start tracking."
      : "No matching transactions found.";
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">${emptyMessage}</td>
      </tr>
    `;
    return;
  }

  sortedTransactions.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <span class="type-badge ${item.type}">${item.type}</span>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td class="${item.type === "income" ? "income-text" : "expense-text"}">
        ${formatCurrency(item.amount)}
      </td>
      <td>${item.date}</td>
      <td>${escapeHtml(item.description || "No note")}</td>
      <td class="action-cell">
        <button type="button" class="edit-btn" data-id="${item.id}">Edit</button>
        <button type="button" class="delete-btn" data-id="${item.id}">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function resetForm() {
  form.reset();
  editingTransactionId = null;
  typeSelect.value = "expense";
  populateCategories();
  dateInput.value = new Date().toISOString().slice(0, 10);
  submitButton.textContent = "Add Transaction";
}

function fillFormWithTransaction(item) {
  editingTransactionId = item.id;
  typeSelect.value = item.type;
  populateCategories();
  categorySelect.value = item.category;
  amountInput.value = item.amount;
  dateInput.value = item.date;
  descriptionInput.value = item.description;
  submitButton.textContent = "Update Transaction";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function refreshBudgetDisplay() {
  budgetInput.value = monthlyBudget;
  const remaining = monthlyBudget - calculateTotals(getFilteredTransactions()).expense;
  const status = remaining >= 0 ? "within budget" : "over budget";
  saveBudgetBtn.title = `Current budget is ${formatCurrency(monthlyBudget)} (${status})`;
}

async function addOrUpdateTransaction(event) {
  event.preventDefault();

  const type = typeSelect.value;
  const category = categorySelect.value;
  const amount = Number(amountInput.value);
  const date = dateInput.value || new Date().toISOString().slice(0, 10);
  const description = descriptionInput.value.trim();

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount greater than zero.");
    return;
  }

  if (!date) {
    alert("Please select a date.");
    return;
  }

  const data = {
    id: editingTransactionId,
    type,
    category,
    amount: Number(amount.toFixed(2)),
    date,
    description,
  };

  try {
    const savedItem = editingTransactionId
      ? await window.budgetBackend.updateTransaction(data)
      : await window.budgetBackend.insertTransaction(data, currentUser.id);
    const normalized = normalizeTransaction(savedItem);
    if (!normalized) {
      throw new Error(
        "Supabase returned invalid transaction data. Refresh the page to verify whether it was saved before trying again."
      );
    }

    if (editingTransactionId) {
      const index = transactions.findIndex((item) => item.id === editingTransactionId);
      if (index !== -1) {
        transactions[index] = normalized;
      }
    } else {
      transactions.push(normalized);
    }

    transactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    renderTransactions();
    resetForm();
  } catch (error) {
    alert(`Could not save transaction: ${error.message}`);
  }
}

async function handleDeleteClick(event) {
  const deleteButton = event.target.closest(".delete-btn");
  const editButton = event.target.closest(".edit-btn");

  if (deleteButton) {
    const { id } = deleteButton.dataset;
    const index = transactions.findIndex((item) => item.id === id);

    if (index !== -1) {
      try {
        await window.budgetBackend.deleteTransaction(id);
        transactions.splice(index, 1);
      } catch (error) {
        alert(`Could not delete transaction: ${error.message}`);
        return;
      }
      renderTransactions();
    }
    return;
  }

  if (editButton) {
    const { id } = editButton.dataset;
    const item = transactions.find((transaction) => transaction.id === id);

    if (item) {
      fillFormWithTransaction(item);
    }
  }
}

async function handleBudgetSave() {
  const value = Number(budgetInput.value);

  if (!value || value < 0) {
    alert("Please enter a valid monthly budget greater than zero.");
    return;
  }

  const nextBudget = Number(value.toFixed(2));
  try {
    await window.budgetBackend.saveBudget(currentUser.id, nextBudget);
    monthlyBudget = nextBudget;
    refreshBudgetDisplay();
    renderTransactions();
  } catch (error) {
    alert(`Could not save budget: ${error.message}`);
  }
}

function exportTransactions() {
  const payload = {
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    monthlyBudget,
    transactions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "budget-tracker-export.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function importTransactions(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    let importedCount = 0;
    try {
      const parsed = JSON.parse(String(reader.result));
      const incomingTransactions = Array.isArray(parsed.transactions)
        ? parsed.transactions
        : Array.isArray(parsed)
          ? parsed
          : [];

      const normalized = incomingTransactions
        .map(normalizeTransaction)
        .filter(Boolean);

      if (!normalized.length) {
        throw new Error("No valid transactions found in file.");
      }

      const importedRows = await window.budgetBackend.insertTransactions(
        normalized,
        currentUser.id
      );
      importedCount = importedRows.length;
      transactions = [...importedRows.map(normalizeTransaction), ...transactions]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      renderTransactions();

      if (Number(parsed.monthlyBudget) > 0) {
        const nextBudget = Number(Number(parsed.monthlyBudget).toFixed(2));
        await window.budgetBackend.saveBudget(currentUser.id, nextBudget);
        monthlyBudget = nextBudget;
      }
      renderTransactions();
      refreshBudgetDisplay();
      alert(`${importedRows.length} transactions imported to your account.`);
    } catch (error) {
      const message = importedCount
        ? `${importedCount} transactions were imported, but another import step failed: ${error.message}`
        : `Import failed: ${error.message}`;
      alert(message);
    }
  };

  reader.readAsText(file);
}

function showAuthMessage(message, isError = false) {
  authMessageEl.textContent = message;
  authMessageEl.classList.toggle("error", isError);
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignUp = mode === "signup";
  const isResetRequest = mode === "reset-request";
  const isResetPassword = mode === "reset-password";
  const isPasswordMode = !isResetRequest;

  authTitleEl.textContent = isSignUp
    ? "Create your account"
    : isResetRequest
      ? "Reset password"
      : isResetPassword
        ? "Choose a new password"
        : "Sign in";
  authIntroEl.textContent = isSignUp
    ? "Create a private account to keep your financial records separate."
    : isResetRequest
      ? "Enter your account email and we will send you a password reset link."
      : isResetPassword
        ? "Enter and confirm your new password."
        : "Sign in to securely view your own budget and transactions.";
  authSubmitBtn.textContent = isSignUp
    ? "Create account"
    : isResetRequest
      ? "Send reset link"
      : isResetPassword
        ? "Update password"
        : "Sign in";
  authPasswordField.hidden = isResetRequest;
  authPasswordInput.required = isPasswordMode;
  authConfirmPasswordField.hidden = !isResetPassword;
  authConfirmPasswordInput.required = isResetPassword;
  authConfirmPasswordInput.value = "";
  forgotPasswordBtn.hidden = mode !== "signin";
  authPasswordInput.autocomplete = isSignUp || isResetPassword ? "new-password" : "current-password";
  authModeBtn.textContent = isSignUp
    ? "Already have an account? Sign in"
    : isResetRequest || isResetPassword
      ? "Back to sign in"
      : "Create an account";
  showAuthMessage("");
}

function showSignedOut(message = "") {
  currentUser = null;
  authScreen.hidden = false;
  appShell.hidden = true;
  showAuthMessage(message);
}

async function enterApp(user) {
  currentUser = user;
  const [storedTransactions, storedBudget] = await Promise.all([
    window.budgetBackend.loadTransactions(),
    window.budgetBackend.loadBudget(user.id),
  ]);
  transactions = storedTransactions
    .map(normalizeTransaction)
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  monthlyBudget = Number.isFinite(storedBudget) && storedBudget > 0
    ? storedBudget
    : DEFAULT_BUDGET;

  if (storedBudget === null) {
    await window.budgetBackend.saveBudget(user.id, monthlyBudget);
  }

  signedInEmailEl.textContent = user.email || "Signed in";
  authScreen.hidden = true;
  appShell.hidden = false;
  filterMonthInput.value = getCurrentMonthKey();
  dateInput.value = new Date().toISOString().slice(0, 10);
  populateCategories();
  populateFilterCategories();
  refreshBudgetDisplay();
  renderTransactions();
}

async function initializeApp() {
  if (!window.budgetBackend.configured) {
    backendSetupMessageEl.hidden = false;
    backendSetupMessageEl.textContent =
      "Connect Supabase to enable account sign-in: set the project URL and publishable/anon key in supabase-config.js, then run supabase-schema.sql in the Supabase SQL Editor. Do not put a service-role key in this app.";
    authSubmitBtn.disabled = true;
    authModeBtn.disabled = true;
    showSignedOut("Backend setup is required before users can create accounts.");
    return;
  }

  try {
    if (window.budgetBackend.handlePasswordRecoveryLocation()) {
      setAuthMode("reset-password");
      showSignedOut("Enter a new password for your account.");
      return;
    }
    const session = await window.budgetBackend.getExistingSession();
    if (!session) {
      showSignedOut();
      return;
    }
    const user = await window.budgetBackend.getUser();
    await enterApp(user);
  } catch (error) {
    window.budgetBackend.clearSession();
    showSignedOut(`Unable to restore your account session: ${error.message}`);
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!window.budgetBackend.configured) return;

  authSubmitBtn.disabled = true;
  showAuthMessage(
    authMode === "signup"
      ? "Creating your account..."
      : authMode === "reset-request"
        ? "Sending reset link..."
        : authMode === "reset-password"
          ? "Updating password..."
          : "Signing in..."
  );

  try {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (authMode === "reset-request") {
      await window.budgetBackend.requestPasswordReset(email);
      setAuthMode("signin");
      authEmailInput.value = email;
      showAuthMessage("If an account exists for that email, a password reset link has been sent.");
      return;
    }

    if (authMode === "reset-password") {
      if (password !== authConfirmPasswordInput.value) {
        showAuthMessage("Passwords do not match.", true);
        authSubmitBtn.disabled = false;
        return;
      }
      await window.budgetBackend.updatePassword(password);
      setAuthMode("signin");
      showAuthMessage("Password updated. Sign in with your new password.");
      return;
    }

    const result = authMode === "signup"
      ? await window.budgetBackend.signUp(email, password)
      : await window.budgetBackend.signIn(email, password);

    if (authMode === "signup" && !result.access_token) {
      setAuthMode("signin");
      authEmailInput.value = email;
      showAuthMessage("Account created. Check your email to confirm it, then sign in.");
      return;
    }

    const user = result.user || await window.budgetBackend.getUser();
    await enterApp(user);
  } catch (error) {
    showAuthMessage(error.message, true);
  } finally {
    authSubmitBtn.disabled = !window.budgetBackend.configured;
  }
});

authModeBtn.addEventListener("click", () => {
  setAuthMode(
    authMode === "signin"
      ? "signup"
      : "signin"
  );
});

forgotPasswordBtn.addEventListener("click", () => {
  setAuthMode("reset-request");
});

signOutBtn.addEventListener("click", async () => {
  signOutBtn.disabled = true;
  try {
    await window.budgetBackend.signOut();
    transactions = [];
    showSignedOut("You have been signed out.");
  } catch (error) {
    transactions = [];
    showSignedOut(`Your local session was cleared, but Supabase sign-out reported: ${error.message}`);
  } finally {
    signOutBtn.disabled = false;
  }
});

form.addEventListener("submit", addOrUpdateTransaction);
tableBody.addEventListener("click", handleDeleteClick);
resetBtn.addEventListener("click", async () => {
  const wantsReset = window.confirm("Clear all saved transactions?");

  if (!wantsReset) return;

  try {
    await window.budgetBackend.deleteAllTransactions(currentUser.id);
    transactions = [];
    renderTransactions();
    resetForm();
  } catch (error) {
    alert(`Could not clear transactions: ${error.message}`);
  }
});

saveBudgetBtn.addEventListener("click", handleBudgetSave);
exportDataBtn.addEventListener("click", exportTransactions);
importDataBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  importTransactions(file);
  importFileInput.value = "";
});

document.addEventListener("click", (event) => {
  const drillable = event.target.closest("[data-drilldown]");
  if (!drillable) return;
  openDrilldown(drillable.dataset.drilldown);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const drillable = event.target.closest("[data-drilldown]");
  if (!drillable) return;
  event.preventDefault();
  openDrilldown(drillable.dataset.drilldown);
});

closeDetailBtn.addEventListener("click", () => {
  if (typeof detailDialog.close === "function") {
    detailDialog.close();
  } else {
    detailDialog.removeAttribute("open");
  }
});

detailSaveBudgetBtn.addEventListener("click", async () => {
  const value = Number(detailBudgetInput.value);
  if (!value || value < 0) {
    alert("Please enter a valid monthly budget greater than zero.");
    return;
  }
  const nextBudget = Number(value.toFixed(2));
  try {
    await window.budgetBackend.saveBudget(currentUser.id, nextBudget);
    monthlyBudget = nextBudget;
    budgetInput.value = monthlyBudget;
    refreshBudgetDisplay();
    renderTransactions();
    if (activeDrilldownType) openDrilldown(activeDrilldownType);
  } catch (error) {
    alert(`Could not save budget: ${error.message}`);
  }
});

detailTableBodyEl.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".detail-edit-btn");
  const deleteButton = event.target.closest(".detail-delete-btn");

  if (editButton) {
    const item = transactions.find((transaction) => transaction.id === editButton.dataset.id);
    if (!item) return;
    if (typeof detailDialog.close === "function") {
      detailDialog.close();
    } else {
      detailDialog.removeAttribute("open");
    }
    fillFormWithTransaction(item);
    return;
  }

  if (deleteButton) {
    const item = transactions.find((transaction) => transaction.id === deleteButton.dataset.id);
    if (!item) return;
    if (!window.confirm(`Delete ${formatCurrency(item.amount)} ${item.category} transaction?`)) return;
    try {
      await window.budgetBackend.deleteTransaction(item.id);
      transactions = transactions.filter((transaction) => transaction.id !== item.id);
    } catch (error) {
      alert(`Could not delete transaction: ${error.message}`);
      return;
    }
    renderTransactions();
    if (activeDrilldownType) openDrilldown(activeDrilldownType);
  }
});
detailDialog.addEventListener("click", (event) => {
  if (event.target !== detailDialog) return;
  if (typeof detailDialog.close === "function") {
    detailDialog.close();
  } else {
    detailDialog.removeAttribute("open");
  }
});

typeSelect.addEventListener("change", populateCategories);
filterMonthInput.addEventListener("input", renderTransactions);
filterTypeInput.addEventListener("change", renderTransactions);
filterCategoryInput.addEventListener("change", renderTransactions);
searchInput.addEventListener("input", renderTransactions);

initializeApp();

