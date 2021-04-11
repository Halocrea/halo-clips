const Database  = require('better-sqlite3')
const Guild     = require('../schemas/Guild') 

class Guilds {
    constructor (dLogger) {
        this.dLogger == dLogger
        try {
            this.db = new Database('data/guilds.db')

            const createGuildTable = `CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(30) PRIMARY KEY,
                joinedAt DATETIME,
                updatedAt DATETIME,
                locale VARCHAR(10),
                name VARCHAR(255),
                prefix VARCHAR(255),
                waitingSetupAnswer TEXT
            );`;
            this.db.exec(createGuildTable)
        } catch (err) {
            this.dLogger && this.dLogger.log(`in crud/Guilds/constructor: ${err.message}`)
        }
    }

    addOrOverwrite (guild) {
        const checkExistence = this.getById(guild.id)

        if (!checkExistence) {
            let queryStr    = 'INSERT INTO guilds '
            let rowNames    = ''
            let namedValues = '' 

            for (let k in guild._serialize()) {
                rowNames    += `${k},`
                namedValues += `@${k},`
            }

            rowNames    = rowNames.substring(0, rowNames.length - 1)
            namedValues = namedValues.substring(0, namedValues.length - 1)
            queryStr    += `(${rowNames}) VALUES (${namedValues})`

            const statement = this.db.prepare(queryStr)

            statement.run(guild._serialize())
        }

        return guild
    }

    all () {
        const guildsRaw     = this.db.prepare('SELECT * FROM guilds').all()
        const guilds        = []
        for (const i in guildsRaw) 
            guilds.push(new Guild(guildsRaw[i]))

        return guilds
    }

    getById (id) {
        const guildRaw = this.db.prepare('SELECT * FROM guilds WHERE id = ? LIMIT 1').get(id)

        return guildRaw ? new Guild(guildRaw) : null
    }

    remove (id) {
        const info = this.db.prepare('DELETE FROM guilds WHERE id = ? LIMIT 1').run(id)
        return info.changes >= 0
    }

    update (args) {
        const currentGuild = this.getById(args.id)
        
        if (!currentGuild)
            return false 
        
        args.updatedAt      = new Date() 
        let queryStr        = 'UPDATE guilds SET '

        for (let k in args._serialize()) if (currentGuild.hasOwnProperty(k) && k !== 'id') 
            queryStr += `${k}=@${k},`
        queryStr = `${queryStr.substring(0, queryStr.length - 1)} WHERE id=@id`

        return this.db.prepare(queryStr).run(args._serialize())
    }
}

module.exports = Guilds
