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

// Gestion du fichier CSV
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csv = e.target.result;
            csvData = parseCSV(csv);
            
            if (csvData.length < 100) {
                showStatus('Le fichier CSV doit contenir au moins 100 lignes de données', 'error');
                return;
            }
            
            document.getElementById('fileInfo').innerHTML = `
                ✅ Fichier chargé: ${file.name}<br>
                📊 ${csvData.length} lignes de données<br>
                📅 Du ${new Date(csvData[0].timestamp).toLocaleDateString()} au ${new Date(csvData[csvData.length-1].timestamp).toLocaleDateString()}
            `;
            
            showStatus('Fichier CSV chargé avec succès', 'success');
            
        } catch (error) {
            showStatus('Erreur lors du chargement du fichier CSV: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
});

// Parsing du CSV
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const data = [];
    
    // Vérification des colonnes requises
    const requiredColumns = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
        throw new Error(`Colonnes manquantes dans le CSV: ${missingColumns.join(', ')}`);
    }
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index].trim();
            if (header === 'timestamp') {
                row[header] = new Date(value).getTime();
            } else {
                row[header] = parseFloat(value);
            }
        });
        
        // Validation des données
        if (isNaN(row.timestamp) || isNaN(row.open) || isNaN(row.high) || 
            isNaN(row.low) || isNaN(row.close) || isNaN(row.volume)) {
            continue;
        }
        
        data.push(row);
    }
    
    return data.sort((a, b) => a.timestamp - b.timestamp);
}

// Calcul des indicateurs techniques
function calculateIndicators(data, config) {
    const result = data.map(d => ({ ...d }));
    
    // RSI
    const rsi = calculateRSI(data.map(d => d.close), config.rsiPeriod);
    
    // EMA
    const emaFast = calculateEMA(data.map(d => d.close), config.emaFast);
    const emaSlow = calculateEMA(data.map(d => d.close), config.emaSlow);
    
    // Bollinger Bands
    const bb = calculateBollingerBands(data.map(d => d.close), config.bbPeriod);
    
    // MACD
    const macd = calculateMACD(data.map(d => d.close), 12, 26, 9);
    
    // Ajout des indicateurs aux données
    for (let i = 0; i < result.length; i++) {
        result[i].rsi = rsi[i];
        result[i].emaFast = emaFast[i];
        result[i].emaSlow = emaSlow[i];
        result[i].bbUpper = bb.upper[i];
        result[i].bbMiddle = bb.middle[i];
        result[i].bbLower = bb.lower[i];
        result[i].macd = macd.macd[i];
        result[i].macdSignal = macd.signal[i];
        result[i].macdHistogram = macd.histogram[i];
    }
    
    return result;
}

// Calcul du RSI
function calculateRSI(prices, period) {
    const rsi = new Array(prices.length).fill(null);
    
    for (let i = period; i < prices.length; i++) {
        let gains = 0;
        let losses = 0;
        
        for (let j = i - period + 1; j <= i; j++) {
            const change = prices[j] - prices[j - 1];
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) {
            rsi[i] = 100;
        } else {
            const rs = avgGain / avgLoss;
            rsi[i] = 100 - (100 / (1 + rs));
        }
    }
    
    return rsi;
}

// Calcul de l'EMA
function calculateEMA(prices, period) {
    const ema = new Array(prices.length).fill(null);
    const multiplier = 2 / (period + 1);
    
    // Première valeur = SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += prices[i];
    }
    ema[period - 1] = sum / period;
    
    // Calcul EMA
    for (let i = period; i < prices.length; i++) {
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    
    return ema;
}

// Calcul des Bollinger Bands
function calculateBollingerBands(prices, period) {
    const upper = new Array(prices.length).fill(null);
    const middle = new Array(prices.length).fill(null);
    const lower = new Array(prices.length).fill(null);
    
    for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const sma = slice.reduce((sum, price) => sum + price, 0) / period;
        
        const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        
        middle[i] = sma;
        upper[i] = sma + (stdDev * 2);
        lower[i] = sma - (stdDev * 2);
    }
    
    return { upper, middle, lower };
}

// Calcul du MACD
function calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod) {
    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);
    
    const macd = new Array(prices.length).fill(null);
    for (let i = 0; i < prices.length; i++) {
        if (emaFast[i] !== null && emaSlow[i] !== null) {
            macd[i] = emaFast[i] - emaSlow[i];
        }
    }
    
    const signal = calculateEMA(macd.map(v => v || 0), signalPeriod);
    const histogram = new Array(prices.length).fill(null);
    
    for (let i = 0; i < prices.length; i++) {
        if (macd[i] !== null && signal[i] !== null) {
            histogram[i] = macd[i] - signal[i];
        }
    }
    
    return { macd, signal, histogram };
}

// Simulation du trading
function simulateTrading(data, config) {
    const trades = [];
    const equity = [];
    let position = null;
    let cash = config.initialCapital;
    let totalValue = cash;
    
    for (let i = 50; i < data.length; i++) {
        const current = data[i];
        const prev = data[i - 1];
        
        // Calcul de la valeur totale du portfolio
        if (position) {
            const currentValue = position.quantity * current.close;
            totalValue = cash + currentValue;
        } else {
            totalValue = cash;
        }
        
        equity.push({
            timestamp: current.timestamp,
            value: totalValue,
            price: current.close
        });
        
        // Signaux de trading
        const signals = generateSignals(current, prev, data[i - 2] || prev);
        
        // Gestion des positions existantes
        if (position) {
            const currentPrice = current.close;
            const entryPrice = position.entryPrice;
            const pnlPercent = (currentPrice - entryPrice) / entryPrice;
            
            // Stop Loss
            if (pnlPercent <= -config.stopLoss) {
                const sellPrice = entryPrice * (1 - config.stopLoss);
                const quantity = position.quantity;
                const proceeds = quantity * sellPrice;
                const fees = proceeds * config.fees;
                
                cash += proceeds - fees;
                
                trades.push({
                    timestamp: current.timestamp,
                    type: 'SELL',
                    price: sellPrice,
                    quantity: quantity,
                    pnl: proceeds - position.cost - fees,
                    reason: 'Stop Loss',
                    signals: signals
                });
                
                position = null;
            }
            // Take Profit
            else if (pnlPercent >= config.takeProfit) {
                const sellPrice = entryPrice * (1 + config.takeProfit);
                const quantity = position.quantity;
                const proceeds = quantity * sellPrice;
                const fees = proceeds * config.fees;
                
                cash += proceeds - fees;
                
                trades.push({
                    timestamp: current.timestamp,
                    type: 'SELL',
                    price: sellPrice,
                    quantity: quantity,
                    pnl: proceeds - position.cost - fees,
                    reason: 'Take Profit',
                    signals: signals
                });
                
                position = null;
            }
            // Signal de vente
            else if (signals.sell) {
                const quantity = position.quantity;
                const proceeds = quantity * current.close;
                const fees = proceeds * config.fees;
                
                cash += proceeds - fees;
                
                trades.push({
                    timestamp: current.timestamp,
                    type: 'SELL',
                    price: current.close,
                    quantity: quantity,
                    pnl: proceeds - position.cost - fees,
                    reason: 'Signal',
                    signals: signals
                });
                
                position = null;
            }
        }
        // Signal d'achat
        else if (signals.buy && cash > 100) {
            const buyAmount = cash * 0.95; // 95% du capital disponible
            const fees = buyAmount * config.fees;
            const quantity = (buyAmount - fees) / current.close;
            
            position = {
                entryPrice: current.close,
                quantity: quantity,
                cost: buyAmount,
                timestamp: current.timestamp
            };
            
            cash -= buyAmount;
            
            trades.push({
                timestamp: current.timestamp,
                type: 'BUY',
                price: current.close,
                quantity: quantity,
                pnl: 0,
                reason: 'Signal',
                signals: signals
            });
        }
    }
    
    // Fermeture de la position finale si nécessaire
    if (position) {
        const lastPrice = data[data.length - 1].close;
        const quantity = position.quantity;
        const proceeds = quantity * lastPrice;
        const fees = proceeds * config.fees;
        
        cash += proceeds - fees;
        
        trades.push({
            timestamp: data[data.length - 1].timestamp,
            type: 'SELL',
            price: lastPrice,
            quantity: quantity,
            pnl: proceeds - position.cost - fees,
            reason: 'Final',
            signals: {}
        });
    }
    
    return { trades, equity, finalValue: cash };
}

// Génération des signaux de trading
function generateSignals(current, prev, prevPrev) {
    const signals = {
        buy: false,
        sell: false,
        reasons: []
    };
    
    // Vérification que tous les indicateurs sont disponibles
    if (!current.rsi || !current.emaFast || !current.emaSlow || 
        !current.macd || !current.macdSignal || !current.bbLower || !current.bbUpper) {
        return signals;
    }
    
    let buyScore = 0;
    let sellScore = 0;
    
    // RSI
    if (current.rsi < 30) {
        buyScore += 2;
        signals.reasons.push('RSI oversold');
    } else if (current.rsi > 70) {
        sellScore += 2;
        signals.reasons.push('RSI overbought');
    }
    
    // EMA Crossover
    if (current.emaFast > current.emaSlow && prev.emaFast <= prev.emaSlow) {
        buyScore += 3;
        signals.reasons.push('EMA bullish crossover');
    } else if (current.emaFast < current.emaSlow && prev.emaFast >= prev.emaSlow) {
        sellScore += 3;
        signals.reasons.push('EMA bearish crossover');
    }
    
    // MACD
    if (current.macd > current.macdSignal && prev.macd <= prev.macdSignal) {
        buyScore += 2;
        signals.reasons.push('MACD bullish crossover');
    } else if (current.macd < current.macdSignal && prev.macd >= prev.macdSignal) {
        sellScore += 2;
        signals.reasons.push('MACD bearish crossover');
    }
    
    // Bollinger Bands
    if (current.close < current.bbLower && prev.close >= prev.bbLower) {
        buyScore += 1;
        signals.reasons.push('BB oversold');
    } else if (current.close > current.bbUpper && prev.close <= prev.bbUpper) {
        sellScore += 1;
        signals.reasons.push('BB overbought');
    }
    
    // Prix au-dessus/en-dessous des EMA
    if (current.close > current.emaFast && current.close > current.emaSlow) {
        buyScore += 1;
    } else if (current.close < current.emaFast && current.close < current.emaSlow) {
        sellScore += 1;
    }
    
    // Décision finale
    signals.buy = buyScore >= 4;
    signals.sell = sellScore >= 4;
    
    return signals;
}

// Calcul du Buy & Hold
function calculateBuyAndHold(data, config) {
    const startPrice = data[0].close;
    const endPrice = data[data.length - 1].close;
    const fees = config.initialCapital * config.fees * 2; // Achat + Vente
    
    const quantity = (config.initialCapital - config.initialCapital * config.fees) / startPrice;
    const finalValue = quantity * endPrice - endPrice * quantity * config.fees;
    
    const equity = data.map(d => ({
        timestamp: d.timestamp,
        value: quantity * d.close,
        price: d.close
    }));
    
    return {
        startPrice,
        endPrice,
        quantity,
        finalValue,
        equity,
        fees
    };
}

// Calcul des métriques de performance
function calculateMetrics(botResults, holdResults, config) {
    const botPnl = botResults.finalValue - config.initialCapital;
    const botReturn = (botPnl / config.initialCapital) * 100;
    
    const holdPnl = holdResults.finalValue - config.initialCapital;
    const holdReturn = (holdPnl / config.initialCapital) * 100;
    
    const outperformance = botReturn - holdReturn;
    
    // Calcul des trades gagnants
    const winningTrades = botResults.trades.filter(t => t.pnl > 0);
    const winRate = botResults.trades.length > 0 ? (winningTrades.length / botResults.trades.length) * 100 : 0;
    
    // Calcul du Sharpe Ratio
    const botReturns = calculateDailyReturns(botResults.equity);
    const sharpeRatio = calculateSharpeRatio(botReturns);
    
    // Calcul du Maximum Drawdown
    const botMaxDrawdown = calculateMaxDrawdown(botResults.equity);
    const holdMaxDrawdown = calculateMaxDrawdown(holdResults.equity);
    
    // Calcul de la volatilité
    const volatility = calculateVolatility(botReturns);
    
    return {
        bot: {
            pnl: botPnl,
            return: botReturn,
            numTrades: botResults.trades.length,
            winRate: winRate,
            sharpeRatio: sharpeRatio,
            maxDrawdown: botMaxDrawdown,
            volatility: volatility
        },
        hold: {
            pnl: holdPnl,
            return: holdReturn,
            maxDrawdown: holdMaxDrawdown,
            fees: holdResults.fees
        },
        outperformance: outperformance
    };
}

// Calcul des rendements journaliers
function calculateDailyReturns(equity) {
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
        const dailyReturn = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
        returns.push(dailyReturn);
    }
    return returns;
}

// Calcul du Sharpe Ratio
function calculateSharpeRatio(returns) {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualisé
}

// Calcul du Maximum Drawdown
function calculateMaxDrawdown(equity) {
    let maxDrawdown = 0;
    let peak = equity[0].value;
    
    for (let i = 1; i < equity.length; i++) {
        const value = equity[i].value;
        if (value > peak) {
            peak = value;
        } else {
            const drawdown = (peak - value) / peak;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }
    }
    
    return maxDrawdown * 100;
}

// Calcul de la volatilité
function calculateVolatility(returns) {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualisé en %
}

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

// Création du graphique
function createChart(botEquity, holdEquity, priceData) {
    const canvas = document.getElementById('performanceChart');
    const ctx = canvas.getContext('2d');
    
    // Ajustement de la taille du canvas
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth - 40;
    canvas.height = 400;
    
    // Nettoyage du canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configuration du graphique
    const padding = 50;
    const chartWidth = canvas.width - 3 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    // Calcul des min/max
    const allValues = [...botEquity.map(e => e.value), ...holdEquity.map(e => e.value)];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    
    const minTime = Math.min(botEquity[0].timestamp, holdEquity[0].timestamp);
    const maxTime = Math.max(botEquity[botEquity.length - 1].timestamp, holdEquity[holdEquity.length - 1].timestamp);
    const timeRange = maxTime - minTime;
    
    // Fonction pour convertir les coordonnées
    function getX(timestamp) {
        return padding + ((timestamp - minTime) / timeRange) * chartWidth;
    }
    
    function getY(value) {
        return padding + ((maxValue - value) / valueRange) * chartHeight;
    }
    
    // Dessin des axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    
    // Axe X
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Axe Y
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // Grille
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 1; i < 10; i++) {
        const y = padding + (i / 10) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    // Dessin de la courbe du bot
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(getX(botEquity[0].timestamp), getY(botEquity[0].value));
    
    for (let i = 1; i < botEquity.length; i++) {
        ctx.lineTo(getX(botEquity[i].timestamp), getY(botEquity[i].value));
    }
    ctx.stroke();
    
    // Dessin de la courbe Buy & Hold
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(getX(holdEquity[0].timestamp), getY(holdEquity[0].value));
    
    for (let i = 1; i < holdEquity.length; i++) {
        ctx.lineTo(getX(holdEquity[i].timestamp), getY(holdEquity[i].value));
    }
    ctx.stroke();
    
    // Légende
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText('Bot Trading', padding, 30);
    
    ctx.fillStyle = '#00d4ff';
    ctx.fillRect(padding - 20, 20, 15, 3);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Buy & Hold', padding + 100, 30);
    
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(padding + 80, 20, 15, 3);
    
    // Labels des axes
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // Dates sur l'axe X
    const startDate = new Date(minTime).toLocaleDateString();
    const endDate = new Date(maxTime).toLocaleDateString();
    
    ctx.fillText(startDate, padding, canvas.height - 10);
    ctx.fillText(endDate, canvas.width - padding, canvas.height - 10);
    
    // Valeurs sur l'axe Y
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(maxValue), padding - 10, padding + 5);
    ctx.fillText(formatCurrency(minValue), padding - 10, canvas.height - padding + 5);
    
    document.getElementById('chartContainer').style.display = 'block';
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

// Fonction pour analyser les signaux
function analyzeSignals() {
    if (csvData.length === 0) {
        showStatus('Veuillez d\'abord charger un fichier CSV', 'error');
        return;
    }
    
    const config = {
        rsiPeriod: parseInt(document.getElementById('rsiPeriod').value),
        emaFast: parseInt(document.getElementById('emaFast').value),
        emaSlow: parseInt(document.getElementById('emaSlow').value),
        bbPeriod: parseInt(document.getElementById('bbPeriod').value)
    };
    
    const dataWithIndicators = calculateIndicators(csvData, config);
    
    let buySignals = 0;
    let sellSignals = 0;
    let strongBuySignals = 0;
    let strongSellSignals = 0;
    
    for (let i = 50; i < dataWithIndicators.length; i++) {
        const current = dataWithIndicators[i];
        const prev = dataWithIndicators[i - 1];
        const signals = generateSignals(current, prev, dataWithIndicators[i - 2]);
        
        if (signals.buy) {
            buySignals++;
            if (signals.reasons.length >= 3) strongBuySignals++;
        }
        
        if (signals.sell) {
            sellSignals++;
            if (signals.reasons.length >= 3) strongSellSignals++;
        }
    }
    
    const analysisResult = `
        📊 Analyse des signaux sur ${dataWithIndicators.length - 50} périodes:
        
        🟢 Signaux d'achat: ${buySignals}
        🔴 Signaux de vente: ${sellSignals}
        💪 Signaux d'achat forts: ${strongBuySignals}
        💪 Signaux de vente forts: ${strongSellSignals}
        
        📈 Fréquence des signaux: ${((buySignals + sellSignals) / (dataWithIndicators.length - 50) * 100).toFixed(1)}%
    `;
    
    showStatus(analysisResult, 'info');
}

// Ajout des boutons d'actions supplémentaires
document.addEventListener('DOMContentLoaded', function() {
    // Création des boutons additionnels
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
});

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

// Amélioration de la fonction de validation
function validateMarketData(data) {
    const issues = [];
    
    // Vérification des gaps de prix importants
    for (let i = 1; i < data.length; i++) {
        const prevClose = data[i - 1].close;
        const currentOpen = data[i].open;
        const gap = Math.abs(currentOpen - prevClose) / prevClose;
        
        if (gap > 0.1) { // Gap > 10%
            issues.push(`Gap de prix important détecté à ${new Date(data[i].timestamp).toLocaleString()}: ${(gap * 100).toFixed(1)}%`);
        }
    }
    
    // Vérification des volumes anormaux
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    
    for (let i = 0; i < data.length; i++) {
        if (data[i].volume > avgVolume * 10) {
            issues.push(`Volume anormalement élevé détecté à ${new Date(data[i].timestamp).toLocaleString()}`);
        }
    }
    
    // Vérification de la cohérence OHLC
    for (let i = 0; i < data.length; i++) {
        const { open, high, low, close } = data[i];
        if (high < Math.max(open, close) || low > Math.min(open, close)) {
            issues.push(`Données OHLC incohérentes à ${new Date(data[i].timestamp).toLocaleString()}`);
        }
    }
    
    return issues;
}

// Fonction pour afficher les statistiques des données
function showDataStatistics() {
    if (csvData.length === 0) {
        showStatus('Aucune donnée chargée', 'error');
        return;
    }
    
    const prices = csvData.map(d => d.close);
    const volumes = csvData.map(d => d.volume);
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    
    const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
    
    const stats = `
        📊 Statistiques des données:
        
        💰 Prix min: ${formatCurrency(minPrice)}
        💰 Prix max: ${formatCurrency(maxPrice)}
        💰 Prix moyen: ${formatCurrency(avgPrice)}
        📈 Variation totale: ${formatPercent(priceChange)}
        📊 Volume moyen: ${avgVolume.toLocaleString()}
        📅 Période: ${new Date(csvData[0].timestamp).toLocaleDateString()} - ${new Date(csvData[csvData.length - 1].timestamp).toLocaleDateString()}
    `;
    
    showStatus(stats, 'info');
}

// Ajout des fonctions de gestion des erreurs
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

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    showStatus('Bot de trading crypto prêt! Chargez un fichier CSV pour commencer.', 'info');
    
    // Ajout des tooltips et aide contextuelle
    addTooltips();
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