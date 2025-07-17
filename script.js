// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const textContainer = document.getElementById('textContainer');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');

// Speech Synthesis
const synth = window.speechSynthesis;
let currentText = '';
let isPlaying = false;
let voices = [];
let utterance = null;

// Check support
if (!('speechSynthesis' in window)) {
    alert("Your browser doesn't support speech synthesis. Please try Chrome or Edge.");
}

// Load voices
function loadVoices() {
    voices = synth.getVoices();
    if (voices.length === 0) {
        setTimeout(loadVoices, 100);
    }
}
loadVoices();
synth.onvoiceschanged = loadVoices;

// Handle PDF file
async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
        alert('Please upload a valid PDF file.');
        return;
    }

    textContainer.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Processing PDF...</p></div>';

    try {
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });

        const typedArray = new Uint8Array(fileData);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;

        const pageTexts = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            pageTexts.push(text);
        }

        currentText = pageTexts.join('\n\n');
        textContainer.innerHTML = `<div class="text-content">${currentText}</div>`;

        playBtn.disabled = false;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    } catch (err) {
        console.error(err);
        textContainer.innerHTML = '<div class="placeholder"><i class="fas fa-exclamation-triangle"></i><p>Error loading PDF.</p></div>';
    }
}

// File input
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

// Drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, e => {
        e.preventDefault();
        e.stopPropagation();
    }, false);
});
['dragenter', 'dragover'].forEach(event => {
    dropZone.addEventListener(event, () => dropZone.classList.add('highlight'), false);
});
['dragleave', 'drop'].forEach(event => {
    dropZone.addEventListener(event, () => dropZone.classList.remove('highlight'), false);
});
dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// Play
playBtn.addEventListener('click', () => {
    if (!currentText) {
        alert('No PDF text to read.');
        return;
    }

    if (synth.speaking && !synth.paused) return;

    if (synth.paused) {
        synth.resume();
        return;
    }

    utterance = new SpeechSynthesisUtterance(currentText);
    utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;

    utterance.onend = () => {
        isPlaying = false;
        playBtn.classList.remove('active');
        pauseBtn.classList.remove('active');
        stopBtn.classList.remove('active');
    };

    isPlaying = true;
    synth.speak(utterance);

    playBtn.classList.add('active');
    pauseBtn.classList.remove('active');
    stopBtn.classList.remove('active');
});

// Pause
pauseBtn.addEventListener('click', () => {
    if (synth.speaking && !synth.paused) {
        synth.pause();
        isPlaying = false;
        pauseBtn.classList.add('active');
        playBtn.classList.remove('active');
    }
});

// Stop (NOW WORKS EVEN ON MULTIPLE CLICKS)
stopBtn.addEventListener('click', () => {
    if (synth.speaking || synth.paused) {
        synth.cancel();
    }
    isPlaying = false;
    utterance = null;

    stopBtn.classList.add('active');
    playBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
});
