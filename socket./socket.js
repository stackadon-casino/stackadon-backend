const {createDeck, deal} = require('./deck')

module.exports = io =>{
  io.on('connection', (socket) => {
    console.log(`We are connected ${socket.id}`)
    socket.on('takeSeat', (ind)=>{
      io.emit('takenSeat',ind)
    })
    socket.on('disconnect', () => {
      console.log('user has disconnected')
    })
  })

}
