// ui.js - Gestion de l'interface utilisateur

// Validation de la configuration
function validateConfig(config) {
    if (config.initialCapital < 1000) {
        showStatus('Le capital initial doit être d\'au moins 1000€', 'error');
        return false;
    }
    
    if (config.fees < 0 || config.fees > 0.01) {
        showStatus('Les frais doivent être entre 0% et 1%', 'error');
        return false;
    }
    
    if (config.stopLoss < 0 || config.stopLoss > 0.1) {
        showStatus('Le stop loss doit être entre 0% et 10%', 'error');
        return false;
    }
    
    if (config.takeProfit < 0 || config.takeProfit > 0.2) {
        showStatus('Le take profit doit être entre 0% et 20%', 'error');
        return false;
    }
    
    if (config.emaFast >= config.emaSlow) {
        showStatus('La période EMA rapide doit être inférieure à la période EMA lente', 'error');
        return false;
    }
    
    return true;
}

// Affichage des résultats
function displayResults(metrics, botResults, holdResults) {
    // Résultats du bot
    document.getElementById('botPnl').textContent = formatCurrency(metrics.bot.pnl);
    document.getElementById('botPnl').className = 'metric-value ' + (metrics.bot.pnl >= 0 ? 'positive' : 'negative');
    
    document.getElementById('botReturn').textContent = formatPercent(metrics.bot.return);
    document.getElementById('botReturn').className = 'metric-value ' + (metrics.bot.return >= 0 ? 'positive' : 'negative');
    
    document.getElementById('numTrades').textContent = metrics.bot.numTrades;
    document.getElementById('winRate').textContent = formatPercent(metrics.bot.winRate);
    document.getElementById('sharpeRatio').textContent = metrics.bot.sharpeRatio.toFixed(2);
    
    // Résultats du Buy & Hold
    document.getElementById('holdPnl').textContent = formatCurrency(metrics.hold.pnl);
    document.getElementById('holdPnl').className = 'metric-value ' + (metrics.hold.pnl >= 0 ? 'positive' : 'negative');
    
    document.getElementById('holdReturn').textContent = formatPercent(metrics.hold.return);
    document.getElementById('holdReturn').className = 'metric-value ' + (metrics.hold.return >= 0 ? 'positive' : 'negative');
    
    document.getElementById('holdFees').textContent = formatCurrency(metrics.hold.fees);
    
    // Comparaison
    document.getElementById('outperformance').textContent = formatPercent(metrics.outperformance);
    document.getElementById('outperformance').className = 'metric-value ' + (metrics.outperformance >= 0 ? 'positive' : 'negative');
    
    document.getElementById('maxDrawdown').textContent = formatPercent(metrics.bot.maxDrawdown);
    document.getElementById('holdMaxDrawdown').textContent = formatPercent(metrics.hold.maxDrawdown);
    document.getElementById('volatility').textContent = formatPercent(metrics.bot.volatility);
    
    document.getElementById('results').style.display = 'block';
}

// Affichage des trades
function displayTrades(trades) {
    const tbody = document.getElementById('tradesBody');
    tbody.innerHTML = '';
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        
        const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
        const typeClass = trade.type === 'BUY' ? 'buy-signal' : 'sell-signal';
        
        row.innerHTML = `
            <td>${new Date(trade.timestamp).toLocaleString()}</td>
            <td class="${typeClass}">${trade.type}</td>
            <td>${formatCurrency(trade.price)}</td>
            <td>${trade.quantity.toFixed(6)}</td>
            <td class="${pnlClass}">${formatCurrency(trade.pnl)}</td>
            <td>${trade.signals.reasons ? trade.signals.reasons.join(', ') : trade.reason}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    document.getElementById('tradesContainer').style.display = 'block';
}

// Fonctions utilitaires
function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function formatPercent(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

function showStatus(message, type = '') {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = message ? 'block' : 'none';
}

function showLoading(show) {
    const loadingDiv = document.getElementById('loading');
    if (show) {
        loadingDiv.classList.add('active');
    } else {
        loadingDiv.classList.remove('active');
    }
}