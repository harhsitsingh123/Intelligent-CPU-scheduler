// algorithms.js

export const algorithms = {
    FCFS: (processes) => {
        let currentTime = 0;
        const schedule = [];
        const solvedProcesses = [];
        
        // Sort by arrival time
        const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

        sortedProcesses.forEach(process => {
            if (currentTime < process.arrivalTime) {
                schedule.push({ type: 'idle', start: currentTime, end: process.arrivalTime, duration: process.arrivalTime - currentTime });
                currentTime = process.arrivalTime;
            }

            const startTime = currentTime;
            const completionTime = startTime + process.burstTime;
            
            schedule.push({
                type: 'process',
                processId: process.id,
                start: startTime,
                end: completionTime,
                duration: process.burstTime
            });

            solvedProcesses.push({
                ...process,
                completionTime,
                turnaroundTime: completionTime - process.arrivalTime,
                waitingTime: completionTime - process.arrivalTime - process.burstTime
            });

            currentTime = completionTime;
        });

        return { schedule, solvedProcesses };
    },

    SJF: (processes) => {
        // Non-preemptive SJF
        let currentTime = 0;
        let completed = 0;
        const schedule = [];
        const solvedProcesses = [];
        const n = processes.length;
        const remainingProcesses = processes.map(p => ({ ...p, isCompleted: false }));

        while (completed < n) {
            // Find available processes
            const available = remainingProcesses.filter(p => !p.isCompleted && p.arrivalTime <= currentTime);

            if (available.length === 0) {
                // Move time to next arrival
                const nextArrival = Math.min(...remainingProcesses.filter(p => !p.isCompleted).map(p => p.arrivalTime));
                schedule.push({ type: 'idle', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
                currentTime = nextArrival;
                continue;
            }

            // Select process with shortest burst time
            const selected = available.sort((a, b) => a.burstTime - b.burstTime)[0];

            const startTime = currentTime;
            const completionTime = startTime + selected.burstTime;

            schedule.push({
                type: 'process',
                processId: selected.id,
                start: startTime,
                end: completionTime,
                duration: selected.burstTime
            });

            selected.isCompleted = true;
            selected.completionTime = completionTime;
            selected.turnaroundTime = completionTime - selected.arrivalTime;
            selected.waitingTime = completionTime - selected.arrivalTime - selected.burstTime;
            
            solvedProcesses.push(selected);
            completed++;
            currentTime = completionTime;
        }

        return { schedule, solvedProcesses: solvedProcesses.sort((a, b) => a.id - b.id) };
    },

    SRTF: (processes) => {
        // Preemptive SJF
        let currentTime = 0;
        let completed = 0;
        const schedule = [];
        const n = processes.length;
        // Deep copy to track remaining time
        const procState = processes.map(p => ({ ...p, remainingTime: p.burstTime, isCompleted: false }));
        
        let lastProcessId = -1;

        while (completed < n) {
            const available = procState.filter(p => !p.isCompleted && p.arrivalTime <= currentTime);

            if (available.length === 0) {
                const nextArrival = Math.min(...procState.filter(p => !p.isCompleted).map(p => p.arrivalTime));
                if (currentTime < nextArrival) {
                    schedule.push({ type: 'idle', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
                }
                currentTime = nextArrival;
                continue;
            }

            // Select process with shortest remaining time
            const selected = available.sort((a, b) => a.remainingTime - b.remainingTime)[0];

            if (lastProcessId !== selected.id) {
                // New block in Gantt chart
                schedule.push({
                    type: 'process',
                    processId: selected.id,
                    start: currentTime,
                    end: currentTime + 1, // Placeholder, will update
                    duration: 0
                });
                lastProcessId = selected.id;
            }

            // Execute for 1 unit
            selected.remainingTime--;
            currentTime++;
            
            // Update last schedule block
            const lastBlock = schedule[schedule.length - 1];
            lastBlock.end = currentTime;
            lastBlock.duration++;

            if (selected.remainingTime === 0) {
                selected.isCompleted = true;
                selected.completionTime = currentTime;
                selected.turnaroundTime = currentTime - selected.arrivalTime;
                selected.waitingTime = currentTime - selected.arrivalTime - selected.burstTime;
                completed++;
            }
        }

        return { schedule, solvedProcesses: procState.sort((a, b) => a.id - b.id) };
    },

    RR: (processes, quantum) => {
        let currentTime = 0;
        const schedule = [];
        const n = processes.length;
        // Queue for Round Robin
        const queue = [];
        const procState = processes.map(p => ({ ...p, remainingTime: p.burstTime, inQueue: false }));
        
        // Add initial processes
        procState.filter(p => p.arrivalTime <= currentTime).forEach(p => {
            queue.push(p);
            p.inQueue = true;
        });

        let completed = 0;

        while (completed < n) {
            if (queue.length === 0) {
                const remaining = procState.filter(p => p.remainingTime > 0);
                if (remaining.length > 0) {
                    const nextArrival = Math.min(...remaining.map(p => p.arrivalTime));
                    schedule.push({ type: 'idle', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
                    currentTime = nextArrival;
                    
                    procState.filter(p => p.arrivalTime <= currentTime && !p.inQueue && p.remainingTime > 0).forEach(p => {
                        queue.push(p);
                        p.inQueue = true;
                    });
                } else {
                    break; 
                }
            }

            const currentProc = queue.shift();
            const executeTime = Math.min(quantum, currentProc.remainingTime);

            schedule.push({
                type: 'process',
                processId: currentProc.id,
                start: currentTime,
                end: currentTime + executeTime,
                duration: executeTime
            });

            currentProc.remainingTime -= executeTime;
            currentTime += executeTime;

            // Check for new arrivals during execution
            procState.filter(p => p.arrivalTime <= currentTime && !p.inQueue && p.remainingTime > 0).forEach(p => {
                queue.push(p);
                p.inQueue = true;
            });

            if (currentProc.remainingTime > 0) {
                queue.push(currentProc);
            } else {
                currentProc.completionTime = currentTime;
                currentProc.turnaroundTime = currentTime - currentProc.arrivalTime;
                currentProc.waitingTime = currentTime - currentProc.arrivalTime - currentProc.burstTime;
                completed++;
            }
        }

        return { schedule, solvedProcesses: procState.sort((a, b) => a.id - b.id) };
    },

    Priority: (processes) => {
        // Non-preemptive Priority (Lower number = Higher priority)
        let currentTime = 0;
        let completed = 0;
        const schedule = [];
        const solvedProcesses = [];
        const n = processes.length;
        const remainingProcesses = processes.map(p => ({ ...p, isCompleted: false }));

        while (completed < n) {
            const available = remainingProcesses.filter(p => !p.isCompleted && p.arrivalTime <= currentTime);

            if (available.length === 0) {
                const nextArrival = Math.min(...remainingProcesses.filter(p => !p.isCompleted).map(p => p.arrivalTime));
                schedule.push({ type: 'idle', start: currentTime, end: nextArrival, duration: nextArrival - currentTime });
                currentTime = nextArrival;
                continue;
            }

            // Select process with highest priority (lowest number)
            const selected = available.sort((a, b) => a.priority - b.priority)[0];

            const startTime = currentTime;
            const completionTime = startTime + selected.burstTime;

            schedule.push({
                type: 'process',
                processId: selected.id,
                start: startTime,
                end: completionTime,
                duration: selected.burstTime
            });

            selected.isCompleted = true;
            selected.completionTime = completionTime;
            selected.turnaroundTime = completionTime - selected.arrivalTime;
            selected.waitingTime = completionTime - selected.arrivalTime - selected.burstTime;
            
            solvedProcesses.push(selected);
            completed++;
            currentTime = completionTime;
        }

        return { schedule, solvedProcesses: solvedProcesses.sort((a, b) => a.id - b.id) };
    }
};

export const compareAlgorithms = (processes, quantum) => {
    const results = [];
    
    // Run all algorithms
    Object.keys(algorithms).forEach(name => {
        const { solvedProcesses } = algorithms[name](processes, quantum);
        const avgTat = solvedProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) / processes.length;
        const avgWt = solvedProcesses.reduce((sum, p) => sum + p.waitingTime, 0) / processes.length;
        
        results.push({
            name,
            avgTat,
            avgWt
        });
    });

    // Sort by efficiency (primary: TAT, secondary: WT)
    results.sort((a, b) => {
        if (Math.abs(a.avgTat - b.avgTat) > 0.01) return a.avgTat - b.avgTat;
        return a.avgWt - b.avgWt;
    });

    return results;
};
