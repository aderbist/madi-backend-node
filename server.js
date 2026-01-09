const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// ==================== УЛЬТРА-ПРОСТОЙ CORS ====================
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Если это OPTIONS запрос, сразу отвечаем
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadSchedule(weekType) {
  try {
    const filePath = path.join(__dirname, 'static', `schedule_${weekType}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading schedule:', error.message);
    return null;
  }
}

async function getAllGroups() {
  try {
    const numerator = await loadSchedule('numerator');
    const denominator = await loadSchedule('denominator');
    
    const groups = new Set();
    if (numerator) Object.keys(numerator).forEach(g => groups.add(g));
    if (denominator) Object.keys(denominator).forEach(g => groups.add(g));
    
    return Array.from(groups).sort();
  } catch (error) {
    console.error('Error getting groups:', error.message);
    return [];
  }
}

// ==================== API ЭНДПОИНТЫ ====================
app.get('/api/schedule/:weekType', async (req, res) => {
  try {
    const { weekType } = req.params;
    
    // Валидация
    if (!['numerator', 'denominator'].includes(weekType)) {
      return res.status(400).json({ error: 'Invalid week type' });
    }
    
    const schedule = await loadSchedule(weekType);
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json({
      success: true,
      data: schedule,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getAllGroups();
    
    res.json({
      success: true,
      groups: groups,
      count: groups.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'MADI Tutor API',
    cors: 'enabled',
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'MADI Tutor Schedule API',
    endpoints: [
      '/api/schedule/numerator',
      '/api/schedule/denominator',
      '/api/groups',
      '/api/health'
    ]
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(PORT, () => {
  console.log(`
  🚀 MADI Tutor API запущен!
  📍 Порт: ${PORT}
  📍 CORS: разрешены ВСЕ домены (*)
  📍 Время: ${new Date().toLocaleString('ru-RU')}
  `);
});