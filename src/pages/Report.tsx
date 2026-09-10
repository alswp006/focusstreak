import { useEffect, useState } from 'react';
import { Top, Paragraph, Spacing, Toast, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { Card } from '../components/Card';
import { SummaryHero } from '../components/SummaryHero';
import { Amount } from '../components/Amount';
import { MiniBar } from '../components/MiniBar';
import { TossRewardAd } from '../components/TossRewardAd';
import { EmptyState } from '../components/StateView';
import { buildWeeklyReport, type FocusSession } from '../lib/domain';
import { toWeekKey, toDateKey, startOfWeek } from '../lib/datetime';
import { read, write } from '../lib/storage';

const SESSIONS_KEY = 'fs:sessions:v1';
const SETTINGS_KEY = 'fs:settings:v1';
const UNLOCK_KEY = 'fs:report_unlock:v1';
const DEFAULT_GOAL_MIN_PER_DAY = 120;
const MAX_UNLOCKED_WEEKS = 12;
const AD_FAIL_FALLBACK_THRESHOLD = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

interface ReportUnlockState {
  unlocked: Record<string, number>;
  adFailCount: Record<string, number>;
  version: 1;
}

const EMPTY_UNLOCK_STATE: ReportUnlockState = { unlocked: {}, adFailCount: {}, version: 1 };

/** unlockedAt 기준 최근 MAX_UNLOCKED_WEEKS개만 유지 */
function pruneUnlocked(unlocked: Record<string, number>): Record<string, number> {
  const entries = Object.entries(unlocked)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_UNLOCKED_WEEKS);
  return Object.fromEntries(entries);
}

function formatMonthDay(timestamp: number): string {
  const d = new Date(timestamp + 9 * 60 * 60 * 1000); // KST 벽시계
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export default function Report() {
  const now = Date.now();
  const weekKey = toWeekKey(now);
  const mondayMs = startOfWeek(toDateKey(now));
  const weekRangeLabel = `${formatMonthDay(mondayMs)} - ${formatMonthDay(mondayMs + 6 * DAY_MS)}`;

  const [unlockState, setUnlockState] = useState<ReportUnlockState>(() =>
    read(UNLOCK_KEY, EMPTY_UNLOCK_STATE),
  );
  const [toastOpen, setToastOpen] = useState(false);

  const alreadyUnlocked = unlockState.unlocked[weekKey] != null;
  const failCount = unlockState.adFailCount[weekKey] ?? 0;
  const shouldFallbackOpen = !alreadyUnlocked && failCount >= AD_FAIL_FALLBACK_THRESHOLD;
  const openedWithoutAd = failCount >= AD_FAIL_FALLBACK_THRESHOLD;
  const locked = !alreadyUnlocked && !shouldFallbackOpen;

  // 광고 실패가 임계치를 넘으면(사전 기록 포함) 광고 없이 즉시 해제하고 기록을 남긴다
  useEffect(() => {
    if (!shouldFallbackOpen) return;
    setUnlockState((prev) => {
      if (prev.unlocked[weekKey] != null) return prev;
      const next: ReportUnlockState = {
        ...prev,
        unlocked: pruneUnlocked({ ...prev.unlocked, [weekKey]: Date.now() }),
      };
      write(UNLOCK_KEY, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFallbackOpen, weekKey]);

  function handleRewarded() {
    try {
      Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
    } catch {
      /* WebView 밖 — 무시 */
    }
    setUnlockState((prev) => {
      const next: ReportUnlockState = {
        ...prev,
        unlocked: pruneUnlocked({ ...prev.unlocked, [weekKey]: Date.now() }),
      };
      write(UNLOCK_KEY, next);
      return next;
    });
  }

  function handleAdError() {
    setUnlockState((prev) => {
      const next: ReportUnlockState = {
        ...prev,
        adFailCount: { ...prev.adFailCount, [weekKey]: (prev.adFailCount[weekKey] ?? 0) + 1 },
      };
      write(UNLOCK_KEY, next);
      return next;
    });
    setToastOpen(true);
  }

  const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
  const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
    goalMinPerDay: DEFAULT_GOAL_MIN_PER_DAY,
  });
  const goalMinPerDay = settings.goalMinPerDay ?? DEFAULT_GOAL_MIN_PER_DAY;
  const report = buildWeeklyReport(sessions, weekKey, goalMinPerDay);
  const maxDayMin = Math.max(1, ...report.days.map((d) => d.dayMin));
  const tagEntries = Object.entries(report.tagBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>주간 집중 리포트</Top.TitleParagraph>} />}
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
      <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
        {`${weekKey} · ${weekRangeLabel}`}
      </Paragraph.Text>

      <Spacing size={24} />

      {locked ? (
        <Card testId="report-lock-card">
          <Asset.ContentIcon
            name="icon-warning-circle"
            alt=""
            style={{ width: 40, height: 40 }}
          />
          <Spacing size={12} />
          <Paragraph.Text typography="t4">이번 주 집중 리포트가 준비됐어요</Paragraph.Text>
          <Spacing size={4} />
          <Paragraph.Text typography="t6">짧은 광고를 보면 이번 주 리포트를 열어드려요</Paragraph.Text>
          <Spacing size={24} />
          <TossRewardAd
            slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID ?? ''}
            buttonText="광고 보고 리포트 열기"
            description="광고를 보면 이번 주 리포트를 확인할 수 있어요"
            onRewarded={handleRewarded}
            onError={handleAdError}
            testId="report-unlock-button"
          >
            {null}
          </TossRewardAd>
        </Card>
      ) : (
        <div data-testid="report-content">
          {openedWithoutAd ? (
            <>
              <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
                광고 없이 리포트를 열었어요
              </Paragraph.Text>
              <Spacing size={12} />
            </>
          ) : null}

          <SummaryHero
            testId="report-hero"
            label="이번 주 총 집중"
            value={<Amount value={report.totalMin} unit="분" typography="t1" />}
            caption={`일 평균 ${report.avgMin}분 · 목표 달성 ${report.goalMetDays}일`}
          />

          <Spacing size={16} />

          <Card testId="report-days-card">
            {report.days.map((d) => (
              <div
                key={d.dayIndex}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}
              >
                <div style={{ width: 24 }}>
                  <Paragraph.Text typography="st13">{DAY_LABELS[d.dayIndex]}</Paragraph.Text>
                </div>
                <div style={{ flex: 1 }}>
                  <MiniBar ratio={d.dayMin / maxDayMin} />
                </div>
                <div style={{ width: 52, textAlign: 'right' }}>
                  <Amount value={d.dayMin} unit="분" typography="st13" />
                </div>
              </div>
            ))}
          </Card>

          <Spacing size={16} />

          {tagEntries.length > 0 ? (
            <Card testId="report-tags-card">
              {tagEntries.map(([tag, minutes]) => (
                <div
                  key={tag}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
                >
                  <Paragraph.Text typography="st13">{tag}</Paragraph.Text>
                  <Amount value={minutes} unit="분" typography="st13" />
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon={
                <Asset.ContentIcon
                  name="icon-warning-circle"
                  alt=""
                  style={{ width: 40, height: 40 }}
                />
              }
              title="이번 주 집중 기록이 아직 없어요"
            />
          )}

          <Spacing size={24} />
        </div>
      )}

      <Toast
        open={toastOpen}
        position="bottom"
        text="광고를 불러오지 못했어요"
        onClose={() => setToastOpen(false)}
      />

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
