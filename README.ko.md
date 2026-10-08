🇰🇷 [English](./README.md)

# 포커스스트릭 (focusstreak) — 앱인토스용 습관 형성 뽀모도로 집중 타이머

포커스스트릭은 하루 동안 얼마나 집중했는지 쌓아 보여 주는 뽀모도로 방식 집중 타이머 미니앱입니다. 달력에서 하루 목표를 향한 진행 상황을 보여 주고, 연속 기록과 배지를 관리하며, 친구와 이번 주 집중 시간을 비교할 수 있습니다. 단순한 습관으로 집중 시간이 늘어나는 모습을 확인하고 싶은 사람을 위해 만들었고, 토스 앱 안에서 독립형 Vite + React 웹 앱으로 동작합니다.

## 주요 기능

- ⏱️ **집중 타이머**: 25분 집중 세션. 남은 시간은 종료 절대 시각으로 계산하므로 앱이 백그라운드에 갔다 와도 표시가 정확합니다.
- 🎯 **일일 목표 링**: 홈에서 하루 집중 목표(기본 120분)까지 얼마나 왔는지 보여 줍니다.
- 📅 **달력**: 월간 보기에서 날짜마다 목표 대비 네 단계로 색을 달리합니다.
- 🗂️ **기록**: 선택한 날의 세션 목록. 삭제와 확인 대화상자를 지원합니다.
- 🔥 **연속 기록**: 기록된 세션으로 현재 연속 기록과 최장 연속 기록을 계산합니다.
- 🏅 **배지**: 일곱 가지 업적(첫 기록, 3·7·30일 연속, 누적 10시간·50시간, 2시간 깊은 집중 세션)과 공유 버튼.
- 📊 **주간 리포트**: 이번 주 요약. 리워드 광고를 시청하면 열리며, 광고 로드가 세 번 실패하면 광고 없이 열립니다. 잠금 해제한 주는 최대 12주까지 보관합니다.
- 👥 **친구 랭킹**: 이번 주 집중 시간(분)을 친구와 비교합니다. 공유 코드로 친구를 추가하며, 모든 데이터는 기기 안에만 저장됩니다.
- ⚙️ **설정**: 일일 목표와 타이머 옵션을 바꿉니다. 입력값 범위를 검증합니다.
- 🔗 **공유**: 앱의 화면으로 연결되는 토스 딥링크를 공유합니다.
- ⭐ **리뷰 요청**: 집중 세션을 끝낸 직후 리뷰를 한 번만 요청합니다.
- 📣 **배너 광고**: 홈, 달력, 기록, 더보기 화면에 노출됩니다.

> **현재 제한 사항**
> - 타이머가 아직 새 세션을 저장하지 않습니다. 완료 시 호출되는 훅(`src/pages/Home.tsx`의 `onSessionEnd`)은 자리표시자이며, 기록 화면에서는 세션을 읽고 삭제만 할 수 있습니다.
> - 홈 타이머는 항상 고정된 25분 집중 시간을 씁니다. 설정의 집중·휴식 시간은 저장되지만 아직 타이머에 적용되지 않습니다.
> - 인앱 결제 컴포넌트(`src/components/TossPurchase.tsx`)는 있지만 아직 어떤 페이지에도 붙어 있지 않습니다.

## 기술 스택

- **프레임워크**: React 18, TypeScript, Vite 6 (정적 빌드만 지원)
- **라우팅**: React Router 7 (`BrowserRouter`)
- **UI**: Toss Design System(`@toss/tds-mobile`, `@toss/tds-mobile-ait`)과 TDS 테마 색상 및 CSS 변수
- **플랫폼 SDK**: `@apps-in-toss/web-framework` (햅틱, 공유 링크, 광고, 분석, 리뷰 요청)
- **저장소**: `fs:` 접두사를 붙인 브라우저 `localStorage`. 데이터베이스와 서버는 없습니다.
- **인증**: 없음. 토스 앱이 사용자 세션을 제공합니다.
- **테스트**: jsdom과 Testing Library를 쓰는 Vitest, Playwright 비주얼 스모크 테스트

## 시작하기

```bash
# 의존성 설치 (pnpm이 아닌 npm 사용)
npm install

# 단위 테스트
npx vitest run

# 프로덕션 번들 (dist/에 출력)
npx vite build

# Apps-in-Toss 번들
npx ait build
```

빌드 전에 `.env.example`을 `.env`로 복사해서 필요한 값을 채우세요(아래 참고).

## 환경 변수

Vite가 빌드 시점에 값을 읽으므로, 값을 바꾼 뒤에는 다시 빌드해야 합니다.

| 변수 | 설명 | 필수 여부 |
| --- | --- | --- |
| `VITE_TOSS_AD_GROUP_ID` | 앱인토스 콘솔에서 받은 배너 광고 그룹 ID. 달력, 기록, 더보기의 `AdSlot`이 사용합니다. `.env.example`에는 없습니다. | 운영 배포 시 권장 |
| `VITE_TOSS_AD_SLOT_ID` | 주간 리포트(리포트 페이지)를 여는 리워드 광고 슬롯 ID. | 운영 배포 시 권장 |
| `VITE_SHARE_OG_URL` | 공유 링크에 붙는 미리보기 이미지 URL. 비워 두면 미리보기 이미지가 붙지 않습니다. | 아니요 |
| `VITE_TOSS_IAP_SKU` | `TossPurchase`의 상품 SKU. 이 컴포넌트가 읽지만 아직 어떤 페이지에도 마운트되지 않습니다. | 아니요 (현재) |
| `VITE_TOSS_PROMOTION_CODE` | `.env.example`에 있지만 아직 이 값을 읽는 소스 파일이 없습니다. | 아니요 (현재) |

값이 비어 있으면 그 값을 쓰는 기능만 조용히 동작하지 않고, 나머지 앱은 정상적으로 렌더링됩니다.

## 프로젝트 구조

```
src/
├── App.tsx          # Route table
├── main.tsx         # Entry point: TDS provider and router
├── pages/           # Screens (Home, Calendar, History, Report, Badges, Rank, Settings, More)
├── components/      # Reusable UI built on TDS (ScreenScaffold, SummaryHero, FloatingTabBar, ...)
├── lib/             # Domain logic, storage helpers, SDK wrappers (analytics, share, review)
├── styles/          # Global CSS and rewarded-ad styles
├── types/           # Shared type declarations
└── __tests__/       # Vitest unit tests and test helpers
e2e/                 # Playwright visual smoke tests
scripts/             # Build and check scripts
apps-in-toss.config.ts  # Apps-in-Toss app configuration (appName, brand color)
```

## 배포

1. `npx ait build`로 Apps-in-Toss 번들을 빌드합니다. `apps-in-toss.config.ts`의 `appName`은 앱인토스 콘솔에 등록된 앱 이름과 대소문자까지 정확히 같아야 합니다. 다르면 배포 오류(4031)가 납니다.
2. 현재 `ait` 배포 안내에 따라 Apps-in-Toss CLI로 빌드 결과물을 토스 호스팅에 업로드합니다.
3. Apps-in-Toss 개발자 콘솔에서 앱의 빌드를 확인하고 검수를 신청합니다.

이 앱은 정적 빌드(CSR)입니다. 서버 동적 렌더링은 지원하지 않습니다. 검수 체크리스트에 따라 외부 도메인 이동이 없어야 하고, 프로덕션에서 `console.error` 출력이 없어야 하며, 미성년자 대상 콘텐츠가 없어야 합니다.

## 라이선스

MIT
