import { Button, ListRow, Paragraph, Spacing, Asset } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { Card } from './Card';
import { SummaryHero } from './SummaryHero';
import { Amount } from './Amount';
import { AdSlot } from './AdSlot';
import { EmptyState } from './StateView';
import type { WeeklyReport } from '../lib/domain';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const TAGS = ['공부', '업무', '운동'] as const;

/**
 * 주간 리포트 결과 카드 — 해제된 리포트의 히어로 · 요일별 추이 · 태그 비중.
 * 수치는 전부 buildWeeklyReport 결과(report)에서만 읽는다(내부 재집계 금지).
 */
export function WeeklyReportResult({
  report,
  sessionCount,
}: {
  report: WeeklyReport;
  sessionCount: number;
}) {
  const navigate = useNavigate();

  if (sessionCount === 0) {
    return (
      <EmptyState
        icon={
          <Asset.ContentIcon name="icon-warning-circle" alt="" style={{ width: 40, height: 40 }} />
        }
        title="이번 주에는 아직 집중 기록이 없어요"
        action={
          <Button variant="weak" display="block" onClick={() => navigate('/')}>
            집중 시작하기
          </Button>
        }
      />
    );
  }

  const maxDayMin = Math.max(1, ...report.days.map((d) => d.dayMin));

  return (
    <>
      <SummaryHero
        testId="report-hero"
        label="이번 주 집중"
        value={<Amount value={report.totalMin} unit="분" typography="t1" />}
        caption={`하루 평균 ${report.avgMin}분 · 목표 달성 ${report.goalMetDays}일`}
      />

      <Spacing size={24} />

      <Card testId="report-trend">
        <Paragraph.Text typography="t5">요일별 집중</Paragraph.Text>
        <Spacing size={16} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {report.days.map((day) => {
            const heightPct = Math.round((day.dayMin / maxDayMin) * 100);
            return (
              <div
                key={day.dayIndex}
                data-day-index={day.dayIndex}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <Paragraph.Text typography="st13">{`${day.dayMin}분`}</Paragraph.Text>
                <div style={{ width: '100%', height: 72, display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      minHeight: 4,
                      borderRadius: 4,
                      backgroundColor: 'var(--adaptiveBlue500)',
                    }}
                  />
                </div>
                <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">
                  {DAY_LABELS[day.dayIndex]}
                </Paragraph.Text>
              </div>
            );
          })}
        </div>
      </Card>

      <Spacing size={16} />

      <Card testId="report-tags">
        {TAGS.map((tag) => {
          const minutes = report.tagBreakdown[tag] ?? 0;
          const pct = report.totalMin === 0 ? 0 : Math.round((minutes / report.totalMin) * 100);
          return (
            <ListRow
              key={tag}
              data-testid="report-tag-row"
              contents={<ListRow.Texts type="1RowTypeA" top={tag} />}
              right={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Paragraph.Text typography="st13">{`${minutes}분`}</Paragraph.Text>
                  <Paragraph.Text typography="st13" color="var(--adaptiveGrey700)">{`${pct}%`}</Paragraph.Text>
                </div>
              }
            />
          );
        })}
      </Card>

      <Spacing size={24} />

      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ''} />
    </>
  );
}
