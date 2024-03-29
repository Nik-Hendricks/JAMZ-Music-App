//server.js v1.0.0
var fs = require('fs');
const cookieParser = require("cookie-parser");
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = 80;
var Nedb = require('nedb');
var uniqid = require('uniqid')
var multer  =   require('multer');
var upload = multer()
var mp3Duration = require('mp3-duration');
var mm = require('music-metadata');
var util = require('util')
//configure db
users =           new Nedb({ filename: 'db/users.db', autoload: true, timestampData: true });
usersSongs =      new Nedb({filename: 'db/usersSongs.db', autoload:true, timestampData: true});
songIndex =       new Nedb({ filename: 'db/songIndex.db', autoload: true , timestampData: true});
songData =        new Nedb({ filename: 'db/songData.db', autoload: true , timestampData: true});
playlistsIndex =  new Nedb({ filename: 'db/playlistsIndex.db', autoload: true , timestampData: true});
playlistsSongs =  new Nedb({ filename: 'db/playlistsSongs.db', autoload: true , timestampData: true}); //store image, user can upload image upon creation or have a generated one
artists =         new Nedb({ filename: 'db/artists.db', autoload: true, timestampdata: true}) //Stores albumIds, name, and if the artist has an account the user id
albums =          new Nedb({ filename: 'db/albums.db', autoload: true, timestampdata: true}) //stores album image, or not, songDataIds, album description
genre =           new Nedb({ filename: 'db/genres.db', autoload: true, timestampdata: true}) //stores name, genreId, and(maybe songId's of the top 10 listened songs of that genre updated every 24 hours)

//addUser('Dev','password')

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
    var albumUid;


    if (!files) {
        const error = new Error('Please choose files')
        error.httpStatusCode = 400
        return next(error)
    }else{
      files.forEach(file => {
          mm.parseBuffer(file.buffer, 'audio/mpeg').then( metadata => {
              var songMetadata = {};



              //result = condition ? value1 : value2;
              //If condition is true then value1 will be assigned to result variable and if wrong then value2 will be assigned.

              

              songMetadata = {
                albumImage: metadata.common.picture[0].data,
                songName: metadata.common.title,
                albumName: metadata.common.album,
                albumImage: new Buffer(metadata.common.picture[0].data).toString('base64'),
                songArtists: metadata.common.artists,

              }

              checkAlbumExists(songMetadata.albumName).then(result => {
                if(result == false && songMetadata.albumName != undefined){
                  songMetadata.albumUid = uniqid();
                  albums.insert({albumUid:songMetadata.albumUid, albumName:songMetadata.albumName, albumImage:songMetadata.albumImage})
                }else{
                  songMetadata.albumUid = result;
                }

                var songUid = uniqid();
                base64data = new Buffer(file.buffer).toString('base64');
                songData.insert({songId:songUid, filename: file.originalname, base64: base64data}, function (err) {});
                songIndex.insert({songName: songMetadata.songName, songId:songUid, songAlbum:songMetadata.albumUid},function(err){});
                usersSongs.insert({userUid: uid, listenAmmount: null, favorite: false, songId:songUid},function(err){});
              })




          });
      });
      res.redirect('/')
    }
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

  app.get("/album_art/:albumUid", (req, res) => {
    var albumUid = req.param('albumUid');
    albums.findOne({albumUid:albumUid}, (err, doc) => {
      var albumImage = new Buffer(doc.albumImage, 'base64');
      res.header({
        'Content-Type': 'image/png',
        'Content-Length': albumImage.length
      });
      res.end(albumImage)
    })
  })


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
            results.forEach(song =>{
                i++
                getSongInfo(song.songId).then(result =>{
                    usersSongs.push(result);
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


//addUser("Nik", "Nik")

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
            resolve(rows)
        })
    })
}

function getSongInfo(songId){
    return new Promise(resolve =>{
        songIndex.findOne({songId:songId}, (err, row) => {
            resolve(row)
        })
    })
}


function checkAlbumExists(albumName){
  return new Promise(resolve => {
    albums.findOne({albumName:albumName}, (err, row) => {
        if(row){
          resolve(row.albumUid)
        }else{
          resolve(false)
        }
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