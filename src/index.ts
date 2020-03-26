import WebSocket from 'ws';
import Match from './match';
import { Player } from './player';
import { Card } from './card';

import https from 'https';
import fs from 'fs';
import _ from 'lodash';
import { IncomingMessage } from 'http';

// const server = https.createServer({
//     cert: fs.readFileSync('certs/cert.pem'),
//     key: fs.readFileSync('certs/key.pem')
// })

/* let match = new Match()
match.start()
// console.log(match.getState())

match.addPlayer(new Player("Ichicoro"))
match.addPlayer(new Player("Kira"))
match.addPlayer(new Player("Giovanni"))
// match.addHandler("dealCards", (newcards: any) => {console.log(newcards)})
match.start()

match.playCard(match.players[0].hand[0], match.players[0])
match.playCard(match.players[1].hand[0], match.players[1])
match.deck = []
match.playCard(match.players[2].hand[0], match.players[2])

console.log(match.players[0].hand)


console.log(match.getState())

console.log("DONE") */


// let spPair: {[key: string]: any} = {
    
    // }
    
let spPair:{ username: string, ws: WebSocket }[] = []

    
let match = new Match()
match.addHandler("playCard", (data: any) => {
    console.log(`${data.byPlayer.username} - ` + data.card.getCardName() + " - nextPlayer: " + data.nextPlayer.username)
    broadcastToAll(JSON.stringify({
        type: "playedCard",
        player: data.byPlayer.username,
        card: data.card,
        nextPlayer: data.nextPlayer.username
    }))
})
// match.addPlayer(new Player("oof"))

match.addHandler("dealCards", (newcards: any) => {
    if (newcards == null || newcards.length == 0) return;
    console.log(newcards)
    for (const card of newcards) {
        if (card == undefined) break
        console.log(`card from newcards: ${Card.fromData(card.card).getCardName()}`)
        const pairs = spPair.filter((pair: { username: any; }) => pair.username == (card as any).player.username)
        if (pairs.length == 0) continue
        // console.log(pairs)
        console.log(`Sent card to ${pairs[0].username}`)
        pairs[0].ws.send(JSON.stringify({
            type: "dealtCard",
            card: card.card
        }))
    }
})

match.addHandler("removeCard", (card: Card, player: Player) => {
    const pair = spPair.filter((pair: any) => pair.username == player.username)[0]
    if (pair == null) return
    pair.ws.send(JSON.stringify({
        type: "removeCard",
        card: card
    }))
})

match.addHandler("checkTable", ({ player, card, tableCards }: any) => {
    setTimeout(() => {
        spPair.map(p => p.ws).forEach(ws => ws.send(JSON.stringify({ type: "clearTable" })))
    }, 1500)
    announce(`${player.username} has won the round!`)
    const winnerSpPair = spPair.filter((pair: { username: any; }) => pair.username == player.username)[0] || null
    if (winnerSpPair == null) { return }
    winnerSpPair.ws.send(JSON.stringify({
        type: "roundWinner"
    }))
    tableCards.forEach((card: Card) => {
        winnerSpPair.ws.send(JSON.stringify({
            type: "addCardToStack",
            card: card
        }))
    });
})

match.addHandler("matchStarted", (trumpCard: Card) => {
    broadcastToAll(JSON.stringify({
        type: "setTrumpCard",
        trumpCard: trumpCard
    }))
    broadcastToAll(JSON.stringify({
        type: "state",
        state: match.matchState
    }))
})

match.addHandler("matchWon", (winners: any) => {
    announce(`And the winner is ${winners[0].p.username}!`)
})

function broadcastToAll(message: any) {
    spPair.map(p => p.ws).forEach(ws => ws.send(message))
}


const wss = new WebSocket.Server({ port: 777 });

function announce(message: String) {
    for (const item of spPair) {
        item.ws.send(JSON.stringify({
            type: "announcement",
            message: message
        }))
    }
} 

function wserror(info: string) {
    return JSON.stringify({
        type: "error",
        error: info
    })
}

function resetClientState(ws: WebSocket) {
    const username: string = getUsernameByWS(ws)
    if (username == null) return -1
    ws.send(JSON.stringify({ type: "clearTable" }))
    ws.send(JSON.stringify({ type: "clearHand" }))
    for (const card of match.getPlayer(username).hand) {
        ws.send(JSON.stringify({
            type: "dealtCard",
            card: card
        }))
    }
    for (const card of match.table) {
        ws.send(JSON.stringify({
            type: "playedCard",
            card: card
        }))
    }
}

function sendCurrentState(ws: WebSocket) {
    const username: string = getUsernameByWS(ws)
    if (username == null) return -1
    for (const card of match.getPlayer(username).hand) {
        ws.send(JSON.stringify({
            type: "dealtCard",
            card: card
        }))
    }
    for (const card of match.table) {
        ws.send(JSON.stringify({
            type: "playedCard",
            card: card
        }))
    }
    ws.send(JSON.stringify({
        type: "setTrumpCard",
        trumpCard: match.trumpCard
    }))
    ws.send(JSON.stringify({
        type: "state",
        state: match.getState().matchState
    }))
    ws.send(JSON.stringify({
        type: "nextPlayer",
        nextPlayer: (match.players[match.table.length] || match.players[0]).username
    }))
    let playerList = _.cloneDeep(match.players)
    for (const player of playerList) {
        delete player["hand"]
    }
    ws.send(JSON.stringify({
        type: "setPlayerList",
        playerList: playerList
    }))
    for (const card of match.getPlayer(username).stack) {
        ws.send(JSON.stringify({
            type: "addCardToStack",
            card: card
        }))
    }
}

function getUsernameByWS(ws: WebSocket): any {
    return spPair.filter((pair: { ws: WebSocket; }) => pair.ws == ws)[0].username || null
}

function handleMessage(message: WebSocket.Data, request: IncomingMessage, ws: WebSocket) {
    try {
        var jsonMessage = JSON.parse(message as string);
    } catch (e) {
        console.error(e)
        return
    }

    console.log(jsonMessage)

    if (jsonMessage.type == "connect") {
        const pl = spPair.filter((pair: any) => pair.username == jsonMessage.username)
        if (pl.length != 0) {
            console.log(`${pl[0].username} has rejoined!`)
            pl[0].ws = ws
            sendCurrentState(ws)
        } else {
            spPair.push({username: jsonMessage.username, ws: ws})
            match.addPlayer(new Player(jsonMessage.username))
            broadcastToAll(JSON.stringify({
                type: "setPlayerList",
                playerList: match.players
            }))
            sendCurrentState(ws)
            console.log("New player joined!")
        }
        announce(`${jsonMessage.username} has ${pl.length ? "re" : ""}joined!`)
    } else if (jsonMessage.type == "start") {
        match.start()
        // match.playCard(match.players.filter(p => p.username == "oof")[0].hand[0], match.players[0])
    } else if (jsonMessage.type == "playCard") {
        try {
            let card = Card.fromData(jsonMessage.card)
            // console.log(`card: ${Card.getCardName(card)}, ${getUsernameByWS(ws)}'s hand: ${match.getPlayer(getUsernameByWS(ws)).hand.map(card => card.getCardName())}`)
            let result = match.playCard(card, match.getPlayer(getUsernameByWS(ws)))
            if (result == -1) ws.send(wserror("invalid_card"))
            else if (result == -2) ws.send(wserror("not_your_turn"))
            // else ws.send(JSON.stringify({
            //         type: "removeCard",
            //         card: card
            //      }))
            
        } catch (e) {
            console.error(e)
            ws.send(wserror("wrong_params"))
        }
    } else if (jsonMessage.type == "getCurrentState") {
        sendCurrentState(ws)
    }
}
 
wss.on('connection', function connection(ws, req) {
    ws.on('message', function incoming(message) {
        handleMessage(message, req, ws)
    });
    
    ws.send(JSON.stringify({ type: "hello" }));
});

console.log("ready")
