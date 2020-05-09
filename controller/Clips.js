require('dotenv').config() 

const axios             = require('axios')
const gameList          = require('../utils/gameList')
const GamerController   = require('./Gamer')
const Gamers            = require('../crud/Gamers')
const Guilds            = require('../crud/Guilds')
const generateEmbed     = require('../utils/generateEmbed')
const I18N              = require('../utils/I18N')
const XboxLiveAuth      = require('@xboxreplay/xboxlive-auth')
const XboxLiveAPI       = require('@xboxreplay/xboxlive-api')
const XBLAuthentication = require('../utils/XBLAuthentication')

class Clips {
    constructor (guild) {
        this.guild  = guild
        this.$t     = new I18N(guild.locale) 
    }

    async process (message, argsObject) {
        let shouldAskToSaveGamertag = false
        const gamer                 = new Gamers().getById(message.author.id)
        if (!argsObject.gamertag) {
            if (!gamer) {
                return message.channel.send(generateEmbed({
                    color       : '#ff0000',
                    description : this.$t.get('errorNoGamertagDesc', { prefix: new Guilds().getById(message.guild.id).prefix, cmdHelp: this.$t.get('cmdHelp') }), 
                    title       : this.$t.get('errorNoGamertag')
                }))
            } else 
                argsObject.gamertag = gamer.gamertag
        } else if (!gamer || ((!gamer.gamertag || gamer.gamertag.length < 1) && !gamer.dontAskAgain))
            shouldAskToSaveGamertag = true

        const msg = await message.channel.send(generateEmbed({ 
            description : this.$t.get('workingOnIt'), 
            thumbnail   : 'https://i.imgur.com/vLTtGRJ.gif', 
            title       : this.$t.get('searchInProgress')
        }))
        
        try { 
            const items = []
            let status  = '' 
            let counter = 0.1
            const itvl  = setInterval(async () => {
                if (counter < 1)
                    ++counter 
                
                try {
                    const res = await this._fetchItems(argsObject)
                    if (res.pull && ['waiting', 'started'].includes(res.pull.status) && status === '') {
                        status = res.pull.status 
                        msg.edit(generateEmbed({ 
                            description : this.$t.get('cachingData'), 
                            thumbnail   : 'https://i.imgur.com/vLTtGRJ.gif', 
                            title       : this.$t.get('searchInProgress')
                        }))
                        return 
                    } else {
                        status = res.pull.status 
                        clearInterval(itvl)
                        if (res && res.data && res.data.length > 0) 
                            items.push(...res.data.filter(d => d.game.name.includes(argsObject.game.fullname)))

                        if (items.length > 0) {
                            this._postItem(message, argsObject, items, msg)
                        } else {
                            msg.delete().then(() => 
                                message.channel.send(generateEmbed({
                                    color       : '#ff0000',
                                    description : this.$t.get('errorNoResultDesc', { type: argsObject.type, gamertag: argsObject.gamertag, game: argsObject.game.fullname }), 
                                    title       : this.$t.get('errorNoResult')
                                }))
                                .catch(err => { throw new Error(err.message) })
                            )
                            .catch(err => { throw new Error(err.message) })
                        }
                        setTimeout(() => {
                            if (shouldAskToSaveGamertag) 
                                new GamerController(message, this.guild).askForSave(argsObject.gamertag, argsObject.type)
                        }, 1000)
                    }
                } catch (err) {
                    clearInterval(itvl)
                    msg.edit(generateEmbed({
                        color       : '#ff0000',
                        description : this.$t.get('errorGenericDesc', { error: err.message }), 
                        title       : this.$t.get('errorGeneric') 
                    }))
                }
            }, counter * 2000) 
        } catch (err) {
            msg.edit(generateEmbed({
                color       : '#ff0000',
                description : this.$t.get('errorGenericDesc', { error: err.message }), 
                title       : this.$t.get('errorGeneric') 
            }))
        }
    }

    async _fetchItems (args) {
        try {
            let items = []
            if (args.game.id) { // some games have a unique game id, in this case we can use the Xbox Replay /search endpoint
                // TBD
            } else { // if not, we'll use /clips or /screenshots and filter by ourselves
                const itemsType = args.type === 'gameclip' ? 'clips' : 'screenshots'  
                const { data }  = await axios.get(`https://api.xboxreplay.net/players/${args.gamertag.toLowerCase().replace(/ /g, '-')}/${itemsType}`, {
                    headers: {
                        'Authorization': process.env.XBOXREPLAY_AUTHORIZATION
                    }
                })
                return data 
            }
            
            return items
        } catch (err) {
            throw new Error(err.message)
        }
    }

    async _reactionsToMessage(messageToEdit, originalMessage, argsObject, items = [], index) {
        
        const dl    = '📥'
        const prev  = '⏪'
        const next  = '⏩'
        try {
            messageToEdit.react(dl).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`))
            if (items.length > index + 1)
                setTimeout(() => messageToEdit.react(prev).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`)), 1) 
            if (index > 0)
                setTimeout(() => messageToEdit.react(next).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`)), 1)
            
            const filter = (reaction, user) => {
                const firstCheck = [dl, prev, next].includes(reaction.emoji.name)
                if (!firstCheck)
                    return false 
                
                return user.id === originalMessage.author.id
            }

            const collector = messageToEdit.createReactionCollector(filter, { time: 5 * 60000 })
            collector.on('collect', reaction => {
                switch (reaction.emoji.name) {
                    case dl: 
                        originalMessage.channel.send(this.$t.get('dlLink', { type: argsObject.type, link: items[index].download_urls.source }))
                        break 
                    case prev: 
                        this._postItem(originalMessage, argsObject, items, messageToEdit, index + 1)
                        break 
                    case next:
                        this._postItem(originalMessage, argsObject, items, messageToEdit, index - 1)
                        break
                }
                collector.stop()
                messageToEdit.reactions.removeAll().catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage, failed to clear reactions: ${err.message}`))
            })
        } catch (err) {
            throw new Error(`in controller/Clips/_reactionsToMessage: ${err.message}`)
        }
    }

    async _postItem (originalMessage, argsObject, items, messageToEdit, index = 0) {
        const locale        = this.guild.locale === 'en' ? 'en-US' : 'fr-FR'
        let xboxReplayUri   = `https://www.xboxreplay.net/player/${argsObject.gamertag.toLowerCase().replace(/ /g, '-')}/${argsObject.type === 'gameclip' ? `clips` : `screenshots`}/${items[index].id}`
        if (argsObject.game.ids && argsObject.game.ids.length > 0 ) // we can use the /search endpoint
            xboxReplayUri = `https://api.xboxreplay.net/search/game-dvr?target=${argsObject.type === 'gameclip' ? `clips` : `screenshots`}&gamertag=${argsObject.gamertag.toLowerCase().replace(/ /g, '-')}&game_id=${argsObject.game.ids.join(',')}`

        const fields        = [
            { name: '.', value: this.$t.get('download'), inline: true },
            { name: '.', value: this.$t.get('notThisClip', {type: this.$t.get(argsObject.type)}), inline: true }
        ]
        if (index > 0) 
            fields.push({ name: '.', value: this.$t.get('next'), inline: true })
        
        messageToEdit.edit(
            generateEmbed({
                author      : {
                    iconURL : 'https://i.imgur.com/AqZ1KLb.png',
                    name    : 'XboxReplay.net',
                    url     : 'https://www.xboxreplay.net/'
                }, 
                color       : '#107c10',
                description : this.$t.get('itemInfo', { 
                    type: this.$t.get(argsObject.type)[0].toUpperCase() + this.$t.get(argsObject.type).slice(1), 
                    date: new Date(items[index].uploaded_at).toLocaleDateString(locale), 
                    time: new Date(items[index].uploaded_at).toLocaleTimeString(locale), 
                    url : xboxReplayUri, 
                    link: xboxReplayUri
                }), 
                fields, 
                image       : `https://sharp.xboxreplay.net/image?url=${encodeURIComponent(items[index].thumbnail_urls.small)}`,
                thumbnail   : gameList.find(g => g.fullname === items[index].game.name).image, 
                title       : this.$t.get('latestItem', { gamertag: argsObject.gamertag, game: items[index].game.name }),
                url         : xboxReplayUri
            }))
            .then(() => this._reactionsToMessage(messageToEdit, originalMessage, argsObject, items, index))
            .catch(err => { throw new Error(err.message) })
    }
}

module.exports = Clips
