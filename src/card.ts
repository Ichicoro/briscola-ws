// namespace Sign {
export enum CardSign {
    COINS,
    SWORDS,
    CUPS,
    CLUBS
}
// }

// namespace Card {
export enum CardType {
    ACE,
    THREE,
    KING,
    KNIGHT,
    JACK,
    SEVEN,
    SIX,
    FIVE,
    FOUR,
    TWO,
}

export class Card {
    type: CardType
    sign: CardSign

    constructor(type: CardType, sign: CardSign) {
        this.type = (type as CardType)
        this.sign = (sign as CardSign)
    }

    static fromData(data: any) {
        return new Card(data.type, data.sign)
    }

    equals(c: Card) {
        return (c.sign == this.sign && c.type == this.type)
    }

    static getTypeName(type: CardType) {
        return [
            "Asso",
            "Tre",
            "Re",
            "Cavallo",
            "Fante",
            "Sette",
            "Sei",
            "Cinque",
            "Quattro",
            "Due",
        ][type]
    }

    getPoints() {
        return [
            11,
            10,
            4,
            3,
            2,
            0,0,0,0,0
        ][this.type]
    }

    static getPoints(type: CardType) {
        return [
            11,
            10,
            4,
            3,
            2,
            0,0,0,0,0
        ][type]
    }

    static getSignName(sign: CardSign) {
        return [
            "denari",
            "spade",
            "coppe",
            "bastoni"
        ][sign]
    }
    
    static getSignEmoji(sign: CardSign) {
        return [
            "💰",
            "⚔",
            "🥤",
            "🥢"
        ][sign]
    }

    getCardName() {
        const num = Card.getTypeName(this.type)
        const seme = Card.getSignName(this.sign)
        return `${num} di ${seme}`
    }

    static getCardName(card: any) {
        if (card == null) return ""
        // console.log(card)
        const num = Card.getTypeName(card.type)
        const seme = Card.getSignName(card.sign)
        return `${num} di ${seme}`
    }

}
