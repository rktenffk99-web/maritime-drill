"""Persist assisted evaluation sessions and version all released script URLs."""
from pathlib import Path
import argparse
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
VERSION = '5.35'


def patch_html(text: str) -> str:
    def replace_once(old: str, new: str) -> None:
        nonlocal text
        if new in text:
            return
        if text.count(old) != 1:
            raise RuntimeError('missing or ambiguous mock answer access anchor: ' + old[:100])
        text = text.replace(old, new, 1)

    # State is saved on every interaction, even when question metadata is cached.
    if 'const PAST_CHECKPOINT_KEY=' not in text:
        replace_once(
            "mode:pastMode,startedAt:pastStartedAt,savedAt:Date.now()}),'필기 진행');",
            "mode:pastMode,startedAt:pastStartedAt,savedAt:Date.now(),evaluationExplanationViewed:pastQueue.some(q=>q&&q._evaluationExplanationViewed===true)}),'필기 진행');",
        )
    replace_once(
        "    if(meta.evaluation)restored.forEach(q=>{q._evaluationMock=true;q._predictiveMock=true});\n",
        "    if(meta.evaluation)restored.forEach(q=>{q._evaluationMock=true;q._predictiveMock=true});\n"
        "    if(state.evaluationExplanationViewed===true)restored.forEach(q=>{q._evaluationExplanationViewed=true});\n",
    )
    replace_once(
        '0 키 또는 힌트 버튼으로 풀이 도움을 볼 수 있습니다. 정답·전체 해설은 제출 후 확인합니다.',
        '원할 때 0 키 또는 해설 버튼으로 정답·전체 해설을 확인할 수 있습니다. 확인한 시험은 최근 실력 평균에서 제외됩니다.',
    )
    replace_once(
        "단축키: <b>1~4</b> 답 선택${pastMode==='mock'?' · <b>0</b> 힌트':''}",
        "단축키: <b>1~4</b> 답 선택${pastMode==='mock'?' · <b>0</b> 해설 열기·닫기':''}",
    )
    text, count = re.subn(r"const APP_VERSION = '[^']+';", f"const APP_VERSION = '{VERSION}';", text, count=1)
    if count != 1:
        raise RuntimeError('missing application version')
    text, count = re.subn(r'<title>Maritime Drill v[\d.]+ · Android</title>', f'<title>Maritime Drill v{VERSION} · Android</title>', text, count=1)
    if count != 1:
        raise RuntimeError('missing application title')

    def script_url(match: re.Match) -> str:
        src = match.group('url')
        if re.match(r'(?:[a-z][a-z\d+.-]*:|//|/)', src, re.I):
            return match.group(0)
        url, fragment_sep, fragment = src.partition('#')
        path, _, query = url.partition('?')
        if '/' in path.removeprefix('./') or '\\' in path:
            return match.group(0)
        parts = [part for part in query.split('&') if part and not part.startswith('v=')]
        parts.append('v=' + VERSION)
        updated = path + '?' + '&'.join(parts) + (fragment_sep + fragment if fragment_sep else '')
        return match.group('prefix') + match.group('quote') + updated + match.group('quote')

    return re.sub(r'(?P<prefix><script\b[^>]*?\s+src=)(?P<quote>["\'])(?P<url>[^"\']+)(?P=quote)', script_url, text, flags=re.I)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=ROOT / 'index.html')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--stdin', action='store_true')
    parser.add_argument('--stdout', action='store_true')
    args = parser.parse_args()
    if args.stdin and not args.stdout:
        parser.error('--stdin requires --stdout')
    original = sys.stdin.read() if args.stdin else args.input.read_text(encoding='utf-8-sig')
    patched = patch_html(original)
    if args.stdout:
        sys.stdout.write(patched)
    else:
        target = args.output or args.input
        if target != args.input or patched != original:
            target.write_text(patched, encoding='utf-8')
        print(f'mock answer access state and v{VERSION} release patch applied')


if __name__ == '__main__':
    main()
