require('dotenv').config()

class Guild {
    constructor (args) {
        this.id                 = args.id 
        this.joinedAt           = args.joinedAt ? new Date(args.joinedAt) : new Date()
        this.updatedAt          = args.updatedAt ? new Date(args.updatedAt) : new Date()
        this.locale             = args.locale || 'en' 
        this.name               = args.name 
        this.prefix             = args.prefix || process.env.DISCORD_PREFIX

        if (args.waitingSetupAnswer) {
            if (typeof args.waitingSetupAnswer === 'string') 
                this.waitingSetupAnswer = JSON.parse(args.waitingSetupAnswer)
            else 
                this.waitingSetupAnswer = args.waitingSetupAnswer
        } else 
            this.waitingSetupAnswer = false
            
    }

    getPrefix () {
        return this.prefix
    }

    _serialize () {
        return {
            id                  : this.id, 
            joinedAt            : this.joinedAt.toISOString(), 
            updatedAt           : this.updatedAt.toISOString(),
            locale              : this.locale, 
            name                : this.name, 
            prefix              : this.prefix, 
            waitingSetupAnswer  : JSON.stringify(this.waitingSetupAnswer)
        }
    }
}

module.exports = Guild
