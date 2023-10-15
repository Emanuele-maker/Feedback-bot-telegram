const { Api, TelegramClient } = require("telegram")
const { StringSession } = require("telegram/sessions")
const input = require("input")

const APID = Number(process.env.TELEGRAM_API_ID)
const APIHASH = process.env.TELEGRAM_API_HASH
const stringSession = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAUL7yaH++kQ7dNXQhKV258X7qyAQRpHBuZdvwhP67hoau9WxuYI+neepWxC7P7VExQUxuN1yLq2iGgwyxKufYFmTNoKWGSVEnA2JMJjO/jaV+RrJhq55RM5bax2RHdKkZs2kvOtFI9fUR/BovSvdiHAU+S3zF8aKHLAiuEuJ2P1SJ7/q+Rsm5Lit6uuJ2RGEBT6TxIIc1c5pjMCsm7mtGYYnzuC9sXtQLWRuKvQt0LtfpmPYauguAbFgs5b9iBfPspeUsYg5wG2TJeGcDSPANivpNoQaq/HCjESPO38FEnJO14hudXq74ND/wquGvbeIYeHU8fqbsNBMSOsUrwwAxa/M=")
let client

const getFullUser = async(username) => {
    let user
    await client.connect()
    .then(async() => {
        try {
            user = await client.invoke(
                new Api.users.GetFullUser({
                id: username,
                })
            )
        } catch (err) {
            console.error(err)
        }
    })
    if (!user) return undefined
    return user.users[0]
}

const start = async() => {
    client = new TelegramClient(stringSession, APID, APIHASH, {
        connectionRetries: 5,
    })
    await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () => await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
    })
    console.log("Connected to Telegram API.")
    console.log(client.session.save())
}

start()

module.exports = { getFullUser }