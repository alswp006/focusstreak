import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { Amount } from '../components/Amount';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { AdSlot } from '../components/AdSlot';
import { computeStreak, evaluateBadges, BADGE_DEFS } from '../lib/domain';
import type { FocusSession } from '../lib/types';
import { SESSIONS_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../lib/types';
import { toDateKey } from '../lib/datetime';
import { read } from '../lib/storage';

/** 탭 루트(더보기) — 배지·랭킹·기록·설정으로 가는 허브. */
export default function More() {
  const navigate = useNavigate();

  const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
  const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
    goalMinPerDay: DEFAULT_SETTINGS.goalMinPerDay,
  });
  const goalMinPerDay = settings.goalMinPerDay ?? DEFAULT_SETTINGS.goalMinPerDay;

  const streak = computeStreak(sessions, goalMinPerDay);
  const unlockedCount = evaluateBadges(sessions, streak).length;
  const totalMin = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const totalHour = Math.floor(totalMin / 60);

  const menus = [
    {
      testId: 'more-badges',
      top: '배지',
      bottom: `${unlockedCount} / ${BADGE_DEFS.length} 획득`,
      onClick: () => navigate('/badges'),
    },
    {
      testId: 'more-rank',
      top: '친구 랭킹',
      bottom: '코드로 이번 주 집중시간 겨루기',
      onClick: () => navigate('/rank'),
    },
    {
      testId: 'more-history',
      top: '오늘 기록',
      bottom: '세션 확인하고 태그 고치기',
      onClick: () => navigate('/history', { state: { dateKey: toDateKey(Date.now()) } }),
    },
    {
      testId: 'more-settings',
      top: '설정',
      bottom: '집중·휴식 길이, 하루 목표',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>더보기</Top.TitleParagraph>} />}
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
      <SummaryHero
        testId="more-hero"
        label="지금 연속 기록"
        value={<Amount value={streak.current} unit="일" typography="t1" />}
        caption={`최장 ${streak.longest}일 · 누적 ${totalHour}시간 ${totalMin % 60}분`}
      />

      <Spacing size={16} />

      <Card testId="more-menu-card">
        {menus.map((menu) => (
          <ListRow
            key={menu.testId}
            data-testid={menu.testId}
            onClick={menu.onClick}
            contents={<ListRow.Texts type="2RowTypeA" top={menu.top} bottom={menu.bottom} />}
          />
        ))}
      </Card>

      <Spacing size={16} />

      <Paragraph.Text typography="st13">
        기록은 이 기기에만 저장돼요. 앱을 지우면 함께 사라져요.
      </Paragraph.Text>

      <Spacing size={16} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ''} />
      <Spacing size={80} />
    </ScreenScaffold>
  );
}
