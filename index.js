const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const app = express()
const PORT = process.env.PORT || 7070
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
// const Sequelize = require('sequelize');

const cors = require('cors')

let prod = 'http://localhost:3000'

if (process.env.PORT) {
  prod = 'https://stackadon.herokuapp.com'
}

const corsOptions = {
  origin: prod,
  methods: 'GET,HEAD,POST,PATCH,DELETE,OPTIONS',
  credentials: true, // required to pass
  allowedHeaders: 'Content-Type, Authorization, X-Requested-With, Set-Cookie'
}

app.use(cors(corsOptions))
const { User, sequelize } = require('./models/user')

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.')
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
  })

app.options('/', cors(corsOptions))

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

