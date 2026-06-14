/* ============================================
   Elite Tutorial — Analytics JS
============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is authenticated
    if (!window.EliteAuth || !window.getSupabaseClient) {
        console.error('Supabase not initialized');
        return;
    }

    const client = window.getSupabaseClient();
    let session = null;

    try {
        const { data } = await client.auth.getSession();
        session = data.session;
    } catch (e) {
        console.error('Auth error:', e);
    }

    if (!session || !session.user) {
        window.location.href = '../auth/login.html';
        return;
    }

    const userId = session.user.id;
    fetchAndRenderAnalytics(client, userId);
});

async function fetchAndRenderAnalytics(client, userId) {
    try {
        // Fetch User Exam Attempts
        const { data: attempts, error } = await client
            .from('user_exam_attempts')
            .select('score, total_q, exam_title, subject, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }); // Chronological for charts

        if (error) throw error;

        if (!attempts || attempts.length === 0) {
            document.getElementById('recent-exams-body').innerHTML = `<tr><td colspan="5" style="text-align: center;">No exams taken yet.</td></tr>`;
            return;
        }

        // Process data for KPIs and Charts
        let totalExams = attempts.length;
        let totalScorePct = 0;
        let highestScorePct = 0;
        
        const dates = [];
        const scoreHistory = [];
        const subjectPerformance = {}; // { 'Math': { totalPct: 0, count: 0 } }
        
        const recentExamsHTML = [];

        // Loop through all attempts
        attempts.forEach((attempt, index) => {
            const pct = Math.round((attempt.score / attempt.total_q) * 100);
            totalScorePct += pct;
            if (pct > highestScorePct) highestScorePct = pct;

            // Prepare Line Chart Data
            const dateStr = new Date(attempt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dates.push(`Exam ${index + 1} (${dateStr})`);
            scoreHistory.push(pct);

            // Prepare Bar Chart Data (by subject)
            const subj = attempt.subject || 'General';
            if (!subjectPerformance[subj]) subjectPerformance[subj] = { totalPct: 0, count: 0 };
            subjectPerformance[subj].totalPct += pct;
            subjectPerformance[subj].count += 1;

            // Prepare Table Data (Reverse order for table so newest is first)
            let badgeClass = 'score-low';
            if (pct >= 75) badgeClass = 'score-high';
            else if (pct >= 50) badgeClass = 'score-medium';

            const rowHTML = `
                <tr>
                    <td>${new Date(attempt.created_at).toLocaleDateString()}</td>
                    <td>${attempt.exam_title || 'Untitled Exam'}</td>
                    <td>${subj}</td>
                    <td>${attempt.score} / ${attempt.total_q}</td>
                    <td><span class="score-badge ${badgeClass}">${pct}%</span></td>
                </tr>
            `;
            recentExamsHTML.unshift(rowHTML); // Add to top
        });

        // Update KPIs
        const avgScore = Math.round(totalScorePct / totalExams);
        document.getElementById('kpi-total-exams').textContent = totalExams;
        document.getElementById('kpi-avg-score').textContent = avgScore + '%';
        document.getElementById('kpi-highest-score').textContent = highestScorePct + '%';

        // Update Table
        // Show only last 10
        document.getElementById('recent-exams-body').innerHTML = recentExamsHTML.slice(0, 10).join('');

        // Prepare Subject Bar Chart Data
        const subjLabels = Object.keys(subjectPerformance);
        const subjData = subjLabels.map(s => Math.round(subjectPerformance[s].totalPct / subjectPerformance[s].count));

        // Render Charts
        renderCharts(dates, scoreHistory, subjLabels, subjData);

    } catch (err) {
        console.error('Error fetching analytics:', err);
        document.getElementById('recent-exams-body').innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff7070;">Failed to load data.</td></tr>`;
    }
}

function renderCharts(dates, scoreHistory, subjLabels, subjData) {
    // Global Chart.js styling for Dark Mode
    Chart.defaults.color = '#888888';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.plugins.tooltip.backgroundColor = '#1e1e1e';
    Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    
    // 1. Line Chart (Progress)
    const ctxLine = document.getElementById('progressLineChart').getContext('2d');
    
    // Gradient for line
    const gradientLine = ctxLine.createLinearGradient(0, 0, 0, 300);
    gradientLine.addColorStop(0, 'rgba(224, 28, 28, 0.4)');
    gradientLine.addColorStop(1, 'rgba(224, 28, 28, 0.0)');

    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Score Percentage',
                data: scoreHistory,
                borderColor: '#e01c1c',
                backgroundColor: gradientLine,
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#141414',
                pointBorderColor: '#e01c1c',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { callback: function(value) { return value + '%'; } }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 2. Bar Chart (By Subject)
    const ctxBar = document.getElementById('subjectBarChart').getContext('2d');
    
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: subjLabels,
            datasets: [{
                label: 'Average Score',
                data: subjData,
                backgroundColor: 'rgba(224, 28, 28, 0.8)',
                hoverBackgroundColor: '#ff2d2d',
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { callback: function(value) { return value + '%'; } }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}
