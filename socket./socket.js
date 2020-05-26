const { createDeck, deal } = require('./deck')
const { LinkedHand } = require('./hand')
const axios = require('axios').default

module.exports = io => {
  function Player(userInfo) {
    this.userId = 1
    this.name = 1
    this.socketId = userInfo.socketId
    this.hand = {}
  }
  function Hand(handInfo) {
    this.cards = []
    this.bet = 0
    this.total = 0
    this.order = handInfo.order
    this.socketId = handInfo.socketId
  }

  function blackjackGame() {
    this.deck = [createDeck()]
    this.dealer = {
      hand: [],
      total: 0
    }
    this.linkedIndex = 0
    this.order
    this.trigger
    this.activeHands = new LinkedHand()
    this.players = {}
  }
  let rooms = {}

  io.on('connection', socket => {
    console.log(`We are connected ${socket.id}`)
    // //assign player seats on a table
    socket.on('takeSeat', ({ ind, roomNum }) => {
      let players = rooms[roomNum].players
      players[socket.id].hand[ind] = new Hand({
        order: ind,
        socketId: socket.id
      })
      io.to(roomNum).emit('takenSeat', { ind, player: players[socket.id] })
    })

    // //adds chips to bet
    socket.on('bet', amount => {
      const { roomNum } = amount
      let players = rooms[roomNum].players
      if (players[socket.id].hand[`${amount.index}`]) {
        players[socket.id].hand[`${amount.index}`].bet += amount.bet
        io.to(roomNum).emit('addBet', {
          ind: amount.index,
          player: players[socket.id]
        })
        rooms[roomNum]['activeHands'].add(
          players[socket.id].hand[`${amount.index}`]
        )
      }
    })

    socket.on('addDeck', roomNum => {
      let deck = rooms[roomNum]['deck']
      deck.push(createDeck())
      io.to(roomNum).emit('addedDeck', deck)
    })

    socket.on('deal', roomNum => {
      let players = rooms[roomNum].players
      let activeHands = rooms[roomNum]['activeHands']
      let deck = rooms[roomNum]['deck']
      let dealer = rooms[roomNum]['dealer']

      for (let x = 0; x < activeHands.size(); x += 1) {
        const playerCards = deal(deck)
        const hand = activeHands.elementAt(x).player.order.toString()
        let cards = deck[playerCards.deck][playerCards.card]
        let id = activeHands.elementAt(x).player.socketId
        players[id].hand[hand].cards.push(cards)
        players[id].hand[hand].total += cards.value
        io.to(roomNum).emit('dealtCards', { player: players[id], order: hand })
      }

      const dealerCards = deal(deck)
      dealer.hand.push(deck[dealerCards.deck][dealerCards.card])
      dealer.total += deck[dealerCards.deck][dealerCards.card].value

      io.to(roomNum).emit('dealtDealer', dealer)
    })

    socket.on('dealTrigger', dealtTrigger => {
      const { roomNum } = dealtTrigger
      rooms[roomNum]['trigger'] = dealtTrigger.trigger
      io.to(roomNum).emit('dealtTrigger', rooms[roomNum]['trigger'])
    })

    socket.on('createOrder', roomNum => {
      let activeHands = rooms[roomNum]['activeHands']
      let linkedIndex = rooms[roomNum]['linkedIndex']
      rooms[roomNum]['order'] = activeHands.elementAt(linkedIndex).player.order
      rooms[roomNum]['linkedIndex'] += 1
    })

    socket.on('joinRoom', roomNum => {
      socket.join(`${roomNum}`, () => {
        if (!rooms[roomNum]) {
          rooms[roomNum] = new blackjackGame()
        }
        rooms[roomNum]['players'][socket.id] = new Player({
          socketId: socket.id
        })
      })
    })

    socket.on('hit', async ({ roomNum, socketId }) => {
      let players = rooms[roomNum].players
      let activeHands = rooms[roomNum]['activeHands']
      let linkedIndex = rooms[roomNum]['linkedIndex']
      let dealer = rooms[roomNum]['dealer']

      if (players[socketId]['hand'][rooms[roomNum]['order']]) {
        let deck = rooms[roomNum]['deck']
        const playerCards = deal(deck)
        if (linkedIndex <= activeHands.size()) {
        let cards = deck[playerCards.deck][playerCards.card]
        players[socketId]['hand'][rooms[roomNum]['order']]['cards'].push(cards)
        players[socketId]['hand'][rooms[roomNum]['order']]['total'] +=
          cards.value
        }
        io.to(roomNum).emit('dealtCards', {
          player: players[socketId],
          order: rooms[roomNum]['order']
        })

        if (players[socketId]['hand'][rooms[roomNum]['order']]['total'] >= 21) {
          if (linkedIndex < activeHands.size()) {
            rooms[roomNum]['order'] = activeHands.elementAt(
              linkedIndex
            ).player.order
            rooms[roomNum]['linkedIndex'] += 1
          }
          if (linkedIndex === activeHands.size()) {
            while (dealer.total < 17) {
              const dealerCards = deal(deck)
              dealer.hand.push(deck[dealerCards.deck][dealerCards.card])
              dealer.total += deck[dealerCards.deck][dealerCards.card].value
              io.to(roomNum).emit('dealtDealer', dealer)
            }
            let playerId = players[socket.id]['userId']
            let allPlayerSockets = Object.keys(players)
            for (let x = 0; x < allPlayerSockets.length; x += 1) {
              let allPlayerHands = Object.keys(
                players[allPlayerSockets[x]]['hand']
              )
              for (let y = 0; y < allPlayerHands.length; y += 1) {
                let myTotal =
                  players[allPlayerSockets[x]]['hand'][allPlayerHands[y]][
                    'total'
                  ]
                let betSize =
                  players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['bet']
                //did not bust
                if (myTotal <= 21) {
                  //dealer busts and player did not bust
                  //player wins
                  if (dealer.total > 21 || myTotal > dealer.total) {
                    try {
                      await axios.put('http://localhost:7070/win', {
                        userId: playerId,
                        amount: betSize
                      })
                    } catch (error) {
                      console.log(error)
                    }
                  }
                  //player lose
                  if (myTotal < dealer.total) {
                    try {
                      await axios.put('http://localhost:7070/win', {
                        userId: playerId,
                        amount: -betSize
                      })
                    } catch (error) {
                      console.log(error)
                    }
                  }
                }
                //player bust
                else {
                  try {
                    await axios.put('http://localhost:7070/win', {
                      userId: playerId,
                      amount: -betSize
                    })
                  } catch (error) {
                    console.log(error)
                  }
                }
              }
            }
            rooms[roomNum]['linkedIndex'] += 2
          }
          //

        }
      }
    })

    socket.on('stand', async ({ roomNum, socketId }) => {
      let players = rooms[roomNum].players
      let linkedIndex = rooms[roomNum]['linkedIndex']
      let activeHands = rooms[roomNum]['activeHands']
      let dealer = rooms[roomNum]['dealer']
      let deck = rooms[roomNum]['deck']
      if (players[socketId]['hand'][rooms[roomNum]['order']]) {
        if (linkedIndex < activeHands.size()) {
          rooms[roomNum]['order'] = activeHands.elementAt(
            linkedIndex
          ).player.order
          rooms[roomNum]['linkedIndex'] += 1
        }
        if (linkedIndex === activeHands.size()) {
          while (dealer.total < 17) {
            const dealerCards = deal(deck)
            dealer.hand.push(deck[dealerCards.deck][dealerCards.card])
            dealer.total += deck[dealerCards.deck][dealerCards.card].value
            io.to(roomNum).emit('dealtDealer', dealer)
          }
          let allPlayerSockets = Object.keys(players)
          let playerId = players[socket.id]['userId']
          for (let x = 0; x < allPlayerSockets.length; x += 1) {
            let allPlayerHands = Object.keys(
              players[allPlayerSockets[x]]['hand']
            )
            for (let y = 0; y < allPlayerHands.length; y += 1) {
              let myTotal =
                players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['total']
              let betSize =
                players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['bet']
              //did not bust
              if (myTotal <= 21) {
                //dealer busts and player did not bust
                //player wins
                if (dealer.total > 21 || myTotal > dealer.total) {
                  try {
                    await axios.put('http://localhost:7070/win', {
                      userId: playerId,
                      amount: betSize
                    })
                  } catch (error) {
                    console.log(error)
                  }
                }
                //player lose
                if (myTotal < dealer.total) {
                  try {
                    await axios.put('http://localhost:7070/win', {
                      userId: playerId,
                      amount: -betSize
                    })
                  } catch (error) {
                    console.log(error)
                  }
                }
              }
              //player bust
              else {
                try {
                  await axios.put('http://localhost:7070/win', {
                    userId: playerId,
                    amount: -betSize
                  })
                } catch (error) {
                  console.log(error)
                }
              }
            }
          }
          rooms[roomNum]['linkedIndex'] += 2
        }
      }
    })

    socket.on('reset', ({ roomNum }) => {
      let players = rooms[roomNum].players
      let dealer = rooms[roomNum]['dealer']

      let allPlayerSockets = Object.keys(players)
      for (let x = 0; x < allPlayerSockets.length; x += 1) {
        let allPlayerHands = Object.keys(players[allPlayerSockets[x]]['hand'])
        for (let y = 0; y < allPlayerHands.length; y += 1) {
          players[allPlayerSockets[x]]['hand'][allPlayerHands[y]] = new Hand({
            order:
              players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['order'],
            socketId: allPlayerSockets[x]
          })
          io.to(roomNum).emit('dealtCards', {
            player: players[allPlayerSockets[x]],
            order:
              players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['order']
          })
        }
      }
      dealer.total = 0
      dealer.hand = []
      rooms[roomNum]['linkedIndex'] = 0
      rooms[roomNum]['order'] = undefined
      rooms[roomNum]['activeHands'] = new LinkedHand()
      rooms[roomNum]['trigger'] = true

      io.to(roomNum).emit('dealtDealer', dealer)
      io.to(roomNum).emit('dealtTrigger', rooms[roomNum]['trigger'])

      //
    })

    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
  })
}
