import { useNavigate } from 'react-router-dom';
import { Top, Button, Paragraph, Spacing, Asset } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { Amount } from '../components/Amount';
import { MiniBar } from '../components/MiniBar';
import { computeStreak, evaluateBadges, BADGE_DEFS } from '../lib/domain';
import type { BadgeId, FocusSession } from '../lib/types';
import { SESSIONS_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../lib/types';
import { read } from '../lib/storage';

/** 배지별 달성 조건 안내 문구 — 미획득 배지에 무엇을 하면 열리는지 보여준다. */
const BADGE_CONDITION: Record<BadgeId, string> = {
  'first-step': '집중 세션 1회 완료',
  'streak-3': '3일 연속 목표 달성',
  'streak-7': '7일 연속 목표 달성',
  'streak-30': '30일 연속 목표 달성',
  'total-10h': '누적 집중 10시간',
  'total-50h': '누적 집중 50시간',
  'deep-focus': '한 세션에서 120분 집중',
};

export default function Badges() {
  const navigate = useNavigate();

  const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
  const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
    goalMinPerDay: DEFAULT_SETTINGS.goalMinPerDay,
  });
  const goalMinPerDay = settings.goalMinPerDay ?? DEFAULT_SETTINGS.goalMinPerDay;

  const streak = computeStreak(sessions, goalMinPerDay);
  const unlocked = new Set<BadgeId>(evaluateBadges(sessions, streak));
  const total = BADGE_DEFS.length;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>배지</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate(-1)}>
              닫기
            </Button>
          }
        />
      }
    >
      <SummaryHero
        testId="badge-hero"
        label="획득한 배지"
        value={<Amount value={unlocked.size} unit={` / ${total}개`} typography="t1" />}
        caption={
          unlocked.size === 0
            ? '첫 집중을 마치면 배지가 열려요'
            : `다음 배지까지 ${total - unlocked.size}개 남았어요`
        }
      />

      <Spacing size={12} />
      <MiniBar ratio={total === 0 ? 0 : unlocked.size / total} />
      <Spacing size={16} />

      {unlocked.size === 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Asset.ContentIcon name="icon-warning-circle" alt="" style={{ width: 32, height: 32 }} />
            <Paragraph.Text typography="t6">
              첫 집중을 시작하면 배지가 열려요
            </Paragraph.Text>
          </div>
          <Spacing size={16} />
        </>
      ) : null}

      <div
        data-testid="badge-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
      >
        {BADGE_DEFS.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          return (
            <Card
              key={badge.id}
              testId="badge-card"
              style={{ opacity: isUnlocked ? 1 : 0.45 }}
            >
              <Paragraph.Text typography="t5">{badge.title}</Paragraph.Text>
              <Spacing size={4} />
              <Paragraph.Text typography="st13">
                {isUnlocked ? '획득 완료' : BADGE_CONDITION[badge.id]}
              </Paragraph.Text>
            </Card>
          );
        })}
      </div>

      <Spacing size={40} />
    </ScreenScaffold>
  );
}
