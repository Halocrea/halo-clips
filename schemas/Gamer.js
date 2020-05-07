require('dotenv').config()

class Gamer {
    constructor (args) {
        this.id                 = args.id 
        this.joinedAt           = args.joinedAt ? new Date(args.joinedAt) : new Date()
        this.gamertag           = args.gamertag || ''
        this.name               = args.name 
        this.dontAskAgain       = args.dontAskAgain || 0
    }

    getPrefix () {
        return this.prefix
    }

    _serialize () {
        return {
            id                  : this.id, 
            joinedAt            : this.joinedAt.toISOString(), 
            gamertag            : this.gamertag, 
            name                : this.name, 
            dontAskAgain        : this.dontAskAgain ? 1 : 0, 
        }
    }
}

module.exports = Gamer
