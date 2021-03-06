const { createDeck, deal } = require('./deck')
const { LinkedHand } = require('./hand')
const axios = require('axios').default

module.exports = io => {
  let timer

  let countDownTimer

  function startTime(roomNum, socketId) {
    timer = setTimeout(function() {
      io.to(socketId).emit('timedOut', roomNum)
    }, 10000)
  }

  function endTime() {
    clearTimeout(timer)
  }

  function countDownTimerStart(roomNum) {
    countDownTimer = setInterval(function() {
      io.to(roomNum).emit('startTimer', rooms[roomNum]['timer'])
      rooms[roomNum]['timer'] = rooms[roomNum]['timer'] - 1
    }, 1000)
  }

  function countDownTimerStop() {
    clearTimeout(countDownTimer)
  }

  function Player(userInfo) {
    this.userId = userInfo.id
    this.name = userInfo.firstName
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
    this.deck = [createDeck(), createDeck(), createDeck(), createDeck()]
    this.dealer = {
      hand: [],
      total: 0
    }
    this.linkedIndex = 0
    this.order = 0
    this.trigger = false
    this.activeHands = new LinkedHand()
    this.players = {}
    this.active = false
    this.autoKick = []
    this.timer = 10
  }
  let rooms = {}

  io.on('connection', socket => {
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
      let active = rooms[roomNum]['active']

      if (active) {
      } else {
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
      let hasHands = Object.keys(rooms[roomNum]['players'][socket.id]['hand'])
        .length
      if (hasHands > 0) {
        if (activeHands.elementAt(0)) {
          rooms[roomNum]['active'] = true
          for (let x = 0; x < activeHands.size(); x += 1) {
            const playerCards = deal(deck)
            const hand = activeHands.elementAt(x).player.order.toString()
            let cards = deck[playerCards.deck][playerCards.card]
            let id = activeHands.elementAt(x).player.socketId
            players[id].hand[hand].cards.push(cards)
            players[id].hand[hand].total += cards.value
            io.to(roomNum).emit('dealtCards', {
              player: players[id],
              order: hand
            })
            rooms[roomNum].deck[playerCards.deck].splice(playerCards.card, 1)
          }

          const dealerCards = deal(deck)
          dealer.hand.push(deck[dealerCards.deck][dealerCards.card])
          dealer.total += deck[dealerCards.deck][dealerCards.card].value

          io.to(roomNum).emit('addedDeck', deck)
          io.to(roomNum).emit('dealtDealer', dealer)
        }
      }
    })

    socket.on('dealTrigger', dealtTrigger => {
      const { roomNum } = dealtTrigger
      let activeHands = rooms[roomNum]['activeHands']
      if (activeHands.elementAt(0)) {
        rooms[roomNum]['trigger'] = dealtTrigger.trigger
        io.to(roomNum).emit('dealtTrigger', rooms[roomNum]['trigger'])
      }
    })

    socket.on('createOrder', ({ roomNum, socketId }) => {
      let activeHands = rooms[roomNum]['activeHands']
      let linkedIndex = rooms[roomNum]['linkedIndex']
      if (activeHands.elementAt(0)) {
        rooms[roomNum]['order'] = activeHands.elementAt(
          linkedIndex
        ).player.order
        rooms[roomNum]['linkedIndex'] += 1
        io.to(roomNum).emit('index', rooms[roomNum].order)
        startTime(roomNum, socketId)
        countDownTimerStart(roomNum)
      }
    })

    socket.on('joinRoom', ({ roomNum, firstName, id }) => {
      socket.join(`${roomNum}`, () => {
        if (!rooms[roomNum]) {
          rooms[roomNum] = new blackjackGame()
        }
        rooms[roomNum]['players'][socket.id] = new Player({
          socketId: socket.id,
          firstName,
          id
        })
      })
    })

    socket.on('hit', async ({ roomNum, socketId }) => {
      let players = rooms[roomNum].players
      let activeHands = rooms[roomNum]['activeHands']
      let linkedIndex = rooms[roomNum]['linkedIndex']
      let dealer = rooms[roomNum]['dealer']
      let active = rooms[roomNum]['active']
      if (active) {
        if (players[socketId]['hand'][rooms[roomNum]['order']]) {
          let deck = rooms[roomNum]['deck']
          const playerCards = deal(deck)
          if (linkedIndex <= activeHands.size()) {
            let cards = deck[playerCards.deck][playerCards.card]
            players[socketId]['hand'][rooms[roomNum]['order']]['cards'].push(
              cards
            )
            players[socketId]['hand'][rooms[roomNum]['order']]['total'] +=
              cards.value
            rooms[roomNum].deck[playerCards.deck].splice(playerCards.card, 1)
          }
          io.to(roomNum).emit('addedDeck', deck)
          io.to(roomNum).emit('dealtCards', {
            player: players[socketId],
            order: rooms[roomNum]['order']
          })

          if (
            players[socketId]['hand'][rooms[roomNum]['order']]['total'] >= 21
          ) {
            io.to(socketId).emit('hitStand', {roomNum, socketId})
          }
        }
      }
    })

    socket.on('stand', async ({ roomNum, socketId = undefined, autoStand }) => {
      let players = rooms[roomNum].players
      let linkedIndex = rooms[roomNum]['linkedIndex']
      let activeHands = rooms[roomNum]['activeHands']
      let dealer = rooms[roomNum]['dealer']
      let deck = rooms[roomNum]['deck']
      let active = rooms[roomNum]['active']
      if (autoStand && linkedIndex <= activeHands.size()) {
        socketId = activeHands.elementAt(linkedIndex - 1).player.socketId
        rooms[roomNum]['autoKick'].push({
          index: rooms[roomNum]['order'],
          roomNum,
          socketId
        })
      }
      if (active) {
        if (players[socketId]['hand'][rooms[roomNum]['order']]) {
          if (linkedIndex < activeHands.size()) {
            rooms[roomNum]['order'] = activeHands.elementAt(
              linkedIndex
            ).player.order
            rooms[roomNum]['linkedIndex'] += 1
            endTime()
            countDownTimerStop()
            rooms[roomNum]['timer'] = 10
            countDownTimerStart(roomNum)
            startTime(roomNum, socketId)

          }
          if (linkedIndex === activeHands.size()) {
            endTime()
            countDownTimerStop()
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
                      await axios.put('https://stackadon-backend.herokuapp.com/win', {
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
                      await axios.put('https://stackadon-backend.herokuapp.com/win', {
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
                    await axios.put('https://stackadon-backend.herokuapp.com/win', {
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
          io.to(roomNum).emit('index', rooms[roomNum].order)
        }
      }
    })

    socket.on('reset', ({ roomNum, socketId }) => {
      let players = rooms[roomNum].players
      let dealer = rooms[roomNum]['dealer']
      let linkedIndex = rooms[roomNum]['linkedIndex']
      let activeHands = rooms[roomNum]['activeHands']

      if (linkedIndex === activeHands.size() + 2) {
        rooms[roomNum]['active'] = false
        let allPlayerSockets = Object.keys(players)
        for (let x = 0; x < allPlayerSockets.length; x += 1) {
          let allPlayerHands = Object.keys(players[allPlayerSockets[x]]['hand'])
          for (let y = 0; y < allPlayerHands.length; y += 1) {
            players[allPlayerSockets[x]]['hand'][allPlayerHands[y]] = new Hand({
              order:
                players[allPlayerSockets[x]]['hand'][allPlayerHands[y]][
                  'order'
                ],
              socketId: allPlayerSockets[x]
            })
            io.to(roomNum).emit('dealtCards', {
              player: players[allPlayerSockets[x]],
              order:
                players[allPlayerSockets[x]]['hand'][allPlayerHands[y]]['order']
            })
          }
        }

        io.to(socketId).emit('autoRemove', rooms[roomNum]['autoKick'])
        dealer.total = 0
        dealer.hand = []
        rooms[roomNum]['linkedIndex'] = 0
        rooms[roomNum]['order'] = undefined
        rooms[roomNum]['activeHands'] = new LinkedHand()
        rooms[roomNum]['trigger'] = false
        rooms[roomNum]['autoKick'] = []
        rooms[roomNum]['timer'] = 10
        io.to(roomNum).emit('startTimer', rooms[roomNum]['timer'])
        io.to(roomNum).emit('dealtDealer', dealer)
        io.to(roomNum).emit('dealtTrigger', rooms[roomNum]['trigger'])
        io.to(roomNum).emit('updateChips')
        io.to(roomNum).emit('index', 0)
      }
    })

    socket.on('lateJoin', roomNum => {
      let table = []
      // let activeHands = rooms[roomNum]['activeHands']
      for (let x = 0; x < 7; x += 1) {
        table[x] = { taken: false }
      }
      //all sockets
      let allPlayers = Object.keys(rooms[roomNum]['players'])
      for (let x = 0; x < allPlayers.length; x += 1) {
        let activeHands = Object.keys(
          rooms[roomNum]['players'][allPlayers[x]]['hand']
        )
        for (let y = 0; y < activeHands.length; y += 1) {
          table[
            rooms[roomNum]['players'][allPlayers[x]]['hand'][activeHands[y]][
              'order'
            ]
          ] = {
            taken: true,
            player: rooms[roomNum]['players'][allPlayers[x]]
          }
        }
      }
      let currentGame = {
        trigger: rooms[roomNum]['trigger'],
        dealer: rooms[roomNum]['dealer'],
        table: table
      }
      io.to(roomNum).emit('startTimer', rooms[roomNum]['timer'])
      io.to(roomNum).emit('updateUser', currentGame)
      io.to(roomNum).emit('index', rooms[roomNum].order)
    })

    socket.on('clearSeat', ({ index, roomNum, socketId }) => {
      let activeHands = rooms[roomNum]['activeHands']
      let players = rooms[roomNum].players
      if (players[socketId]['hand'][index]['cards'].length > 0) {
        activeHands.removeAtIndex(index)
      }
      delete players[socketId]['hand'][index]
      io.to(roomNum).emit('removedPlayer', index)
    })

    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
  })
}
