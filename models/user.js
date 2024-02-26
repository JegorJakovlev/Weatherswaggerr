const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('WeatherDB', 'WeatherDB', 'WeatherDB', {
  host: 'localhost',
  dialect: 'mysql'
});

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
});


sequelize.sync()
  .then(() => {
    console.log('Модель пользователя синхронизирована с базой данных');
  })
  .catch(err => {
    console.error('Ошибка синхронизации модели пользователя:', err);
  });


module.exports = User;
