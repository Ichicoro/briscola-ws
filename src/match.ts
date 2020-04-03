import { CardSign, Card, CardType } from './card'
import { Player } from './player'

export enum MatchState {
    NOT_STARTED,
    PLAYING,
    ENDED
}

interface HandlerList {
    [key: string]: Function
}

export default class Match {
    deck: Card[] = []
    trumpCard: Card
    players: Player[] = []
    table: Card[] = []
    matchState: MatchState = MatchState.NOT_STARTED
    handlers: HandlerList = {}
    winners: unknown = null
    
    constructor(players: Player[] = null) {
        if (players == null || players.length > 4) { return null }
        this.players = players
    }

    start() {
        if (![2,3,4].includes(this.players.length)) { return }
        if (this.matchState != MatchState.NOT_STARTED) { return }
        this.matchState = MatchState.PLAYING
        this.shuffleDeck()
        this.dealCards()
        if (this.handlers["matchStarted"] != null)
            this.handlers["matchStarted"](this.deck[this.deck.length-1])
    }

    addHandler(event: string, handler: Function) {
        this.handlers[event] = handler
    }

    getPlayer(username: String) {
        let p = this.players.filter(p => p.username == username)
        return p[0] || null
    }

    addPlayer(player: Player) {
        if (this.players.length >= 4) return;
        if (this.players.map(p => p.username).indexOf(player.username) != -1) return;
        this.players.push(player)

        if (this.handlers["addPlayer"] != null)
            this.handlers["addPlayer"](player)
    }

    resetMatch() {
        this.deck = []
        this.players.forEach(player => {
            player.hand = []
            player.stack = []
        })
        this.table = []
        this.matchState = MatchState.NOT_STARTED
        this.shuffleDeck()
        this.dealCards()
    }

    removeCardFromPlayer(card: Card, player: Player) {
        console.log(`hand before: ${player.hand.map(c => c.getCardName())}`)
        card = Card.fromData(card)
        // player.hand = player.hand.filter(c => !(c.type == card.type && c.sign == card.sign))
        player.hand = player.hand.filter(c => !c.equals(card))
        console.log(`hand after: ${player.hand.map(c => c.getCardName())}`)
        if (this.handlers["removeCard"] != null)
            this.handlers["removeCard"](card, player)
    }

    getNextPlayer() {
        return this.players[this.table.length] || this.players[0]
    }

    playCard(card: Card, player: Player) {
        if (this.matchState != MatchState.PLAYING) { return }

        const found = this.players.some(p => player == p && p.hand.some(c => c.type == card.type && c.sign == card.sign))
        
        if (!found) {
            return -1
        }

        let pPos = 0
        for (const p of this.players) {
            if (p == player) break
            pPos++
        }
        console.log(pPos)

        if (this.table.length != pPos) return -2

        if (this.table.length < this.players.length) this.table.push(card)
        this.removeCardFromPlayer(card, player)
        // player.hand = player.hand.filter(c => c.type != card.type && c.sign != card.sign)

        if (this.handlers["playCard"] != null) {
            this.handlers["playCard"]({
                valid: true,
                card: card,
                byPlayer: player,
                table: this.table,
                nextPlayer: (this.players[this.table.length] || this.players[0])
            })
        }

        if (this.table.length == this.players.length) this.checkTable()
    }

    checkTable() {
        let winner: Card = this.table[0]
        let winnerPos: number

        let trumps = this.table.map((card, i) => {
            return {
                card: card,
                pos: i
            }
        }).filter(card => card.card.sign == this.getTrumpSign())

        if (trumps.length > 0) {
            const bestTrump = trumps.sort((a,b) => a.card.type-b.card.type)[0]
            winner = bestTrump.card
            winnerPos = bestTrump.pos
        } else {
            const winnerCard = this.table.map((card, i) => {
                return {
                    card: card,
                    pos: i
                }
            }).filter(card => card.card.sign == this.table[0].sign)
            .sort((a,b) => a.card.type-b.card.type)[0]
            winner = winnerCard.card
            winnerPos = winnerCard.pos
        }
        console.log(`winner: ${winner.getCardName()} - pos: ${winnerPos} - ${this.players[winnerPos].username}`)

        if (this.handlers["checkTable"] != null)
            this.handlers["checkTable"]({
                player: this.players[winnerPos],
                card: winner,
                tableCards: this.table
            })

        this.players[winnerPos].stack = this.players[winnerPos].stack.concat(this.table)
        this.table = []

        if (this.deck.length >= this.players.length) {
            for (let i = winnerPos; i<this.players.length; i++) {
                this.players.unshift(this.players.pop())
            }
            this.dealCards()
        } else if (this.players.map(p => p.hand).some(h => h.length > 0)) {
            for (let i = winnerPos; i<this.players.length; i++) {
                this.players.unshift(this.players.pop())
            }
        } else {
            this.calculateWinner()
        } 
    }

    private calculateWinner() {
        const winners = this.players.map((p,i) => {
            return { ...p, 
                index: i, 
                points: p.stack.map(c => c.type).reduce((a,b) => a + Card.getPoints(b), 0)
            }
        }).sort((a,b) => b.points-a.points)
        console.log(`${winners[0].username} -> ${winners[0].points}`)
        this.matchState = MatchState.ENDED
        this.winners = winners
        if (this.handlers["matchWon"] != null)
            this.handlers["matchWon"](winners)
    }

    dealCards() {
        let newcards = []
        for (let player of this.players) {
            console.log(`dealCards(${player.username}): hand=${player.hand}`)
            while (player.hand.length < 3) {
                const card = this.deck.shift()
                newcards.push({
                    card: card,
                    player: player
                })
                player.hand.push(card)
            }
        }
        if (this.handlers["dealCards"] != null)
            this.handlers["dealCards"](newcards)
    }

    getState() {
        return {
            matchState: this.matchState,
            players: this.players,
            deck: this.deck,
            table: this.table,
            trumpCard: Card.getSignName(this.getTrumpSign())
        }
    }

    private shuffleDeck() {
        for (let sign in CardSign) {
            if (isNaN(sign as unknown as CardType)) continue
            for (let type in CardType) {
                if (isNaN(type as unknown as CardType)) continue 
                this.deck.push(new Card(type as unknown as CardType, sign as unknown as CardSign))
            }
        }
        this.deck.sort(() => Math.random() - 0.5);
        console.log("Cards: ")
        this.deck.forEach((card,i) => {
            console.log(card.getCardName() + " - " + (i+1))
        });
        this.trumpCard = this.deck[this.deck.length-1]
        if (this.handlers["shuffleDeck"] != null)
            this.handlers["shuffleDeck"]()
    }

    getTrumpSign() {
        console.log(this.trumpCard)
        return this.trumpCard?.sign || null
        return this.deck[this.deck.length-1].sign
    }
}
 