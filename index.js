const TelegramBot = require("node-telegram-bot-api")
const User = require("./user")
const { getFullUser } = require("./getUserInfo")
const conn = require("./db")
require("dotenv").config()

const TOKEN = process.env.BOT_TOKEN
const CHATID = process.env.NODE_ENV === "development" ? process.env.DEV_CHAT_ID : process.env.CHAT_ID
const ADMINCHATID = process.env.ADMIN_CHAT_ID
const api = new TelegramBot(TOKEN, { polling: true })

const feedbackRequests = []
const currentUsersMessages = {}

const registerUser = (id, username) => {
    conn.query(`INSERT INTO users(id, username, feedbacks, verified) VALUES("${id}", "${username}", 0, false)`, err => {
        if (err) console.error(err)
    })
}

const requestFeedback = msg => {
    let firstTaggedUser = msg.text.trim().replace("@feedback", "").split(" ").find(word => word.startsWith("@"))
    if (!firstTaggedUser || !firstTaggedUser.startsWith("@") || firstTaggedUser.length < 1) return api.sendMessage(CHATID, "Per favore, utilizza la sintassi corretta: @feedback @username.\nEsempio: @feedback <code>@Giuggetto</code>", {
        parse_mode: "HTML"
    })
    firstTaggedUser = firstTaggedUser.replace("@", "")
    if (firstTaggedUser.toLowerCase() === msg.from.username.toLowerCase()) api.sendMessage(CHATID, "Non puoi richiedere di aggiungere un feedback a te stesso!")
    else {
        conn.query("SELECT * FROM users", (err, dbUsers) => {
            if (err) return console.error(err)
            const usersId = dbUsers.map(dbUser => {
                return dbUser.id
            })
            if (err) return console.error(err)
            const user = new User(msg.from.id, msg.from.username, msg.from.first_name, firstTaggedUser)
            if (!usersId.includes(user.id.toString())) {
                registerUser(user.id, user.username)
                currentUsersMessages[msg.message_id] = user
            } else {
                currentUsersMessages[msg.message_id] = dbUsers.find(u => u.id === msg.from.id.toString())
            }
            getFullUser(firstTaggedUser.replace("@", ""))
            .then(fullTaggedUser => {
                if (!fullTaggedUser) return api.sendMessage(CHATID, "Utente non trovato!")
                if (!usersId.includes(fullTaggedUser.id.toString())) {
                    registerUser(fullTaggedUser.id, fullTaggedUser.username)
                }
            })
        })
        feedbackRequests.push(msg)
        api.sendMessage(CHATID, `Ciao! Vuoi inviare il feedback agli admin? Sii sicuro di seguire queste regole\n\nInvia le prove del tuo scambio (screenshot della chat) Assicurati di aver correttamente inserito lo @username dell'utente`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "✅",
                            callback_data: `btn_yes_${msg.from.id}`
                        },
                        {
                            text: "✖️",
                            callback_data: `btn_no_${msg.from.id}`
                        },
                    
                    ]
                ]
            }
        })
    }
}

// puts a user verified by the community
const verifica = msg => {
    api.getChatAdministrators(CHATID)
    .then(admins => {
        const adminsId = admins.map(admin => {
            return admin.user.id
        })
        api.getChatMember(CHATID, msg.from.id)
        .then(member => {
            if (!adminsId.includes(member.user.id)) return api.sendMessage(CHATID, "Solo gli admin possono eseguire questo comando!")
            let firstTaggedUser = msg.text.trim().replace(".verifica", "").split(" ").find(word => word.startsWith("@"))?.replace("undefined", "")
            if (!firstTaggedUser || firstTaggedUser.length < 1 || !firstTaggedUser.startsWith("@")) {
                if (msg.reply_to_message?.from?.username !== undefined) firstTaggedUser = msg.reply_to_message.from.username
                else return api.sendMessage(CHATID, "Per favore, utilizza la sintassi corretta: .inf @username.\nEsempio: .inf <code>@Giuggetto</code>", {
                    parse_mode: "HTML"
                })
            }
            firstTaggedUser = firstTaggedUser.replace("@", "")
            getFullUser(firstTaggedUser)
            .then(fullUser => {
                if (!fullUser) return api.sendMessage(CHATID, `Utente @${firstTaggedUser} non trovato!`)
                conn.query("SELECT * FROM users", (err, dbUsers) => {
                    if (err) return console.error(err)
                    const usersId = dbUsers.map(dbUser => {
                        return dbUser.id
                    })
                    const dbUser = dbUsers.find(u => u.id === fullUser.id.toString())
                    if (dbUser.verified) return api.sendMessage(CHATID, "Questo utente è già verificato!")
                    if (usersId.includes(fullUser.id.toString())) {
                        conn.query(`UPDATE users SET verified = true WHERE id = "${fullUser.id}"`, (err) => {
                            if (err) return console.error(err)
                            api.sendMessage(CHATID, `@${fullUser.username} è stato verificato!`)
                        })
                    } else api.sendMessage(CHATID, "Questo utente non è regitrato!")
                })
            })
        })
    })
}

const unverifica = msg => {
    api.getChatAdministrators(CHATID)
    .then(admins => {
        const adminsId = admins.map(admin => {
            return admin.user.id
        })
        api.getChatMember(CHATID, msg.from.id)
        .then(member => {
            if (!adminsId.includes(member.user.id)) return api.sendMessage(CHATID, "Solo gli admin possono eseguire questo comando!")
            let firstTaggedUser = msg.text.trim().replace(".unverifica", "").split(" ").find(word => word.startsWith("@"))?.replace("undefined", "")
            if (!firstTaggedUser || firstTaggedUser.length < 1 || !firstTaggedUser.startsWith("@")) {
                if (msg.reply_to_message?.from?.username !== undefined) firstTaggedUser = msg.reply_to_message.from.username
                else return api.sendMessage(CHATID, "Per favore, utilizza la sintassi corretta: .inf @username.\nEsempio: .inf <code>@Giuggetto</code>", {
                    parse_mode: "HTML"
                })
            }
            firstTaggedUser = firstTaggedUser.replace("@", "")
            getFullUser(firstTaggedUser)
            .then(fullUser => {
                if (!fullUser) return api.sendMessage(CHATID, `Utente @${firstTaggedUser} non trovato!`)
                conn.query("SELECT * FROM users", (err, dbUsers) => {
                    if (err) return console.error(err)
                    const usersId = dbUsers.map(dbUser => {
                        return dbUser.id
                    })
                    const dbUser = dbUsers.find(u => u.id === fullUser.id.toString())
                    if (!dbUser.verified) return api.sendMessage(CHATID, "Questo utente è già unverificato!")
                    if (usersId.includes(fullUser.id.toString())) {
                        conn.query(`UPDATE users SET verified = false WHERE id = "${fullUser.id}"`, (err) => {
                            if (err) return console.error(err)
                            api.sendMessage(CHATID, `@${fullUser.username} è stato unverificato!`)
                        })
                    } else api.sendMessage(CHATID, "Questo utente non è regitrato!")
                })
            })
        })
    })
}

const getVerifedUsersList = msg => {
    conn.query("SELECT * FROM users", (err, users) => {
        if (err) return console.error(err)
        const verifiedUsers = users.filter(user => user.verified)
        let verifiedUsersList = ""
        verifiedUsers.map(user => {
            verifiedUsersList += `• @${user.username} [<code>${user.id}</code>]\n`
        })
        if (verifiedUsers.length > 0) api.sendMessage(CHATID, `Utenti verificati dalla community di @MobopolyGoFastTrade:\n${verifiedUsersList}`, {
            parse_mode: "HTML"
        })
    })
}

// adds a feedback to a user in the db
const addFeedback = msg => {
    api.getChatAdministrators(CHATID)
    .then(admins => {
        const adminsId = admins.map(admin => {
            return admin.user.id
        })
        api.getChatMember(CHATID, msg.from.id)
        .then(member => {
            if (!adminsId.includes(member.user.id)) return api.sendMessage(CHATID, "Solo gli admin possono eseguire questo comando!")
            let firstTaggedUser = msg.text.trim().replace(".addfeedback", "").split(" ").find(word => word.startsWith("@"))?.replace("undefined", "")
            let numberOfFeedbacks = parseInt(msg.text.match(/\d+/g).join(""))
            if (!firstTaggedUser || firstTaggedUser.length < 1 || !firstTaggedUser.startsWith("@")) {
                if (msg.reply_to_message?.from?.username !== undefined) firstTaggedUser = msg.reply_to_message.from.username
                else return api.sendMessage(CHATID, "Per favore, utilizza la sintassi corretta: .addfeedback @username numero_di_feedback.\nEsempio: .addfeedback <code>@Giuggetto</code> <code>1</code>", {
                    parse_mode: "HTML"
                })
            }
            if (typeof numberOfFeedbacks !== "number" || numberOfFeedbacks < 1) numberOfFeedbacks = 1
            firstTaggedUser = firstTaggedUser.replace("@", "")
            getFullUser(firstTaggedUser)
            .then(fullUser => {
                conn.query("SELECT * FROM users", (err, dbUsers) => {
                    if (err) return console.error(err)
                    const usersId = dbUsers.map(dbUser => {
                        return dbUser.id
                    })
                    if (usersId.includes(fullUser.id.toString())) {
                        const currentUsersFeedbacks = dbUsers.find(u => u.id === fullUser.id.toString()).feedbacks
                        conn.query(`UPDATE users SET feedbacks = ${currentUsersFeedbacks + numberOfFeedbacks} WHERE id = "${fullUser.id}"`, (err) => {
                            if (err) return console.error(err)
                            if (numberOfFeedbacks === 1) api.sendMessage(CHATID, `Aggiunto un feedback a @${fullUser.username}`)
                            else if (numberOfFeedbacks > 1) api.sendMessage(CHATID, `Aggiunti ${numberOfFeedbacks} feedback a @${fullUser.username}`)
                        })
                    } else {
                        registerUser(fullUser.id, fullUser.username)
                        conn.query(`UPDATE users SET feedbacks = ${numberOfFeedbacks} WHERE id = "${fullUser.id}"`, (err) => {
                            if (err) return console.error(err)
                            api.sendMessage(CHATID, `Aggiunto il primo feedback a @${fullUser.username}!`)
                        })
                    }
                })
            })
        })
    })
}

// get user info
const inf = msg => {
    let firstTaggedUser = msg.text.trim().replace(".inf", "").split(" ").find(word => word.startsWith("@"))?.replace("undefined", "")
    if (!firstTaggedUser || firstTaggedUser.length < 1 || !firstTaggedUser.startsWith("@")) {
        if (msg.reply_to_message?.from?.username !== undefined) firstTaggedUser = msg.reply_to_message.from.username
        else return api.sendMessage(CHATID, "Per favore, utilizza la sintassi corretta: .inf @username.\nEsempio: .inf <code>@Giuggetto</code>", {
            parse_mode: "HTML"
        })
    }
    firstTaggedUser = firstTaggedUser.replace("@", "")
    conn.query("SELECT * FROM users", (err, dbUsers) => {
        if (err) return console.error(err)
        const user = dbUsers.find(u => u.username === firstTaggedUser)
        if (!user) return api.sendMessage(CHATID, "Questo utente non è registrato!")
        api.sendMessage(CHATID, `• Username: @${user.username}\n• ID: ${user.id}\n• Feedback: ${user.feedbacks}\n• Verificato dalla community di @MobopolyGoFastTrade: ${user.verified ? "Sì" : "No"}`)
    })
}

const help = msg => {
    api.sendMessage(CHATID, `• <b>.verifica</b>: usalo per verificare un utente. Sintassi: .verifica @username (Esclusivo per gli <b>admin</b>)\n• <b>.addfeedback</b>: usalo per aggiungere feedback a un utente. Sintassi: .addfeedback @username numero_feedback. (Esclusivo per gli <b>admin</b>)\n• <b>@feedback</b>: usalo per richiedere agli admin di aggiungere un feedback a un utente dopo uno scambio. Sintassi: @feedback @username messaggio.\n• <b>.verificati</b>: usalo per vedere la lista di utenti verificati nel gruppo.\n• <b>.inf</b>: usalo per vedere le informazioni di un utente. Sintassi: .inf @username`, {
        parse_mode: "HTML"
    })
}

// command list
api.on("message", msg => {
    if (msg.chat.id.toString() !== CHATID) return
    if (msg.text.startsWith(".com")) help(msg)
    if (msg.text.startsWith("@feedback")) requestFeedback(msg)
    if (msg.text.startsWith(".addfeedback")) addFeedback(msg)
    if (msg.text.startsWith(".inf")) inf(msg)
    if (msg.text.startsWith(".unverifica")) unverifica(msg)
    if (msg.text.startsWith(".verificati")) getVerifedUsersList(msg)
    else if (msg.text.startsWith(".verifica")) verifica(msg)
})

// button listener
api.on("callback_query", (callbackQuery) => {
    const action = callbackQuery.data
    const msg = callbackQuery.message
    const opts = {
      chat_id: msg.chat.id,
      message_id: msg.message_id
    }
    let text

    const currentUser = currentUsersMessages[msg.message_id - 1]
    const currentMessage = feedbackRequests.find(m => m.message_id === msg.message_id - 1)
    
    if (action.includes(`btn_yes`) && currentUser.id.toString() === callbackQuery.from.id.toString()) text = "Messaggio inviato agli admin!"
    if (action.includes(`btn_no`) && currentUser.id.toString() === callbackQuery.from.id.toString()) text = "Hai annullato la richiesta di feedback!"
  
    if (text) {
        getFullUser(currentMessage.text.trim().replace("@feedback", "").replaceAll(" ", "").replace("undefined", "").replace("@", ""))
        .then(taggedUser => {
            api.editMessageText(text, opts)
            if (action.includes("btn_yes")) api.sendMessage(ADMINCHATID, `
                ✅RICHIESTA FEEDBACK: \n• <b>Di</b>: @${callbackQuery.from.username} [<code>${callbackQuery.from.id}</code>] \n• <b>A</b>: @${taggedUser.username} [<code>${taggedUser.id}</code>] \n• <b>Gruppo</b>: MONOPOLY GO SCAMBI VELOCI 🇮🇹🎲🎲 [<code>-1001739647238</code>]`, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "👀 Vai al messaggio",
                                url: `https://t.me/${msg.chat.username}/${currentMessage.message_id}`
                            }
                        ]
                    ]
                }
            })
        })
    }
    else api.answerCallbackQuery(callbackQuery.id, {
        text: "Non puoi cliccare su questo pulsante",
        show_alert: true
    })
})