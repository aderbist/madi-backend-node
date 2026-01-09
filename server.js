const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// САМЫЕ ПРОСТЫЕ НАСТРОЙКИ CORS - разрешаем все
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Загрузка расписания
async function loadSchedule(weekType) {
  try {
    const filePath = path.join(__dirname, 'static', `schedule_${weekType}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading schedule:', error);
    return null;
  }
}

// API эндпоинты
app.get('/api/schedule/:weekType', async (req, res) => {
  const { weekType } = req.params;
  const schedule = await loadSchedule(weekType);
  
  if (schedule) {
    res.json(schedule);
  } else {
    res.status(404).json({ error: 'Schedule not found' });
  }
});

app.get('/api/groups', async (req, res) => {
  const numerator = await loadSchedule('numerator');
  const denominator = await loadSchedule('denominator');
  
  const groups = new Set();
  if (numerator) Object.keys(numerator).forEach(g => groups.add(g));
  if (denominator) Object.keys(denominator).forEach(g => groups.add(g));
  
  res.json({ groups: Array.from(groups).sort() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cors: 'enabled', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'MADI Tutor API', 
    cors: 'enabled',
    endpoints: ['/api/schedule/:weekType', '/api/groups', '/api/health']
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with CORS enabled for all origins`);
});