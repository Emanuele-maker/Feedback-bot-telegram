class User {
    constructor(id, username, first_name, tags) {
        this.id = id
        this.username = username
        this.first_name = first_name
        this.tags = tags
        this.feedbacks = 0
        this.verified = false
    }
}

module.exports = User