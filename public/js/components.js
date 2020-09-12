class miniPlayer extends HTMLElement{
    constructor(){
        super();
        getHTML('miniPlayer.html').then(html =>{
            this.innerHTML = html
            console.log('this is volume ' + volume)
            updateVolumeSlider(volume);
            if(song){
                console.log('update slider max')
                console.log(song.duration)
                setSongSliderPosition(song.currentTime)
                updateSongSliderMax(song.duration)
                if(song.paused) {
                    console.log('song is paused')
                    togglePlayButtonClass('play')
                 } else {
                    togglePlayButtonClass('pause')
                 }
            }else{
                togglePlayButtonClass('play')
            }
        })

    }
}

class songTable extends HTMLElement {
    constructor() {
        super();
        getHTML('songTable.html').then(html=>{
            this.innerHTML = html
        })
    }
}


function getHTML(file){
    return new Promise(resolve =>{
        $.get( `/component/${file}`, function( data ) {
            resolve(data)
        });
    })
}



window.customElements.define('mini-player', miniPlayer);
window.customElements.define('song-table', songTable);