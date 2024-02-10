require('dotenv').config()
const password = process.env.DB_PW
<<<<<<< HEAD

console.log(password)

=======
>>>>>>> 190c6a7 (<server.js> passport 오류 해결)
const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

require('dotenv').config()
const password = process.env.DB_PW

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
// 데이터를 보내면 res.body에 넣는걸 도와주는 방법
app.use(express.json())
app.use(express.urlencoded({ extended : true } ))

app.use(passport.initialize())
app.use(session({
  secret: password,
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 },
  store : MongoStore.create({
    mongoUrl : `mongodb+srv://sikim0721:${password}@cluster0.tqbj5n0.mongodb.net/?retryWrites=true&w=majority`,
    dbName : "forum"
  })
}))
app.use(passport.session())

passport.use(new LocalStrategy(async (user_id, user_pw, cb) => {
  let user = await db.collection('user').findOne({ username: user_id });
  if (!user) {
    return cb(null, false, { message: '아이디 DB에 없음' });
  }
  if (await bcrypt.compare(user_pw, user.password)) {
    return cb(null, user);
  } else {
    console.log(user_id); // 사용자가 제공한 아이디 출력
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  console.log(user)
  process.nextTick(() => {
    done(null, { id : user._id, username : user.username })
  })
})

// 쿠키 분석하는 역할
passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({ _id : new ObjectId(user.id) })
  if(result) {
    delete result.password
    process.nextTick(() => {
      done(null, result)
    })
  } else {
    done(new Error('User not found'))
  }
})

let db
const url = `mongodb+srv://sikim0721:${password}@cluster0.tqbj5n0.mongodb.net/?retryWrites=true&w=majority`
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

app.get('/list/:id', async (req, res) => {
  let result = await db.collection('post').find().limit(5).toArray()
  res.render('list.ejs', { list : result })
})

app.get('/list/next/:id', async (req, res) => {
  let result = await db.collection('post').find({_id : {$gt : new ObjectId(req.params.id)}}).limit(5).toArray()
  res.render('list.ejs', { list : result })
})

app.get('/time', async (req, res) => {
  let date = await new Date()
  res.render('time.ejs', { time : date })
})

app.get('/write', async (req, res) => {
  try{
    await res.render('write.ejs')
    // 리다이렉트 구현
    res.redirect('/list')
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

app.get('/login', async (req, res) => {
  console.log(req.user)
  await res.render('login.ejs')
})

app.get('/mypage', loggedin, async (req, res) => {
  res.render('myPage.ejs', { result : req.user })
})

// 로그인 여부 함수
function loggedin(req, res, next) {
  if (req.user) {
    next()
  } else {
    res.send("로그인을 해주세요")
  }
}

app.get('/register', (요청, 응답)=>{
  응답.render('register.ejs')
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

app.post('/login', async (req, res, next) => {
  try {
    passport.authenticate('local', (err, user, info) => { 
      if (err) return res.status(500).json(err)
      if (!user) return res.status(401).json(info.message)
      req.logIn(user, (err)=> {
        if(err) return next(err)
        res.redirect('/')
      })
    })(req, res, next)
  } catch(err) {
    console.error(err)
  }
})

app.post('/register', async(req, res) => {
  let hashing = await bcrypt.hash(req.body.password, 10)
  await db.collection('user').insertOne({ username : req.body.username, password : hashing })
  res.redirect('/')
})

// 라우터 put 요청
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
