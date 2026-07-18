# ISHS ARENA 무료 온라인 배포

Render 무료 웹 서버와 Neon 무료 Postgres를 함께 사용합니다. Render가 쉬거나 다시 배포되어도 계정, 공용 도감, 팀 데이터는 Neon에 남습니다.

## 1. Neon 무료 데이터베이스 만들기

1. [Neon](https://console.neon.tech/)에 GitHub 계정으로 로그인합니다.
2. **New Project**를 누릅니다.
3. 프로젝트 이름을 `ishs-arena`로 정하고 가까운 지역을 선택한 뒤 생성합니다.
4. 프로젝트 화면의 **Connect**를 누릅니다.
5. 표시되는 Postgres 연결 문자열을 **Copy**로 복사합니다. 보통 `postgresql://`로 시작합니다.

SQL을 직접 입력하거나 표를 만들 필요는 없습니다. ISHS ARENA 서버가 처음 실행될 때 필요한 표를 자동으로 만듭니다.

## 2. Render 무료 Blueprint 배포

1. [Render Dashboard](https://dashboard.render.com/)에 GitHub 계정으로 로그인합니다.
2. **New → Blueprint**를 선택합니다.
3. `leejuhan-1214/test` 저장소를 선택합니다.
4. `DATABASE_URL` 입력란에 Neon에서 복사한 연결 문자열을 붙여 넣습니다.
5. `ISHS_ADMIN_PASSWORD` 입력란에 도감 관리자 비밀번호를 입력합니다.
6. **Deploy Blueprint**를 누릅니다.
7. 배포가 끝나면 Render가 보여 주는 `https://...onrender.com` 주소로 접속합니다.

## 무료 사용 시 알아둘 점

- Render 무료 서버는 15분 동안 접속이 없으면 쉽니다. 다음 접속 때 다시 켜지는 데 약 1분이 걸릴 수 있습니다.
- 서버가 다시 켜지면 로그인 세션과 진행 중이던 프라이빗 룸은 초기화될 수 있지만, 계정·도감·팀 데이터는 Neon에 유지됩니다.
- Neon 무료 플랜의 저장공간은 작은 게임에는 충분하지만, 도감 이미지를 지나치게 큰 원본으로 등록하지 않는 것이 좋습니다.
- `DATABASE_URL`은 비밀번호가 포함된 비밀값입니다. GitHub 파일이나 채팅에 공개하지 마세요.

## 게임 업데이트

GitHub의 코드 파일을 새 버전으로 교체하면 Render가 자동으로 다시 배포합니다. 데이터는 Neon에 따로 저장되므로 코드 업데이트 후에도 유지됩니다.

업데이트할 때 `DATABASE_URL` 환경값을 삭제하거나 Neon 프로젝트를 삭제하지 마세요.
