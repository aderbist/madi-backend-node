const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');

// Инициализация Express приложения
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors()); // Разрешаем CORS для всех доменов
app.use(helmet()); // Безопасность HTTP заголовков
app.use(express.json()); // Парсинг JSON
app.use(express.urlencoded({ extended: true })); // Парсинг URL-encoded данных

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Функция для загрузки расписания
async function loadSchedule(weekType) {
  try {
    const validWeekTypes = ['numerator', 'denominator'];
    
    if (!validWeekTypes.includes(weekType)) {
      throw new Error('Неверный тип недели');
    }
    
    const filePath = path.join(__dirname, 'static', `schedule_${weekType}.json`);
    console.log(`Загрузка файла: ${filePath}`);
    
    // Проверяем существование файла
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`Файл не найден: ${filePath}`);
    }
    
    // Читаем и парсим JSON
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка загрузки расписания для ${weekType}:`, error.message);
    return null;
  }
}

// Функция для получения списка всех групп
async function getAllGroups() {
  try {
    const numerator = await loadSchedule('numerator');
    const denominator = await loadSchedule('denominator');
    
    const groups = new Set();
    
    // Добавляем группы из числителя
    if (numerator && typeof numerator === 'object') {
      Object.keys(numerator).forEach(group => groups.add(group));
    }
    
    // Добавляем группы из знаменателя
    if (denominator && typeof denominator === 'object') {
      Object.keys(denominator).forEach(group => groups.add(group));
    }
    
    return Array.from(groups).sort();
  } catch (error) {
    console.error('Ошибка получения списка групп:', error.message);
    return [];
  }
}

// ==================== API ЭНДПОИНТЫ ====================

// 1. Главная страница
app.get('/', (req, res) => {
  res.json({
    message: '🎓 MADI Tutor Schedule API',
    version: '1.0.0',
    description: 'API для расписания занятий МАДИ',
    endpoints: {
      schedule: 'GET /api/schedule/:weekType',
      groups: 'GET /api/groups',
      health: 'GET /api/health',
      docs: 'GET /api/docs'
    },
    example: {
      numerator: '/api/schedule/numerator',
      denominator: '/api/schedule/denominator'
    }
  });
});

// 2. Получить расписание
app.get('/api/schedule/:weekType', async (req, res) => {
  try {
    const { weekType } = req.params;
    
    // Валидация параметра
    if (!['numerator', 'denominator'].includes(weekType)) {
      return res.status(400).json({
        error: 'Неверный тип недели',
        message: 'Используйте: numerator (числитель) или denominator (знаменатель)',
        received: weekType
      });
    }
    
    const schedule = await loadSchedule(weekType);
    
    if (!schedule) {
      return res.status(404).json({
        error: 'Расписание не найдено',
        weekType: weekType,
        message: 'Файл расписания отсутствует или поврежден'
      });
    }
    
    // Успешный ответ
    res.json({
      success: true,
      weekType: weekType,
      data: schedule,
      timestamp: new Date().toISOString(),
      totalGroups: Object.keys(schedule).length
    });
    
  } catch (error) {
    console.error('Ошибка API /api/schedule:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: error.message
    });
  }
});

// 3. Получить все группы
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getAllGroups();
    
    res.json({
      success: true,
      count: groups.length,
      groups: groups,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Ошибка API /api/groups:', error);
    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      message: error.message
    });
  }
});

// 4. Проверка здоровья сервера
app.get('/api/health', async (req, res) => {
  try {
    // Проверяем доступность файлов расписания
    const numeratorExists = await loadSchedule('numerator').then(data => !!data);
    const denominatorExists = await loadSchedule('denominator').then(data => !!data);
    
    res.json({
      status: 'healthy',
      service: 'MADI Schedule API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      scheduleFiles: {
        numerator: numeratorExists ? 'available' : 'missing',
        denominator: denominatorExists ? 'available' : 'missing'
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 5. Документация API
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'MADI Tutor Schedule API Documentation',
    baseUrl: req.protocol + '://' + req.get('host'),
    endpoints: [
      {
        method: 'GET',
        path: '/',
        description: 'Главная страница API',
        example: `${req.protocol}://${req.get('host')}/`
      },
      {
        method: 'GET',
        path: '/api/schedule/:weekType',
        description: 'Получить расписание',
        parameters: [
          {
            name: 'weekType',
            type: 'string',
            required: true,
            values: ['numerator', 'denominator'],
            description: 'Тип недели: числитель или знаменатель'
          }
        ],
        examples: [
          `${req.protocol}://${req.get('host')}/api/schedule/numerator`,
          `${req.protocol}://${req.get('host')}/api/schedule/denominator`
        ]
      },
      {
        method: 'GET',
        path: '/api/groups',
        description: 'Получить список всех групп',
        example: `${req.protocol}://${req.get('host')}/api/groups`
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Проверка здоровья сервера',
        example: `${req.protocol}://${req.get('host')}/api/health`
      }
    ]
  });
});

// 6. Обслуживание статических файлов (если нужно)
app.use('/static', express.static(path.join(__dirname, 'static')));

// 7. Обработка 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    path: req.url,
    method: req.method,
    availableEndpoints: ['/', '/api/schedule/:weekType', '/api/groups', '/api/health', '/api/docs']
  });
});

// 8. Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Произошла ошибка'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`
  🚀 Сервер запущен!
  
  📍 Локальный URL: http://localhost:${PORT}
  📍 Префикс API: http://localhost:${PORT}/api
  
  📋 Доступные эндпоинты:
     • GET  /                 - Главная страница
     • GET  /api/schedule/:weekType - Расписание (numerator/denominator)
     • GET  /api/groups       - Все группы
     • GET  /api/health       - Проверка здоровья
     • GET  /api/docs         - Документация API
     
  ⏰ ${new Date().toLocaleString('ru-RU')}
  `);
});

// Обработка graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM, завершаем работу...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершаем работу...');
  process.exit(0);
});

module.exports = app;