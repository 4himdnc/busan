# 샬롬하우스 (Shalom House) - 이주민을 위한 종합 지원 플랫폼

[![Deployed on Vercel](https://vercel.com/button)](https://busan-napiy50ee-4himdncs-projects.vercel.app)

## 📋 프로젝트 소개

샬롬하우스는 한국에 거주하는 이주민들을 위한 종합 지원 플랫폼입니다. 교회 연결, 법률 상담, 의료 지원, 교육 멘토링, 커뮤니티 등 다양한 서비스를 통해 이주민들의 한국 생활 적응을 돕습니다.

## ✨ 주요 기능

### 🏛️ 교회 연결 시스템
- **다국어 예배 정보**: 필리핀어, 베트남어, 태국어, 인도네시아어 등 다양한 언어 지원
- **지역별 검색**: GPS 기반 주변 교회 찾기
- **세부 필터링**: 교단, 예배 시간, 제공 서비스별 검색
- **교회 정보 관리**: 연락처, 시설, 목회진 정보

### 💬 커뮤니티 게시판
- **다양한 게시판**: 자유게시판, 정보공유, Q&A, 구인구직, 중고나눔
- **다국어 지원**: 각 언어별 게시글 작성 및 검색
- **실시간 댓글**: 대댓글 지원, 좋아요/북마크 기능
- **지역별 정보**: 거주 지역별 맞춤 정보 제공

### 🤝 봉사자 시스템
- **전문 분야별 매칭**: 번역, 통역, 법률, 의료, 교육 등
- **언어 능력 기반**: 봉사자의 언어 구사 능력에 따른 매칭
- **체계적 관리**: 신청-심사-승인-활동 전 과정 관리
- **활동 기록**: 봉사 시간 및 평가 시스템

### 🔐 사용자 관리
- **이주민 맞춤 회원가입**: 국적, 언어, 한국어 수준 등 상세 정보
- **다단계 인증**: 이메일 인증, 비밀번호 재설정
- **역할 기반 권한**: 일반 사용자, 봉사자, 관리자
- **프로필 관리**: 관심사, 경험, 긴급 연락처 등

## 🛠️ 기술 스택

### Backend
- **Node.js** + **Express.js**: RESTful API 서버
- **MongoDB** + **Mongoose**: NoSQL 데이터베이스
- **JWT**: 인증 및 세션 관리
- **bcryptjs**: 비밀번호 암호화
- **Multer**: 파일 업로드 처리

### Security & Performance
- **Helmet**: 보안 헤더 설정
- **Rate Limiting**: API 호출 제한
- **CORS**: 크로스 오리진 리소스 공유 설정
- **Compression**: Gzip 압축

### Validation & Utilities
- **express-validator**: 입력 데이터 검증
- **Morgan**: HTTP 요청 로깅
- **Nodemailer**: 이메일 발송

## 📁 프로젝트 구조

```
shalom-house/
│
├── models/              # 데이터베이스 모델
│   ├── User.js         # 사용자 모델
│   ├── Church.js       # 교회 모델  
│   ├── Post.js         # 게시글 모델
│   ├── Comment.js      # 댓글 모델
│   └── Volunteer.js    # 봉사자 모델
│
├── routes/              # API 라우터
│   ├── auth.js         # 인증 관련
│   ├── users.js        # 사용자 관리
│   ├── churches.js     # 교회 정보
│   ├── posts.js        # 게시글
│   ├── comments.js     # 댓글
│   ├── volunteers.js   # 봉사자
│   └── upload.js       # 파일 업로드
│
├── middleware/          # 미들웨어
│   └── auth.js         # 인증 미들웨어
│
├── scripts/            # 유틸리티 스크립트
│   ├── init-database.js    # DB 초기화
│   └── seed-database.js    # 샘플 데이터
│
├── uploads/            # 업로드 파일 저장소
├── busan_index.html    # 메인 웹페이지
├── server.js           # 서버 메인 파일
├── package.json        # 의존성 관리
└── README.md          # 프로젝트 문서
```

## 🚀 설치 및 실행

### 1. 필수 요구사항
- **Node.js** 16.0 이상
- **MongoDB** 4.4 이상
- **npm** 또는 **yarn**

### 2. 프로젝트 클론 및 설치
```bash
# 프로젝트 클론
git clone [repository-url]
cd shalom-house

# 의존성 설치
npm install
```

### 3. 환경 설정
```bash
# 환경 설정 파일 복사
cp config.env .env

# .env 파일 편집 (필요한 설정 값 입력)
# - MONGODB_URI: MongoDB 연결 URL
# - JWT_SECRET: JWT 시크릿 키
# - EMAIL_* : 이메일 설정 (선택사항)
```

### 4. 데이터베이스 설정
```bash
# MongoDB 시작 (로컬 설치의 경우)
mongod

# 데이터베이스 초기화
npm run init-db

# 샘플 데이터 생성 (선택사항)
npm run seed
```

### 5. 서버 실행
```bash
# 개발 모드 실행
npm run dev

# 프로덕션 모드 실행
npm start
```

서버가 성공적으로 시작되면:
- 🌐 웹사이트: http://localhost:3000
- 📡 API: http://localhost:3000/api
- ❤️ 헬스체크: http://localhost:3000/api/health

## 📡 API 엔드포인트

### 인증 (`/api/auth`)
- `POST /register` - 회원가입
- `POST /login` - 로그인
- `GET /me` - 내 정보 조회
- `POST /forgot-password` - 비밀번호 재설정 요청
- `POST /reset-password` - 비밀번호 재설정
- `PUT /change-password` - 비밀번호 변경

### 교회 (`/api/churches`)
- `GET /` - 교회 목록 조회 (필터링 지원)
- `GET /:id` - 특정 교회 정보
- `POST /` - 새 교회 등록
- `PUT /:id` - 교회 정보 수정
- `DELETE /:id` - 교회 삭제
- `GET /nearby/:lat/:lng` - 주변 교회 검색

### 게시글 (`/api/posts`)
- `GET /` - 게시글 목록 (게시판별, 필터링)
- `GET /:id` - 게시글 상세
- `POST /` - 새 게시글 작성
- `PUT /:id` - 게시글 수정
- `DELETE /:id` - 게시글 삭제
- `POST /:id/like` - 좋아요/취소

### 댓글 (`/api/comments`)
- `GET /post/:postId` - 게시글 댓글 목록
- `POST /` - 댓글 작성
- `PUT /:id` - 댓글 수정
- `DELETE /:id` - 댓글 삭제
- `POST /:id/like` - 댓글 좋아요

### 봉사자 (`/api/volunteers`)
- `POST /apply` - 봉사자 신청
- `GET /applications` - 신청 목록 (관리자)
- `PUT /:id/status` - 신청 상태 변경
- `GET /my-application` - 내 신청 현황

## 🌍 다국어 지원

현재 지원되는 언어:
- 🇰🇷 한국어 (Korean)
- 🇺🇸 영어 (English)  
- 🇵🇭 타갈로그어 (Tagalog)
- 🇻🇳 베트남어 (Vietnamese)
- 🇹🇭 태국어 (Thai)
- 🇮🇩 인도네시아어 (Indonesian)
- 🇲🇲 미얀마어 (Burmese)
- 🇰🇭 크메르어 (Khmer)
- 🇱🇦 라오어 (Lao)
- 🇧🇩 벵골어 (Bengali)
- 🇵🇰 우르두어 (Urdu)
- 🇳🇵 네팔어 (Nepali)
- 🇱🇰 싱할라어 (Sinhala)
- 🇺🇿 우즈베크어 (Uzbek)
- 🇰🇿 카자흐어 (Kazakh)
- 🇲🇳 몽골어 (Mongolian)
- 🇨🇳 중국어 (Chinese)
- 🇯🇵 일본어 (Japanese)

## 🔒 보안 기능

- **Rate Limiting**: API 호출 제한으로 DDoS 방지
- **JWT 인증**: 안전한 토큰 기반 인증
- **비밀번호 암호화**: bcrypt를 이용한 해싱
- **입력 검증**: express-validator로 모든 입력 검증
- **CORS 설정**: 허용된 도메인만 API 접근 가능
- **헬멧 보안**: 기본 보안 헤더 설정

## 📊 데이터베이스 스키마

### Users (사용자)
```javascript
{
  email: String,           // 이메일 (고유)
  password: String,        // 암호화된 비밀번호
  name: String,           // 이름
  nationality: String,     // 국적
  nativeLanguage: String, // 모국어
  koreanLevel: String,    // 한국어 수준
  region: {               // 거주지
    city: String,
    district: String,
    address: String
  },
  role: String,           // 역할 (user/volunteer/admin)
  interests: [String],    // 관심사
  // ... 기타 필드
}
```

### Churches (교회)
```javascript
{
  name: String,                    // 교회명
  contact: {                      // 연락처
    phone: String,
    email: String,
    website: String
  },
  address: {                      // 주소
    fullAddress: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  services: [{                    // 예배 정보
    type: String,                 // 예배 종류
    language: String,             // 언어
    dayOfWeek: String,           // 요일
    time: String                 // 시간
  }],
  supportedLanguages: [String],   // 지원 언어
  supportedNationalities: [String], // 지원 국가
  immigrantServices: [{          // 이주민 서비스
    type: String,
    description: String
  }],
  // ... 기타 필드
}
```

## 👥 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

- 📧 이메일: info@shalomhouse.kr
- 📱 전화: 1588-1234
- 🏢 주소: 서울시 강남구 테헤란로 123

## 🙏 감사의 말

이 프로젝트는 한국에 거주하는 모든 이주민들이 따뜻한 공동체 안에서 새로운 시작을 할 수 있도록 돕는 것을 목표로 합니다. 여러분의 관심과 참여에 깊이 감사드립니다.

---

Made with ❤️ for immigrants in Korea 

## 배포 상태
- Production: https://busan-napiy50ee-4himdncs-projects.vercel.app
- GitHub Repository: https://github.com/4himdnc/busan 