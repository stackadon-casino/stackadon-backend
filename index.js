const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const app = express()
const PORT = 7070
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// const Sequelize = require('sequelize');

const cors = require('cors')
app.use(cors())
const { User, sequelize } = require('./models/user')

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.')
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
  })

User.sync({ force: true }).then(() => {
  // Now the `users` table in the database corresponds to the model definition
  return User.create({
    firstName: 'John',
    lastName: 'Hancock',
    login: 'example',
    password: '123',
    chips: 1000
  })
})

const router = require('./router')

const server = http.createServer(app)
const io = socketio(server)
require('./socket./socket')(io)

app.use(router)

server.listen(PORT, () => console.log(`started PORT ${PORT}`))
