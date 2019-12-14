//main.js 
var socket = io();
var song;
var contextmenu;
var volume = .75;
var songsResults;
var tracks= [];
var repeat = true;

var sidebarItems = {
    home:{
        title: "Home",
        icon: 'fas fa-home',
        id: 'home-item',
        onclick: "homeView()"
    },
    yourSongs:{
        title: "Your Songs",
        icon: 'fas fa-music',
        id:"your-songs-item",
        onclick:"songsView()"
    },
    playlists:{
        title: "Playlists",
        icon: 'fas fa-compact-disc',
        id:"playlist-item",
        onclick: "playlistsView()",
    },
    addSongs:{
        title: "Add Song",
        icon: 'fas fa-plus-circle',
        id:"add-song-item",
        onclick: "addSongView()"
    }
    
}

$(document).ready(function(){
    checkAuthed();
})

function checkAuthed(){
    if(!getCookie('uid')){
        window.location = '/login'
    }else{
        init();
    }
}

function init(){
    homeView();
    populateSidebar();
}




function populateSidebar(){
    console.log(sidebarItems)
    for (var key of Object.keys(sidebarItems)) {
        item = sidebarItems[key];
        console.log(sidebarItems[key].title)
        $("#main-sidebar").append(`<div id="${item.id}" onclick="${item.onclick}" class="sidebar-item"><i class="${item.icon}"></i><p>${item.title}</p></div>`)
    
    }
}

function clearMainContentContainer(){
    $('#main-content-container').empty();
}

function homeView(){
    $.get( "/view/home.html", function( data ) {
        clearMainContentContainer()
        $("#main-content-container").append(data);
        grabSongs();
    });
}

function songsView(){
    $.get( "/view/songs.html", function( data ) {
        clearMainContentContainer()
        $("#main-content-container").append(data);
        appendSongs();
    });
}

function addSongView(){
    $.get( "/view/addSong.html", function( data ) {
        clearMainContentContainer()
        $("#main-content-container").append(data);

        const inputElement = document.getElementById("upload-songs-button");
        inputElement.addEventListener("change", handleFiles, false);
        function handleFiles() {
          const fileList = this.files; 
          socket.emit('file', fileList)
          Object.keys(fileList).forEach(key =>{
            $("#file-wrapper").append(`<div class="file-item"><center><i class="fas fa-file-audio"></i><p>${fileList[key].name}</p></center></div>`);
         });
        }
    });
}

function playlistsView(){
    $.get( "/view/playlists.html", function( data ) {
        clearMainContentContainer()
        $("#main-content-container").append(data);
    });
    
}

function grabSongs(){
    var uid = getCookie('uid')
    getUserSongs(uid).then(results =>{
        songsResults = results;
        results.forEach(song => {
            tracks.push({songId:song.songId})
        })
    })
}

function appendSongs(){
    var i = 0;
    var uid = getCookie('uid')
        songsResults.forEach(song => {
            
            var table = document.getElementById('songs-table')
            var row = table.insertRow(-1);
            row.className = 'song-item';
            row.id = 'song-item-' + i;
            var songCell = row.insertCell(0);
            var artistCell = row.insertCell(1);
            var dateAddedCell = row.insertCell(2);
            var actionCell = row.insertCell(3)
            songCell.innerHTML = `<a onclick="openSong('${song.songId}')">${song.songName}</a>`;
            artistCell.innerHTML = song.artist
            dateAddedCell.innerHTML = song.createdAt
            actionCell.innerHTML = '<i class="fas fa-ellipsis-v"></i>'
            i++
        })

}


function getUserSongs(uid){
    return new Promise(resolve => {
        socket.emit('getUserSongs', uid, (results) =>{
            resolve(results)
        })
    })
}

function getSongInfo(songId){
    return new Promise(resolve => {
        socket.emit('getSongInfo', songId ,(song) =>{
            console.log(song)
        })
    })
}

function openSong(songId){
    highlightSongRow(songId);
    if(song){
        if(song.paused && song.currentTime > 0 && !song.ended) {
            console.log('song is paused')
            song = new Audio('/song/'+ songId);
            addSongEventListeners()
 
         } else {
            console.log('song is not paused')
            song.pause();
            song.currentTime = 0;
            song = new Audio('/song/'+ songId);
            addSongEventListeners();
         }
    }else{
        console.log('there is no song yet')
        song = new Audio('/song/'+ songId);
        addSongEventListeners()

    }
    getSongInfo(songId).then(song => {
        console.log(song)

    })
}


function highlightSongRow(songId){
    var songQueue = arraySearch(tracks, songId);
    console.log('#song-item-'+songQueue);
    $('.song-item').removeClass('selected-song');
    $('#song-item-'+ songQueue).addClass('selected-song');
}

function togglePlayButtonClass(toggle){
    console.log(`toggle ${toggle}`)
    if(toggle){
        if(toggle == 'play'){
            $('#play-button').children().removeClass();
            $('#play-button').children().addClass('fa fa-play');
        }else{
            $('#play-button').children().removeClass();
            $('#play-button').children().addClass('fa fa-pause');
        }
    }else{
        $('#play-button').children().toggleClass('fa fa-play')
        $('#play-button').children().toggleClass('fa fa-pause')
    }
}

function togglePlayPause(){
    if(!song){
        openSong(tracks[0].songId)
    }else{
        if(song.paused && song.currentTime > 0 && !song.ended) {
            song.play();
         } else {
            song.pause();
         }
    }
}

function playAction(){
    //togglePlayButtonClass();
    togglePlayPause();
}

function nextAction(){
    nextSong();
}

function prevAction(){
    prevSong()
}

function updateSongSliderMax(value){
    document.getElementById("audio-slider").max = value;
}

function setSongSliderPosition(value){
    document.getElementById("audio-slider").value = value;
}

function updateVolumeSlider(value){
    value = Number((value * 100).toFixed(0))
    console.log(value)
    document.getElementById("volume-slider").value = value
}

function updateSongTime(value){
    if(song){
        console.log(value)
        song.currentTime = value;
    }else{
        setSongSliderPosition(0);
    }
}

function updateSongVolume(value){
    if(song){
        console.log(Number((value / 100).toFixed(2)))
        volume = Number((value / 100).toFixed(2))
        song.volume = volume;
    }
}


function nextSong(){
    currentSongId = song.src.split('/')[4];
    var currentTrackIndex = arraySearch(tracks, currentSongId)
    console.log(currentTrackIndex + ', ' + tracks.length)

    if(currentTrackIndex+1 >= tracks.length && repeat == true){
        console.log('repeat')
        newTrackIndex = 0;
    }else{
        console.log('next')
        newTrackIndex = currentTrackIndex + 1;
    }
    var newSongId = tracks[newTrackIndex].songId;
    openSong(newSongId);
}

function prevSong(){
    currentSongId = song.src.split('/')[4];
    var currentTrackIndex = arraySearch(tracks, currentSongId)
    console.log(currentTrackIndex + ', ' + tracks.length)

    if(currentTrackIndex == 0){
        newTrackIndex = 0;
    }else{
        console.log('prev')
        newTrackIndex = currentTrackIndex - 1;
    }
    var newSongId = tracks[newTrackIndex].songId;
    openSong(newSongId);
}


function addSongEventListeners(){
    song.onended = function() {
        togglePlayButtonClass('play');
        nextSong();
    };

    song.onloadeddata = function(){
        updateSongSliderMax(song.duration)
    }

    song.oncanplay = function(){
        song.volume = volume;
        song.play()
        togglePlayButtonClass('pause')
    }

    song.ontimeupdate = function(){
        setSongSliderPosition(song.currentTime)
    }

    song.onplaying = function(){
        togglePlayButtonClass('pause')
    }

    song.onpause = function(){
        togglePlayButtonClass('play')
    }

}


