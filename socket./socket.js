const { createDeck, deal } = require('./deck')
const { LinkedHand } = require('./hand')

module.exports = io => {
  let deck = [createDeck()]

  let dealer = {
    hand: [],
    total: 0
  }

  let activeHands = new LinkedHand()

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
    this.socketId = handInfo.socketId
  }

  let players = {}

  io.on('connection', socket => {
    players[socket.id] = new Player({ socketId: socket.id })
    if (deck.length === 1) {
      io.emit('addedDeck', deck)
    }
    console.log(`We are connected ${socket.id}`)
    //assign player seats on a table
    socket.on('takeSeat', ind => {
      players[socket.id].hand[ind] = new Hand({
        order: ind,
        socketId: socket.id
      })
      io.emit('takenSeat', { ind, player: players[socket.id] })
    })
    //adds chips to bet
    socket.on('bet', amount => {
      if (players[socket.id].hand[`${amount.index}`]) {
        players[socket.id].hand[`${amount.index}`].bet += amount.bet
        io.emit('addBet', { ind: amount.index, player: players[socket.id] })
        activeHands.add(players[socket.id].hand[`${amount.index}`])
      }
    })
    socket.on('addDeck', () => {
      deck.push(createDeck())
      io.emit('addedDeck', deck)
    })
    socket.on('deal', () => {
      for (let x = 0; x < activeHands.size(); x += 1) {
        const playerCards = deal(deck)
        const hand = activeHands.elementAt(x).player.order.toString()
        players[activeHands.elementAt(x).player.socketId].hand[hand].cards.push(
          deck[playerCards.deck][playerCards.card]
        )
      }
      const dealerCards = deal(deck)
      dealer.hand.push(deck[dealerCards.deck][dealerCards.card])
    })

    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
  })
}
