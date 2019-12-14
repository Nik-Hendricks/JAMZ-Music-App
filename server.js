//server.js v1.0.0
var fs = require('fs');
const cookieParser = require("cookie-parser");
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = 3000;
var Nedb = require('nedb');
var uniqid = require('uniqid')
var multer  =   require('multer');
var upload = multer()
var mp3Duration = require('mp3-duration');

//configure db
users = new Nedb({ filename: 'db/users.db', autoload: true, timestampData: true });
usersSongs = new Nedb({filename: 'db/usersSongs.db', autoload:true, timestampData:true});
songIndex = new Nedb({ filename: 'db/songIndex.db', autoload: true , timestampData: true});
songData = new Nedb({ filename: 'db/songData.db', autoload: true , timestampData: true});
playlistsIndex = new Nedb({ filename: 'db/playlistsIndex.db', autoload: true , timestampData: true});
playlistsSongs = new Nedb({ filename: 'db/playlistsSongs.db', autoload: true , timestampData: true});


app.use(cookieParser());

//define app routes since it must me multiple pages :(
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/login', function(req, res){
    res.sendFile(__dirname + '/public/login.html');
});

app.post('/upload/audio',upload.array('songs', 50), (req, res, next) => {
    console.log(req.cookies.uid)
    var uid = req.cookies.uid;
    var files = req.files
    if (!files) {
        const error = new Error('Please choose files')
        error.httpStatusCode = 400
        return next(error)
    }
        files.forEach(file => {
          var songUid = uniqid();
          console.log('file.originalname= ' + file.originalname)
          base64data = new Buffer(file.buffer).toString('base64');
          songData.insert({songId:songUid ,filename: file.originalname, base64: base64data}, function (err) {});
          songIndex.insert({songName: file.originalname, songId:songUid},function(err){});
          usersSongs.insert({userUid: uid, listenAmmount: null, favorite: false, songId:songUid},function(err){});
        });
        res.redirect('/')

})

app.get("/view/:file",function(req, res){
    var file = req.param('file');
    console.log(file)
    res.header({
      'Content-Type': 'text/html',
      'Content-Size': getFilesizeInBytes(__dirname + '/public/views/' + file)
    });
    res.sendFile(__dirname + '/public/views/'+file)
})

app.get("/component/:file",function(req, res){
    var file = req.param('file');
    console.log(file)
    res.header({
      'Content-Type': 'text/html',
      'Content-Size': getFilesizeInBytes(__dirname + '/public/components/' + file)
    });
    res.sendFile(__dirname + '/public/components/'+file)
})

app.get("/js/:file",function(req, res){
    var file = req.param('file');
    res.header({
      'Content-Type': 'text/javascript',
      'Content-Size': getFilesizeInBytes(__dirname + '/public/js/' + file)
    });
    res.sendFile(__dirname + '/public/js/'+file)
  })
  
  app.get("/css/:file",function(req, res){
    var file = req.param('file');
    res.header({
      'Content-Type': 'text/css',
      'Content-Size': getFilesizeInBytes(__dirname + '/public/css/' + file)
    });
    res.sendFile(__dirname + '/public/css/'+file)
  })
  
  app.get("/font/:file",function(req, res){
    var file = req.param('file');
    console.log(file)
    res.header({
      'Content-Type': 'font/opentype',
      'Content-Size': getFilesizeInBytes(__dirname + '/public/fonts/' + file)
    });
    res.sendFile(__dirname + '/public/fonts/'+file)
  })
  
  
  app.get("/img/:file",function(req, res){
    var file = req.param('file')
    res.header({
      'Content-Type': 'image/png',
      'Content-Length': getFilesizeInBytes(__dirname + '/public/img/' + file)
    });
    res.sendFile(__dirname + '/public/img/'+file)
  })


  app.get("/song/:songId", function(req, res) {
    var songId = req.param('songId');
    songData.findOne({songId:songId}, function (err, doc) {
      if(err || doc == null){
        res.status(404)        // HTTP status 404: NotFound
          .send('Not found')
      }else{
        var song = new Buffer(doc.base64, 'base64');
        mp3Duration(song, function (err, duration) {
          if (err) return console.log(err.message);
          console.log(duration)
          res.header({
            'Content-Type': 'audio/mpeg',
            'Content-Length': song.length,
            'Accept-Ranges': 'bytes', 'Content-Length': song.length
          });
          res.end(song);
        })
      }
    }); 
  });


//start handling websocket connections
io.on('connection', function(socket){
  console.log('a user connected');

    socket.on('tryLogin', function(username, password, callback){
        tryLogin(username, password).then(result =>{
            console.log(result);
            callback(result)
        })
    })

    socket.on('getUserSongs', (uid, callback) => {
        console.log('this is uid ' + uid)
        var usersSongs = [];
        var i = 0;
        getUserSongs(uid).then(results => {
            console.log(results.length)
            results.forEach(song =>{
                i++
                getSongInfo(song.songId).then(result =>{
                    usersSongs.push(result);
                    console.log('usersSongs')
                    console.log(usersSongs)
                    if(usersSongs.length == results.length){
                        callback(usersSongs)
                    }
                })
            })
        })
    })

    socket.on('getSongInfo', (songId, callback) => {
      getSongInfo(songId).then(song =>{
        callback(song)
      })
    })
});


//addUser("Sonja", "password")

function addUser(username, password){
    users.insert({uid:uniqid(), username:username, password: password}, function(err){});
}


function tryLogin(username, password){
    return new Promise(resolve => {
        users.findOne({username: username}, function(err, row) {
            if(row){
                if(password == row.password){
                    resolve(row.uid)
                }else{
                    resolve(false)
                }
            }else{
                resolve(false)
            }
        })
    })
}

function getUserSongs(uid){
    return new Promise(resolve => {
        usersSongs.find({userUid: uid}, (err, rows) => {
            console.log(rows)
            resolve(rows)
        })
    })
}

function getSongInfo(songId){
    return new Promise(resolve =>{
        songIndex.findOne({songId:songId}, (err, row) => {
            console.log(row)
            resolve(row)
        })
    })
}

//get filesize in bytes to make sure express knows how big the file 
//its sending is

function getFilesizeInBytes(filename) {
    var stats = fs.statSync(filename)
    var fileSizeInBytes = stats["size"]
    return fileSizeInBytes
}

//finaly start http server

http.listen(port, function(){
  console.log('listening on *:' + port);
});