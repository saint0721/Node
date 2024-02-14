require('dotenv').config()
const express = require('express')
const app = express()
const { MongoClient, ObjectId, FindCursor } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET,
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
// 데이터를 보내면 res.body에 넣는걸 도와주는 방법
app.use(express.json())
app.use(express.urlencoded({ extended : true } ))
app.use(passport.initialize())
app.use(session({
  secret: process.env.DB_PW,
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 },
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : "forum"
  })
}))
app.use(passport.session())
app.use('/shop', require('./routes/shop.js'))
app.use('/board', require('./routes/board.js'))
// 미들웨어 함수 적용
// app.use('/', isLogin)

// 로그인 여부 함수
function isLogin(req, res, next) {
  if (!req.user) {
    res.send('로그인하세요')
  }
  next()
}

let connectDB = require('./database.js')
let db
connectDB.then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(process.env.PORT, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
  })
}).catch((err)=>{
  console.log(err)
})

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

// /list로 접속시 현재 시간을 터미널에 출력하는 미들웨어
function nowTime(req, res, next) {
  console.log(new Date())
  next()
}

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

app.get('/login', blankSpace, async (req, res) => {
  console.log(req.user)
  await res.render('login.ejs')
})

app.get('/mypage', async (req, res) => {
  res.render('myPage.ejs', { result : req.user })
})

// 아이디, 비번 빈칸 여부 함수
function blankSpace(req, res, next) {
  if (req.body.username == "" || req.body.password == "") {
    res.send('빈칸으로 제출하지 마라')
  }
  next()
}

app.get('/register', blankSpace, (요청, 응답)=>{
  응답.render('register.ejs')
})

// 검색기능 구현
app.get('/search', async(req, res) => {
  console.log(req.query)
  let result = await db.collection('post').find({ title : { $regex : req.query.value} }).toArray()
  res.render('search.ejs', { list : result})
})
// 정규식을 쓰면 document가 많은경우 .find()를 사용하면 느리다. 일일이 검사하기 때문. index 사용하면 해결 가능

// 라우터 post 요청
app.post('/add', upload.single('img1'), async (req, res, next) => {
  try{
    if(req.body.title == '' || req.body.content =='') {
      console.error(err)
    } else {
      await db.collection('post').insertOne({ title : req.body.title, content : req.body.content, img : req.file.location })
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
    passport.authenticate('local', (err, user, info, next) => { 
      if (err) return next(err)
      if (!user) return res.status(401).json(info.message)
      req.logIn(user, (err)=> {
        if(err) return next(err)
        res.redirect('/')
      })
    })(req, res, next)
  } catch(err) {
    console.error(err)
    next(err)
  }
})

app.post('/register', async(req, res, next) => {
  try {
    let existId = await db.collection('user').findOne({username : req.body.username})
    if(existId) {
      return res.status(400).send('존재하는 아이디')
    }
    
    if (req.body.password !== req.body.password2) {
      return res.status(400).send('비밀번호가 일치하지 않습니다.')
    } else {
      let hashing = await bcrypt.hash(req.body.password, 10)
      await db.collection('user').insertOne({username : req.body.username, password : hashing})
    }
    res.redirect('/')
  } catch(err) {
    console.error(err)
    next(err)
  }
})

// 검색기능 구현
app.post('/search', async (req, res) => {
  try {
    await db.collection('post').insertOne({ search : req.body.search })
    res.send('검색 실행중')
  } catch(err) {
    console.error(err)
  }
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