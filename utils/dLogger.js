const dLogger = {
    async init (client) { 
        this.maintainer = await client.users.fetch(process.env.DISCORD_MAINTAINER)
        process.dLogger = this
        return this
    },
    
    log (message) {
        if (!this.maintainer)
            return 

        this.maintainer
            .send(message)
            .catch(console.error)
    }
}

module.exports = dLogger
