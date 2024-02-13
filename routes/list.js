const router = require('express').Router()
let connectDB = require('./../database.js')
let db
connectDB.then((client)=>{
  db = client.db('forum')
}).catch((err)=>{
  console.log(err)
})

// /list로 접속시 현재 시간을 터미널에 출력하는 미들웨어
function nowTime(req, res, next) {
  console.log(new Date())
  next()
}

module.exports = router