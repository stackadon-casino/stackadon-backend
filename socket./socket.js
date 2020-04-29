const { createDeck, deal } = require('./deck')

module.exports = io => {
  function Player(userInfo) {
    this.userId = 1
    this.name = 1
    this.socketId = userInfo.socketId
    this.chips = 1000
    this.hand = {}
  }

  function Hand() {
    this.cards = []
    this.bet = 0
    this.total = 0
  }

  let players = {}

  io.on('connection', socket => {
    players[socket.id] = new Player({ socketId: socket.id })
    console.log(`We are connected ${socket.id}`)
    //assign player seats on a table
    socket.on('takeSeat', ind => {
      players[socket.id].hand[`${ind}`] = new Hand
      io.emit('takenSeat', ind)
    })
    socket.on('bet', amount => {
      players[socket.id].hand[`${amount.index}`].bet += amount.bet
    })
    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
    console.log(players)
  })
}
