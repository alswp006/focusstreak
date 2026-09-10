import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Button, Paragraph, Spacing, ListRow, Chip, ChipItem, AlertDialog, BottomSheet, Toast, Asset } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { Card } from "../components/Card";
import { EmptyState } from "../components/StateView";
import { AdSlot } from "../components/AdSlot";
import { isValidDateKey, toDateKey } from "../lib/datetime";
import { read, write } from "../lib/storage";
import type { FocusSession } from "../lib/domain";
import type { RouteState } from "../lib/types";

const SESSIONS_KEY = "fs:sessions:v1";
const PAGE_SIZE = 20;
const TAGS = ["공부", "업무", "운동"] as const;
type Tag = (typeof TAGS)[number];
type TagFilter = "전체" | Tag;

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/** startedAt이 'YYYY-MM-DD'가 아니면 파싱해 dateKey로 정규화 (domain.ts의 내부 헬퍼와 동일 규칙) */
function sessionDateKey(session: FocusSession): string {
  if (isValidDateKey(session.startedAt)) return session.startedAt;
  const parsed = Date.parse(session.startedAt);
  return Number.isNaN(parsed) ? session.startedAt : toDateKey(parsed);
}

export default function History() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = (location.state as RouteState["/history"] | null | undefined) ?? null;
  const dateKey = routeState && isValidDateKey(routeState.dateKey) ? routeState.dateKey : toDateKey(Date.now());
  const [y, m, d] = dateKey.split("-").map(Number);
  void y;

  const [sessions, setSessions] = useState<FocusSession[]>(() => read<FocusSession[]>(SESSIONS_KEY, []));
  const [tagFilter, setTagFilter] = useState<TagFilter>("전체");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingSession, setEditingSession] = useState<FocusSession | null>(null);
  const [editTag, setEditTag] = useState<Tag>("공부");
  const [deletingSession, setDeletingSession] = useState<FocusSession | null>(null);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  const daySessions = useMemo(() => sessions.filter((s) => sessionDateKey(s) === dateKey), [sessions, dateKey]);
  const filteredSessions = useMemo(
    () => (tagFilter === "전체" ? daySessions : daySessions.filter((s) => s.tag === tagFilter)),
    [daySessions, tagFilter],
  );

  const totalMin = filteredSessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const visibleSessions = filteredSessions.slice(0, visibleCount);
  const hasMore = filteredSessions.length > visibleSessions.length;
  const isEmpty = filteredSessions.length === 0;

  function selectTag(tag: TagFilter) {
    fireHaptic();
    setTagFilter(tag);
    setVisibleCount(PAGE_SIZE);
  }

  function loadMore() {
    setVisibleCount((v) => v + PAGE_SIZE);
  }

  function openEdit(session: FocusSession) {
    setEditingSession(session);
    setEditTag((TAGS as readonly string[]).includes(session.tag ?? "") ? (session.tag as Tag) : "공부");
  }

  function saveEdit() {
    if (!editingSession) return;
    const target = editingSession;
    setSessions((prev) => {
      const next = prev.map((s) => (s === target ? { ...s, tag: editTag } : s));
      write(SESSIONS_KEY, next);
      return next;
    });
    setEditingSession(null);
  }

  function confirmDeleteSession() {
    if (!deletingSession) return;
    const target = deletingSession;
    try {
      setSessions((prev) => {
        const next = prev.filter((s) => s !== target);
        write(SESSIONS_KEY, next);
        return next;
      });
      setDeletingSession(null);
      setToast({ open: true, text: "기록을 삭제했어요" });
    } catch {
      setDeletingSession(null);
      setToast({ open: true, text: "변경을 저장하지 못했어요" });
    }
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>{`${m}월 ${d}일 기록`}</Top.TitleParagraph>}
          right={
            <Button variant="weak" size="small" onClick={() => navigate(-1)}>
              닫기
            </Button>
          }
        />
      }
    >
      <Card testId="history-summary-card">
        <Paragraph.Text typography="t3">{`총 ${totalMin}분 · ${filteredSessions.length}회`}</Paragraph.Text>
      </Card>

      <Spacing size={16} />

      <Chip wrap>
        <ChipItem selected={tagFilter === "전체"} onClick={() => selectTag("전체")}>
          전체
        </ChipItem>
        {TAGS.map((tag) => (
          <ChipItem key={tag} selected={tagFilter === tag} onClick={() => selectTag(tag)}>
            {tag}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={16} />

      {isEmpty ? (
        <EmptyState
          icon={<Asset.ContentIcon name="icon-warning-circle" alt="" style={{ width: 40, height: 40 }} />}
          title="이 날은 집중 기록이 없어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              집중 시작하기
            </Button>
          }
        />
      ) : (
        <>
          <Card testId="history-list-card">
            {visibleSessions.map((session, idx) => (
              <ListRow
                key={`${session.startedAt}-${idx}`}
                data-testid="session-row"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${session.minutes}분 · ${session.tag ?? "기타"}`}
                    bottom={session.startedAt}
                  />
                }
                right={
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button variant="weak" size="small" onClick={() => openEdit(session)}>
                      수정
                    </Button>
                    <Button variant="weak" size="small" onClick={() => setDeletingSession(session)}>
                      삭제
                    </Button>
                  </div>
                }
              />
            ))}
          </Card>

          {hasMore && (
            <>
              <Spacing size={16} />
              <Button variant="weak" size="medium" display="block" onClick={loadMore}>
                더 보기
              </Button>
            </>
          )}
        </>
      )}

      <Spacing size={24} />

      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />

      <Spacing size={24} />

      <BottomSheet
        open={editingSession != null}
        onClose={() => setEditingSession(null)}
        header={<BottomSheet.Header>태그 수정</BottomSheet.Header>}
      >
        <Chip wrap>
          {TAGS.map((tag) => (
            <ChipItem
              key={tag}
              selected={editTag === tag}
              onClick={() => {
                fireHaptic();
                setEditTag(tag);
              }}
            >
              {tag}
            </ChipItem>
          ))}
        </Chip>
        <Spacing size={16} />
        <Button variant="fill" display="block" onClick={saveEdit}>
          저장
        </Button>
      </BottomSheet>

      <AlertDialog
        open={deletingSession != null}
        title="기록을 삭제할까요?"
        description="삭제한 기록은 되돌릴 수 없어요."
        alertButton={<AlertDialog.AlertButton onClick={confirmDeleteSession}>삭제하기</AlertDialog.AlertButton>}
        onClose={() => setDeletingSession(null)}
      />

      <Toast open={toast.open} position="bottom" text={toast.text} onClose={() => setToast({ open: false, text: "" })} />
    </ScreenScaffold>
  );
}
