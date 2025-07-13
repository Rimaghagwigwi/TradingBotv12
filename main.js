// main.js - Fichier principal
// Variables globales
let csvData = [];
let backtestResults = null;
let chart = null;

// Fonction principale pour lancer le backtest
async function runBacktest() {
    if (csvData.length === 0) {
        showStatus('Veuillez d\'abord charger un fichier CSV', 'error');
        return;
    }

    showLoading(true);
    showStatus('');

    try {
        // Récupération des paramètres
        const config = {
            initialCapital: parseFloat(document.getElementById('initialCapital').value),
            fees: parseFloat(document.getElementById('fees').value) / 100,
            stopLoss: parseFloat(document.getElementById('stopLoss').value) / 100,
            takeProfit: parseFloat(document.getElementById('takeProfit').value) / 100,
            rsiPeriod: parseInt(document.getElementById('rsiPeriod').value),
            emaFast: parseInt(document.getElementById('emaFast').value),
            emaSlow: parseInt(document.getElementById('emaSlow').value),
            bbPeriod: parseInt(document.getElementById('bbPeriod').value)
        };

        // Validation des données
        if (!validateConfig(config)) {
            showLoading(false);
            return;
        }

        // Calcul des indicateurs techniques
        const dataWithIndicators = calculateIndicators(csvData, config);
        
        // Simulation du trading
        const botResults = simulateTrading(dataWithIndicators, config);
        
        // Calcul du Buy & Hold
        const holdResults = calculateBuyAndHold(csvData, config);
        
        // Calcul des métriques de performance
        const metrics = calculateMetrics(botResults, holdResults, config);
        
        // Affichage des résultats
        displayResults(metrics, botResults, holdResults);
        
        // Création du graphique
        createChart(botResults.equity, holdResults.equity, csvData);
        
        // Affichage des trades
        displayTrades(botResults.trades);
        
        backtestResults = { bot: botResults, hold: holdResults, metrics };
        
        showStatus('Backtest terminé avec succès!', 'success');
        
    } catch (error) {
        console.error('Erreur lors du backtest:', error);
        showStatus('Erreur lors du backtest: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    showStatus('Bot de trading crypto prêt! Chargez un fichier CSV pour commencer.', 'info');
    
    // Ajout des tooltips et aide contextuelle
    addTooltips();
    
    // Ajout des boutons additionnels
    addAdditionalButtons();
});

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
    showStatus('Une erreur inattendue s\'est produite. Veuillez vérifier la console.', 'error');
    showLoading(false);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse rejetée:', e.reason);
    showStatus('Erreur lors du traitement des données.', 'error');
    showLoading(false);
});

function addTooltips() {
    const tooltips = {
        'initialCapital': 'Capital de départ pour le trading. Recommandé: 10,000€ minimum',
        'fees': 'Frais de transaction appliqués à chaque trade (achat/vente)',
        'stopLoss': 'Pourcentage de perte maximum avant fermeture automatique',
        'takeProfit': 'Pourcentage de gain visé avant fermeture automatique',
        'rsiPeriod': 'Période pour le calcul du RSI (14 est standard)',
        'emaFast': 'Période pour l\'EMA rapide (doit être < EMA lente)',
        'emaSlow': 'Période pour l\'EMA lente (signal de tendance)',
        'bbPeriod': 'Période pour les Bollinger Bands (20 est standard)'
    };
    
    Object.keys(tooltips).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.title = tooltips[id];
        }
    });
}

function addAdditionalButtons() {
    const container = document.querySelector('.container');
    const runButton = document.querySelector('.run-button');
    
    // Bouton d'optimisation
    const optimizeButton = document.createElement('button');
    optimizeButton.className = 'run-button';
    optimizeButton.style.background = 'linear-gradient(45deg, #00ff88, #00d4ff)';
    optimizeButton.style.marginRight = '10px';
    optimizeButton.innerHTML = '🔧 Optimiser les Paramètres';
    optimizeButton.onclick = optimizeParameters;
    
    // Bouton d'analyse des signaux
    const analyzeButton = document.createElement('button');
    analyzeButton.className = 'run-button';
    analyzeButton.style.background = 'linear-gradient(45deg, #ffd700, #ffb347)';
    analyzeButton.style.marginRight = '10px';
    analyzeButton.innerHTML = '📊 Analyser les Signaux';
    analyzeButton.onclick = analyzeSignals;
    
    // Bouton de téléchargement
    const downloadButton = document.createElement('button');
    downloadButton.className = 'run-button';
    downloadButton.style.background = 'linear-gradient(45deg, #9b59b6, #8e44ad)';
    downloadButton.innerHTML = '💾 Télécharger les Résultats';
    downloadButton.onclick = downloadResults;
    
    // Insertion des boutons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.textAlign = 'center';
    buttonContainer.style.marginBottom = '30px';
    
    buttonContainer.appendChild(optimizeButton);
    buttonContainer.appendChild(analyzeButton);
    buttonContainer.appendChild(downloadButton);
    
    container.insertBefore(buttonContainer, runButton.nextSibling);
}