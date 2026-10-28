# TO Z 로그인·PC/모바일 동기화 설정

TO Z는 기존 WORKs와 같은 Supabase 프로젝트의 계정을 사용할 수 있지만, 데이터는 별도 `toz_documents`와 `toz_allowed_users`에 저장합니다. WORKs의 `pworks_*` 테이블이나 `pworks-sync` 함수는 수정하지 않습니다.

## 1. 서버 테이블 만들기

1. https://supabase.com/dashboard/project/xcqwwyjjeolsmmxpkvfm 에 관리자 계정으로 로그인합니다.
2. SQL Editor → New query에서 `cloud/schema.sql` 전체 내용을 붙여넣고 Run을 누릅니다.
3. Authentication → Users에서 로그인할 사용자의 UID를 복사합니다. WORKs에서 쓰는 이메일 계정을 그대로 사용할 수 있습니다. 다른 계정이 필요하면 Users에서 별도로 만듭니다.
4. SQL Editor에서 아래 `YOUR-USER-UUID`를 그 UID로 교체해 실행합니다.

```sql
insert into public.toz_allowed_users(user_id)
values ('YOUR-USER-UUID')
on conflict do nothing;
```

공개 회원가입 화면은 제공하지 않습니다. 등록된 허용 계정만 접근할 수 있습니다.

## 2. TO Z 서버 함수 만들기

1. Edge Functions에서 새 함수를 만들고 이름을 **toz-sync**로 지정합니다.
2. `supabase/functions/toz-sync/index.ts` 내용을 붙여넣고 배포합니다.
3. 기존 WORKs의 서버 환경변수 `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 같은 프로젝트에서 제공되는지 확인합니다. 이 값은 앱 파일이나 GitHub에 넣지 않습니다.
4. `ALLOWED_ORIGINS`에 `https://jinhee-hong-test.github.io`가 포함되어야 합니다. 기존 주소들을 유지하고 쉼표로 구분해 필요한 주소를 추가합니다. `file://`나 `null`은 허용하지 않습니다.
5. 플랫폼 JWT 검증으로 401이 발생하면 아래 공식 안내를 확인합니다. 함수 자체에서 `/auth/v1/user`로 로그인 토큰을 검증하고 TO Z 허용 계정도 확인합니다.

공식 문서:
- https://supabase.com/docs/guides/functions/quickstart-dashboard
- https://supabase.com/docs/guides/functions/auth-headers
- https://supabase.com/kb/troubleshooting/edge-function-401-error-response

## 3. 앱 업데이트 및 데이터 이전

1. 먼저 현재 로컬 앱에서 **백업**으로 JSON을 저장합니다. 로컬 파일과 배포 주소는 브라우저 저장 공간이 다르므로 자동으로 같은 데이터를 읽지 않습니다.
2. 최신 `J-TO-0-GitHub-Pages.zip`을 풀어 GitHub 저장소의 파일을 갱신하고 배포합니다.
3. 배포 주소를 새로고침하면 TO Z 로그인 창이 표시됩니다. 1번에서 허용한 계정으로 로그인합니다.
4. 기존 브라우저에 저장된 TO Z 데이터가 있고 서버가 비어 있다면 첫 로그인 시 자동으로 가져옵니다. 로컬 파일의 백업을 옮길 때는 배포된 앱의 **불러오기**를 사용합니다.
5. **동기화 완료**를 확인한 뒤 모바일에서도 같은 배포 주소와 계정으로 로그인합니다.

동기화 항목: 리스트, 프로젝트와 색상·마감일, 약속, 준비·출발 시간, 메모지와 닫은 날짜, 하루기록·일지와 소요시간, 날짜별 하루 시작·출근·퇴근 및 휴일 설정, 휴가·프로젝트 완료 기록.

사용 중인 화면에서 약 3초마다 변경을 확인하고 온라인 복귀·창 복귀 때 재시도합니다. 입력하거나 메모지를 움직이는 중에는 외부 변경 적용을 기다립니다. 미전송 변경은 계정별 로컬 초안에 보관하고 충돌 시 백업 및 서버 불러오기 기능을 제공합니다. 앱이 종료된 상태의 백그라운드 동기화는 제공하지 않습니다.

**WORKs 시간 연결**은 별도 기능입니다. 이를 연결하면 출근·퇴근은 WORKs 값을 읽어 사용하고, TO Z의 다른 기록은 TO Z 서버에 저장합니다.
