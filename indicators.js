// indicators.js - Indicateurs techniques

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