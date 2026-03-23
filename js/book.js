// ============================================
// BOOK MANAGEMENT SYSTEM
// ============================================

import { db } from './firebase-config.js';
import { currentUser } from './auth.js';
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ============================================
// DATA STORAGE
// ============================================

let allBooks = [];
let currentBook = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    setupEventListeners();
});

// ============================================
// BOOK LOADING
// ============================================

async function loadBooks() {
    try {
        const response = await fetch('data/books.json');
        if (!response.ok) throw new Error('Failed to load books');
        
        const data = await response.json();
        allBooks = data.books || [];
        
        displayBooks(allBooks);
        updateBookCount();
        loadSubjectBooks();
        
    } catch (error) {
        console.error('Error loading books:', error);
        showBooksError();
    }
}

function showBooksError() {
    const containers = [
        document.getElementById('booksContainer'),
        document.getElementById('recentBooks'),
        document.getElementById('subjectBooks')
    ];
    
    containers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>Unable to load books. Please try again later.</p>
                    <button onclick="location.reload()" class="btn-primary">Retry</button>
                </div>
            `;
        }
    });
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayBooks(books, containerId = 'booksContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (books.length === 0) {
        container.innerHTML = '<p class="empty-state">No books found</p>';
        return;
    }
    
    container.innerHTML = books.map(book => createBookCard(book)).join('');
}

function createBookCard(book) {
    const subjectColors = {
        english: '#e74c3c',
        math: '#3498db',
        physics: '#9b59b6',
        chemistry: '#1abc9c',
        biology: '#2ecc71',
        'further-math': '#f39c12',
        computer: '#34495e',
        agriculture: '#27ae60'
    };
    
    const subjectIcons = {
        english: '📖',
        math: '📐',
        physics: '⚛️',
        chemistry: '⚗️',
        biology: '🧬',
        'further-math': '🔢',
        computer: '💻',
        agriculture: '🌱'
    };
    
    const color = subjectColors[book.subject] || '#2563eb';
    const icon = subjectIcons[book.subject] || '📚';
    
    return `
        <div class="book-card" data-id="${book.id}">
            <div class="book-cover" style="background: linear-gradient(135deg, ${color}20 0%, ${color}40 100%);">
                <span style="font-size: 4rem;">${icon}</span>
            </div>
            <div class="book-info">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
                <div class="book-meta">
                    <span class="badge ${book.subject}">${book.subject}</span>
                    <span class="badge level">${book.level}</span>
                </div>
                <div class="book-actions">
                    <button onclick="readBook('${book.id}')" class="btn-read">📖 Read</button>
                    <button onclick="downloadBook('${book.id}')" class="btn-download">⬇️ Download</button>
                </div>
            </div>
        </div>
    `;
}

function updateBookCount() {
    const countElement = document.getElementById('bookCount');
    if (countElement) {
        countElement.textContent = allBooks.length;
    }
}

// ============================================
// FILTERING & SEARCH
// ============================================

window.filterBooks = function(subject) {
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('active');
        if ((subject === 'all' && chip.textContent === 'All') || 
            chip.textContent.toLowerCase().includes(subject)) {
            chip.classList.add('active');
        }
    });
    
    let filtered = allBooks;
    if (subject !== 'all') {
        filtered = allBooks.filter(book => book.subject === subject);
    }
    
    const level = document.getElementById('levelFilter')?.value;
    if (level && level !== 'all') {
        filtered = filtered.filter(book => book.level === level);
    }
    
    displayBooks(filtered);
};

window.filterByLevel = function() {
    const activeChip = document.querySelector('.chip.active');
    const subject = activeChip?.dataset.subject || 'all';
    filterBooks(subject);
};

window.searchBooks = function(query) {
    if (!query) {
        displayBooks(allBooks);
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = allBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.description?.toLowerCase().includes(searchTerm)
    );
    
    displayBooks(results);
};

// ============================================
// BOOK ACTIONS
// ============================================

window.readBook = function(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        alert('Book not found');
        return;
    }
    
    currentBook = book;
    
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfFrame');
    const title = document.getElementById('pdfTitle');
    
    if (modal && iframe) {
        title.textContent = book.title;
        iframe.src = book.filePath;
        modal.classList.add('active');
        saveToReadingHistory(bookId);
    } else {
        window.open(`book-viewer.html?book=${bookId}`, '_blank');
    }
};

window.downloadBook = function(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (!book) {
        alert('Book not found');
        return;
    }
    
    const link = document.createElement('a');
    link.href = book.filePath;
    link.download = `${book.title.replace(/\\s+/g, '_')}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    trackBookDownload(bookId);
};

window.closePdfModal = function() {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfFrame');
    if (modal) modal.classList.remove('active');
    if (iframe) iframe.src = '';
};

window.downloadCurrentBook = function() {
    if (currentBook) {
        downloadBook(currentBook.id);
    }
};

// ============================================
// USER BOOK INTERACTIONS
// ============================================

async function saveToReadingHistory(bookId) {
    if (!currentUser) {
        let history = JSON.parse(localStorage.getItem('readingHistory') || '[]');
        history = history.filter(id => id !== bookId);
        history.unshift(bookId);
        history = history.slice(0, 20);
        localStorage.setItem('readingHistory', JSON.stringify(history));
        return;
    }
    
    try {
        const historyRef = doc(db, 'users', currentUser.uid, 'history', bookId);
        await setDoc(historyRef, {
            bookId: bookId,
            readAt: serverTimestamp(),
            progress: 0
        }, { merge: true });
    } catch (error) {
        console.error('Error saving history:', error);
    }
}

async function trackBookDownload(bookId) {
    let downloads = JSON.parse(localStorage.getItem('myDownloads') || '[]');
    if (!downloads.includes(bookId)) {
        downloads.push(bookId);
        localStorage.setItem('myDownloads', JSON.stringify(downloads));
    }
}

// ============================================
// SUBJECT PAGE FUNCTIONS
// ============================================

function loadSubjectBooks() {
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get('subject');
    
    if (!subject) return;
    
    const subjectBooks = allBooks.filter(book => book.subject === subject);
    const container = document.getElementById('subjectBooks');
    
    if (container) {
        if (subjectBooks.length > 0) {
            container.innerHTML = subjectBooks.map(book => createBookCard(book)).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No books available for this subject yet</p>';
        }
    }
    
    const subjectFilter = document.getElementById('subjectFilter');
    if (subjectFilter) {
        subjectFilter.value = subject;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    const modal = document.getElementById('pdfModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePdfModal();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePdfModal();
        }
    });
    
    const searchInput = document.getElementById('bookSearch');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchBooks(e.target.value);
            }, 300);
        });
    }
}

// Exports
export { allBooks, currentBook, loadBooks };
