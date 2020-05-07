const Database  = require('better-sqlite3')
const Gamer     = require('../schemas/Gamer') 

class Gamers {
    constructor () {
        try {
            this.db = new Database('data/gamers.db')

            const createGamersTable = `CREATE TABLE IF NOT EXISTS gamers (
                id VARCHAR(30) PRIMARY KEY,
                joinedAt DATETIME,
                gamertag VARCHAR(255),
                name VARCHAR(255),
                dontAskAgain BOOLEAN
            );`;
            this.db.exec(createGamersTable)
        } catch (err) {
            process.dLogger.log(`in crud/Gamers/constructor: ${err.message}`)
        }
    }

    addOrOverwrite (gamer) {
        const checkExistence = this.getById(gamer.id)

        if (!checkExistence) {
            let queryStr    = 'INSERT INTO gamers '
            let rowNames    = ''
            let namedValues = '' 

            for (let k in gamer._serialize()) {
                rowNames    += `${k},`
                namedValues += `@${k},`
            }

            rowNames    = rowNames.substring(0, rowNames.length - 1)
            namedValues = namedValues.substring(0, namedValues.length - 1)
            queryStr    += `(${rowNames}) VALUES (${namedValues})`

            const statement = this.db.prepare(queryStr)

            statement.run(gamer._serialize())
        }

        return gamer
    }

    all () {
        const gamersRaw     = this.db.prepare('SELECT * FROM gamers').all()
        const gamers        = []
        for (const i in gamersRaw) 
            gamers.push(new Guild(gamersRaw[i]))

        return gamers
    }

    getById (id) {
        const gamerRaw = this.db.prepare('SELECT * FROM gamers WHERE id = ? LIMIT 1').get(id)

        return gamerRaw ? new Gamer(gamerRaw) : null
    }

    remove (id) {
        const info = this.db.prepare('DELETE FROM gamers WHERE id = ? LIMIT 1').run(id)
        return info.changes >= 0
    }

    update (args) {
        const currentGamer = this.getById(args.id)
        
        if (!currentGamer)
            return false 
        
        args.updatedAt      = new Date() 
        let queryStr        = 'UPDATE gamers SET '

        for (let k in args._serialize()) if (currentGamer.hasOwnProperty(k) && k !== 'id') 
            queryStr += `${k}=@${k},`
        queryStr = `${queryStr.substring(0, queryStr.length - 1)} WHERE id=@id`

        return this.db.prepare(queryStr).run(args._serialize())
    }
}

module.exports = Gamers
