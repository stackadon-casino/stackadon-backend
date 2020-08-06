const express = require('express')
const router = express.Router()
const { User } = require('./models/user')


router.get('/', async (req, res, next) => {
  const users = await User.findAll()

  console.log(users)
  res.sendFile(__dirname + '/index.html')
})

router.post('/user/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, password, login } = req.body
    const newUser = await User.create({
      firstName,
      lastName,
      password,
      login
    })
    res.send(newUser)
  } catch (error) {}
})

router.post('/user/chips', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.body.id)
    if (user) {
      res.send(user)
    } else {
      res.send(false)
    }
  } catch (error) {
    next(error)
  }
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
      await User.update(
        { status: true },
        { where: { id: user[0].dataValues.id } }
      )
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
    const newUser = await User.update(
      { chips: user.chips + req.body.amount },
      { where: { id: req.body.userId } }
    )
    res.send(newUser)
  } catch (error) {
    next(error)
  }
})

module.exports = router
