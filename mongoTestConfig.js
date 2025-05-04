const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer
exports.dbConnect = async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = await mongoServer.getUri()
  await mongoose.connect(mongoUri)
}

exports.dbDisconnect = async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongoServer.stop()
}