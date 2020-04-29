const { createDeck, deal } = require('./deck')

module.exports = io => {
  function Player(userInfo) {
    this.userId = 1
    this.name = 1
    this.socketId = userInfo.socketId
    this.chips = 1000
    this.hand = {}
  }

  function Hand(handInfo) {
    this.cards = []
    this.bet = 0
    this.total = 0
    this.order = handInfo.order
  }

  let players = {}

  io.on('connection', socket => {
    players[socket.id] = new Player({ socketId: socket.id })
    console.log(`We are connected ${socket.id}`)
    //assign player seats on a table
    socket.on('takeSeat', ind => {
      players[socket.id].hand[ind] = new Hand({ order: ind })
      io.emit('takenSeat', { ind, player: players[socket.id] })
    })
    //adds chips to bet
    socket.on('bet', amount => {
      if(players[socket.id].hand[`${amount.index}`]){
      players[socket.id].hand[`${amount.index}`].bet += amount.bet
      io.emit('addBet', { ind: amount.index, player: players[socket.id] })
    }
    })
    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
    })
}
