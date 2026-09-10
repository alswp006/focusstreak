import { useState } from 'react';
import { Top, Button, Paragraph, Spacing, Asset } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { Amount } from '../components/Amount';
import { AdSlot } from '../components/AdSlot';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { EmptyState } from '../components/StateView';
import { getDayLevel, sumMinutesByDate, computeStreak, type FocusSession } from '../lib/domain';
import { toDateKey } from '../lib/datetime';
import { read } from '../lib/storage';

const SESSIONS_KEY = 'fs:sessions:v1';
const SETTINGS_KEY = 'fs:settings:v1';
const DEFAULT_GOAL_MIN_PER_DAY = 120;

// 농도 레벨(0=없음 ~ 3=목표 초과 달성) → TDS 색상 토큰
// --tds-color-*는 실제 @toss/tds-mobile CSS에 정의돼 있지 않아(패키지는 --adaptive*만 노출)
// var() 2차 인자로 실재하는 --adaptive* 토큰을 폴백에 둔다 — HEX 리터럴 없이 실제로 보이게.
const LEVEL_TOKEN: Record<0 | 1 | 2 | 3, string> = {
  0: 'grey100',
  1: 'grey300',
  2: 'blue300',
  3: 'blue500',
};
const LEVEL_ADAPTIVE_FALLBACK: Record<0 | 1 | 2 | 3, string> = {
  0: 'adaptiveGrey100',
  1: 'adaptiveGrey300',
  2: 'adaptiveBlue300',
  3: 'adaptiveBlue500',
};
function levelBackgroundColor(level: 0 | 1 | 2 | 3): string {
  return `var(--tds-color-${LEVEL_TOKEN[level]}, var(--${LEVEL_ADAPTIVE_FALLBACK[level]}))`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 해당 연-월(1-indexed)의 총 일수 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 해당 연-월 1일의 요일(0=일 ~ 6=토) */
function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

type CalendarCell = { dateKey: string; level: 0 | 1 | 2 | 3 } | null;

export default function Calendar() {
  const navigate = useNavigate();

  const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
  const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
    goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY,
  });
  const goalMinPerDay = settings.goalMinPerDay ?? DEFAULT_GOAL_MIN_PER_DAY;

  const [todayYear, todayMonth] = toDateKey(Date.now()).split('-').map(Number);
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);

  const isThisMonth = viewYear === todayYear && viewMonth === todayMonth;

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    if (isThisMonth) return;
    setViewMonth((m) => {
      if (m === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }

  const dailyTotals = sumMinutesByDate(sessions);
  const streak = computeStreak(sessions, goalMinPerDay);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = firstWeekdayOfMonth(viewYear, viewMonth);
  const trailingBlanks = (7 - ((leadingBlanks + totalDays) % 7)) % 7;

  const cells: CalendarCell[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateKey = `${viewYear}-${pad2(viewMonth)}-${pad2(day)}`;
      const level = getDayLevel(dailyTotals[dateKey] ?? 0, goalMinPerDay);
      return { dateKey, level };
    }),
    ...Array.from({ length: trailingBlanks }, () => null),
  ];

  const monthPrefix = `${viewYear}-${pad2(viewMonth)}`;
  const hasSessionsThisMonth = Object.keys(dailyTotals).some(
    (key) => key.startsWith(monthPrefix) && dailyTotals[key] > 0,
  );

  function goToDate(dateKey: string) {
    navigate('/history', { state: { dateKey } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{`${viewYear}년 ${viewMonth}월`}</Top.TitleParagraph>} />}
      bottom={
        <FloatingTabBar
          items={[
            { label: '홈', path: '/' },
            { label: '캘린더', path: '/calendar' },
            { label: '리포트', path: '/report' },
            { label: '더보기', path: '/more' },
          ]}
        />
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="weak" size="small" onClick={prevMonth}>
          이전 달
        </Button>
        <Button variant="weak" size="small" onClick={nextMonth} disabled={isThisMonth}>
          다음 달
        </Button>
      </div>

      <Spacing size={16} />

      <SummaryHero
        testId="streak-hero"
        label="집중 스트릭"
        value={<Amount value={streak.current} unit="일 연속" typography="t1" />}
        caption={`최장 ${streak.longest}일`}
      />

      <Spacing size={24} />

      <Card testId="calendar-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {cells.map((cell, idx) =>
            cell ? (
              <button
                key={cell.dateKey}
                type="button"
                data-date-key={cell.dateKey}
                data-level={cell.level}
                onClick={() => goToDate(cell.dateKey)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: levelBackgroundColor(cell.level),
                }}
              />
            ) : (
              <div key={`blank-${idx}`} aria-hidden="true" style={{ minWidth: 44, minHeight: 44 }} />
            ),
          )}
        </div>
      </Card>

      <Spacing size={12} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
          적음
        </Paragraph.Text>
        {([0, 1, 2, 3] as const).map((level) => (
          <span
            key={level}
            data-level={level}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: levelBackgroundColor(level),
            }}
          />
        ))}
        <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
          목표 달성
        </Paragraph.Text>
      </div>

      {!hasSessionsThisMonth && (
        <>
          <Spacing size={24} />
          <EmptyState
            icon={<Asset.ContentIcon name="icon-warning-circle" alt="" style={{ width: 40, height: 40 }} />}
            title="이번 달 집중 기록이 아직 없어요"
          />
        </>
      )}

      <Spacing size={24} />

      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ''} />

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
