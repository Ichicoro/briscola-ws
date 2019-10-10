import WebSocket from 'ws';
import Match from './match';
import { Player } from './player';
import { Card } from './card';

import https from 'https';
import fs from 'fs';
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
    
let spPair:any = []
    
    
let match = new Match()
match.addHandler("playCard", (data: any) => { console.log(`${data.byPlayer.username} - ` + data.card.getCardName() + " - nextPlayer: " + data.nextPlayer.username)})
match.addPlayer(new Player("oof"))

match.addHandler("dealCards", (newcards: any) => {
    for (const card of newcards) {
        console.log(`card from newcards: ${Card.getCardName(card.card)}`)
        const pairs = spPair.filter((pair: { username: any; }) => pair.username == (card as any).player.username)
        if (pairs.length == 0) continue
        // console.log(pairs)
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

match.addHandler("checkTable", ({ player, card }: any) => {
    announce(`${player.username} has won the round!`)
})

const wss = new WebSocket.Server({ port: 6669 });

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
        const pl = spPair.filter((pair: { username: any; }) => pair.username == jsonMessage.username)
        if (pl.length != 0) {
            pl[0].ws = ws
            for (const card of match.getPlayer(jsonMessage.username).hand) {
                ws.send(JSON.stringify({
                    type: "dealtCard",
                    card: card
                }))
            }
        } else {
            spPair.push({username: jsonMessage.username, ws: ws})
            match.addPlayer(new Player(jsonMessage.username))
        }
        console.log("New player joined!")
        announce(`${jsonMessage.username} has joined!`)
    } else if (jsonMessage.type == "start") {
        match.start()
        match.playCard(match.players[0].hand[0], match.players[0])
    } else if (jsonMessage.type == "playCard") {
        try {
            let card = Card.fromData(jsonMessage.card)
            console.log(`card: ${Card.getCardName(card)}, ${getUsernameByWS(ws)}'s hand: ${match.getPlayer(getUsernameByWS(ws)).hand.map(card => card.getCardName())}`)
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
    }
}
 
wss.on('connection', function connection(ws, req) {
    ws.on('message', function incoming(message) {
        console.log(message)
        handleMessage(message, req, ws)
    });
    
    ws.send('something');
});

console.log("ready")
