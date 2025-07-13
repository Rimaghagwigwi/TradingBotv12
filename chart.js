// chart.js - Gestion des graphiques

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
    const chartWidth = canvas.width - 2 * padding;
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