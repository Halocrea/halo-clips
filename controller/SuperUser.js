const generateEmbed = require('../utils/generateEmbed')
const Guilds        = require('../crud/Guilds')
const I18N          = require('../utils/I18N')

class SuperUser {
    constructor (message, guild) { 
        this.guilds     = new Guilds() 
        this.guild      = guild 
        this.message    = message
        this.$t         = new I18N(guild.locale)
    }

    async prefix (arg) {
        const canDoThis = await this._checkAuthorization(this.message)
        if (!canDoThis)
            return 

        const strippedContent = arg.replace(/#| |@|`/g, '')
        if (strippedContent.length < 1) {
            return this.message.channel.send(generateEmbed({
                color       : '#ff0000',
                description : this.$t.get('changePrefix', { prefix: this.guild.prefix }),
                title       : this.$t.get('errorInvalidPrefix')
            }))
        }
        this.guild.prefix = strippedContent
        this.guilds.update(this.guild)
        
        this.message.channel.send(generateEmbed({
            color       : '#43b581', 
            title       : this.$t.get('changePrefixSuccess', { prefix: this.guild.prefix })
        }))
    }

    async setLang (arg) {
        const canDoThis = await this._checkAuthorization(this.message)
        if (!canDoThis)
            return 

        const msg       = await this.message.channel.send(generateEmbed({
            description : 'Please select in reaction to this message the bot\'s language for this server:\n• 🇺🇸 English (USA)\n• 🇫🇷 Français (France)',
            title       : 'Language selection' 
        }))
        const languages = [
            {
                flag: '🇺🇸',
                key : 'en'
            },
            {
                flag: '🇫🇷',
                key : 'fr'
            }
        ]
        languages.forEach(async l => await msg.react(l.flag))
        const filter = (reaction, user) => { 
            const firstCheck = Array.from(languages, l => l.flag).includes(reaction.emoji.name)
            if (!firstCheck)
                return false 

            return user.id === this.message.author.id
        }
        msg.awaitReactions(filter, { 
                max     : 1, 
                time    : (5 * 60000), 
                errors  : ['time'] 
            }
        )
            .then(async collected => { 
                const reaction      = collected.first()
                this.guild.locale   = languages.find(l => l.flag === reaction.emoji.name).key
                this.guilds.update(this.guild)
                this.$t = new I18N(this.guild.locale)
                msg.edit(generateEmbed({
                    color       : '#43b581',
                    description : this.$t.get('setLanguageSuccessDesc'),
                    title       : this.$t.get('setLanguageSuccess')
                }))
                
            })
            .catch((err) => {
                // nothing but timeout
            })
    }

    async uninstall () {
        const canDoThis = await this._checkAuthorization()
        if (!canDoThis)
            return 
            
        const confirm   = '✅'
        const cancel    = '❎'
        const msg = await this.message.channel.send(generateEmbed({
            description : this.$t.get('confirmUninstall', { confirm, cancel }), 
            title       : this.$t.get('confirmUninstallTitle')
        }))
        msg.react(confirm)
        msg.react(cancel)
        const filter = (reaction, user) => {
            const firstCheck = [confirm, cancel].includes(reaction.emoji.name)
            if (!firstCheck)
                return false 

            return user.id === this.message.author.id
        }
        msg.awaitReactions(filter, { 
                max     : 1, 
                time    : (5 * 60000), 
                errors  : ['time'] 
            }
        )
            .then(collected => {
                const reaction  = collected.first()

                if (reaction.emoji.name === confirm) {
                    this.message.channel.send('See you, space cowboy!')
                        .then(() => {
                            this.guilds.remove(this.guild.id)
                            this.message.guild.leave()
                        })

                } else
                    this.message.channel.send(this.$t.get('goodCancel'))

                
            })
            .catch(err => process.dLogger.log(`in controller/SuperUser/uninstall: ${err.message}`))
    }

    async _checkAuthorization () {
        const discordGuild  = this.message.guild
        const member        = await discordGuild.members.fetch(this.message.author)
        if (!member.hasPermission('ADMINISTRATOR')) {
            this.message.channel.send(this.$t.get('errorNotAllowed'))
            return false
        }
        
        return true
    }
}

module.exports = SuperUser
