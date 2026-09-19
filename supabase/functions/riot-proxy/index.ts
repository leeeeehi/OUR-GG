/**
 * riot-proxy (폐기됨): "전적을 게시물로 공유"하던 시절의 Edge Function.
 *
 * 친구 전적 중심 구조로 바뀌면서 match-api로 대체되었다. 이 함수를 그대로 두면 전적 공개 설정과 차단을
 * 무시하고 조회해 줄 수 있으므로, 어떤 요청에도 410(Gone)만 응답하는 껍데기로 남겨 둔다.
 * 배포 후 옛 클라이언트(캐시된 탭)가 호출해도 조용히 실패한다.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
  return new Response(
    JSON.stringify({ code: 'GONE', message: '이 API는 더 이상 사용되지 않습니다. 앱을 새로고침해주세요.' }),
    { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
  );
});
