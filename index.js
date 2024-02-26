const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;
const keys = require('./config/keys');

const connection = mysql.createConnection(keys.mysql);

connection.connect(err => {
  if (err) {
    console.error('Ошибка подключения к базе данных MySQL:', err);
  } else {
    console.log('Подключение к базе данных MySQL успешно');
    createTables(); 
  }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function createTables() {
  const createUsersTableSql = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  )`;

  const createWeatherDataTableSql = `CREATE TABLE IF NOT EXISTS weather_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    date DATE NOT NULL,
    windSpeed DECIMAL(5,2) NOT NULL
  )`;

  connection.query(createUsersTableSql, err => {
    if (err) console.error('Ошибка при создании таблицы пользователей:', err);
    else console.log('Таблица пользователей успешно создана');
  });

  connection.query(createWeatherDataTableSql, err => {
    if (err) console.error('Ошибка при создании таблицы данных о погоде:', err);
    else console.log('Таблица данных о погоде успешно создана');
  });
}

function saveWeatherDataToDB(city, temperature, windSpeed, date) {
  const sql = 'INSERT INTO weather_data (city, temperature, windSpeed, date) VALUES (?, ?, ?, ?)';
  connection.query(sql, [city, temperature, windSpeed, date], (err, result) => {
    if (err) {
      console.error('Ошибка при сохранении данных о погоде:', err);
    } else {
      console.log('Данные о погоде успешно сохранены в базе данных');
    }
  });
}

async function fetchWeatherData(city) {
  const apiKey = '450050a1fa3f5be2c948d55125658cea';
  const apiUrl = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.cod === 200) {
      const temperature = data.main.temp;
      const windSpeed = data.wind.speed;
      const date = new Date().toISOString().slice(0, 10);
      return { temperature, windSpeed, date };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
}

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (password.length < 8) {
    res.status(400).json({ error: 'Пароль должен содержать не менее 8 символов' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  connection.query(sql, [username, email, hashedPassword], (err, result) => {
    if (err) {
      console.error('Ошибка при регистрации пользователя:', err);
      res.status(400).json({ error: 'Ошибка при регистрации пользователя' });
    } else {
      console.log('Пользователь успешно зарегистрирован');
      res.status(200).json({ message: 'Пользователь успешно зарегистрирован' });
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
  connection.query(sql, [email, password], (err, result) => {
    if (err) {
      console.error('Ошибка при входе пользователя:', err);
      res.status(400).json({ error: 'Ошибка при входе пользователя' });
    } else if (result.length === 0) {
      console.log('Неверные учетные данные');
      res.status(401).json({ error: 'Неверные учетные данные' });
    } else {
      console.log('Вход успешно выполнен');
      res.status(200).json({ message: 'Вход успешно выполнен' });
    }
  });
});

app.get('/api/weather', async (req, res) => {
  const { city } = req.query;

  if (!city) {
    res.status(400).json({ error: 'Город не указан в параметрах запроса' });
    return;
  }

  try {
    const weatherData = await fetchWeatherData(city);
    if (weatherData) {
      saveWeatherDataToDB(city, weatherData.temperature, weatherData.windSpeed, weatherData.date);
      console.log('Данные о погоде успешно получены');
      res.status(200).json({ data: weatherData });
    } else {
      res.status(404).json({ error: 'Данные о погоде не найдены' });
    }
  } catch (error) {
    console.error('Ошибка при получении данных о погоде:', error);
    res.status(500).json({ error: 'Ошибка при получении данных о погоде' });
  }
});

app.delete('/api/auth/delete/:email', (req, res) => {
  const { email } = req.params;
  const sql = 'DELETE FROM users WHERE email = ?';
  connection.query(sql, [email], (err, result) => {
    if (err) {
      console.error('Ошибка при удалении учетной записи пользователя:', err);
      res.status(500).json({ error: 'Ошибка при удалении учетной записи пользователя' });
    } else {
      if (result.affectedRows === 0) {
        console.log('Учетная запись пользователя не найдена');
        res.status(404).json({ message: 'Учетная запись пользователя не найдена' });
      } else {
        console.log('Учетная запись пользователя успешно удалена');
        res.status(200).json({ message: 'Учетная запись пользователя успешно удалена' });
      }
    }
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
