// dataHandler.js - Gestion des données CSV

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

// Validation des données de marché
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