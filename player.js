const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const progress = document.getElementById('progress');
const progressContainer = document.getElementById('progressContainer');
const currentTime = document.getElementById('currentTime');
const duration = document.getElementById('duration');
const songTitle = document.getElementById('songTitle');
const artistName = document.getElementById('artistName');
const volumeBar = document.getElementById('volumeBar');
const volumeContainer = document.getElementById('volumeContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const playlistElement = document.getElementById('playlist');
const visualizer = document.getElementById('visualizer');
const ctx = visualizer.getContext('2d');

let audioContext = null;
let analyser = null;
let dataArray = null;
let isPlaying = false;
let currentSongIndex = 0;
let isShuffled = false;
let repeatMode = 'none'; // none, one, all
const playlist = [...defaultPlaylist]; // Mulai dengan lagu default

// Setup audio visualizer
function setupVisualizer() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            // Tingkatkan resolusi visualizer dan smoothing
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }

        // Pastikan canvas memiliki ukuran yang tepat
        function resizeCanvas() {
            visualizer.width = visualizer.offsetWidth * window.devicePixelRatio;
            visualizer.height = visualizer.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    } catch (error) {
        console.error('Error setting up visualizer:', error);
    }
}

// Visualizer yang lebih menarik
function drawVisualizer() {
    if (!analyser) return;
    
    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);
    
    const width = visualizer.width / window.devicePixelRatio;
    const height = visualizer.height / window.devicePixelRatio;
    
    // Clear canvas dengan efek fade yang lebih transparan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);
    
    // Hitung parameter visualizer
    const barCount = 32; // Kurangi jumlah bar agar lebih rapi
    const barWidth = width / barCount;
    const barSpacing = 4; // Tambah spacing antar bar
    
    // Smooth the frequency data
    const smoothedData = new Array(barCount).fill(0);
    const samplesPerBar = Math.floor(dataArray.length / barCount);
    
    for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
            sum += dataArray[i * samplesPerBar + j];
        }
        smoothedData[i] = sum / samplesPerBar;
    }
    
    // Draw mirrored bars
    for (let i = 0; i < barCount; i++) {
        const barHeight = (smoothedData[i] / 255) * height * 0.4; // Kurangi tinggi maksimum
        
        // Warna yang lebih cerah dan konsisten
        const hue = 250 + (i / barCount) * 60; // Range warna dari ungu ke biru
        const saturation = 100;
        const lightness = 60 + (barHeight / height) * 20;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, height/2 - barHeight, 0, height/2 + barHeight);
        gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness + 10}%, 0.7)`);
        gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, 0.9)`);
        
        // Calculate bar position
        const x = i * (barWidth + barSpacing) + barSpacing/2;
        
        // Draw top bar
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.roundRect(x, height/2 - barHeight, barWidth, barHeight, barWidth/2);
        ctx.fill();
        
        // Draw bottom bar (mirrored)
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.roundRect(x, height/2, barWidth, barHeight, barWidth/2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
    }
    
    // Reset shadow effect
    ctx.shadowBlur = 0;
    
    // Add center line with glow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.stroke();
}

// Update playlist UI
function updatePlaylistUI() {
    playlistElement.innerHTML = '';
    playlist.forEach((song, index) => {
        const li = document.createElement('li');
        li.className = `flex items-center justify-between p-2 rounded hover:bg-white/10 cursor-pointer ${
            index === currentSongIndex ? 'bg-blue-500/30' : ''
        }`;
        li.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="material-icons text-gray-400 text-sm">music_note</span>
                <span class="text-gray-300">${song.title}</span>
            </div>
            <span class="text-xs text-gray-500">${song.artist}</span>
        `;
        li.addEventListener('click', () => loadSong(song, index));
        playlistElement.appendChild(li);
    });
}

// Load and play song
async function loadSong(song, index) {
    try {
        currentSongIndex = index;
        songTitle.textContent = song.title;
        artistName.textContent = song.artist;
        
        audio.src = song.url;
        
        await audio.load();
        
        // Setup visualizer jika belum
        if (!audioContext) {
            setupVisualizer();
        }
        
        // Resume audioContext jika suspended
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        playAudio();
        updatePlaylistUI();
    } catch (error) {
        console.error('Error loading song:', error);
        alert('Gagal memuat lagu. Silakan coba lagi.');
    }
}

// Playback controls
async function playAudio() {
    try {
        // Resume audioContext jika suspended
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        await audio.play();
        isPlaying = true;
        playBtn.innerHTML = '<span class="material-icons text-3xl">pause</span>';
        
        // Mulai visualizer hanya jika audio sedang bermain
        if (audioContext && analyser) {
            drawVisualizer();
        }
    } catch (error) {
        console.error('Error playing audio:', error);
        pauseAudio();
    }
}

function pauseAudio() {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = '<span class="material-icons text-3xl">play_arrow</span>';
}

playBtn.addEventListener('click', () => isPlaying ? pauseAudio() : playAudio());

// Progress bar
audio.addEventListener('timeupdate', updateProgress);
progressContainer.addEventListener('click', setProgress);

function updateProgress() {
    const progressPercent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${progressPercent}%`;
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
}

function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    audio.currentTime = (clickX / width) * audio.duration;
}

// Volume control
volumeContainer.addEventListener('click', (e) => {
    const width = volumeContainer.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    audio.volume = volume;
    volumeBar.style.width = `${volume * 100}%`;
});

// Navigation controls
prevBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
    loadSong(playlist[currentSongIndex], currentSongIndex);
});

nextBtn.addEventListener('click', () => {
    currentSongIndex = (currentSongIndex + 1) % playlist.length;
    loadSong(playlist[currentSongIndex], currentSongIndex);
});

// Shuffle and repeat
shuffleBtn.addEventListener('click', () => {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('text-blue-500');
});

repeatBtn.addEventListener('click', () => {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    
    repeatBtn.classList.toggle('text-blue-500', repeatMode !== 'none');
    if (repeatMode === 'one') {
        repeatBtn.innerHTML = '<span class="material-icons">repeat_one</span>';
    } else {
        repeatBtn.innerHTML = '<span class="material-icons">repeat</span>';
    }
});

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Tambahkan fungsi untuk menyimpan playlist ke localStorage
function savePlaylist() {
    const playlistData = playlist.map(song => ({
        title: song.title,
        artist: song.artist,
        // Kita tidak bisa menyimpan File object langsung ke localStorage
        // Jadi kita akan menyimpan path-nya saja
        filePath: song.file ? song.file.name : song.url
    }));
    localStorage.setItem('musicPlaylist', JSON.stringify(playlistData));
}

// Tambahkan fungsi untuk memuat playlist dari localStorage
function loadSavedPlaylist() {
    const savedPlaylist = localStorage.getItem('musicPlaylist');
    if (savedPlaylist) {
        const playlistData = JSON.parse(savedPlaylist);
        // Tampilkan pesan bahwa ada playlist tersimpan
        if (playlistData.length > 0) {
            songTitle.textContent = 'Playlist tersimpan tersedia';
            artistName.textContent = `${playlistData.length} lagu`;
        }
    }
}

// Panggil loadSavedPlaylist saat halaman dimuat
document.addEventListener('DOMContentLoaded', loadSavedPlaylist);

// Load playlist default saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Hapus event listener ganda
        loadSavedPlaylist();
        updatePlaylistUI();
        
        // Tunggu audio context siap
        if (playlist.length > 0) {
            const firstSong = playlist[0];
            
            // Pre-load audio untuk memastikan bisa diputar
            audio.src = firstSong.file ? URL.createObjectURL(firstSong.file) : firstSong.url;
            await audio.load();
            
            // Setup visualizer setelah user interaction
            const startPlayback = async () => {
                if (audioContext && audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                setupVisualizer();
                loadSong(firstSong, 0);
                document.removeEventListener('click', startPlayback);
            };
            
            document.addEventListener('click', startPlayback);
            
            // Update UI
            songTitle.textContent = firstSong.title;
            artistName.textContent = firstSong.artist;
        }
    } catch (error) {
        console.error('Error initializing player:', error);
    }
}); 