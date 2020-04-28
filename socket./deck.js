function createDeck() {
  let deck = []
  let suits = ['diamond', 'club', 'heart', 'spade']
  //creates a full deck of cards
  for (var x = 0; x < 13; x += 1) {
    for (var y = 0; y < suits.length; y += 1) {
      let card = {}
      card.id = x + 1
      card.suit = suits[y]
      if (card.id >= 10) {
        card.value = 10
      } else {
        card.value = card.id
      }

      if (card.id === 11) {
        card.id = 'J'
      } else if (card.id === 12) {
        card.id = 'Q'
      } else if (card.id === 13) {
        card.id = 'K'
      }

      deck.push(card)
    }
  }
  return deck
}

//function for generating a random number given a maximum
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max))
}

//function that picks a deck and picks a card in that deck and returns its indexes
function deal(arr) {
  let deck = getRandomInt(arr.length)
  let card = getRandomInt(arr[deck].length)
  return {deck, card}
}

module.exports = {createDeck, deal}
