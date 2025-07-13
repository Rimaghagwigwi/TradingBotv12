// optimization.js - Optimisation des paramètres

// Fonction pour optimiser les paramètres
function optimizeParameters() {
    if (csvData.length === 0) {
        showStatus('Veuillez d\'abord charger un fichier CSV', 'error');
        return;
    }
    
    showLoading(true);
    showStatus('Optimisation des paramètres en cours...', 'info');
    
    const baseConfig = {
        initialCapital: parseFloat(document.getElementById('initialCapital').value),
        fees: parseFloat(document.getElementById('fees').value) / 100
    };
    
    const parameterRanges = {
        stopLoss: [0.01, 0.02, 0.03, 0.04, 0.05],
        takeProfit: [0.06, 0.08, 0.10, 0.12, 0.15],
        rsiPeriod: [10, 14, 18, 22],
        emaFast: [8, 12, 16],
        emaSlow: [21, 26, 31],
        bbPeriod: [15, 20, 25]
    };
    
    let bestConfig = null;
    let bestReturn = -Infinity;
    
    // Test de toutes les combinaisons (approche brute force simplifiée)
    const combinations = generateParameterCombinations(parameterRanges);
    
    setTimeout(() => {
        let completed = 0;
        
        for (const params of combinations.slice(0, 50)) { // Limite à 50 combinaisons pour éviter les blocages
            const config = { ...baseConfig, ...params };
            
            try {
                const dataWithIndicators = calculateIndicators(csvData, config);
                const botResults = simulateTrading(dataWithIndicators, config);
                const holdResults = calculateBuyAndHold(csvData, config);
                const metrics = calculateMetrics(botResults, holdResults, config);
                
                if (metrics.bot.return > bestReturn) {
                    bestReturn = metrics.bot.return;
                    bestConfig = { ...config };
                }
                
                completed++;
                
                if (completed % 10 === 0) {
                    showStatus(`Optimisation: ${completed}/${combinations.length} combinaisons testées`, 'info');
                }
                
            } catch (error) {
                console.error('Erreur lors de l\'optimisation:', error);
            }
        }
        
        if (bestConfig) {
            // Mise à jour des champs avec les meilleurs paramètres
            document.getElementById('stopLoss').value = (bestConfig.stopLoss * 100).toFixed(1);
            document.getElementById('takeProfit').value = (bestConfig.takeProfit * 100).toFixed(1);
            document.getElementById('rsiPeriod').value = bestConfig.rsiPeriod;
            document.getElementById('emaFast').value = bestConfig.emaFast;
            document.getElementById('emaSlow').value = bestConfig.emaSlow;
            document.getElementById('bbPeriod').value = bestConfig.bbPeriod;
            
            showStatus(`Optimisation terminée! Meilleur rendement: ${formatPercent(bestReturn)}`, 'success');
        } else {
            showStatus('Aucune configuration optimale trouvée', 'error');
        }
        
        showLoading(false);
    }, 100);
}

function generateParameterCombinations(ranges) {
    const combinations = [];
    const keys = Object.keys(ranges);
    
    function generate(index, current) {
        if (index === keys.length) {
            combinations.push({ ...current });
            return;
        }
        
        const key = keys[index];
        for (const value of ranges[key]) {
            current[key] = value;
            generate(index + 1, current);
        }
    }
    
    generate(0, {});
    return combinations;
}