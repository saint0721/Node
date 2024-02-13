const router = require('express').Router()

let connectDB = require('./../database.js')
let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})


module.exports = router