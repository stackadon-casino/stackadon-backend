const express = require('express');
const router = express.Router();
const {User} = require('./models/user')

router.get('/', async (req, res, next) => {
  const users = await User.findAll()

  console.log(users)
  res.sendFile(__dirname + '/index.html');
})

router.post('/login', async (req, res, next)=>{
  try {
    console.log('connected',req.body)
    const user = await User.findAll({
      where:{
        login: 'example',
        password: '123'
      }
    })
    // console.log(user)
    res.send(user)
  } catch (error) {
    next(error)
  }
})

module.exports = router;
