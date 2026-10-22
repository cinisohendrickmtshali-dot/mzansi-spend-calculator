// State Management
let transactions = JSON.parse(localStorage.getItem('mzansi_transactions')) || [];
let spendingChart = null;

// DOM Elements
const transactionForm = document.getElementById('transactionForm');
const transactionList = document.getElementById('transactionList');
const totalBalanceEl = document.getElementById('totalBalance');
const totalSpentEl = document.getElementById('totalSpent');
const totalIncomeEl = document.getElementById('totalIncome');
const clearAllBtn = document.getElementById('clearAll');
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');

// Format amount to South African Rand (ZAR)
function formatZAR(amount) {
    return 'R ' + Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Initialize App
function init() {
    renderTransactions();
    updateSummary();
    initChart();
}

// Add Transaction
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = typeSelect.value;
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = categorySelect.value;

    const newTransaction = {
        id: Date.now(),
        type,
        description,
        amount,
        category,
        date: new Date().toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    transactions.unshift(newTransaction);
    saveAndRefresh();
    transactionForm.reset();
});

// Save to LocalStorage & Refresh UI
function saveAndRefresh() {
    localStorage.setItem('mzansi_transactions', JSON.stringify(transactions));
    renderTransactions();
    updateSummary();
    updateChart();
}

// Render Transaction History List
function renderTransactions() {
    transactionList.innerHTML = '';

    if (transactions.length === 0) {
        transactionList.innerHTML = `<li class="py-6 text-center text-slate-400 text-xs">No transactions recorded yet. Add one above!</li>`;
        return;
    }

    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.className = 'py-3 flex justify-between items-center text-sm';
        
        const isIncome = tx.type === 'income';
        const amountClass = isIncome ? 'text-emerald-600 font-semibold' : 'text-slate-900 font-semibold';
        const prefix = isIncome ? '+' : '-';

        li.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-full ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xs font-bold">
                    ${isIncome ? 'IN' : 'OUT'}
                </div>
                <div>
                    <p class="font-medium text-slate-800">${tx.description}</p>
                    <p class="text-xs text-slate-400">${tx.category} &bull; ${tx.date}</p>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <span class="${amountClass}">${prefix} ${formatZAR(tx.amount)}</span>
                <button onclick="deleteTransaction(${tx.id})" class="text-slate-300 hover:text-rose-500 transition text-xs">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        transactionList.appendChild(li);
    });
}

// Update Totals Summary
function updateSummary() {
    let income = 0;
    let spent = 0;

    transactions.forEach(tx => {
        if (tx.type === 'income') {
            income += tx.amount;
        } else {
            spent += tx.amount;
        }
    });

    const balance = income - spent;

    totalBalanceEl.textContent = formatZAR(balance);
    totalSpentEl.textContent = formatZAR(spent);
    totalIncomeEl.textContent = formatZAR(income);

    // Color code balance if negative
    if (balance < 0) {
        totalBalanceEl.className = 'text-xl font-bold text-rose-600';
    } else {
        totalBalanceEl.className = 'text-xl font-bold text-slate-900';
    }
}

// Initialize Chart.js Bar Graph
function initChart() {
    const ctx = document.getElementById('spendingChart').getContext('2d');
    
    spendingChart = new Chart(ctx, {
        type: 'bar',
        data: getChartData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: { size: 11 },
                        color: '#64748b'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

// Calculate totals per category for the Bar Graph
function getChartData() {
    const categories = [
        'Groceries & Food',
        'Transport & Travel',
        'Utilities & Airtime',
        'Leisure & Eating Out',
        'Bills & Debt',
        'Other'
    ];

    const categoryTotals = categories.map(cat => {
        return transactions
            .filter(tx => tx.type === 'expense' && tx.category === cat)
            .reduce((sum, tx) => sum + tx.amount, 0);
    });

    return {
        labels: ['Groceries', 'Transport', 'Utilities', 'Leisure', 'Bills', 'Other'],
        datasets: [{
            label: 'Spent (R)',
            data: categoryTotals,
            backgroundColor: [
                '#10b981', // Emerald
                '#3b82f6', // Blue
                '#f59e0b', // Amber
                '#ec4899', // Pink
                '#8b5cf6', // Purple
                '#64748b'  // Slate
            ],
            borderRadius: 6
        }]
    };
}

// Update Chart Data dynamically
function updateChart() {
    if (spendingChart) {
        const updatedData = getChartData();
        spendingChart.data.datasets[0].data = updatedData.datasets[0].data;
        spendingChart.update();
    }
}

// Delete Single Transaction
window.deleteTransaction = function(id) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveAndRefresh();
};

// Clear All Transactions
clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all transactions?')) {
        transactions = [];
        saveAndRefresh();
    }
});

// Run Init on Load
init();

// Register Service Worker for Offline PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Offline mode activated!'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
