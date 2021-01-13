/**
 * 
 * CONFIGURATION - LANCEMENT DU BOT - CONNEXION BD - IMPORTS DES RESSOURCES ET BIBLIOTHEQUES NECESSAIRES
 * 
 */

// Importation de la bibliothèque discord.js
const Discord = require('discord.js');

// Importation des constantes de configuration
const { BOT_TOKEN, PREFIX, MESSAGE_ID, EMOJI_ID, ROOM_ID } = require('./config');

// Importation sequelize
const { Sequelize } = require('sequelize');

// Connexion bd sql
const sequelize = new Sequelize("discord-bot", "root", "", {
    host: "localhost",
    dialect: "mysql",
    logging: false
});

// Importation du modèle Commands
const Commands = require('./Models/Commands')(sequelize, Sequelize.DataTypes);

// Instanciation du client 
const client = new Discord.Client({
    partials: [
        "MESSAGE",
        "REACTION"
    ]
});

// On attend que le bot soit prêt
client.on('ready', () => {
    // Instancier le modele Commands
    Commands.sync();

    // Changement de statu - setPresence retourne une promesse, need then/catch
    client.user.setPresence({ 
        activity: {name:'En développement'}, 
        status:'dnd'
    })
    .then(console.log)
    .catch(console.error)
})

/**
 * 
 * REACTION A UN MESSAGE
 * 
 */
client.on('message', (message)=>{
    // Si le message est une commande (qui commence par le préfix)
    if(message.content.startsWith(PREFIX)){
        // On récupère un tableau des arguments sans le prefixe
        const input = message.content.slice(PREFIX.length).trim().split(' ');
        // On récupère la commande
        const command = input.shift();

        // On transforme les arguments en string
        const commandArgs = input.join(' ');

        // On recherche la commande dans la bd, findOne retourne une promesse, donc then/catch
        // équivaut à : SELECT id, command, message, deleteMessage FROM commands WHERE command = :command LIMIT 1
        Commands.findOne({
            attributes: ["id", "command", "message", "deleteMessage"],
            where: {
                command: command
            }
        }).then(response =>{
            // On traite la réponse
            message.channel.send(response.message);
            // Si le deleteMessage = true, effacer la commande
            if(response.deleteMessage) message.delete();
        }).catch(e => console.log);

    
        // Gestion de différentes commandes avec un switch
        switch(command){
            case "addCommand":
                // On récupère les arguments
                const options = commandArgs.split("///");
                
                const newCommand = Commands.create({
                    command: options[0],
                    message: options[1],
                    deleteMessage: options[2]
                }).then(()=>{
                    message.reply("Commande ajoutée avec succès.")
                }).catch(e =>{
                    if(e.name === "SequelizeUniqueConstraintError"){
                        message.reply("La commande existe déjà.");
                    }
                    message.reply("Une erreur est survenue.")
                })
                break;
            case "listCommands":
                Commands.findAll({
                    attributes: ["id", "command", "message", "deleteMessage"]
                }).then(list => {
                    const liste = list.map(
                        command => `${command.id} - ${command.command} - ${command.message} - ${command.deleteMessage}`
                        ).join('\n') || "Pas de commande";
                    message.channel.send(`Liste des commandes : \n ${liste}`, {split: true});
                })
            break
            case "deleteCommand":
                Commands.destroy({
                    where: {
                        id: commandArgs
                    }
                }).then(rowCount => {
                    if(!rowCount) return message.reply("Commande introuvable.");

                    return message.reply("Commande supprimée.")
                })
            break
            }    
    }


    // Tester la présence d'une string dans un message
    // Si indexOf("string") != 1 veut dire que la string est présente dans le content
    if(message.content.indexOf("lasagne")!= -1){
        message.channel.send('Quelqu\'un a parlé de manger ?')
    }


    // Message d'avertissement
    // Si le message contient la string !attention
    if(message.content.indexOf("!attention") === 0 ){
        // On prend le contenu du message à partir du 11eme signe, donc après !attention
        let param = message.content.substr(11)
        // Si param (message après !attention) n'est pas vide, on stock ça sous text sinon on utilise le mot Attention
        let text = (param != "") ? param : "Attention"
        message.channel.send(`${text}, ce salon est interdit aux loups-garous`)
        message.delete()
    }

    /**
     * 
     * ALERTER UN UTILISATEUR QUI SPAM LES MENTIONS (+ de 2 membres)
     * 
     */

    // Récupère les mentions d'un message sous forme de tableau
    let mentions = message.mentions.users.array()
    if(mentions.length > 2){
        message.channel.send(`<@${message.member.user.id}>, merci de ne pas abuser des mentions.`)
    }

})

/**
 * 
 * AJOUT D'UN ROLE APRES UN EVENEMENT (réaction emoji)
 * 
 */

// On écoute l'ajout de réaction
client.on("messageReactionAdd", async(reaction, user) => {
    // Si quelqu'un réagit au message ciblé avec l'emoji ciblé
    if(reaction.message.id === MESSAGE_ID && reaction.emoji.id === EMOJI_ID){
        // On attribut un role a l'utilisateur ayant réagit
        // target du role voulu
        let role = reaction.message.guild.roles.cache.get(ROOM_ID)
        // target du membre qui a réagit au msg 
        let member = reaction.message.guild.members.cache.get(user.id)
        // si j'ai bien un role et un membre, j'ajoute ce role au membre
        if (role && member){
            member.roles.add(role)
        }
    } 
})

/**
 * 
 * RETIRER UN ROLE
 * 
 */
client.on("messageReactionRemove", async(reaction, user)=> {
    // Si quelqu'un réagit au message ciblé avec l'emoji ciblé
    if(reaction.message.id === MESSAGE_ID && reaction.emoji.id === EMOJI_ID){
        // target du role 
        let role = reaction.message.guild.roles.cache.get(ROOM_ID)
        // target du membre qui a réagit au msg
        let member = reaction.message.guild.members.cache.get(user.id)
        // retirer le role au membre
        if (role && member){
            member.roles.remove(role)
        }
    } 
})

/**
 * 
 * MESSAGE DE BIENVENUE
 * 
 */
client.on('guildMemberAdd', member => {
    // Message public
    client.channels.resolve('447784888066768898').send(`Bienvenue <@${member.user.id}>, prend garde au grand méchant loup.`)
    // Message privé
    member.send(`Bienvenue <@${member.user.id}>, prend garde au grand méchant loup.`)
})





// Connexion
client.login(BOT_TOKEN)