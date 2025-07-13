// metrics.js - Calcul des métriques de performance

/**
 * Calcul des métriques de performance
 * @param {Object} botResults - Résultats du bot de trading
 * @param {Object} holdResults - Résultats du Buy & Hold
 * @param {Object} config - Configuration du backtest
 * @returns {Object} Métriques de performance
 */
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

/**
 * Calcul des rendements journaliers
 * @param {Array} equity - Courbe d'équité
 * @returns {Array} Rendements journaliers
 */
function calculateDailyReturns(equity) {
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
        const dailyReturn = (equity[i].value - equity[i - 1].value) / equity[i - 1].value;
        returns.push(dailyReturn);
    }
    return returns;
}

/**
 * Calcul du Sharpe Ratio
 * @param {Array} returns - Rendements journaliers
 * @returns {number} Sharpe Ratio annualisé
 */
function calculateSharpeRatio(returns) {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(252); // Annualisé
}

/**
 * Calcul du Maximum Drawdown
 * @param {Array} equity - Courbe d'équité
 * @returns {number} Maximum Drawdown en pourcentage
 */
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

/**
 * Calcul de la volatilité
 * @param {Array} returns - Rendements journaliers
 * @returns {number} Volatilité annualisée en pourcentage
 */
function calculateVolatility(returns) {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualisé en %
}

/**
 * Calcul des métriques avancées
 * @param {Object} botResults - Résultats du bot
 * @param {Object} config - Configuration
 * @returns {Object} Métriques avancées
 */
function calculateAdvancedMetrics(botResults, config) {
    const trades = botResults.trades;
    const equity = botResults.equity;
    
    // Calcul du profit factor
    const profitFactor = calculateProfitFactor(trades);
    
    // Calcul du recovery factor
    const recoveryFactor = calculateRecoveryFactor(botResults, config);
    
    // Calcul du Calmar Ratio
    const calmarRatio = calculateCalmarRatio(botResults, config);
    
    // Statistiques des trades
    const tradeStats = calculateTradeStatistics(trades);
    
    return {
        profitFactor,
        recoveryFactor,
        calmarRatio,
        ...tradeStats
    };
}

/**
 * Calcul du Profit Factor
 * @param {Array} trades - Liste des trades
 * @returns {number} Profit Factor
 */
function calculateProfitFactor(trades) {
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    return grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;
}

/**
 * Calcul du Recovery Factor
 * @param {Object} botResults - Résultats du bot
 * @param {Object} config - Configuration
 * @returns {number} Recovery Factor
 */
function calculateRecoveryFactor(botResults, config) {
    const totalReturn = botResults.finalValue - config.initialCapital;
    const maxDrawdown = calculateMaxDrawdown(botResults.equity);
    
    return maxDrawdown === 0 ? (totalReturn > 0 ? Infinity : 0) : (totalReturn / config.initialCapital) / (maxDrawdown / 100);
}

/**
 * Calcul du Calmar Ratio
 * @param {Object} botResults - Résultats du bot
 * @param {Object} config - Configuration
 * @returns {number} Calmar Ratio
 */
function calculateCalmarRatio(botResults, config) {
    const annualizedReturn = ((botResults.finalValue / config.initialCapital) ** (365 / (botResults.equity.length || 1)) - 1) * 100;
    const maxDrawdown = calculateMaxDrawdown(botResults.equity);
    
    return maxDrawdown === 0 ? (annualizedReturn > 0 ? Infinity : 0) : annualizedReturn / maxDrawdown;
}

/**
 * Calcul des statistiques des trades
 * @param {Array} trades - Liste des trades
 * @returns {Object} Statistiques des trades
 */
function calculateTradeStatistics(trades) {
    if (trades.length === 0) {
        return {
            avgTrade: 0,
            avgWinningTrade: 0,
            avgLosingTrade: 0,
            largestWin: 0,
            largestLoss: 0,
            consecutiveWins: 0,
            consecutiveLosses: 0
        };
    }
    
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const avgTrade = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length;
    const avgWinningTrade = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLosingTrade = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
    
    // Calcul des séries consécutives
    const { consecutiveWins, consecutiveLosses } = calculateConsecutiveTrades(trades);
    
    return {
        avgTrade,
        avgWinningTrade,
        avgLosingTrade,
        largestWin,
        largestLoss,
        consecutiveWins,
        consecutiveLosses
    };
}

/**
 * Calcul des séries consécutives de gains/pertes
 * @param {Array} trades - Liste des trades
 * @returns {Object} Séries consécutives
 */
function calculateConsecutiveTrades(trades) {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;
    
    for (const trade of trades) {
        if (trade.pnl > 0) {
            currentWins++;
            currentLosses = 0;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
        } else if (trade.pnl < 0) {
            currentLosses++;
            currentWins = 0;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
        }
    }
    
    return {
        consecutiveWins: maxConsecutiveWins,
        consecutiveLosses: maxConsecutiveLosses
    };
}