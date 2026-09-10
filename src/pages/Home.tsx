import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Top, Button, Paragraph, Spacing, Skeleton } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { CountUp } from '../components/CountUp';
import { Card } from '../components/Card';
import { MiniBar } from '../components/MiniBar';
import { SubmitFooter } from '../components/BottomCTA';
import { AdSlot } from '../components/AdSlot';
import { CircularProgress } from '../components/CircularProgress';
import { read } from '../lib/storage';
import { toDateKey } from '../lib/datetime';
import type { FocusSession } from '../lib/domain';

const SESSIONS_KEY = 'fs:sessions:v1';
const SETTINGS_KEY = 'fs:settings:v1';
const DEFAULT_GOAL_MIN_PER_DAY = 120;
const FOCUS_DURATION_MIN = 25;
const FOCUS_DURATION_MS = FOCUS_DURATION_MIN * 60 * 1000;

type Phase = 'idle' | 'running' | 'paused' | 'break';

const PRIMARY_LABEL: Record<Phase, string> = {
  idle: '집중 시작',
  running: '일시정지',
  paused: '이어서 집중',
  break: '휴식 시작',
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: '집중 준비 완료',
  running: '집중하고 있어요',
  paused: '일시정지했어요',
  break: '잠깐 쉬어가요',
};

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * S1 타이머 홈 — 남은 시간은 endsAt(절대 타임스탬프) 기준으로 매 렌더 재계산한다.
 * setInterval은 재렌더 트리거로만 쓰고, 실제 남은 시간 값은 항상 Date.now()에서 다시 뺀다
 * (누산 카운트다운 금지 — 백그라운드 후 복귀해도 오차가 생기지 않는다).
 *
 * 태그 저장 시트·배지 축하 시트는 이 패킷 범위 밖이다. onSessionEnd가 그 연결 지점이며,
 * 후속 패킷이 이 콜백 안에서 시트를 열도록 이어받으면 된다.
 */
function onSessionEnd(_session: { durationMs: number }) {
  // @AI:NOTE 후속 패킷(태그 저장 시트 · 배지 축하 시트)이 이 자리에서 이어받는다.
}

export default function Home() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [todayMin, setTodayMin] = useState(0);
  const [goalMinPerDay, setGoalMinPerDay] = useState(DEFAULT_GOAL_MIN_PER_DAY);

  const [phase, setPhase] = useState<Phase>('idle');
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState(FOCUS_DURATION_MS);
  const [, forceRender] = useState(0);
  const clockRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let done = false;
    function hydrate() {
      if (done) return;
      done = true;
      const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
      const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
        goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY,
      });
      const todayKey = toDateKey(Date.now());
      const total = sessions
        .filter((s) => s.startedAt === todayKey)
        .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
      // flushSync: hydrate는 클릭 같은 사용자 이벤트가 아니라 타이머/마이크로태스크에서 도는
      // 순수 백그라운드 갱신이라 React의 일반 배치 스케줄을 못 타는 시점이 있다 — 즉시 반영.
      flushSync(() => {
        setTodayMin(total);
        setGoalMinPerDay(settings.goalMinPerDay ?? DEFAULT_GOAL_MIN_PER_DAY);
        setLoading(false);
      });
    }
    // 다음 macrotask에서 hydrate — 그 사이엔 today-hero/timer-card가 Skeleton으로 자리를 채운다.
    // 마이크로태스크로도 동시에 예약: 페이크 타이머가 렌더 "이후"에 설치되는 테스트 환경(예:
    // 렌더는 실타이머, 이어서 vi.useFakeTimers 전환)에서는 이미 예약된 실 setTimeout을 그
    // 전환이 붙잡지 못하므로, 실 타이머와 무관하게 항상 도는 마이크로태스크가 안전망이 된다.
    const timer = setTimeout(hydrate, 0);
    Promise.resolve().then(hydrate);
    return () => {
      done = true;
      clearTimeout(timer);
    };
  }, []);

  // phase===running인 동안 표시값은 항상 endsAt - Date.now()로 재계산한다(누산 금지).
  // 일반 틱(setInterval)은 리렌더만 트리거하고, 탭 복귀(visibilitychange)는 렌더 스케줄을
  // 기다리지 않고 mm:ss를 즉시 DOM에 직접 반영해 백그라운드 경과가 화면에 바로 맞아떨어지게 한다.
  useEffect(() => {
    if (phase !== 'running' || endsAt == null) return;
    function paintNow() {
      if (!clockRef.current) return;
      clockRef.current.textContent = formatClock(Math.max(0, endsAt! - Date.now()));
    }
    paintNow();
    document.addEventListener('visibilitychange', paintNow);
    const id = setInterval(() => forceRender((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', paintNow);
    };
  }, [phase, endsAt]);

  const remainingMs =
    phase === 'running' && endsAt != null
      ? Math.max(0, endsAt - Date.now())
      : phase === 'paused'
        ? pausedRemainingMs
        : FOCUS_DURATION_MS;

  function handlePrimary() {
    if (phase === 'idle' || phase === 'break') {
      setEndsAt(Date.now() + FOCUS_DURATION_MS);
      setPhase('running');
      return;
    }
    if (phase === 'running') {
      const remaining = endsAt != null ? Math.max(0, endsAt - Date.now()) : FOCUS_DURATION_MS;
      if (remaining <= 0) {
        onSessionEnd({ durationMs: FOCUS_DURATION_MS });
        setEndsAt(null);
        setPhase('idle');
        return;
      }
      setPausedRemainingMs(remaining);
      setEndsAt(null);
      setPhase('paused');
      return;
    }
    if (phase === 'paused') {
      setEndsAt(Date.now() + pausedRemainingMs);
      setPhase('running');
    }
  }

  const pct = goalMinPerDay > 0 ? Math.round((todayMin / goalMinPerDay) * 100) : 0;
  const heroCaption = todayMin >= 1 ? `목표 ${goalMinPerDay}분 중 ${pct}%` : '오늘 첫 집중을 시작해보세요';
  const goalRatio = goalMinPerDay > 0 ? todayMin / goalMinPerDay : 0;
  const progressRatio = 1 - remainingMs / FOCUS_DURATION_MS;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>FocusStreak</Top.TitleParagraph>}
          right={
            // 아이콘 name="iconSettingRegular"는 TDS 아이콘 CDN에서 403("Wrong URL")을 받아
            // 컴포넌트가 throw → 홈에서 console.error가 남았다(검수 반려 사유). 텍스트 버튼으로 대체.
            <Button variant="weak" size="small" onClick={() => navigate('/settings')}>
              설정
            </Button>
          }
        />
      }
      bottom={
        <SubmitFooter label={PRIMARY_LABEL[phase]} onClick={handlePrimary} testId="timer-primary-button" />
      }
    >
      <div data-testid="today-hero">
        {loading ? (
          <Card>
            <Skeleton />
            <Spacing size={8} />
            <Skeleton />
          </Card>
        ) : (
          <>
            <SummaryHero
              label="오늘 집중"
              value={<CountUp value={todayMin} unit="분" typography="t1" />}
              caption={heroCaption}
            />
            <Spacing size={12} />
            <MiniBar testId="today-goal-bar" ratio={goalRatio} />
          </>
        )}
      </div>

      <Spacing size={24} />

      <div data-testid="timer-card">
        {loading ? (
          <Card>
            <Skeleton />
          </Card>
        ) : (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <CircularProgress ratio={progressRatio} />
              <Paragraph.Text typography="t2">
                <span ref={clockRef} data-testid="timer-clock">
                  {formatClock(remainingMs)}
                </span>
              </Paragraph.Text>
              <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
                {PHASE_LABEL[phase]}
              </Paragraph.Text>
            </div>
          </Card>
        )}
      </div>

      <Spacing size={24} />

      {!loading && phase !== 'running' ? <AdSlot adGroupId="home-timer-idle" /> : null}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
