# 각자의 컴퓨터에서 접속하는 실제 웹사이트 만들기

이 프로젝트는 Render 같은 Node.js 호스팅 서비스에 올리면 `https://이름.onrender.com` 주소를 받아 각자의 컴퓨터와 휴대폰에서 접속할 수 있습니다.

## 중요한 선택

계정과 도감을 업데이트 후에도 유지하려면 **영구 디스크가 있는 서버**가 필요합니다. 이 프로젝트의 `render.yaml`은 `/var/data`에 1GB 영구 디스크를 연결하도록 준비되어 있습니다.

Render의 무료 웹 서버는 재시작·업데이트 때 로컬 파일이 사라지므로 공용 도감 영구 저장에는 사용할 수 없습니다. 영구 디스크를 지원하는 유료 웹 서비스가 필요합니다.

## 배포 순서

1. GitHub에 새 저장소를 만듭니다.
2. `nexus-arena` 폴더 안의 파일을 전부 저장소의 최상위에 업로드합니다. `render.yaml`과 `server.js`가 같은 위치에 있어야 합니다.
3. [Render Dashboard](https://dashboard.render.com/)에 가입하고 GitHub 계정을 연결합니다.
4. **New → Blueprint**를 선택합니다.
5. 방금 만든 GitHub 저장소를 선택합니다.
6. Blueprint에 표시되는 `ishs-arena` 웹 서비스와 `ishs-arena-data` 디스크를 확인하고 배포를 승인합니다.
7. 배포가 끝나면 Render가 `https://ishs-arena-xxxx.onrender.com` 형태의 주소를 보여줍니다.
8. 그 주소를 친구들에게 전달하면 각자 계정을 만들고 같은 공용 도감으로 플레이할 수 있습니다.

## 게임을 업데이트할 때

GitHub의 코드 파일만 새 버전으로 바꿉니다. 다음 파일은 GitHub에 올리거나 덮어쓸 필요가 없습니다.

- `store.json`
- `store.backup.json`
- `.ishs-arena-data` 폴더

Render에서는 계정·도감·팀 데이터가 코드와 분리된 `/var/data/ishs-arena`에 저장되므로 새 버전이 배포되어도 유지됩니다.

## 로컬 컴퓨터에서 업데이트할 때

v3의 새 서버는 계정·도감·팀을 게임 폴더가 아니라 다음 사용자 전용 폴더에 저장합니다.

```text
C:\Users\사용자이름\.ishs-arena-data
```

새 ZIP으로 `nexus-arena` 폴더를 교체해도 이 데이터 폴더는 남아 있습니다. 이전 버전의 `nexus-arena/server-data/store.json`이 발견되면 첫 실행 때 새 위치로 자동 복사합니다.

저장할 때마다 직전 정상 데이터는 `store.backup.json`으로 자동 보관됩니다.

## 관리자 비밀번호 변경

배포 중 Render가 `ISHS_ADMIN_PASSWORD` 값을 요청하면 도감 관리자 비밀번호를 입력합니다. 이 값은 GitHub 코드에 포함되지 않는 비밀 환경값으로 저장됩니다.

## 주의

- 검은 로컬 서버 창을 켜 두는 방식과 달리, 배포된 사이트는 서버가 켜져 있는 동안 어디서나 접속할 수 있습니다.
- 프라이빗 룸은 서버 재시작 중에는 종료되지만 계정·공용 도감·팀은 영구 디스크에 남습니다.
- 도감 이미지도 공용 도감 JSON에 포함되므로 너무 큰 이미지는 피하는 것이 좋습니다.
