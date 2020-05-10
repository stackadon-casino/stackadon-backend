const Sequelize = require('sequelize');
const sequelize = new Sequelize(`postgres://localhost:5432/stackadon`)

const User = sequelize.define('user', {
  // attributes
  firstName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  lastName: {
    type: Sequelize.STRING
    // allowNull defaults to true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  },
  login:{
    type: Sequelize.STRING,
    allowNull: false
  }
}, {
  // options
});


module.exports = { User, sequelize }
