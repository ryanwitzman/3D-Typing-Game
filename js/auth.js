// Authentication page functionality
let isLoginMode = true;

const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const submitBtn = document.getElementById('submitBtn');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const errorMessage = document.getElementById('errorMessage');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        verifyToken(token);
    }
});

// Toggle between login and signup modes
toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        authTitle.textContent = 'Login to Race';
        submitBtn.textContent = 'Login';
        toggleAuthMode.textContent = 'Create Account';
        passwordInput.setAttribute('autocomplete', 'current-password');
    } else {
        authTitle.textContent = 'Create Account';
        submitBtn.textContent = 'Sign Up';
        toggleAuthMode.textContent = 'Back to Login';
        passwordInput.setAttribute('autocomplete', 'new-password');
    }

    errorMessage.textContent = '';
    authForm.reset();
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Clear any previous error messages
    errorMessage.textContent = '';

    // Validate input
    if (!username || !password) {
        showError('Username and password are required');
        return;
    }

    if (!isLoginMode) {
        // Additional validation for signup
        if (username.length < 3 || username.length > 20) {
            showError('Username must be 3-20 characters');
            return;
        }

        if (password.length < 4) {
            showError('Password must be at least 4 characters');
            return;
        }
    }

    // Disable form while processing
    submitBtn.disabled = true;
    submitBtn.textContent = isLoginMode ? 'Logging in...' : 'Creating account...';

    try {
        const endpoint = isLoginMode ? '/api/login' : '/api/signup';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userColor', data.user.color);

            // Redirect to home page
            window.location.href = 'home.html';
        } else {
            showError(data.error || 'Authentication failed');
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
        }
    } catch (error) {
        console.error('Auth error:', error);
        showError('Connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
    }
});

// Verify token validity
async function verifyToken(token) {
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
            // Token is valid, redirect to home
            window.location.href = 'home.html';
        } else {
            // Token invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('userColor');
        }
    } catch (error) {
        console.error('Token verification error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userColor');
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Allow Enter key to submit form
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        authForm.dispatchEvent(new Event('submit'));
    }
});
