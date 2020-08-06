const pkg = require('../package.json')
const databaseName = pkg.name + (process.env.NODE_ENV === 'test' ? '-test' : '')

const Sequelize = require('sequelize')
const sequelize = new Sequelize(
  process.env.DATABASE_URL || `postgres://localhost:5432/${databaseName}`,
  {
    logging: false
  }
)

const User = sequelize.define(
  'user',
  {
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
    login: {
      type: Sequelize.STRING,
      allowNull: false
    },
    chips: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  },
  {
    // options
  }
)

module.exports = { User, sequelize }
