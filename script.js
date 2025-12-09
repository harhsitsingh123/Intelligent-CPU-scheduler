import { algorithms, compareAlgorithms } from './algorithms.js';

// State
let processes = [];
let nextId = 1;

// DOM Elements
const processForm = document.getElementById('process-form');
const arrivalInput = document.getElementById('arrival-time');
const burstInput = document.getElementById('burst-time');
const priorityInput = document.getElementById('priority');
const processTableBody = document.querySelector('#process-table tbody');
const algorithmSelect = document.getElementById('algorithm-select');
const quantumGroup = document.getElementById('quantum-group');
const quantumInput = document.getElementById('time-quantum');
const simulateBtn = document.getElementById('simulate-btn');
const compareBtn = document.getElementById('compare-btn');
const resetBtn = document.getElementById('reset-btn');
const resultsSection = document.getElementById('results-section');
const comparisonSection = document.getElementById('comparison-section');
const algorithmNameDisplay = document.getElementById('algorithm-name');
const ganttChart = document.getElementById('gantt-chart');
const timeRuler = document.getElementById('time-ruler');
const statsTableBody = document.querySelector('#stats-table tbody');
const avgTatDisplay = document.getElementById('avg-tat');
const avgWtDisplay = document.getElementById('avg-wt');
const comparisonTableBody = document.querySelector('#comparison-table tbody');
const recommendationBanner = document.getElementById('recommendation-banner');

// Event Listeners
processForm.addEventListener('submit', addProcess);
algorithmSelect.addEventListener('change', toggleQuantumInput);
simulateBtn.addEventListener('click', runSimulation);
compareBtn.addEventListener('click', runComparison);
resetBtn.addEventListener('click', resetAll);

// Functions
function addProcess(e) {
    e.preventDefault();

    const arrival = parseInt(arrivalInput.value);
    const burst = parseInt(burstInput.value);
    const priority = parseInt(priorityInput.value);

    const process = {
        id: nextId++,
        arrivalTime: arrival,
        burstTime: burst,
        priority: priority
    };

    processes.push(process);
    renderProcessTable();
    processForm.reset();
    arrivalInput.focus();
}

function renderProcessTable() {
    processTableBody.innerHTML = '';
    processes.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P${p.id}</td>
            <td>${p.arrivalTime}</td>
            <td>${p.burstTime}</td>
            <td>${p.priority}</td>
            <td><button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="removeProcess(${p.id})">Delete</button></td>
        `;
        processTableBody.appendChild(row);
    });
}

// Expose removeProcess to global scope for inline onclick
window.removeProcess = (id) => {
    processes = processes.filter(p => p.id !== id);
    renderProcessTable();
};

function toggleQuantumInput() {
    if (algorithmSelect.value === 'RR') {
        quantumGroup.style.display = 'block';
    } else {
        quantumGroup.style.display = 'none';
    }
}

function runSimulation() {
    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }

    const algoName = algorithmSelect.value;
    const quantum = parseInt(quantumInput.value);

    // Deep copy processes to avoid mutation issues between runs
    const processesCopy = JSON.parse(JSON.stringify(processes));

    let result;
    try {
        result = algorithms[algoName](processesCopy, quantum);
    } catch (error) {
        console.error(error);
        alert('An error occurred during simulation.');
        return;
    }

    displayResults(result, algoName);
}

function displayResults({ schedule, solvedProcesses }, algoName) {
    resultsSection.classList.remove('hidden');
    comparisonSection.classList.add('hidden');
    algorithmNameDisplay.textContent = algoName;

    // Render Gantt Chart
    renderGanttChart(schedule);

    // Render Stats
    renderStats(solvedProcesses);
}

function renderGanttChart(schedule) {
    ganttChart.innerHTML = '';
    timeRuler.innerHTML = '';

    if (schedule.length === 0) return;

    const totalDuration = schedule[schedule.length - 1].end;

    schedule.forEach(block => {
        const widthPercent = (block.duration / totalDuration) * 100;
        const div = document.createElement('div');
        div.className = 'gantt-block';
        div.style.width = `${widthPercent}%`;

        if (block.type === 'idle') {
            div.style.backgroundColor = '#334155'; // Dark grey for idle
            div.textContent = 'Idle';
            div.dataset.tooltip = `Idle: ${block.start} - ${block.end}`;
        } else {
            // Generate color based on process ID
            const hue = (block.processId * 137.508) % 360; // Golden angle approximation
            div.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
            div.textContent = `P${block.processId}`;
            div.dataset.tooltip = `P${block.processId}: ${block.start} - ${block.end}`;
        }

        ganttChart.appendChild(div);
    });

    // Simple time ruler (Start and End)
    const startSpan = document.createElement('span');
    startSpan.textContent = '0';
    timeRuler.appendChild(startSpan);

    const endSpan = document.createElement('span');
    endSpan.textContent = totalDuration;
    timeRuler.appendChild(endSpan);
}

function renderStats(solvedProcesses) {
    statsTableBody.innerHTML = '';
    let totalTat = 0;
    let totalWt = 0;

    solvedProcesses.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P${p.id}</td>
            <td>${p.completionTime}</td>
            <td>${p.turnaroundTime}</td>
            <td>${p.waitingTime}</td>
        `;
        statsTableBody.appendChild(row);

        totalTat += p.turnaroundTime;
        totalWt += p.waitingTime;
    });

    avgTatDisplay.textContent = (totalTat / solvedProcesses.length).toFixed(2);
    avgWtDisplay.textContent = (totalWt / solvedProcesses.length).toFixed(2);
}

function runComparison() {
    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }

    const quantum = parseInt(quantumInput.value);
    // Deep copy for comparison
    const processesCopy = JSON.parse(JSON.stringify(processes));

    const results = compareAlgorithms(processesCopy, quantum);

    displayComparison(results);
}

function displayComparison(results) {
    resultsSection.classList.add('hidden');
    comparisonSection.classList.remove('hidden');
    comparisonTableBody.innerHTML = '';

    const bestAlgo = results[0];
    recommendationBanner.innerHTML = `
        <p>Recommended Algorithm</p>
        <div style="font-size: 2rem; margin-top: 0.5rem;">${bestAlgo.name}</div>
        <p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.8;">Lowest Average Turnaround Time: ${bestAlgo.avgTat.toFixed(2)}</p>
    `;

    results.forEach(res => {
        const row = document.createElement('tr');
        if (res.name === bestAlgo.name) {
            row.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'; // Light green highlight
        }
        row.innerHTML = `
            <td style="font-weight: 600;">${res.name}</td>
            <td>${res.avgTat.toFixed(2)}</td>
            <td>${res.avgWt.toFixed(2)}</td>
        `;
        comparisonTableBody.appendChild(row);
    });
}

function resetAll() {
    processes = [];
    nextId = 1;
    renderProcessTable();
    resultsSection.classList.add('hidden');
    comparisonSection.classList.add('hidden');
    processForm.reset();
}
