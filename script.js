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
    const totalSeats = car.seats.length;
    const occupiedSeats = car.seats.filter(seat => seat.status === 'taken').length;
    const occupancyRate = totalSeats > 0 ? occupiedSeats / totalSeats : 0;

    // HSL interpolation: green (120deg) to red (0deg)
    function interpolateColor(rate) {
        const hue = 120 - 120 * rate; // 120 (green) to 0 (red)
        return `hsl(${hue}, 70%, 60%)`;
    }

    const carBgColor = interpolateColor(occupancyRate);

    const seatRows = organizeSeatRows(car.seats);
    return `
        <div class="car" style="background:${carBgColor}; transition: background 0.5s;">
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

        try {
            const message = JSON.parse(event.data);

            // If message is a seat update (from your server)
            if (message.seatId && message.status) {
                handleWebSocketMessage(message);
            }
            // If message is in your app's format
            else if (message.type === 'seatUpdate' && message.data) {
                seatMonitor = message.data;
                renderTrains();
                updateStatistics();
            }
        } catch (err) {
            console.error('[WebSocket ERROR] Failed to parse message', err);
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

// let mqttClient;

// function initializeMQTT() {
//     // Connect to MQTT broker (change this to your actual broker)
//     mqttClient = mqtt.connect('ws://localhost:9001'); // e.g., Mosquitto WebSocket port

//     mqttClient.on('connect', () => {
//         console.log('[MQTT CONNECTED]');

//         // Subscribe to seat updates
//         mqttClient.subscribe('train/seats/update', (err) => {
//             if (err) console.error('[MQTT SUBSCRIBE ERROR]', err);
//             else console.log('[MQTT SUBSCRIBED] train/seats/update');
//         });
//     });

//     mqttClient.on('message', (topic, message) => {
//         console.log(`[MQTT INCOMING] Topic: ${topic}`, message.toString());

//         try {
//             const data = JSON.parse(message.toString());

//             if (topic === 'train/seats/update' && data.seatId && data.status) {
//                 handleWebSocketMessage(data); // reuse same handler
//             }
//         } catch (err) {
//             console.error('[MQTT ERROR] Failed to parse', err);
//         }
//     });

//     mqttClient.on('error', (err) => {
//         console.error('[MQTT ERROR]', err);
//     });

//     mqttClient.on('close', () => {
//         console.log('[MQTT DISCONNECTED]');
//     });
// }

// function sendCloseDoor(trainId) {
//     const message = {
//         type: 'closeDoor',
//         trainId: trainId
//     };
//     const json = JSON.stringify(message);
//     console.log('[MQTT OUTGOING]', json);

//     mqttClient.publish('train/door/control', json);
// }

// initializeMQTT();



// Initialize app
initializeTrains();
renderTrains();
updateStatistics();
initializeWebSocket();
