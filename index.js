const app = require("./server")
const mongoose = require("mongoose")

const PORT = process.env.PORT || 5000;
const { DB_URL } = process.env

mongoose.connect(DB_URL).then(() => {
    app.listen(PORT)
    console.log(`Server listening on port ${PORT}`)
}).catch(e => {
    console.log("Mongoose Connection Error:", e)
})