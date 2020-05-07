const Clips         = require('./Clips')
const Gamers        = require('../crud/Gamers')
const generateEmbed = require('../utils/generateEmbed')
const I18N          = require('../utils/I18N')
const XboxLiveAPI   = require('@xboxreplay/xboxlive-api')

class General {
    constructor (message, guild) {
        this.message    = message 
        this.guild      = guild 
        this.$t         = new I18N(guild.locale)
    }

    async help () {
        const commands = Object.keys(this.$t.translations)
            .filter(key => key.startsWith('cmd'))
            .reduce((obj, key) => {
                obj[key] = this.$t.translations[key]
                return obj
            }, {})

        let description = ''
        description += this.$t.get('helpText', Object.assign({
                prefix          : this.guild.prefix,
                discordInvite   : 'https://discord.gg/74UAq84'
            }, commands))

        this.message.channel.send(generateEmbed({
            color       : '#43b581',
            description, 
            footer      : this.$t.get('madeWithLove'),
            thumbnail   : 'https://i.imgur.com/NUt6Rrr.png',
            title       : this.$t.get('helpTitle')
        }))
        .catch(err => process.dLogger.log(`in controller/General/help: ${err.message}`))
    }

    inviteBot () {
        this.message.channel.send(this.$t.get('inviteText', { botInviteLink: `https://discordapp.com/oauth2/authorize?client_id=${message.client.user.id}&scope=bot&permissions=93248` }))
    }

    releaseInfo () {
        this.message.channel.send(generateEmbed({
            color       : '#43b581',
            description : this.$t.get('releaseInfo', { prefix: this.guild.prefix, cmdSaveGamertag: this.$t.get('cmdSaveGamertag'), cmdHelp: this.$t.get('cmdHelp') }),
            footer      : this.$t.get('madeWithLove'),
            title       : this.$t.get('releaseInfoTitle'),
            thumbnail   : 'https://i.imgur.com/NUt6Rrr.png'
        }))
        .catch(err => process.dLogger.log(`in controller/General/releaseInfo: ${err.message}`))
    }

    async saveGamertag (gamertag) {
        const auth = await new Clips(this.guild)._authenticate()
        try {
            const userXuid  = await XboxLiveAPI.getPlayerXUID(gamertag, auth)
            if (!userXuid)
                throw new Error('player not found')
            const gamersCrud    = new Gamers() 
            const gamer         = gamersCrud.getById(this.message.author.id) || gamersCrud.addOrOverwrite(new Gamer(message.author))
            gamer.gamertag      = gamertag 
            
            gamersCrud.update(gamer)
            this.message.channel.send(generateEmbed({
                color       : '#43b581',
                description : this.$t.get('savedGamertagDesc', { gamertag, prefix: this.guild.prefix, cmdSaveGamertag: this.$t.get('cmdSaveGamertag') }),
                title       : this.$t.get('savedGamertag')
            }))
            .catch(err => process.dLogger.log(`in controller/General/help: ${err.message}`))
        } catch (err) {
            this.message.channel.send(generateEmbed({
                color       : '#ff0000',
                description : this.$t.get('errorGenericDesc', { error: err.message }), 
                title       : this.$t.get('errorGeneric')
            })).catch(error => process.dLogger.log(`in commands/MainCommands/handle: ${error.message}`))
        }

    }
}

module.exports = General 
