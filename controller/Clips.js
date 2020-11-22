require('dotenv').config() 

const axios                 = require('axios')
const fs                    = require('fs')
const gameList              = require('../utils/gameList')
const GamerController       = require('./Gamer')
const Gamers                = require('../crud/Gamers')
const Guilds                = require('../crud/Guilds')
const generateEmbed         = require('../utils/generateEmbed')
const https                 = require('https')
const I18N                  = require('../utils/I18N')
const { MessageAttachment } = require('discord.js')
const XboxLiveAuth          = require('@xboxreplay/xboxlive-auth')
const XboxLiveAPI           = require('@xboxreplay/xboxlive-api')
const XBLAuthentication     = require('../utils/XBLAuthentication')
const XBOX_LIVE_DOMAINS     = {
    screenshots : 'https://screenshotsmetadata.xboxlive.com/',
    gameclips   : 'https://gameclipsmetadata.xboxlive.com/',
    profile     : 'https://profile.xboxlive.com/'
}

/* HOW DOES IT WORK
 * 
 * First of all, the method used here is absolutely not the "official" way to access the XBLive API.
 * You must register as a game developer to access the API in a regular fashion.
 * Here, we use the unofficial API wrapper from @xboxreplay.
 * There are 4 steps to retrieve our clips and screenshots, which makes the process a bit long, sadly: 
 *  1. authenticate to the XBL API as a regular player
 *  2. Retrieve the current gamer's XUID
 *  3. Fetch the clips & screenshots from the XBL API
 *  4. Fetch that item but proxified by XboxReplay
 * 
 */

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

        const msg = await message.channel.send(generateEmbed({ title: this.$t.get('searchInProgress'), description: this.$t.get('workingOnIt') + '\n\n💚🖤🖤🖤🖤' }))
        try {
            msg.edit(generateEmbed({ title: this.$t.get('searchInProgress'), description: this.$t.get('authenticating') + '\n\n💚💚🖤🖤🖤' }))
            const authInfo = await this._authenticate()

            msg.edit(generateEmbed({ title: this.$t.get('searchInProgress'), description: this.$t.get('retrievingPlayerInfo', { gamertag: argsObject.gamertag }) + '\n\n💚💚💚🖤🖤' }))
            const userXuid  = await XboxLiveAPI.getPlayerXUID(argsObject.gamertag, authInfo)
            
            msg.edit(generateEmbed({ title: this.$t.get('searchInProgress'), description: this.$t.get('fetchingData') + '\n\n💚💚💚💚🖤' }))
            const path_1    = require('path') 
            let uri         = (argsObject.type === 'gameclip' ? XBOX_LIVE_DOMAINS.gameclips : XBOX_LIVE_DOMAINS.screenshots) + path_1.join('users', `xuid(${userXuid})`, argsObject.type === 'gameclip' ? 'clips' : 'screenshots')
            const args      = { qs: { maxItems: 20 } }
            
            const items     = await this._fetchItems(uri, authInfo, args, argsObject.type, argsObject.game)

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
        } catch (err) {
            msg.edit(generateEmbed({
                color       : '#ff0000',
                description : this.$t.get('errorGenericDesc', { error: err.message }), 
                title       : this.$t.get('errorGeneric') 
            }))
        }
    }

    async _authenticate () {
        try {
            const savedAuth = XBLAuthentication.get()
            if (savedAuth.expiresOn && 
                savedAuth.expiresOn.length > 0 &&
                new Date(savedAuth.expiresOn) > new Date()
            ) 
                return savedAuth
            else {
                const auth = await XboxLiveAuth.authenticate(process.env.XBL_EMAIL, process.env.XBL_PASSWORD)
                return XBLAuthentication.save(auth)
            }
        } catch (err) {
            throw new Error(`in utils/Clips/authenticate, couldn't fetch authentication infos: ${err.message}`)
        }
    }

    async _fetchItems (url, authInfo, args, type, game, continuationToken = null) {
        try {
            if (continuationToken)
                args.continuationToken = continuationToken
            
            const result    = await XboxLiveAPI.call({ url }, authInfo, args)
            const itemsType = type === 'gameclip' ? 'gameClips' : 'screenshots'  
            let items       = result[itemsType].filter(item => item.titleName.includes(game.fullname))
            
            if (items.length < 1) {
                if (result.pagingInfo && result.pagingInfo.continuationToken) {
                    return this._fetchItems(url, authInfo, args, type, game, result.pagingInfo.continuationToken)
                } else 
                    return []
            } else 
                return items
        } catch (err) {
            throw new Error(`in controller/Clips/_fetchItems: ${err.message}`)
        }
    }

    _getClip(url) {
        const dest = `./tmp/${Math.random()}.mp4`
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest, { flags: "wx" });
    
            const request = https.get(url, response => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                } else {
                    file.close();
                    fs.unlink(dest, () => {}); // Delete temp file
                    reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
                }
            });
    
            request.on("error", err => {
                file.close();
                fs.unlink(dest, () => {}); // Delete temp file
                reject(err.message);
            });
    
            file.on("finish", () => {
                resolve(dest);
            });
    
            file.on("error", err => {
                file.close();
    
                if (err.code === "EEXIST") {
                    reject("File already exists");
                } else {
                    fs.unlink(dest, () => {}); // Delete temp file
                    reject(err.message);
                }
            });
        });
    }
    
    _getImage(url, callback) {
        https.get(url, res => {
            // Initialise an array
            const bufs = [];
    
            // Add the data to the buffer collection
            res.on('data', function (chunk) {
                bufs.push(chunk)
            });
    
            // This signifies the end of a request
            res.on('end', function () {
                // We can join all of the 'chunks' of the image together
                const data = Buffer.concat(bufs);
    
                // Then we can call our callback.
                callback(null, data);
            });
        })
        // Inform the callback of the error.
        .on('error', callback);
    }

    async _reactionsToMessage(messageToEdit, originalMessage, argsObject, items = [], index, title, description) {
        
        const dl    = '📥'
        const prev  = '⏪'
        const next  = '⏩'
        const show  = '🎦'
        try { 
            messageToEdit.react(dl).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`))
            if (items.length > index + 1)
                setTimeout(() => messageToEdit.react(prev).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`)), 1) 
            if (index > 0)
                setTimeout(() => messageToEdit.react(next).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`)), 1)
            
            if (items[index].gameClipUris && items[index].gameClipUris[0])
                messageToEdit.react(show).catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage: ${err.message}`))

            const filter = (reaction, user) => { 
                const firstCheck = [dl, prev, next, show].includes(reaction.emoji.name)
                if (!firstCheck)
                    return false 
                
                return user.id === originalMessage.author.id
            }

            const collector = messageToEdit.createReactionCollector(filter, { time: 5 * 60000 })
            collector.on('collect', reaction => {
                const user      = reaction.users.cache.last()
                switch (reaction.emoji.name) {
                    case dl: 
                        const dlLink = `https://api.xboxreplay.net/ugc-files/xuid-${items[index].xuid}/${argsObject.type === 'gameclip' ? `${items[index].gameClipId}/gameclip.mp4` : `${items[index].screenshotId}/screenshot.png`}`
                        originalMessage.channel.send(this.$t.get('dlLink', { type: argsObject.type, link: dlLink }))
                        collector.stop()
                        messageToEdit.reactions.removeAll().catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage, failed to clear reactions: ${err.message}`))
                        break 
                    case prev: 
                        this._postItem(originalMessage, argsObject, items, messageToEdit, index + 1)
                        collector.stop()
                        messageToEdit.reactions.removeAll().catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage, failed to clear reactions: ${err.message}`))
                        break 
                    case next:
                        this._postItem(originalMessage, argsObject, items, messageToEdit, index - 1)
                        collector.stop()
                        messageToEdit.reactions.removeAll().catch(err => process.dLogger.log(`in controller/Clips/_reactionsToMessage, failed to clear reactions: ${err.message}`))
                        break
                    case show: 
                        collector.stop()
                        messageToEdit.delete().then(() => {
                            originalMessage.channel.send(generateEmbed({ 
                                description : this.$t.get('uploading'), 
                                thumbnail   : 'https://i.imgur.com/vLTtGRJ.gif', 
                                title       : this.$t.get('workingOnIt')
                            }))
                                .then(msg => {
                                    this._postClip(items[index].gameClipUris[0].uri, title, description)
                                        .then(res => { 
                                            const itvl = setInterval(() => {
                                                axios.get(res)
                                                    .then(() => {
                                                        clearInterval(itvl)
                                                        msg.delete().then(() => {
                                                            originalMessage.channel.send(`> ** ${title}: ** \n${res}`)
                                                        })
                                                    })
                                                    .catch(() => {})
                                            }, 2500)
                                        })
                                })
                        })
                        break
                }
            })
        } catch (err) {
            throw new Error(`in controller/Clips/_reactionsToMessage: ${err.message}`)
        }
    }

    _postClip (video, title, description) { 
        return this._getClip(video).then(res => {
            const FormData = require('form-data')
            const data = new FormData()
            data.append('video', fs.createReadStream(res))

            return axios({
                method: 'post',
                url: 'https://api.imgur.com/3/upload',
                headers: { 
                    'Authorization': 'Client-ID 18e2840ca2ac4e2', 
                    ...data.getHeaders()
                },
                maxContentLength: 209715200, 
                maxBodyLength: 209715200,
                data : data,
                disable_audio: 0,
                title,
                description
            }).then(({ data }) => { 
                fs.unlink(res, () => {})
                if (data.status === 200 && data.data)
                    return data.data.mp4
            }).catch(err => console.log(err => {
                fs.unlink(res, () => {})
                throw new Error(`in controller/Clips/_reactionsToMessage: ${err.message}`)
            }))
        })
    }

    async _postItem (originalMessage, argsObject, items, messageToEdit, index = 0) {
        const locale        = this.guild.locale === 'en' ? 'en-US' : 'fr-FR'
        let xboxReplayUri   = `https://www.xboxreplay.net/player/${argsObject.gamertag.toLowerCase().replace(/ /g, '-')}/`
        xboxReplayUri       += argsObject.type === 'gameclip' ? `clips/${items[index].gameClipId}` : `screenshots/${items[index].screenshotId}`
        const chan          = messageToEdit.channel 
        const title         = this.$t.get('latestItem', { gamertag: argsObject.gamertag, game: items[index].titleName })
        const description   = this.$t.get('itemInfo', { 
            type: this.$t.get(argsObject.type)[0].toUpperCase() + this.$t.get(argsObject.type).slice(1), 
            date: new Date(items[index].datePublished).toLocaleDateString(locale), 
            time: new Date(items[index].datePublished).toLocaleTimeString(locale), url: xboxReplayUri, 
            link: xboxReplayUri
        })
        
        this._getImage(items[index].thumbnails[0].uri, (err, data) => { 
            const fields = [{ name: this.$t.get('download'), value: this.$t.get('downloadText'), inline: true }]

            if (items[index].gameClipUris && items[index].gameClipUris[0]) 
                fields.push({ name: this.$t.get('show'), value: this.$t.get('showText'), inline: true })
            else 
                fields.push({ name: this.$t.get('notThisClip'), value: this.$t.get('notThisClipText', {type: this.$t.get(argsObject.type)}), inline: true })
            
            messageToEdit.delete().then(() => {
                chan.send(
                    generateEmbed({
                        author      : {
                            iconURL : 'https://i.imgur.com/AqZ1KLb.png',
                            name    : 'XboxReplay.net',
                            url     : 'https://www.xboxreplay.net/'
                        }, 
                        color       : '#107c10',
                        description, 
                        fields, 
                        footer      : this.$t.get('footerNote'), 
                        image       : new MessageAttachment(data, 'image.png'),
                        thumbnail   : gameList.find(g => g.fullname === items[index].titleName).image, 
                        title,
                        url         : xboxReplayUri
                    }))
                    .then(msg => this._reactionsToMessage(msg, originalMessage, argsObject, items, index, title, description))
                    .catch(err => { throw new Error(err.message) })
            })
        }) 
    }
}

module.exports = Clips
