require('dotenv').config()

const Discord       = require('discord.js')
const Guild         = require('./schemas/Guild')
const Guilds        = require('./crud/Guilds')
const MainCommands  = require('./commands/MainCommands')
let dLogger;

const client            = new Discord.Client({
    ws: { intents: [
        'GUILDS', 
        'GUILD_MESSAGES', 
        'GUILD_MESSAGE_REACTIONS', 
        'GUILD_INVITES', 
        'GUILD_INTEGRATIONS'
    ]}
})

// client.on('debug', console.log)

client.on('ready', async () => {
    dLogger = await require('./utils/dLogger').init(client)

    client.user.setStatus('available')
    client.user.setActivity('>> help | >> release-info', {
        type: 'PLAYING',
        url : 'https://halocrea.com/'
    }) 
    console.log('the bot is ready')
})

client.on('message', async message => {
    if (!message.guild) // MPs
        return 

    const guilds    = new Guilds(dLogger)
    let guild       = guilds.getById(message.guild.id)

    if (!guild) 
        guild = guilds.addOrOverwrite(new Guild(message.guild))
    
    if (message.content.startsWith(guild.prefix)) 
        new MainCommands(dLogger).handle(message, guild)
})

client.on('guildCreate', guild => {
    dLogger && dLogger.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!\nI'm serving ${client.guilds.cache.size} servers now.`)
})

client.on('guildDelete', guild => {
    dLogger && dLogger.log(`${guild.name} (id: ${guild.id}) removed me.\nI'm serving ${client.guilds.size} servers now.`)
})

console.log('Sarting the bot...')
client.login(process.env.DISCORD_TOKEN)
