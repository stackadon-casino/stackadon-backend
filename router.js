const express = require('express')
const router = express.Router()
const { User } = require('./models/user')

router.get('/', async (req, res, next) => {
  const users = await User.findAll()

  console.log(users)
  res.sendFile(__dirname + '/index.html')
})

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findAll({
      where: {
        login: req.body.login,
        password: req.body.password
      }
    })
    if (user.length > 0) {
      user[0].dataValues.status = 'loggedIn'
      res.send(user)
    } else {
      res.send(false)
    }
  } catch (error) {
    next(error)
  }
})

router.put('/win', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.body.userId)
    user.chips += req.body.amount
    res.send(user)
  } catch (error) {
    next(error)
  }
})

module.exports = router
