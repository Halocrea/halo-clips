const { MessageEmbed } = require('discord.js')

module.exports = ({ color, description, fields, footer, image, thumbnail, title, author, url }) => {
    const embed = new MessageEmbed()
        .setTitle(title || '')
        .setColor(color || '#faa61a')
        .setDescription(description || '')

    if (author) 
        embed.setAuthor(author.name, author.iconURL || null, author.url || null)

    if (url) 
        embed.setURL(url)

    if (thumbnail)
        embed.setThumbnail(thumbnail)

    for (let i in fields)
        embed.addField(fields[i].name, fields[i].value, !!fields[i].inline)

    if (image) 
        embed.attachFiles([image]).setImage('attachment://image.png');
    
    if (footer)
        embed.setFooter(footer)

    return embed
}
