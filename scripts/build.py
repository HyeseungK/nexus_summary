#!/usr/bin/env python3
"""src/template.html + data.json + qa.* -> index.html  (정적 배포용, 외부 의존은 CDN 라이브러리와 assets/ 폰트뿐)"""
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
t = (root / "src/template.html").read_text(encoding="utf-8")
data = (root / "src/data.json").read_text(encoding="utf-8").replace("</", "<\\/")

def rep(a, b):
    global t
    assert a in t, a[:60]
    t = t.replace(a, b, 1)

# Pretendard (self-hosted) instead of Noto Sans KR
rep("&family=Noto+Sans+KR:wght@400;500;700", "")
rep("<style>\n/* Layout:", "<style>\n@font-face{font-family:\"Pretendard\";font-weight:100 900;font-style:normal;font-display:swap;src:url(assets/PretendardVariable.woff2) format(\"woff2\")}\n/* Layout:")
rep('--display:"Schibsted Grotesk","Noto Sans KR",system-ui,sans-serif;', '--display:"Schibsted Grotesk","Pretendard",system-ui,sans-serif;')
rep('--body:"Noto Sans KR",system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;', '--body:"Pretendard",system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;')
rep(".hint{position:absolute;bottom:max(16px,env(safe-area-inset-bottom,0px));right:max(16px,env(safe-area-inset-right,0px));", ".hint{position:absolute;bottom:max(16px,env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);white-space:nowrap;")
rep('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
rep("<title>Nexus 읽기 지도</title>", '<title>Nexus 읽기 지도</title>\n<meta name="description" content="유발 하라리 『Nexus』를 3D 네트워크, 챕터 카드, 인용구 카드로 정리한 인터랙티브 요약">\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%277%27 fill=%27%230C1116%27/%3E%3Cg stroke=%27%2343C4D6%27 stroke-width=%271.6%27%3E%3Cpath d=%27M7 22L13 10L20 20L26 9%27 fill=%27none%27/%3E%3C/g%3E%3Ccircle cx=%277%27 cy=%2722%27 r=%273%27 fill=%27%23E8A04F%27/%3E%3Ccircle cx=%2713%27 cy=%2710%27 r=%273%27 fill=%27%23E8A04F%27/%3E%3Ccircle cx=%2720%27 cy=%2720%27 r=%273%27 fill=%27%2343C4D6%27/%3E%3Ccircle cx=%2726%27 cy=%279%27 r=%273%27 fill=%27%23F2707F%27/%3E%3C/svg%3E">')
rep("*{box-sizing:border-box}", "*{box-sizing:border-box}\nbody{margin:0}")
src = root / "src"
qa_js = (src / "qa.js").read_text(encoding="utf-8").replace("/*RETR*/", (src / "retr.js").read_text(encoding="utf-8"))
t = t.replace("/*QA_CSS*/", (src / "qa.css").read_text(encoding="utf-8")).replace("<!--QA_HTML-->", (src / "qa.html").read_text(encoding="utf-8")).replace("/*QA_JS*/", qa_js)
t = t.replace("__DATA__", data)
head = '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
out = head + t.replace("</style>\n", "</style>\n</head>\n<body>\n", 1) + "\n</body>\n</html>\n"
(root / "index.html").write_text(out, encoding="utf-8")
print("index.html", round(len(out) / 1e3), "KB")
