const generateEmbed = require('../utils/generateEmbed')
const GamerSchema   = require('../schemas/Gamer')
const Gamers        = require('../crud/Gamers')
const I18N          = require('../utils/I18N')

class Gamer {
    constructor (message, guild = { locale: 'en' }) {
        this.gamersCrud = new Gamers()
        this.user       = message.author
        this.gamer      = this.gamersCrud.getById(this.user.id) || this.gamersCrud.addOrOverwrite(new GamerSchema(this.user))
        this.guild      = guild 
        this.message    = message
        this.$t         = new I18N(guild.locale)
    }

    async askForSave (gamertag, type) {
        const cancel    = '❎'
        const confirm   = '✅'
        const notAgain  = '⛔'
        let msg         = null
        try {
            msg = await this.message.channel.send(generateEmbed({
                description : this.$t.get('rememberMeDesc', { 
                    cancel, 
                    cmdSaveGamertag : this.$t.get('cmdSaveGamertag'), 
                    confirm, 
                    gamertag, 
                    notAgain, 
                    prefix          : this.guild.prefix, 
                    type
                }),
                title       : this.$t.get('rememberMeTitle')
            }))
            await msg.react(confirm)
            await msg.react(cancel)
            await msg.react(notAgain)
            const filter = (reaction, user) => { 
                const firstCheck = [confirm, cancel, notAgain].includes(reaction.emoji.name)
                if (!firstCheck)
                    return false 

                return user.id === this.user.id
            }
            msg.awaitReactions(filter, { 
                    max     : 1, 
                    time    : (5 * 60000), 
                    errors  : ['time'] 
                }
            )
                .then(async collected => {
                    let answer      = null 
                    const reaction  = collected.first()
                    switch (reaction.emoji.name) {
                        case confirm:
                            this.gamer.gamertag = gamertag
                            answer = generateEmbed({
                                color       : '#43b581', 
                                description : this.$t.get('savedGamertagDesc', { gamertag, prefix: this.guild.prefix, cmdSaveGamertag: this.$t.get('cmdSaveGamertag') }), 
                                title       : this.$t.get('savedGamertag')
                            })
                            break 
                        case cancel:
                            answer = generateEmbed({ description: this.$t.get('saveGamertagDismissed') })
                            break 
                        case notAgain: 
                            this.gamer.dontAskAgain = true
                            answer = generateEmbed({ description: this.$t.get('saveGamertagNotAgain', { prefix: this.guild.prefix, cmdSaveGamertag: this.$t.get('cmdSaveGamertag') }) })
                            break 
                    }
                    this.gamersCrud.update(this.gamer)
                    await msg.edit(answer)
                    setTimeout(() => msg.delete().catch(err => process.dLogger.log(`in controller/Gamer/askForSave: ${err.message}`)), 6000)
                })
                .catch((err) => {
                    // nothing but timeout
                })
        } catch (err) {
            if (msg) 
                msg.delete()
        }
    }
}

module.exports = Gamer
