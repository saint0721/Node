const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')

require('dotenv').config()
const password = process.env.MongoDBPassword

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
// 데이터를 보내면 res.body에 넣는걸 도와주는 방법
app.use(express.json())
app.use(express.urlencoded({ extended : true } ))

let db
const url = 'mongodb+srv://sikim0721:{password}@cluster0.tqbj5n0.mongodb.net/?retryWrites=true&w=majority'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
  })
}).catch((err)=>{
  console.log(err)
})

// 라우터 get 요청
app.get('/', async (req, res) => {
  try { 
    await res.render('about.ejs')
  } catch(err) {
    console.error(err)
  }
})

// DB 데이터 추가
app.get('/news', async (req, res) => {
  await db.collection('post').insertOne({ title : 'Node.js' })
})

app.get('/list', async (req, res) => {
  let result = await db.collection('post').find().toArray()
  res.render('list.ejs', { list : result })
})

app.get('/time', async (req, res) => {
  let date = await new Date()
  res.render('time.ejs', { time : date })
})

app.get('/write', async (req, res) => {
  try{
    await res.render('write.ejs')
  } catch(err) {
    console.error(err)
  }
})

// url 파라미터 적용
app.get('/detail/:id', async (req, res) => {
  try {
    let result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id) })
    res.render('detail.ejs', { result : result })
  } catch(err) {
    console.error(err)
  }
})

app.get('/edit/:id', async (req, res) => {
  try {
    let result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id )})
    res.render('edit.ejs', { result : result })
  } catch(err) {
    console.error(err)
  }
})

// 라우터 post 요청
app.post('/add', async (req, res) => {
  try{
    if(req.body.title == '' || req.body.content =='') {
      console.error(err)
    } else {
      await db.collection('post').insertOne({ title : req.body.title, content : req.body.content })
      console.log('DB 저장완료')
      res.send('DB 저장완료')
    }
  } catch(err) {
    console.error(err)
    res.status(500).send('Internal Server Error!')
  }
})

app.put('/edit', async (req, res) => {
  try {
    await db.collection('post').updateMany({ like : { $gt : 10} }, { $inc : {like : 2 } })
    // await db.collection('post').updateOne(
    //   { _id : new ObjectId(req.body.id )}, 
    //   { $set : { title : req.body.title, content : req.body.content } })
    res.redirect('/list')
  } catch(err) {
    console.error(err)
  }
})

// 라우터 delete 요청
app.delete('/delete', async (req, res) => {
  await db.collection('post').deleteOne({ _id : new ObjectId(req.query.docid) })
  res.send('DB 삭제 완료')
})