<h1 align="center">Halo Clips ⏩</h1>
<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version2.0.0-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/node-%3E%3D12.16.1-blue.svg" />
  <img src="https://img.shields.io/badge/yarn-%3E%3D1.19.1-blue.svg" />
  <a href="https://choosealicense.com/licenses/gpl-3.0/" target="_blank">
    <img alt="License: GNU GPLv3" src="https://img.shields.io/badge/License-GNU GPLv3-yellow.svg" />
  </a>
  <img src="https://img.shields.io/maintenance/yes/2020" />
  <br />
  <a href="https://discord.gg/74UAq84" target="_blank">
    <img src="https://img.shields.io/discord/443833089966342145?color=7289DA&label=Halo%20Cr%C3%A9ation&logo=Discord" />
  </a>
  <a href="https://twitter.com/HaloCreation" target="_blank">
    <img src="https://img.shields.io/twitter/follow/HaloCreation?color=%232da1f3&logo=Twitter&style=flat-square" />
  </a>
</p>

> Call me with `>>`, and I'll fetch for you your latest Halo clip from Xbox Live and display it in a pretty way!

## RELEASE NOTES
The Halo Clips bot's is now faster, easier to use, more resilient and with more features!
- Fetchings clips and screenshots is not 30 to 50% faster than before!
- You can navigate to older clips/screenshots using the ⏪ and ⏩ reactions.
- You can get a direct download link to your clip or screenshot by clicking the 📥 reaction.
- You can save your gamertag using the `>> save Your Gamertag` command. 
- You can specify one game by using its full name or an abridged version of it. 
- The parameters of the basic command can be put in any order: `>> Tepec Fett Reach screenshot` or `>> Reach screenshot Tepec Fett`, the bot will understand both just the same way!
- The bot can be set to english or french.  
- You can set a prefix other than the default `>>` for your server!
Use `>> help` to see the full list of available commands. 

### NOTES ON BRANCHES AND XBOX REPLAY PARTNERSHIP
By default on the `master` branch, Halo Clips uses [@xboxreplay/xboxlive-auth](https://github.com/XboxReplay/xboxlive-auth) and [@xboxreplay/xboxlive-api](https://github.com/XboxReplay/xboxlive-api) node packages to authenticate and access the Xbox Live API, which is great and only requires an Xbox Live account's credentials to work.

**However**, the `xboxreplay-partner-access` branch depends on Xbox Replay (free) API. If you want to get access to it, feel free to contact Xbox Replay on Twitter @XboxReplayNet or by email at api@xboxreplay.net.   

## Prerequisites

- [node](https://nodejs.org/en/) >=12.16.1
- [yarn](https://yarnpkg.com) >=1.19.1

## Install 
### With Docker 
A `Dockerfile` is available at the root of the project so you can easily set the bot up without having to care about any global dependency or anything. If you want to do it this way, make sure you have [Docker](https://www.docker.com) installed on your machine.

```bash session
git clone https://github.com/tepec/halo-clips.git
cd halo-clips

cp .env.dist .env
vi .env
#provide the information required in the .env file

docker build -t halo-clips .
docker run -d -v /absolute/path/to/halo-clips/data:/app/data --restart=always --name=halo-clips halo-clips
```

### Without Docker
Make sure you have the proper [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com) versions installed on your machine.
```bash session
git clone https://github.com/halocrea/halo-clips.git
cd halo-clips

cp .env.dist .env
vi .env
#provide the information required in the .env file

yarn

node index.js
```

## Setup 
* If you never set up a Discord bot before, please follow the instructions over [here](https://discordapp.com/developers/docs/intro).
* If you don't want to host your own version of the bot but consume an existing instance of it, you can use the following invite link: https://discordapp.com/oauth2/authorize?client_id=606574501723111447&scope=bot&permissions=93248
* Once that is done, invite the bot to your server, and type `>> help` to get the list of available commands.

## Supported languages 
* 🇺🇸 English
* 🇫🇷 French

If you'd like to get the bot in another language, feel free to contact us and contribute! 

## Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Halocrea/halo-clips.git). 

## Show your support

Give a ⭐️ if this project helped you!
