// ============= STORAGE MANAGEMENT =============
const Storage = {
    save: (key, data) => chrome.storage.sync.set({ [key]: data }),
    load: (key) => new Promise(resolve => chrome.storage.sync.get(key, r => resolve(r[key]))),
    remove: (key) => chrome.storage.sync.remove(key)
};

// ============= THEME MANAGEMENT =============
const ThemeManager = {
    init() {
        Storage.load('theme').then(theme => {
            if (theme === 'dark') this.setDark();
        });
        document.getElementById('themeToggle').addEventListener('click', () => this.toggle());
    },
    toggle() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        Storage.save('theme', isDark ? 'dark' : 'light');
        document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌙';
    },
    setDark() {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }
};

// ============= TAB MANAGEMENT =============
const TabManager = {
    init() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
    },
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');
    }
};

// ============= TIMER FUNCTIONALITY =============
const Timer = {
    seconds: 0,
    timerInterval: null,
    isRunning: false,

    init() {
        this.loadTimer();
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    },

    loadTimer() {
        const mins = parseInt(document.getElementById('minutes').value) || 25;
        const secs = parseInt(document.getElementById('seconds').value) || 0;
        this.seconds = mins * 60 + secs;
        this.updateDisplay();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loadTimer();
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('timerStatus').textContent = '⏱️ Running...';

        this.timerInterval = setInterval(() => {
            this.seconds--;
            this.updateDisplay();
            
            if (this.seconds <= 0) {
                this.finish();
            }
        }, 1000);
    },

    pause() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('timerStatus').textContent = '⏸️ Paused';
    },

    reset() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.loadTimer();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('timerStatus').textContent = 'Ready';
    },

    finish() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('timerStatus').textContent = '✅ Complete!';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        this.notifyCompletion();
    },

    updateDisplay() {
        const mins = Math.floor(this.seconds / 60);
        const secs = this.seconds % 60;
        document.getElementById('timerDisplay').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },

    notifyCompletion() {
        if (Notification.permission === 'granted') {
            new Notification('Timer Complete! 🎉', {
                body: 'Your focus session is done!'
            });
        }
        // Store focus time
        Storage.load('focusTime').then(time => {
            Storage.save('focusTime', (time || 0) + 25);
        });
    }
};

// ============= NOTES FUNCTIONALITY =============
const Notes = {
    init() {
        document.getElementById('saveNoteBtn').addEventListener('click', () => this.saveNote());
        document.getElementById('notesList').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-note-btn')) {
                this.deleteNote(parseInt(e.target.dataset.id));
            }
        });
        this.loadNotes();
    },

    saveNote() {
        const text = document.getElementById('noteInput').value.trim();
        if (!text) return;

        Storage.load('notes').then(notes => {
            const allNotes = notes || [];
            allNotes.push({
                id: Date.now(),
                text: text,
                date: new Date().toLocaleDateString()
            });
            Storage.save('notes', allNotes);
            document.getElementById('noteInput').value = '';
            this.loadNotes();
        });
    },

    loadNotes() {
        Storage.load('notes').then(notes => {
            const list = document.getElementById('notesList');
            list.innerHTML = '';
            (notes || []).reverse().forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'note-item';
                noteEl.innerHTML = `
                    <p>${this.escapeHtml(note.text)}</p>
                    <small>${note.date}</small>
                    <button class="btn btn-danger compact delete-note-btn" data-id="${note.id}">Delete</button>
                `;
                list.appendChild(noteEl);
            });
        });
    },

    deleteNote(id) {
        Storage.load('notes').then(notes => {
            const filtered = (notes || []).filter(n => n.id !== id);
            Storage.save('notes', filtered);
            this.loadNotes();
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============= TODOS FUNCTIONALITY =============
const Todos = {
    init() {
        document.getElementById('addTodoBtn').addEventListener('click', () => this.addTodo());
        document.getElementById('todoInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        document.getElementById('todosList').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.toggleTodo(parseInt(e.target.dataset.id));
            }
        });
        document.getElementById('todosList').addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-todo-btn')) {
                this.deleteTodo(parseInt(e.target.dataset.id));
            }
        });
        this.loadTodos();
    },

    addTodo() {
        const input = document.getElementById('todoInput');
        const text = input.value.trim();
        if (!text) return;

        Storage.load('todos').then(todos => {
            const allTodos = todos || [];
            allTodos.push({
                id: Date.now(),
                text: text,
                completed: false
            });
            Storage.save('todos', allTodos);
            input.value = '';
            this.loadTodos();
        });
    },

    loadTodos() {
        Storage.load('todos').then(todos => {
            const list = document.getElementById('todosList');
            list.innerHTML = '';
            (todos || []).forEach(todo => {
                const li = document.createElement('li');
                li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
                li.innerHTML = `
                    <input type="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
                    <span>${this.escapeHtml(todo.text)}</span>
                    <button class="btn btn-danger compact delete-todo-btn" data-id="${todo.id}">×</button>
                `;
                list.appendChild(li);
            });
            this.updateStats();
        });
    },

    toggleTodo(id) {
        Storage.load('todos').then(todos => {
            const updated = (todos || []).map(t => t.id === id ? {...t, completed: !t.completed} : t);
            Storage.save('todos', updated);
            this.loadTodos();
        });
    },

    deleteTodo(id) {
        Storage.load('todos').then(todos => {
            const filtered = (todos || []).filter(t => t.id !== id);
            Storage.save('todos', filtered);
            this.loadTodos();
        });
    },

    updateStats() {
        Storage.load('todos').then(todos => {
            const all = todos || [];
            const completed = all.filter(t => t.completed).length;
            document.getElementById('totalTodos').textContent = all.length;
            document.getElementById('completedTodos').textContent = completed;
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============= TOOLS FUNCTIONALITY =============
const Tools = {
    init() {
        document.getElementById('colorInput').addEventListener('input', (e) => {
            document.getElementById('colorDisplay').style.backgroundColor = e.target.value;
            document.getElementById('colorValue').textContent = e.target.value.toUpperCase();
        });
        this.updateStats();
    },

    updateStats() {
        Storage.load('focusTime').then(time => {
            const hours = Math.floor((time || 0) / 60);
            document.getElementById('focusTime').textContent = hours + 'h';
        });
    }
};

// ============= DATA MANAGEMENT =============
document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (confirm('Are you sure? This will delete ALL data!')) {
        chrome.storage.sync.clear(() => {
            alert('All data cleared! 🗑️');
            location.reload();
        });
    }
});

// ============= INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    TabManager.init();
    Timer.init();
    Notes.init();
    Todos.init();
    Tools.init();
    
    // Request notification permission
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
