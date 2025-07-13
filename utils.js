// utils.js - Fonctions utilitaires

// Fonction pour télécharger les résultats en CSV
function downloadResults() {
    if (!backtestResults) {
        showStatus('Aucun résultat à télécharger', 'error');
        return;
    }
    
    const trades = backtestResults.bot.trades;
    const csvContent = generateTradesCSV(trades);
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'backtest_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function generateTradesCSV(trades) {
    const headers = ['Date', 'Type', 'Prix', 'Quantité', 'PnL', 'Raison', 'Signaux'];
    const rows = trades.map(trade => [
        new Date(trade.timestamp).toISOString(),
        trade.type,
        trade.price.toFixed(2),
        trade.quantity.toFixed(6),
        trade.pnl.toFixed(2),
        trade.reason,
        trade.signals.reasons ? trade.signals.reasons.join('; ') : ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Fonction pour réinitialiser les paramètres
function resetParameters() {
    document.getElementById('initialCapital').value = '10000';
    document.getElementById('fees').value = '0.1';
    document.getElementById('stopLoss').value = '3';
    document.getElementById('takeProfit').value = '8';
    document.getElementById('rsiPeriod').value = '14';
    document.getElementById('emaFast').value = '12';
    document.getElementById('emaSlow').value = '26';
    document.getElementById('bbPeriod').value = '20';
    
    showStatus('Paramètres réinitialisés aux valeurs par défaut', 'success');
}

// Fonction pour sauvegarder les paramètres
function saveParameters() {
    const config = {
        initialCapital: document.getElementById('initialCapital').value,
        fees: document.getElementById('fees').value,
        stopLoss: document.getElementById('stopLoss').value,
        takeProfit: document.getElementById('takeProfit').value,
        rsiPeriod: document.getElementById('rsiPeriod').value,
        emaFast: document.getElementById('emaFast').value,
        emaSlow: document.getElementById('emaSlow').value,
        bbPeriod: document.getElementById('bbPeriod').value
    };
    
    const configString = JSON.stringify(config);
    const blob = new Blob([configString], { type: 'application/json' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'trading_config.json');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showStatus('Configuration sauvegardée', 'success');
}

// Fonction pour charger les paramètres
function loadParameters() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                
                // Validation et application des paramètres
                Object.keys(config).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.value = config[key];
                    }
                });
                
                showStatus('Configuration chargée avec succès', 'success');
                
            } catch (error) {
                showStatus('Erreur lors du chargement de la configuration', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Gestion des erreurs
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    showStatus('Une erreur inattendue s\'est produite. Veuillez vérifier la console.', 'error');
    showLoading(false);
});

// Gestion des erreurs de promesses
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse rejetée:', e.reason);
    showStatus('Erreur lors du traitement des données.', 'error');
    showLoading(false);
});