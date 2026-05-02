const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ---------- C Process Management ----------

let cProcess = null;
let requestQueue = [];
let isProcessing = false;
let isReady = false;

function startCProcess() {
  const binaryPath = path.join(__dirname, '..', 'c-backend', 'kdtree_server.exe');

  console.log(`[Server] Spawning C process: ${binaryPath}`);
  cProcess = spawn(binaryPath, [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';

  cProcess.stdout.on('data', (data) => {
    buffer += data.toString();

    // Process complete JSON lines
    let lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const json = JSON.parse(trimmed);

        // Handle the initial "ready" signal
        if (json.status === 'ready' && !isReady) {
          isReady = true;
          console.log('[Server] C process is ready');
          continue;
        }

        // Resolve the current pending request
        if (requestQueue.length > 0) {
          const { resolve } = requestQueue.shift();
          resolve(json);
          isProcessing = false;
          processNext();
        }
      } catch (e) {
        console.error('[Server] Failed to parse C output:', trimmed);
      }
    }
  });

  cProcess.stderr.on('data', (data) => {
    console.error('[C Process Error]', data.toString());
  });

  cProcess.on('close', (code) => {
    console.log(`[Server] C process exited with code ${code}`);
    isReady = false;

    // Reject all pending requests
    while (requestQueue.length > 0) {
      const { reject } = requestQueue.shift();
      reject(new Error('C process terminated'));
    }

    // Restart after a delay
    setTimeout(() => {
      console.log('[Server] Restarting C process...');
      startCProcess();
    }, 1000);
  });
}

function sendCommand(command) {
  return new Promise((resolve, reject) => {
    if (!cProcess || !isReady) {
      reject(new Error('C process not ready'));
      return;
    }

    requestQueue.push({ command, resolve, reject });
    processNext();
  });
}

function processNext() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  const { command } = requestQueue[0];

  try {
    cProcess.stdin.write(command + '\n');
  } catch (e) {
    const { reject } = requestQueue.shift();
    reject(e);
    isProcessing = false;
    processNext();
  }
}

// ---------- API Endpoints ----------

// GET /api/drivers — List all drivers
app.get('/api/drivers', async (req, res) => {
  try {
    const result = await sendCommand('LIST');
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/drivers — Add a driver { point: [x, y] }
app.post('/api/drivers', async (req, res) => {
  try {
    const { point } = req.body;
    if (!point || point.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'point array [x, y] is required' });
    }
    const [x, y] = point;
    const result = await sendCommand(`ADD|${x}|${y}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// POST /api/remove-driver — Remove a driver by location { point: [x, y] }
app.post('/api/remove-driver', async (req, res) => {
  try {
    const { point } = req.body;
    if (!point || point.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'point array [x, y] is required' });
    }
    const [x, y] = point;
    const result = await sendCommand(`REMOVE|${x}|${y}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// POST /api/find — Find nearest driver { point: [x, y] }
app.post('/api/find', async (req, res) => {
  try {
    const { point } = req.body;
    if (!point || point.length !== 2) {
      return res.status(400).json({ status: 'error', message: 'point array [x, y] is required' });
    }
    const [x, y] = point;
    const result = await sendCommand(`FIND|${x}|${y}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});



// POST /api/range — Find drivers in radius { point: [x, y], radius }
app.post('/api/range', async (req, res) => {
  try {
    const { point, radius } = req.body;
    if (!point || point.length !== 2 || radius === undefined) {
      return res.status(400).json({ status: 'error', message: 'point array [x, y] and radius are required' });
    }
    const [x, y] = point;
    const result = await sendCommand(`RANGE|${x}|${y}|${radius}`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// POST /api/clear — Clear all drivers
app.post('/api/clear', async (req, res) => {
  try {
    const result = await sendCommand('CLEAR');
    res.json(result);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cProcessReady: isReady });
});

// ---------- Start ----------

startCProcess();

app.listen(PORT, () => {
  console.log(`[Server] API running on http://localhost:${PORT}`);
});
