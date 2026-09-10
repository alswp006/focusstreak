import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Top,
  Button,
  Paragraph,
  Spacing,
  ListRow,
  TextField,
  BottomSheet,
  Toast,
  Asset,
} from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { Amount } from '../components/Amount';
import { EmptyState } from '../components/StateView';
import { buildWeeklyReport } from '../lib/domain';
import type { FocusSession, FriendEntry } from '../lib/types';
import { FRIENDS_KEY, NICKNAME_KEY, SESSIONS_KEY, SETTINGS_KEY, DEFAULT_SETTINGS } from '../lib/types';
import { toWeekKey } from '../lib/datetime';
import { read, write } from '../lib/storage';

const MAX_FRIENDS = 20;
const CODE_PREFIX = 'FS1.';

/** 코드 페이로드 — n: 닉네임, w: weekKey, m: 집중 분 */
type CodePayload = { n: string; w: string; m: number };

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeRankCode(payload: CodePayload): string {
  return CODE_PREFIX + toBase64Url(JSON.stringify(payload));
}

/** 잘못된 코드는 예외를 던지지 않고 null을 반환한다 */
export function decodeRankCode(code: string): CodePayload | null {
  try {
    const trimmed = code.trim();
    if (!trimmed.startsWith(CODE_PREFIX)) return null;
    const parsed = JSON.parse(fromBase64Url(trimmed.slice(CODE_PREFIX.length))) as Partial<CodePayload>;
    if (typeof parsed?.n !== 'string' || typeof parsed?.w !== 'string' || typeof parsed?.m !== 'number') {
      return null;
    }
    const nickname = parsed.n.trim();
    if (nickname === '' || nickname.length > 10) return null;
    if (!/^\d{4}-W\d{2}$/.test(parsed.w)) return null;
    if (!Number.isFinite(parsed.m) || parsed.m < 0 || parsed.m > 10080) return null;
    return { n: nickname, w: parsed.w, m: Math.round(parsed.m) };
  } catch {
    return null;
  }
}

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* 구버전 WebView — 아래 fallback 사용 */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function Rank() {
  const navigate = useNavigate();

  const weekKey = toWeekKey(Date.now());
  const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
  const settings = read<{ goalMinPerDay?: number }>(SETTINGS_KEY, {
    goalMinPerDay: DEFAULT_SETTINGS.goalMinPerDay,
  });
  const myMin = buildWeeklyReport(
    sessions,
    weekKey,
    settings.goalMinPerDay ?? DEFAULT_SETTINGS.goalMinPerDay,
  ).totalMin;

  const [nickname, setNickname] = useState<string>(read<string>(NICKNAME_KEY, ''));
  const [friends, setFriends] = useState<FriendEntry[]>(read<FriendEntry[]>(FRIENDS_KEY, []));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);

  const myName = nickname.trim() === '' ? '나' : nickname.trim();
  const thisWeekFriends = friends.filter((friend) => friend.weekKey === weekKey);

  const ranking = [
    { id: 'me', nickname: myName, focusMin: myMin, isMe: true },
    ...thisWeekFriends.map((friend) => ({
      id: friend.id,
      nickname: friend.nickname,
      focusMin: friend.focusMin,
      isMe: false,
    })),
  ].sort((a, b) => b.focusMin - a.focusMin);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function saveNickname(value: string) {
    setNickname(value);
    write(NICKNAME_KEY, value);
  }

  async function copyMyCode() {
    const code = encodeRankCode({ n: myName, w: weekKey, m: myMin });
    try {
      await navigator.clipboard.writeText(code);
      showToast('코드를 복사했어요');
    } catch {
      // 클립보드를 쓸 수 없는 환경 — 코드를 직접 보여주고 길게 눌러 복사하도록 안내
      setCodeInput(code);
      setSheetOpen(true);
      showToast('아래 칸의 코드를 길게 눌러 복사해 주세요');
    }
  }

  function addFriendCode() {
    const payload = decodeRankCode(codeInput);
    if (!payload) {
      setCodeError('코드를 확인해주세요');
      return;
    }
    if (payload.w !== weekKey) {
      setCodeError('이번 주 기록 코드가 아니에요');
      return;
    }

    const existing = friends.find(
      (friend) => friend.weekKey === weekKey && friend.nickname === payload.n,
    );
    if (existing) {
      const next = friends.map((friend) =>
        friend.id === existing.id ? { ...friend, focusMin: payload.m } : friend,
      );
      setFriends(next);
      write(FRIENDS_KEY, next);
    } else {
      if (thisWeekFriends.length >= MAX_FRIENDS) {
        showToast('친구는 최대 20명까지 추가할 수 있어요');
        return;
      }
      const next = [
        ...friends,
        {
          id: makeId(),
          nickname: payload.n,
          weekKey: payload.w,
          focusMin: payload.m,
          addedAt: Date.now(),
        },
      ];
      setFriends(next);
      write(FRIENDS_KEY, next);
    }

    setCodeInput('');
    setCodeError(undefined);
    setSheetOpen(false);
    showToast(`${payload.n} 기록을 추가했어요`);
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>친구 랭킹</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate(-1)}>
              닫기
            </Button>
          }
        />
      }
    >
      <SummaryHero
        testId="rank-hero"
        label={`이번 주 내 집중시간 (${weekKey})`}
        value={<Amount value={myMin} unit="분" typography="t1" />}
        caption={`이번 주 친구 ${thisWeekFriends.length}명과 비교 중`}
        action={
          <Button
            variant="fill"
            display="block"
            data-testid="rank-copy-button"
            onClick={copyMyCode}
          >
            내 기록 코드 복사
          </Button>
        }
      />

      <Spacing size={16} />

      <Card testId="rank-nickname-card">
        <TextField
          variant="box"
          label="코드에 표시될 이름"
          // box variant는 빈 칸에서 라벨이 숨는다 → placeholder가 무엇을 넣는 칸인지 말해야 한다
          placeholder="이름 (예: 민재)"
          value={nickname}
          maxLength={10}
          enterKeyHint="done"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => saveNickname(e.target.value)}
        />
      </Card>

      <Spacing size={16} />

      {thisWeekFriends.length === 0 ? (
        <EmptyState
          testId="rank-empty"
          icon={<Asset.ContentIcon name="icon-warning-circle" alt="" style={{ width: 40, height: 40 }} />}
          title="아직 비교할 친구가 없어요"
          description="친구 코드를 추가하면 순위가 보여요"
          action={
            <Button variant="weak" display="block" onClick={() => setSheetOpen(true)}>
              코드 붙여넣기
            </Button>
          }
        />
      ) : (
        <>
          <Card testId="rank-list-card">
            {ranking.map((entry, idx) => (
              <ListRow
                key={entry.id}
                data-testid="rank-row"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${idx + 1}위 ${entry.nickname}${entry.isMe ? ' (나)' : ''}`}
                    bottom={`${entry.focusMin}분`}
                  />
                }
              />
            ))}
          </Card>
          <Spacing size={16} />
          <Button variant="weak" display="block" onClick={() => setSheetOpen(true)}>
            코드 붙여넣기
          </Button>
        </>
      )}

      <Spacing size={40} />

      <BottomSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setCodeError(undefined);
        }}
      >
        <div style={{ padding: '0 16px 16px' }}>
          <Paragraph.Text typography="t4">친구 코드 추가</Paragraph.Text>
          <Spacing size={12} />
          <TextField
            variant="box"
            label="친구 코드"
            placeholder="FS1.로 시작하는 코드"
            value={codeInput}
            enterKeyHint="done"
            hasError={Boolean(codeError)}
            help={codeError}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCodeInput(e.target.value);
              setCodeError(undefined);
            }}
          />
          <Spacing size={16} />
          <Button variant="fill" display="block" onClick={addFriendCode}>
            랭킹에 추가
          </Button>
        </div>
      </BottomSheet>

      {toast ? <Toast open text={toast} position="bottom" /> : null}
    </ScreenScaffold>
  );
}
