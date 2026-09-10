import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Button, Paragraph, Spacing, TextField, ListRow, Switch, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';
import { SubmitFooter } from '../components/BottomCTA';
import { computeStreak } from '../lib/domain';
import type { FocusSession, TimerSettings } from '../lib/types';
import {
  DEFAULT_SETTINGS,
  SESSIONS_KEY,
  SETTINGS_KEY,
  SETTINGS_RANGE,
  STREAK_KEY,
} from '../lib/types';
import { read, write } from '../lib/storage';

type FieldKey = 'focusMin' | 'breakMin' | 'goalMinPerDay';

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  rangeText: string;
}> = [
  { key: 'focusMin', label: '집중 시간(분)', placeholder: '25', rangeText: '집중 시간은 5~60분 사이로 입력해주세요' },
  { key: 'breakMin', label: '휴식 시간(분)', placeholder: '5', rangeText: '휴식 시간은 1~30분 사이로 입력해주세요' },
  { key: 'goalMinPerDay', label: '하루 목표(분)', placeholder: '120', rangeText: '하루 목표는 10~720분 사이로 입력해주세요' },
];

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Settings() {
  const navigate = useNavigate();

  const saved = read<TimerSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [values, setValues] = useState<Record<FieldKey, string>>({
    focusMin: String(saved.focusMin ?? DEFAULT_SETTINGS.focusMin),
    breakMin: String(saved.breakMin ?? DEFAULT_SETTINGS.breakMin),
    goalMinPerDay: String(saved.goalMinPerDay ?? DEFAULT_SETTINGS.goalMinPerDay),
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    saved.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
  );
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [toastOpen, setToastOpen] = useState(false);

  function validate(): Partial<Record<FieldKey, string>> {
    const next: Partial<Record<FieldKey, string>> = {};
    for (const field of FIELDS) {
      const raw = values[field.key].trim();
      if (raw === '') {
        next[field.key] = '숫자만 입력해주세요';
        continue;
      }
      if (!/^\d+$/.test(raw)) {
        next[field.key] = '숫자만 입력해주세요';
        continue;
      }
      const num = Number(raw);
      const range = SETTINGS_RANGE[field.key];
      if (num < range.min || num > range.max) next[field.key] = field.rangeText;
    }
    return next;
  }

  function handleSave() {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // 첫 에러 필드로 포커스 이동 — 무엇이 막혔는지 바로 보이게
      const firstKey = FIELDS.find((f) => found[f.key])?.key;
      if (firstKey) document.getElementById(`settings-${firstKey}`)?.focus();
      return;
    }

    const goalMinPerDay = Number(values.goalMinPerDay);
    const next: TimerSettings = {
      focusMin: Number(values.focusMin),
      breakMin: Number(values.breakMin),
      goalMinPerDay,
      defaultTag: saved.defaultTag ?? DEFAULT_SETTINGS.defaultTag,
      soundEnabled,
      version: 1,
    };
    write(SETTINGS_KEY, next);

    // 목표가 바뀌면 스트릭 기준도 바뀐다 — 저장 시점에 새 목표로 재계산해 캐시를 갱신
    const sessions = read<FocusSession[]>(SESSIONS_KEY, []);
    write(STREAK_KEY, computeStreak(sessions, goalMinPerDay));

    setToastOpen(true);
    window.setTimeout(() => navigate(-1), 600);
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>설정</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate(-1)}>
              닫기
            </Button>
          }
        />
      }
      bottom={<SubmitFooter testId="settings-submit" label="설정 저장" onClick={handleSave} />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Card testId="settings-timer-card">
          <Paragraph.Text typography="t5">타이머</Paragraph.Text>
          <Spacing size={12} />
          {FIELDS.map((field, idx) => (
            <div key={field.key}>
              {idx > 0 ? <Spacing size={12} /> : null}
              <TextField
                id={`settings-${field.key}`}
                variant="box"
                label={field.label}
                placeholder={field.placeholder}
                value={values[field.key]}
                inputMode="numeric"
                enterKeyHint={idx === FIELDS.length - 1 ? 'done' : 'next'}
                hasError={Boolean(errors[field.key])}
                help={errors[field.key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setValues((prev) => ({ ...prev, [field.key]: value }));
                  setErrors((prev) => ({ ...prev, [field.key]: undefined }));
                }}
              />
            </div>
          ))}
        </Card>

        <Spacing size={16} />

        <Card testId="settings-sound-card">
          <ListRow
            contents={
              <ListRow.Texts type="2RowTypeA" top="종료 알림음" bottom="집중이 끝나면 소리로 알려줘요" />
            }
            right={
              <Switch
                checked={soundEnabled}
                onChange={() => {
                  fireHaptic();
                  setSoundEnabled((prev) => !prev);
                }}
              />
            }
          />
        </Card>

        <Spacing size={16} />
        <Paragraph.Text typography="st13">
          설정은 다음 집중부터 적용돼요. 목표를 바꾸면 연속 기록도 새 기준으로 다시 계산돼요.
        </Paragraph.Text>
        <Spacing size={120} />
      </form>

      <Toast open={toastOpen} text="설정을 저장했어요" position="bottom" />
    </ScreenScaffold>
  );
}
