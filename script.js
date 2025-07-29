let socket;

const seatMonitor = {
    trains: []
};

function initializeTrains() {
    seatMonitor.trains = [
        {
            id: 'train-001',
            name: 'Train A',
            cars: [
                { id: 'car-1', name: 'Car 1', seats: generateSeats(10) },
                { id: 'car-2', name: 'Car 2', seats: generateSeats(10) }
            ]
        }
    ];
}

function generateSeats(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: `seat-${i + 1}`,
        number: i + 1,
        status: Math.random() > 0.6 ? 'taken' : 'empty'
    }));
}

function renderTrains() {
    const container = document.getElementById('trainsContainer');
    container.innerHTML = '';
    seatMonitor.trains.forEach(train => {
        const trainStats = getTrainStatistics(train);
        const trainDiv = document.createElement('div');
        trainDiv.className = 'train-container';

        // Correctly assign innerHTML using variables defined here
        const headerHTML = `
            <div class="train-header">
                <div class="train-name">${train.name}</div>
                <div class="train-stats">
                    <div class="train-stat">Total: ${trainStats.total}</div>
                    <div class="train-stat">Available: ${trainStats.available}</div>
                    <div class="train-stat">Occupied: ${trainStats.occupied}</div>
                    <div class="train-stat">Rate: ${trainStats.rate}%</div>
                    <button class="close-door-btn" onclick="sendCloseDoor('${train.id}')">🚪 Close Door</button>
                </div>
            </div>
        `;

        const carsHTML = `
            <div class="train-layout">
                <div class="car-grid">
                    ${train.cars.map(renderCar).join('')}
                </div>
            </div>
        `;

        trainDiv.innerHTML = headerHTML + carsHTML;
        container.appendChild(trainDiv);
    });
}

function renderCar(car) {
    const seatRows = organizeSeatRows(car.seats);
    return `
        <div class="car">
            <div class="car-header">${car.name}</div>
            <div class="seats-container">
                <div class="seat-section">
                    ${seatRows.left.map(row => `
                        <div class="seat-row">
                            ${row.map(seat => `
                                <div class="seat ${seat.status}" 
                                        data-seat-id="${seat.id}" 
                                        onclick="toggleSeat('${seat.id}')">
                                    ${seat.number}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <div class="aisle">AISLE</div>
                <div class="seat-section">
                    ${seatRows.right.map(row => `
                        <div class="seat-row">
                            ${row.map(seat => `
                                <div class="seat ${seat.status}" 
                                        data-seat-id="${seat.id}" 
                                        onclick="toggleSeat('${seat.id}')">
                                    ${seat.number}
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function organizeSeatRows(seats) {
    const left = [];
    const right = [];
    for (let i = 0; i < seats.length; i += 2) {
        const row = seats.slice(i, i + 2);
        left.push([row[0]]);
        right.push([row[1]]);
    }
    return { left, right };
}

function getTrainStatistics(train) {
    const allSeats = train.cars.flatMap(car => car.seats);
    const total = allSeats.length;
    const occupied = allSeats.filter(seat => seat && seat.status === 'taken').length;
    const available = total - occupied;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, available, occupied, rate };
}

function updateStatistics() {
    const allSeats = seatMonitor.trains.flatMap(train =>
        train.cars.flatMap(car => car.seats)
    );
    const total = allSeats.length;
    const occupied = allSeats.filter(seat => seat && seat.status === 'taken').length;
    const available = total - occupied;
    const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    document.getElementById('totalSeats').textContent = total;
    document.getElementById('availableSeats').textContent = available;
    document.getElementById('occupiedSeats').textContent = occupied;
    document.getElementById('occupancyRate').textContent = rate + '%';
}

function toggleSeat(seatId) {
    seatMonitor.trains.forEach(train => {
        train.cars.forEach(car => {
            const seat = car.seats.find(s => s && s.id === seatId);
            if (seat) {
                seat.status = seat.status === 'empty' ? 'taken' : 'empty';
            }
        });
    });
    renderTrains();
    updateStatistics();
}

function simulateDataUpdate() {
    seatMonitor.trains.forEach(train => {
        train.cars.forEach(car => {
            car.seats.forEach(seat => {
                if (Math.random() > 0.95) {
                    seat.status = seat.status === 'empty' ? 'taken' : 'empty';
                }
            });
        });
    });
    renderTrains();
    updateStatistics();
}

function initializeWebSocket() {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('[WebSocket OPEN] Connected to server');
    };

    socket.onmessage = (event) => {
        console.log('[WebSocket INCOMING]', event.data);

        const message = JSON.parse(event.data);
        if (message.type === 'seatUpdate') {
            seatMonitor = message.data;
            renderTrains();
        }
    };

    socket.onclose = () => {
        console.log('[WebSocket CLOSED] Connection closed');
    };

    socket.onerror = (error) => {
        console.error('[WebSocket ERROR]', error);
    };
}


function handleWebSocketMessage(data) {
    seatMonitor.trains.forEach(train => {
        train.cars.forEach(car => {
            const seat = car.seats.find(s => s.id === data.seatId);
            if (seat) {
                seat.status = data.status;
            }
        });
    });
    renderTrains();
    updateStatistics();
}

function sendCloseDoor(trainId) {
    const message = {
        type: 'closeDoor',
        trainId: trainId
    };
    const json = JSON.stringify(message);
    console.log('[WebSocket OUTGOING]', json);
    socket.send(json);
}


// Initialize app
initializeTrains();
renderTrains();
updateStatistics();
initializeWebSocket();
