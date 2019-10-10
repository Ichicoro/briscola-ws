import {Card} from './card'

export class Player {
    username: string
    hand: Card[] = []
    stack: Card[] = []

    constructor(username: string) {
        if (username.length < 1) { return null }
        this.username = username
    }
}
