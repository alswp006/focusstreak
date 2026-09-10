// Domain types — add your app-specific types here

/** navigate(path, { state }) 페이로드 계약. 화면은 이 타입으로 캐스팅해 state를 주고받는다. */
export type RouteState = {
  "/history": { dateKey: string };
};
