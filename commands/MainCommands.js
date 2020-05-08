require('dotenv').config()

const Clips         = require('../controller/Clips')
const gameList      = require('../utils/gameList') 
const General       = require('../controller/General')
const generateEmbed = require('../utils/generateEmbed')
const SuperUser     = require('../controller/SuperUser')
const I18N          = require('../utils/I18N')


class MainCommands {
    async handle (message, guild) {
        this.prefix         = guild.prefix
        this.$t             = new I18N(guild.locale)
        let cmdAndArgs      = 
            message.content
                .replace(this.prefix, '')
                .replace(/‘|’/g, '\'')
                .replace(/“|”/g, '"')
                .replace(/«|»/g, '"')
                .trim()
                .match(/[^\s"]+|"([^"]*)"/g)
            
        cmdAndArgs = Array.from(cmdAndArgs, a => a.replace(/"/g, ''))
        const cmd           = cmdAndArgs[0]
        let args            = ''

        for (let i = 1; i < cmdAndArgs.length; i++) 
            args += cmdAndArgs[i] + ' '
        args = args.trim()
        try {
            switch (cmd) {
                case this.$t.get('cmdHelp'): 
                    new General(message, guild).help()
                    break 
                case this.$t.get('cmdInvite'):
                    new General(message, guild).inviteBot()
                    break 
                case this.$t.get('cmdPrefix'): 
                    new SuperUser(message, guild).prefix(args)
                    break
                case this.$t.get('cmdLang'):
                    new SuperUser(message, guild).setLang()
                    break 
                case this.$t.get('cmdReleaseInfo'):
                    new General(message, guild).releaseInfo()
                    break 
                case this.$t.get('cmdSaveGamertag'):
                    new General(message, guild).saveGamertag(args)
                    break 
                case this.$t.get('cmdUninstall'): 
                    new SuperUser(message, guild).uninstall()
                    break
                default: 
                    new Clips(guild).process(message, this._understandArgs(cmdAndArgs))
                    break
            }
        } catch (err) {
            process.dLogger.log(`in commands/MainCommands/handle: ${err.message}`)
            message.channel.send(generateEmbed({
                color       : '#ff0000',
                description : this.$t.get('errorGenericDesc', { error: err.message }), 
                title       : this.$t.get('errorGeneric')
            })).catch(error => process.dLogger.log(`in commands/MainCommands/handle: ${error.message}`))
        }
    }

    _understandArgs (args) {
        args = Array.from(args, a => a.toLowerCase())
        const indexOfScreenshot = args.indexOf(this.$t.get('paramScreenshot'))
        const params            = { type: 'gameclip', gamertag: null, game: { fullname: 'Halo' } }
        if (args.length < 0)
            return params

        if (indexOfScreenshot >= 0) {
            params.type = 'screenshot'
            args.splice(indexOfScreenshot, 1)
        } else {
            const indexOfClip = args.indexOf(this.$t.get('paramClip'))
            if (indexOfClip >= 0) 
                args.splice(indexOfClip, 1)
        }

        if (args.length > 0) {
            let game        = args.find(a => !!gameList.some(g => a.length > 1 && g.keys.toLowerCase().includes(a)))
            const gameIndex = args.findIndex(a => !!gameList.some(g => a.length > 1 && g.keys.toLowerCase().includes(a))) 

            if (game === 'halo') { // if someone writes the name of the game like "Halo 2", I need to concatenate the two because in the args it's ['Halo', '2']
                const idx = args.findIndex(a => !!gameList.some(g => a.length > 1 && g.keys.toLowerCase().includes(a)))
                if (idx >= 0 && args.length > idx + 1) {
                    game = `${args[idx]} ${args[idx + 1]}`
                    args.splice(idx + 1, 1)
                }
            } 

            if (game) {
                params.game = gameList.find(g => g.keys.toLowerCase().includes(game))
                args.splice(gameIndex, 1)
            }
            if (args.length > 0) 
                params.gamertag = args.join(' ')
        }

        return params
    }
}

module.exports = MainCommands
