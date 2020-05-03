function LinkedHand() {
  let head = null
  let Node = function(player) {
    this.player = player
    this.next = null
  }
  this.size = function() {
    let currentNode = head
    let count = 0
    while (currentNode) {
      currentNode = currentNode.next
      count++
    }
    return count
  }
  this.head = function() {
    return head
  }
  this.add = function(hand, currentNodeAdd = head) {
    let player = new Node(hand)
    if (head === null) {
      head = player
    } else {
      let currentNode = currentNodeAdd
      if (player.player.order !== currentNode.player.order) {
        if (!currentNode.next) {
          if (player.player.order > currentNode.player.order) {
            currentNode.next = player
          } else {
            player.next = head
            head = player
          }
        } else {
          if (
            player.player.order > currentNode.player.order &&
            player.player.order < currentNode.next.player.order
          ) {
            player.next = currentNode.next
            currentNode.next = player
          } else {
            this.add(hand, currentNode.next)
          }
        }
      }
    }
  }
  this.elementAt = function(index) {
    let currentNode = head
    let count = 0
    while (count < index) {
      count++
      currentNode = currentNode.next
    }
    return currentNode
  }
}

module.exports = { LinkedHand }
