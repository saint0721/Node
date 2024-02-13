const router = require('express').Router()

let connectDB = require('./../database.js')
let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

router.get('/sub/sports', async (req, res) => {
  res.send('스포츠 게시판')
})

router.get('/sub/game', (req, res) => {
  res.send('게임 게시판')
})

module.exports = router