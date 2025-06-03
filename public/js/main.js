// API 엔드포인트
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : 'https://busan-napiy50ee-4himdncs-projects.vercel.app/api';

// 인증 관련 함수들
const auth = {
    // 로그인
    async login(email, password) {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                return data;
            }
            throw new Error(data.error);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // 회원가입
    async register(userData) {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
            const data = await response.json();
            if (response.ok) {
                return data;
            }
            throw new Error(data.error);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    // 로그아웃
    logout() {
        localStorage.removeItem('token');
        window.location.reload();
    }
};

// UI 관련 함수들
const ui = {
    // 모달 표시
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },

    // 모달 닫기
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // 알림 표시
    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }
};

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 폼 제출
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const email = loginForm.email.value;
                const password = loginForm.password.value;
                await auth.login(email, password);
                ui.showAlert('로그인 성공!', 'success');
                window.location.reload();
            } catch (error) {
                ui.showAlert(error.message, 'error');
            }
        });
    }

    // 회원가입 폼 제출
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const userData = {
                    email: registerForm.email.value,
                    password: registerForm.password.value,
                    name: registerForm.name.value,
                    nationality: registerForm.nationality.value,
                    nativeLanguage: registerForm.nativeLanguage.value
                };
                await auth.register(userData);
                ui.showAlert('회원가입 성공!', 'success');
                ui.closeModal('registerModal');
            } catch (error) {
                ui.showAlert(error.message, 'error');
            }
        });
    }

    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
}); 