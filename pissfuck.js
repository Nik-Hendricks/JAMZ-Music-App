files.forEach(file => {


    mm.parseBuffer(file.buffer, 'audio/mpeg').then( metadata => {
      console.log(metadata.common)
      //check for picture in metadata
      if(metadata.common.picture){

        songImage = new Buffer(metadata.common.picture[0].data).toString('base64');
      }else{
        songImage = null;
      }

      //check for title in metadata
      if(metadata.common.title){
        songName = metadata.common.title;
      }else{
        songName = file.originalname;
      }

      //check for albumName in metadata
      //console.log(metadata.common.album)
      if(metadata.common.album){
        console.log("THEER IS ALBUM")
        albumName = metadata.common.album;
        checkAlbumExists(albumName).then(result => {
          console.log("albumResult " + result)
          if(result == false){
            console.log("ALBUM DOES NOT EXIST")
            albumUid = uniqid();
            albums.insert({albumUid:albumUid, albumName:albumName, albumImage:songImage})
          }else{
            console.log("ALBUM EXISTS HERES THE UID " + result)
            albumUid = result;
          }
        })
      }else{
        //albumUid = null;
      }


      var songUid = uniqid();
      //console.log('file.originalname= ' + file.originalname)
      base64data = new Buffer(file.buffer).toString('base64');
      songData.insert({songId:songUid, filename: file.originalname, base64: base64data}, function (err) {});
      console.log(albumUid)
      songIndex.insert({songName: songName, songId:songUid, songAlbum:albumUid},function(err){});
      usersSongs.insert({userUid: uid, listenAmmount: null, favorite: false, songId:songUid},function(err){});

    });



  });
  res.redirect('/')